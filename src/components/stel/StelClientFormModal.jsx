import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {
  name: '', tradeName: '', fiscalId: '', email: '', phone: '',
  address: '', city: '', postalCode: '', province: '', country: 'España', notes: '', web: '',
};

export default function StelClientFormModal({ client, onClose, onSaved }) {
  const isEditing = !!client?.id;
  const [form, setForm] = useState(isEditing ? { ...EMPTY, ...client } : EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      let result;
      if (isEditing) {
        result = await base44.functions.invoke('stelProxy', {
          action: 'updateClient',
          payload: { clientId: client.id, client: form },
        });
      } else {
        result = await base44.functions.invoke('stelProxy', {
          action: 'createClient',
          payload: { client: form },
        });
      }
      toast.success(isEditing ? 'Cliente actualizado en STEL Order' : 'Cliente creado en STEL Order');
      onSaved?.(result.data?.client);
      onClose();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            {isEditing ? 'Editar cliente en STEL Order' : 'Nuevo cliente en STEL Order'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2">
            <Label>Nombre / Razón Social *</Label>
            <Input className="mt-1" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Nombre Comercial</Label>
            <Input className="mt-1" value={form.tradeName} onChange={e => set('tradeName', e.target.value)} />
          </div>
          <div>
            <Label>CIF / NIF</Label>
            <Input className="mt-1" value={form.fiscalId} onChange={e => set('fiscalId', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input className="mt-1" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Dirección</Label>
            <Input className="mt-1" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input className="mt-1" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <Label>Código Postal</Label>
            <Input className="mt-1" value={form.postalCode} onChange={e => set('postalCode', e.target.value)} />
          </div>
          <div>
            <Label>Provincia</Label>
            <Input className="mt-1" value={form.province} onChange={e => set('province', e.target.value)} />
          </div>
          <div>
            <Label>País</Label>
            <Input className="mt-1" value={form.country} onChange={e => set('country', e.target.value)} />
          </div>
          <div>
            <Label>Web</Label>
            <Input className="mt-1" value={form.web} onChange={e => set('web', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Notas</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}