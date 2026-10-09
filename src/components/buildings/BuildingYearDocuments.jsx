import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Leaf, Download, Loader2, Save, Trash2, AlertTriangle, FileText, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import {
  generarLibroMantenimientoAnual, generarLibroFGasAnual, datosFGasFaltantes,
  nombreArchivoLibro, tituloLibro,
} from '@/lib/edificio-libros-pdf';

const LIBROS = [
  {
    tipo: 'libro_mantenimiento',
    titulo: 'Libro de Mantenimiento',
    descripcion: 'Inventario de equipos, mantenimientos realizados, tratamientos L+D y registros de instalador.',
    icono: BookOpen,
    color: 'text-blue-600',
    fondo: 'bg-blue-50',
  },
  {
    tipo: 'libro_fgas',
    titulo: 'Libro de Registro F-Gas',
    descripcion: 'Equipos con gases fluorados, cargas, tCO₂eq e intervenciones con técnico y nº de carnet.',
    icono: Leaf,
    color: 'text-emerald-600',
    fondo: 'bg-emerald-50',
  },
];

export default function BuildingYearDocuments({ building, client, equipment = [], revisions = [] }) {
  const queryClient = useQueryClient();
  const anioActual = new Date().getFullYear();
  const [year, setYear] = useState(anioActual);
  const [generando, setGenerando] = useState(null);
  const [guardando, setGuardando] = useState(null);

  const anios = useMemo(() => {
    const set = new Set([anioActual, anioActual - 1, anioActual - 2, anioActual - 3]);
    revisions.forEach((r) => {
      const y = Number(String(r.completed_date || r.scheduled_date || '').slice(0, 4));
      if (y) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [revisions, anioActual]);

  const rango = { desde: `${year}-01-01`, hasta: `${year + 1}-01-01` };
  const equipmentIds = useMemo(() => new Set(equipment.map((e) => e.id)), [equipment]);
  const clientId = building?.client_id;

  const { data: company } = useQuery({
    queryKey: ['company-doc', client?.company_id],
    queryFn: async () => {
      const res = await base44.entities.Company.filter({ company_id: client.company_id });
      return res[0] || null;
    },
    enabled: !!client?.company_id,
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['building-documents', building?.id],
    queryFn: () => base44.entities.BuildingDocument.filter({ building_id: building.id }, { sort: '-created_date', limit: 100 }),
    enabled: !!building?.id,
  });

  const { data: registrosFGas = [] } = useQuery({
    queryKey: ['building-fgas-year', clientId, year],
    queryFn: async () => {
      const res = await base44.entities.RegistroFGas.filter(
        { client_id: clientId, fecha_intervencion: { $gte: rango.desde, $lt: rango.hasta } },
        { sort: '-fecha_intervencion', limit: 500 },
      );
      return res.items.filter((r) => !r.equipment_id || equipmentIds.has(r.equipment_id));
    },
    enabled: !!clientId,
  });

  const { data: registrosLD = [] } = useQuery({
    queryKey: ['building-ld-year', clientId, year],
    queryFn: async () => {
      const res = await base44.entities.RegistroLD.filter(
        { client_id: clientId, fecha: { $gte: rango.desde, $lt: rango.hasta } },
        { sort: '-fecha', limit: 500 },
      );
      return res.items.filter((r) => !r.equipment_id || equipmentIds.has(r.equipment_id));
    },
    enabled: !!clientId,
  });

  const { data: registrosInstalador = [] } = useQuery({
    queryKey: ['building-instalador-year', clientId, year],
    queryFn: async () => {
      const res = await base44.entities.RegistroInstalador.filter(
        { client_id: clientId, fecha_intervencion: { $gte: rango.desde, $lt: rango.hasta } },
        { sort: '-fecha_intervencion', limit: 500 },
      );
      return res.items.filter((r) => !r.equipment_id || equipmentIds.has(r.equipment_id));
    },
    enabled: !!clientId,
  });

  const faltantes = useMemo(() => datosFGasFaltantes(equipment), [equipment]);
  const documentosAnio = documentos.filter((d) => Number(d.year) === Number(year));

  const construir = (tipo) => (tipo === 'libro_fgas'
    ? generarLibroFGasAnual({ building, client, company, equipment, registros: registrosFGas, year })
    : generarLibroMantenimientoAnual({
      building, client, company, equipment, revisions, ld: registrosLD, instalador: registrosInstalador, year,
    }));

  const descargar = (tipo) => {
    try {
      setGenerando(tipo);
      construir(tipo).save(nombreArchivoLibro(tipo, building, year));
      toast.success(`${tituloLibro(tipo, year)} generado`);
    } catch (e) {
      toast.error('No se pudo generar el documento');
    } finally {
      setGenerando(null);
    }
  };

  const guardar = async (tipo) => {
    try {
      setGuardando(tipo);
      const doc = construir(tipo);
      const nombre = nombreArchivoLibro(tipo, building, year);
      const blob = doc.output('blob');
      const file = new File([blob], nombre, { type: 'application/pdf' });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const me = await base44.auth.me().catch(() => null);
      const resumen = tipo === 'libro_fgas'
        ? `${equipment.filter((e) => e.refrigerant_type).length} equipos con gas · ${registrosFGas.length} intervenciones`
        : `${equipment.length} equipos · ${revisions.length} mantenimientos`;
      await base44.entities.BuildingDocument.create({
        building_id: building.id,
        client_id: building.client_id,
        company_id: client?.company_id || '',
        year,
        tipo,
        titulo: tituloLibro(tipo, year),
        file_uri,
        resumen,
        generated_by_name: me?.full_name || '',
      });
      queryClient.invalidateQueries({ queryKey: ['building-documents', building.id] });
      toast.success('Documento guardado en el edificio');
    } catch (e) {
      toast.error('No se pudo guardar el documento');
    } finally {
      setGuardando(null);
    }
  };

  const abrir = async (documento) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: documento.file_uri, expires_in: 600,
      });
      window.open(signed_url, '_blank');
    } catch (e) {
      toast.error('No se pudo abrir el documento');
    }
  };

  const eliminar = async (documento) => {
    try {
      await base44.entities.BuildingDocument.delete(documento.id);
      queryClient.invalidateQueries({ queryKey: ['building-documents', building.id] });
      toast.success('Documento eliminado');
    } catch (e) {
      toast.error('No se pudo eliminar el documento');
    }
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm mb-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentación anual
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Genera y guarda el libro de mantenimiento y el libro F-Gas de cada año.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Año</span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anios.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {faltantes.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Faltan datos F-Gas en {faltantes.length} equipo{faltantes.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700 mb-2">
                Complétalos antes de emitir el libro: sin estos datos el registro no refleja la instalación real.
              </p>
              <div className="flex flex-wrap gap-2">
                {faltantes.slice(0, 6).map(({ equipment: eq, faltan }) => (
                  <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                    <Badge variant="outline" className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100">
                      {eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || 'Equipo'} · falta {faltan.join(', ')}
                    </Badge>
                  </Link>
                ))}
                {faltantes.length > 6 && (
                  <span className="text-xs text-amber-700 self-center">y {faltantes.length - 6} más</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LIBROS.map((libro) => {
          const Icono = libro.icono;
          const guardado = documentosAnio.find((d) => d.tipo === libro.tipo);
          return (
            <div key={libro.tipo} className="p-4 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${libro.fondo}`}>
                  <Icono className={`h-5 w-5 ${libro.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{libro.titulo}</p>
                  <p className="text-xs text-slate-500">{libro.descripcion}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => descargar(libro.tipo)} disabled={generando === libro.tipo}>
                  {generando === libro.tipo
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Descargar
                </Button>
                <Button size="sm" onClick={() => guardar(libro.tipo)} disabled={guardando === libro.tipo}>
                  {guardando === libro.tipo
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Save className="h-4 w-4 mr-2" />}
                  Guardar en el edificio
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700 mb-2">Documentos guardados · {year}</p>
        {documentosAnio.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Todavía no hay documentos guardados de este año.</p>
        ) : (
          <div className="space-y-2">
            {documentosAnio.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{d.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {d.resumen}{d.generated_by_name ? ` · ${d.generated_by_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => abrir(d)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => eliminar(d)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}