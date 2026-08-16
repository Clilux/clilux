import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const TIPOS = {
  vacaciones: 'Vacaciones',
  baja_medica: 'Baja médica',
  permiso: 'Permiso retribuido',
  asunto_propio: 'Asunto propio',
  maternidad_paternidad: 'Maternidad/Paternidad',
  otro: 'Otro',
};

export default function SolicitudAusenciaModal({ currentUser, techRecord, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tipo: 'vacaciones', fecha_inicio: '', fecha_fin: '', motivo: '' });

  const dias = form.fecha_inicio && form.fecha_fin
    ? differenceInCalendarDays(parseISO(form.fecha_fin), parseISO(form.fecha_inicio)) + 1
    : 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.fecha_inicio || !form.fecha_fin) throw new Error('Debes seleccionar fechas de inicio y fin');
      if (dias < 1) throw new Error('La fecha de fin debe ser posterior a la de inicio');
      const data = {
        technician_email: currentUser?.email || '',
        technician_name: techRecord?.name || currentUser?.full_name || currentUser?.email || '',
        technician_id: techRecord?.id || '',
        company_id: techRecord?.company_id || '',
        tipo: form.tipo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias_totales: dias,
        estado: 'pendiente',
      };
      if (form.motivo) data.motivo = form.motivo;
      return base44.entities.Ausencia.create(data);
    },
    onSuccess: () => {
      toast.success('Solicitud enviada, pendiente de aprobación');
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores-ausencias'] });
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Error al enviar la solicitud'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar ausencia / vacaciones</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Fecha inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Fecha fin</Label>
              <Input type="date" value={form.fecha_fin} min={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
            </div>
          </div>
          {dias > 0 && (
            <p className="text-sm font-semibold text-blue-600">{dias} día{dias !== 1 ? 's' : ''}</p>
          )}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Motivo (opcional)</Label>
            <Input value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Observaciones..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.fecha_inicio || !form.fecha_fin || dias < 1}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}