import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { subirFotoObra } from '@/lib/obra-uploads';

/** Alta y edición de una observación o incidencia de obra, con fotos. */
export default function ObraObservacionForm({ observacion, obraId, obraNombre, isSessionTech, effectiveEmail, techName, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo: observacion?.tipo || 'observacion',
    titulo: observacion?.titulo || '',
    descripcion: observacion?.descripcion || '',
    gravedad: observacion?.gravedad || 'media',
    fecha: (observacion?.fecha || format(new Date(), 'yyyy-MM-dd')).slice(0, 10),
  });
  const [fotos, setFotos] = useState(observacion?.fotos || []);
  const [subiendo, setSubiendo] = useState(false);
  const [saving, setSaving] = useState(false);

  const addFoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSubiendo(true);
    try {
      for (const file of files) {
        const url = await subirFotoObra(file, { isSessionTech, effectiveEmail });
        setFotos(prev => [...prev, url]);
      }
      toast.success('Foto añadida');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.error('Indica un título'); return; }
    setSaving(true);
    try {
      await onSave({
        obra_id: obraId,
        obra_nombre: obraNombre,
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion,
        gravedad: form.tipo === 'incidencia' ? form.gravedad : 'media',
        fecha: form.fecha,
        fotos,
        registrado_por: observacion?.registrado_por || techName || '',
        registrado_por_email: observacion?.registrado_por_email || effectiveEmail || '',
      });
      toast.success(observacion ? 'Registro actualizado' : 'Registro añadido');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{observacion ? 'Editar registro' : 'Nueva observación o incidencia'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="observacion">Observación</SelectItem>
                  <SelectItem value="incidencia">Incidencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {form.tipo === 'incidencia' && (
            <div>
              <Label>Gravedad</Label>
              <Select value={form.gravedad} onValueChange={v => setForm(f => ({ ...f, gravedad: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej. Falta de material en obra" className="mt-1" />
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalle de lo observado o del problema..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Fotos ({fotos.length})</Label>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={addFoto} />
                <Button size="sm" variant="outline" asChild>
                  <span>{subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}Adjuntar foto</span>
                </Button>
              </label>
            </div>
            {fotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {fotos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 group">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}