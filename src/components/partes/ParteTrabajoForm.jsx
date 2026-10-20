import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePartesTrabajo } from '@/hooks/usePartesTrabajo';

export default function ParteTrabajoForm({ onClose, parte = null, registroHorario = null }) {
  const {
    clients, obras, technicians, techRecord, isAdmin, veTodo, hideRates,
    effEmail, effName, saveParte,
  } = usePartesTrabajo({ withPartes: false });

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    target_email: parte?.technician_email || effEmail || '',
    fecha: (parte?.fecha || registroHorario?.fecha || format(new Date(), 'yyyy-MM-dd')).slice(0, 10),
    horas: parte?.horas ?? registroHorario?.horas_efectivas ?? registroHorario?.horas_normales ?? '',
    client_id: parte?.client_id || '',
    obra_id: parte?.obra_id || '',
    descripcion: parte?.descripcion || '',
    notas: parte?.notas || '',
  });

  const horasNum = parseFloat(form.horas) || 0;
  const destTech = technicians.find(t => t.email === form.target_email || t.user_email === form.target_email)
    || (form.target_email === effEmail ? techRecord : null);
  const costeHora = Number(destTech?.coste_hora) || 0;
  const costeTotal = Math.round(horasNum * costeHora * 100) / 100;
  const clienteSel = clients.find(c => c.id === form.client_id);
  const obraSel = obras.find(o => o.id === form.obra_id);
  const obrasCliente = form.client_id
    ? obras.filter(o => !o.client_id || o.client_id === form.client_id)
    : obras;

  const handleSave = async () => {
    if (!form.client_id) { toast.error('Selecciona el cliente'); return; }
    if (horasNum <= 0) { toast.error('Indica las horas trabajadas'); return; }
    setSaving(true);
    try {
      await saveParte({
        fecha: form.fecha,
        horas: horasNum,
        client_id: form.client_id,
        client_name: clienteSel?.name || '',
        obra_id: form.obra_id || '',
        obra_nombre: obraSel?.nombre || '',
        descripcion: form.descripcion,
        notas: form.notas,
        registro_horario_id: registroHorario?.id || parte?.registro_horario_id || '',
      }, { id: parte?.id, targetEmail: form.target_email });
      toast.success(parte ? 'Parte actualizado' : 'Parte registrado');
      onClose();
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar el parte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{parte ? 'Editar parte de trabajo' : 'Nuevo parte de trabajo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {veTodo && (
            <div>
              <Label>Trabajador</Label>
              <Select value={form.target_email} onValueChange={v => setForm(f => ({ ...f, target_email: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar trabajador..." /></SelectTrigger>
                <SelectContent>
                  {(technicians.length > 0 ? technicians : [{ id: 'me', name: effName || effEmail, email: effEmail }]).map(t => (
                    <SelectItem key={t.id} value={t.email || t.user_email}>{t.name || t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Horas *</Label>
              <Input type="number" step="0.25" min="0" value={form.horas}
                onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} className="mt-1" placeholder="Ej: 4.5" />
            </div>
          </div>

          <div>
            <Label>Cliente *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v, obra_id: '' }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Obra (opcional)</Label>
            <Select value={form.obra_id || 'none'} onValueChange={v => setForm(f => ({ ...f, obra_id: v === 'none' ? '' : v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sin obra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin obra</SelectItem>
                {obrasCliente.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">Si indicas la obra, el coste de estas horas se suma a los gastos de la obra.</p>
          </div>

          <div>
            <Label>Trabajos realizados</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Describe brevemente los trabajos..." />
          </div>

          <div>
            <Label>Notas</Label>
            <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" className="mt-1" />
          </div>

          {!hideRates && (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Coste de mano de obra
                {costeHora > 0 && <> · {horasNum || 0} h × {costeHora.toLocaleString('es-ES')} €/h</>}
              </span>
              <span className="font-bold text-slate-800">
                {costeTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {!hideRates && costeHora === 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Este trabajador no tiene coste/hora asignado, así que el parte no sumará gasto a la obra. El gerente puede asignarlo en Empresa → Trabajadores.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {parte ? 'Guardar cambios' : 'Registrar parte'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}