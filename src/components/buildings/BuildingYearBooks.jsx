import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Leaf, Download, Loader2, Save, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useBuildingYearRecords } from '@/hooks/useBuildingYearRecords';
import {
  generarLibroMantenimientoAnual, generarLibroFGasAnual, datosFGasFaltantes,
  nombreArchivoLibro, tituloLibro, llevaFGas,
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

export default function BuildingYearBooks({
  building, client, company, equipment = [], revisions = [], documentos = [],
  guardarDocumento, abrir, eliminar,
}) {
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

  const equipmentIds = useMemo(() => new Set(equipment.map((e) => e.id)), [equipment]);
  const { fgas: registrosFGas, ld: registrosLD, instalador: registrosInstalador } = useBuildingYearRecords({
    buildingId: building?.id,
    clientId: building?.client_id,
    year,
    equipmentIds,
  });

  const faltantes = useMemo(() => datosFGasFaltantes(equipment), [equipment]);
  const librosAnio = documentos.filter(
    (d) => Number(d.year) === Number(year) && (d.tipo === 'libro_mantenimiento' || d.tipo === 'libro_fgas'),
  );

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
      const blob = construir(tipo).output('blob');
      const file = new File([blob], nombreArchivoLibro(tipo, building, year), { type: 'application/pdf' });
      await guardarDocumento(file, {
        client_id: building.client_id,
        company_id: client?.company_id || '',
        year,
        tipo,
        titulo: tituloLibro(tipo, year),
        resumen: tipo === 'libro_fgas'
          ? `${equipment.filter(llevaFGas).length} equipos con gas · ${registrosFGas.length} intervenciones`
          : `${equipment.length} equipos · ${revisions.length} mantenimientos`,
      });
      toast.success('Documento guardado en el edificio');
    } catch (e) {
      toast.error('No se pudo guardar el documento');
    } finally {
      setGuardando(null);
    }
  };

  const abrirDoc = async (d) => {
    try {
      await abrir(d);
    } catch (e) {
      toast.error('No se pudo abrir el documento');
    }
  };

  const borrar = async (d) => {
    try {
      await eliminar(d);
      toast.success('Documento eliminado');
    } catch (e) {
      toast.error('No se pudo eliminar el documento');
    }
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="font-medium text-slate-800">Libros anuales</p>
          <p className="text-sm text-slate-500">
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
        <p className="text-sm font-medium text-slate-700 mb-2">Libros guardados · {year}</p>
        {librosAnio.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Todavía no hay libros guardados de este año.</p>
        ) : (
          <div className="space-y-2">
            {librosAnio.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{d.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {d.resumen}{d.generated_by_name ? ` · ${d.generated_by_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => abrirDoc(d)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => borrar(d)}>
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