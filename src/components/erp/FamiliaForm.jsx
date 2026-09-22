import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

/** Alta/edición de una familia del catálogo. */
export default function FamiliaForm({ open, onClose, familia, onSave }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm({ nombre: familia?.nombre || '', descripcion: familia?.descripcion || '' });
  }, [open, familia]);

  const guardar = async () => {
    setSaving(true);
    try {
      await onSave({ nombre: form.nombre.trim(), descripcion: form.descripcion }, familia?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{familia ? 'Editar familia' : 'Nueva familia'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="mt-1" placeholder="Ej. Climatización" />
          </div>
          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none"
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre.trim() || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {familia ? 'Guardar cambios' : 'Crear familia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}