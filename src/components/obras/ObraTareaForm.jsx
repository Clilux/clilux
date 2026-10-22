import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { subirFotoObra } from '@/lib/obra-uploads';

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'realizada', label: 'Realizado' },
];

const nuevoMaterial = () => ({ descripcion: '', cantidad: 1, precio_unitario: 0 });

/** Alta y edición de un trabajo de obra (o de un trabajo extra de administración). */
export default function ObraTareaForm({ tarea, obraId, obraNombre, technicians = [], permitirExtra, mostrarImporte, isSessionTech, effectiveEmail, techName, onSave, onClose }) {
  const esExtra = (tarea?.tipo || 'trabajo') === 'extra';
  const [form, setForm] = useState({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    tipo: tarea?.tipo || 'trabajo',
    estado: tarea?.estado || 'pendiente',
    asignado_email: tarea?.asignado_email || '',
    fecha_prevista: (tarea?.fecha_prevista || '').slice(0, 10),
    horas: tarea?.horas ?? 0,
    precio_hora: tarea?.precio_hora ?? 0,
    materiales: tarea?.materiales?.length ? tarea.materiales : [nuevoMaterial()],
  });
  const [fotos, setFotos] = useState(tarea?.fotos || []);
  const [subiendo, setSubiendo] = useState(false);
  const [saving, setSaving] = useState(false);

  const materialesValidos = form.materiales.filter(m => m.descripcion?.trim());
  const totalMateriales = materialesValidos.reduce((s, m) => s + (Number(m.cantidad) || 0) * (Number(m.precio_unitario) || 0), 0);
  const importeExtra = (Number(form.horas) || 0) * (Number(form.precio_hora) || 0) + totalMateriales;

  const setMaterial = (idx, campo, valor) => {
    setForm(f => ({ ...f, materiales: f.materiales.map((m, i) => i === idx ? { ...m, [campo]: valor } : m) }));
  };

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
    if (!form.titulo.trim()) { toast.error('Indica el título del trabajo'); return; }
    setSaving(true);
    try {
      const asignado = technicians.find(t => t.email === form.asignado_email);
      const materiales = form.tipo === 'extra'
        ? materialesValidos.map(m => ({
            descripcion: m.descripcion.trim(),
            cantidad: Number(m.cantidad) || 0,
            precio_unitario: Number(m.precio_unitario) || 0,
            total: (Number(m.cantidad) || 0) * (Number(m.precio_unitario) || 0),
          }))
        : [];
      await onSave({
        obra_id: obraId,
        obra_nombre: obraNombre,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion,
        tipo: form.tipo,
        estado: form.estado,
        asignado_email: form.asignado_email || '',
        asignado_nombre: asignado?.name || '',
        fecha_prevista: form.fecha_prevista || '',
        horas: form.tipo === 'extra' ? (Number(form.horas) || 0) : 0,
        precio_hora: form.tipo === 'extra' ? (Number(form.precio_hora) || 0) : 0,
        materiales,
        importe_extra: form.tipo === 'extra' ? importeExtra : 0,
        fotos,
        creado_por: tarea?.creado_por || techName || '',
        creado_por_email: tarea?.creado_por_email || effectiveEmail || '',
      });
      toast.success(tarea ? 'Trabajo actualizado' : 'Trabajo añadido');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar el trabajo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarea ? 'Editar trabajo' : esExtra ? 'Nuevo trabajo extra' : 'Nuevo trabajo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {permitirExtra && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trabajo">Trabajo de la obra</SelectItem>
                    <SelectItem value="extra">Trabajo extra (por hora)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej. Llegada de equipos" className="mt-1" />
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalle del trabajo..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Asignado a</Label>
              <Select value={form.asignado_email || 'none'} onValueChange={v => setForm(f => ({ ...f, asignado_email: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {technicians.map(t => <SelectItem key={t.id || t.email} value={t.email}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha prevista</Label>
              <Input type="date" value={form.fecha_prevista} onChange={e => setForm(f => ({ ...f, fecha_prevista: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {form.tipo === 'extra' && (
            <div className="border border-purple-100 bg-purple-50/40 rounded-xl p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Horas</Label>
                  <Input type="number" min="0" step="0.25" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Precio por hora (€/h)</Label>
                  <Input type="number" min="0" step="0.01" value={form.precio_hora} onChange={e => setForm(f => ({ ...f, precio_hora: e.target.value }))} className="mt-1" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Materiales</Label>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600"
                    onClick={() => setForm(f => ({ ...f, materiales: [...f.materiales, nuevoMaterial()] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Añadir
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.materiales.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={m.descripcion} onChange={e => setMaterial(i, 'descripcion', e.target.value)} placeholder="Material" className="flex-1 text-sm" />
                      <Input type="number" min="0" step="0.5" value={m.cantidad} onChange={e => setMaterial(i, 'cantidad', e.target.value)} className="w-16 text-sm" />
                      <Input type="number" min="0" step="0.01" value={m.precio_unitario} onChange={e => setMaterial(i, 'precio_unitario', e.target.value)} className="w-20 text-sm" />
                      <button onClick={() => setForm(f => ({ ...f, materiales: f.materiales.filter((_, j) => j !== i) }))} className="text-red-300 hover:text-red-500 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {mostrarImporte && (
                <div className="flex justify-between text-sm pt-1 border-t border-purple-100">
                  <span className="text-slate-500">Importe del trabajo extra</span>
                  <span className="font-bold text-purple-700">{importeExtra.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Fotos ({fotos.length})</Label>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" onChange={addFoto} />
                <Button size="sm" variant="outline" asChild>
                  <span>{subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}Añadir foto</span>
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