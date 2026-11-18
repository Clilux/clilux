import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_LABELS = {
  monthly: 'Mensual', quarterly: 'Trimestral',
  biannual: 'Semestral', annual: 'Anual', unified: 'Unificada',
};

const fechaCorta = (v) => String(v || '').slice(0, 10);

// Diálogo para editar una revisión programada: fecha, descripción y activar/desactivar.
// `isTechSession` + `sessionTechEmail` enrutan la actualización por el proxy de empresa.
export default function RevisionEditDialog({ revision, open, onOpenChange, onSaved }) {
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isTechSession = !!sessionTechEmail;

  const [form, setForm] = useState({ scheduled_date: '', notes: '', activa: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (revision) {
      setForm({
        scheduled_date: fechaCorta(revision.scheduled_date),
        notes: revision.notes || '',
        activa: revision.status !== 'cancelled',
      });
    }
  }, [revision]);

  if (!revision) return null;

  const handleSave = async () => {
    if (!form.scheduled_date) { toast.error('Introduce una fecha'); return; }
    setSaving(true);
    try {
      const updates = {
        scheduled_date: form.scheduled_date,
        notes: form.notes,
        status: form.activa ? 'pending' : 'cancelled',
      };
      if (isTechSession) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'revision_update',
          revision_id: revision.id,
          updates,
        });
      } else {
        await base44.entities.ScheduledRevision.update(revision.id, updates);
      }
      toast.success('Mantenimiento actualizado');
      onSaved?.();
      onOpenChange?.(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Error al actualizar el mantenimiento');
    } finally {
      setSaving(false);
    }
  };

  const tipo = TYPE_LABELS[revision.revision_type] || revision.revision_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar mantenimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{tipo}</span>
            {revision.equipment_name && <span> · {revision.equipment_name}</span>}
          </div>

          <div>
            <Label>Fecha programada *</Label>
            <Input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Descripción / Observaciones</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notas sobre este mantenimiento..."
              className="mt-1 min-h-[90px]"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Mantenimiento activo</p>
              <p className="text-xs text-slate-400">
                {form.activa ? 'Aparece en la agenda y revisiones pendientes' : 'Desactivado: no aparece como pendiente'}
              </p>
            </div>
            <Switch
              checked={form.activa}
              onCheckedChange={(v) => setForm((p) => ({ ...p, activa: v }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}