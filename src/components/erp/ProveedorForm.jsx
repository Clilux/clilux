import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

const VACIO = {
  nombre: '', cif: '', contacto: '', email: '', telefono: '',
  direccion: '', ciudad: '', postal_code: '', provincia: '',
  web: '', iban: '', notas: '', status: 'active',
};

/** Alta y edición de proveedores del ERP. */
export default function ProveedorForm({ open, onClose, proveedor, onSave }) {
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(proveedor ? { ...VACIO, ...proveedor } : VACIO);
  }, [open, proveedor]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    setSaving(true);
    try {
      const limpio = { ...form };
      delete limpio.id;
      delete limpio.created_date;
      delete limpio.updated_date;
      delete limpio.created_by_id;
      await onSave(limpio, proveedor?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <Label>Nombre / razón social *</Label>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="mt-1" placeholder="Suministros S.L." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CIF / NIF</Label>
              <Input value={form.cif || ''} onChange={e => set('cif', e.target.value.toUpperCase())} className="mt-1" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Persona de contacto</Label>
              <Input value={form.contacto || ''} onChange={e => set('contacto', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Email de pedidos</Label>
            <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Ciudad</Label>
              <Input value={form.ciudad || ''} onChange={e => set('ciudad', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>C. Postal</Label>
              <Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Provincia</Label>
              <Input value={form.provincia || ''} onChange={e => set('provincia', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Web</Label>
              <Input value={form.web || ''} onChange={e => set('web', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={form.iban || ''} onChange={e => set('iban', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none"
              value={form.notas || ''}
              onChange={e => set('notas', e.target.value)}
              placeholder="Condiciones, plazos de entrega..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre?.trim() || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {proveedor ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}