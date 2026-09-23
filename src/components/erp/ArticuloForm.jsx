import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { UNIDADES, euros, margenCompra, margenVenta, precioCompra, precioVenta } from '@/lib/erp-config';

const inicial = (a) => ({
  nombre: a?.nombre || '',
  codigo: a?.codigo || '',
  descripcion: a?.descripcion || '',
  familia_id: a?.familia_id || '',
  familia: a?.familia || '',
  unidad: a?.unidad || 'ud',
  pvp: a?.pvp ?? '',
  descuento_compra: a?.descuento_compra ?? 0,
  porcentaje_venta: a?.porcentaje_venta ?? 0,
});

/** Alta/edición de un artículo del catálogo. */
export default function ArticuloForm({ open, onClose, articulo, familias = [], onSave, onCreateFamilia }) {
  const [form, setForm] = useState(inicial(articulo));
  const [saving, setSaving] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [creandoFamilia, setCreandoFamilia] = useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(inicial(articulo));
      setNueva(false);
      setNuevaNombre('');
    }
  }, [open, articulo]);

  const set = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }));
  const familia = familias.find(f => f.id === form.familia_id);
  const calc = { pvp: form.pvp, descuento_compra: form.descuento_compra, porcentaje_venta: form.porcentaje_venta };
  const mc = margenCompra(calc);
  const mv = margenVenta(calc);

  const crearFamilia = async () => {
    if (!onCreateFamilia) return;
    setCreandoFamilia(true);
    try {
      const creada = await onCreateFamilia({ nombre: nuevaNombre.trim() });
      set('familia', creada?.nombre || nuevaNombre.trim());
      set('familia_id', creada?.id || '');
      setNueva(false);
      setNuevaNombre('');
    } catch (e) {
      toast.error(e.message || 'No se pudo crear la familia');
    } finally {
      setCreandoFamilia(false);
    }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await onSave({
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim(),
        descripcion: form.descripcion,
        familia_id: form.familia_id || '',
        familia: familia?.nombre || '',
        unidad: form.unidad,
        pvp: Number(form.pvp) || 0,
        descuento_compra: Number(form.descuento_compra) || 0,
        porcentaje_venta: Number(form.porcentaje_venta) || 0,
        precio_compra: precioCompra(calc),
        precio_venta: precioVenta(calc),
        activo: true,
      }, articulo?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">{articulo ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="mt-1" placeholder="Ej. Split conductos 1x1" />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.codigo} onChange={e => set('codigo', e.target.value)} className="mt-1" placeholder="REF-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Familia</Label>
                {onCreateFamilia && !nueva && (
                  <button type="button" onClick={() => setNueva(true)} className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-0.5">
                    <Plus className="h-3 w-3" />Nueva familia
                  </button>
                )}
              </div>
              {nueva ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={nuevaNombre}
                    onChange={e => setNuevaNombre(e.target.value)}
                    placeholder="Nombre de la nueva familia"
                    className="min-w-0"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={crearFamilia}
                    disabled={!nuevaNombre.trim() || creandoFamilia}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {creandoFamilia ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                  </Button>
                  <Button type="button" variant="ghost" className="shrink-0" onClick={() => { setNueva(false); setNuevaNombre(''); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select value={form.familia_id || 'sin'} onValueChange={v => set('familia_id', v === 'sin' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin familia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin">Sin familia</SelectItem>
                    {familias.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad} onValueChange={v => set('unidad', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none"
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Descripción del artículo..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>PVP (€) *</Label>
              <Input type="number" min="0" step="0.01" value={form.pvp} onChange={e => set('pvp', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Dto. compra (%)</Label>
              <Input type="number" min="0" step="0.5" value={form.descuento_compra} onChange={e => set('descuento_compra', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>% venta</Label>
              <Input type="number" min="0" step="0.5" value={form.porcentaje_venta} onChange={e => set('porcentaje_venta', e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:text-base">
            <span className="text-slate-500">Precio compra: <strong className="text-slate-800">{euros(precioCompra(calc))}</strong></span>
            <span className="text-slate-500">Precio venta: <strong className="text-indigo-700">{euros(precioVenta(calc))}</strong></span>
            <span className="text-slate-500">Margen compra: <strong className="text-slate-800">{mc.pct} %</strong> · {euros(mc.importe)}</span>
            <span className="text-slate-500">Margen venta: <strong className="text-emerald-700">{mv.pct} %</strong> · {euros(mv.importe)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre.trim() || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {articulo ? 'Guardar cambios' : 'Crear artículo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}