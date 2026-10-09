import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map, KeyRound, ShieldCheck, FileText, Eye, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS = [
  { value: 'plano', label: 'Plano', icon: Map },
  { value: 'documento_acceso', label: 'Documentación de acceso', icon: KeyRound },
  { value: 'seguro', label: 'Seguro', icon: ShieldCheck },
  { value: 'otro', label: 'Otro', icon: FileText },
];

const configTipo = (tipo) => TIPOS.find((t) => t.value === tipo) || TIPOS[3];

export default function BuildingDocsPanel({ building, client, documentos = [], guardarDocumento, abrir, eliminar }) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('plano');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const archivos = documentos.filter((d) => d.tipo !== 'libro_mantenimiento' && d.tipo !== 'libro_fgas');

  const subir = async () => {
    if (!titulo.trim() || !archivo) {
      toast.error('Indica un título y selecciona un archivo');
      return;
    }
    try {
      setSubiendo(true);
      await guardarDocumento(archivo, {
        tipo,
        titulo: titulo.trim(),
        client_id: building.client_id,
        company_id: client?.company_id || '',
      });
      setTitulo('');
      setArchivo(null);
      toast.success('Documento añadido al edificio');
    } catch (e) {
      toast.error('No se pudo subir el documento');
    } finally {
      setSubiendo(false);
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
      <p className="font-medium text-slate-800">Archivos y documentos</p>
      <p className="text-sm text-slate-500 mb-4">
        Planos, documentación de acceso, seguros y cualquier archivo relevante de la instalación.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Input
          className="md:col-span-2"
          placeholder="Título del documento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
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

      {archivos.length === 0 ? (
        <p className="text-sm text-slate-400 py-3">Todavía no hay documentos aportados.</p>
      ) : (
        <div className="space-y-2">
          {archivos.map((d) => {
            const cfg = configTipo(d.tipo);
            const Icono = cfg.icon;
            return (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Icono className="h-4 w-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{d.titulo}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {d.nombre_original || ''}
                      {d.generated_by_name ? ` · ${d.generated_by_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="hidden sm:inline-flex bg-white">{cfg.label}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => abrirDoc(d)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => borrar(d)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}