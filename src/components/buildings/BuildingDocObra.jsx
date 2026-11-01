import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HardHat, Eye, Trash2, Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useBuildingDocuments } from '@/hooks/useBuildingDocuments';

/**
 * Documentación durante la obra: archivos generados o aportados mientras el
 * edificio está en fase de obra (informe de obra, certificados, planos
 * de ejecución, fotos de avance...). Se conserva como histórico una vez la
 * obra se traspasa a mantenimiento.
 */
export default function BuildingDocObra({ building, client }) {
  const { documentos, guardarDocumento, abrir, eliminar } = useBuildingDocuments(building?.id, client);
  const [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const docs = documentos.filter((d) => d.tipo === 'documentacion_obra');

  const subir = async () => {
    if (!titulo.trim() || !archivo) {
      toast.error('Indica un título y selecciona un archivo');
      return;
    }
    try {
      setSubiendo(true);
      await guardarDocumento(archivo, {
        tipo: 'documentacion_obra',
        titulo: titulo.trim(),
        client_id: building.client_id,
        company_id: client?.company_id || '',
      });
      setTitulo('');
      setArchivo(null);
      toast.success('Documento añadado a la obra');
    } catch (e) {
      toast.error('No se pudo subir el documento');
    } finally {
      setSubiendo(false);
    }
  };

  const abrirDoc = async (d) => {
    try { await abrir(d); } catch { toast.error('No se pudo abrir el documento'); }
  };
  const borrar = async (d) => {
    try { await eliminar(d); toast.success('Documento eliminado'); } catch { toast.error('No se pudo eliminar'); }
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-lg bg-amber-100">
          <HardHat className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-slate-800">Documentación durante la obra</p>
          <p className="text-sm text-slate-500">
            Informe de obra, certificados, planos de ejecución y archivos aportados durante la obra. Se conserva como histórico al pasar a mantenimiento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-4">
        <Input
          className="md:col-span-2"
          placeholder="Título del documento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <div className="md:col-span-2 flex items-center gap-2">
          <label className="flex-1 min-w-0 cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            />
            <span className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-slate-600">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">{archivo?.name || 'Elegir archivo'}</span>
            </span>
          </label>
          <Button onClick={subir} disabled={subiendo}>
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Añadir'}
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Todavía no hay documentación de la obra.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{d.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {d.nombre_original || ''}
                    {d.generated_by_name ? ` · ${d.generated_by_name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="hidden sm:inline-flex bg-white text-amber-700 border-amber-200">Obra</Badge>
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
    </Card>
  );
}