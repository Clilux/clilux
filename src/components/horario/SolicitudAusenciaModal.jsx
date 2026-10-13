import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { notificar } from '@/lib/buzon';
import { getSessionToken } from '@/lib/passwordHash';
import SelectorDias from '@/components/vacaciones/SelectorDias';
import { diasLaborablesDe, diasComprometidos, rangoDeDias, iso } from '@/lib/vacaciones-utils';

const TIPOS = {
  vacaciones: 'Vacaciones',
  baja_medica: 'Baja médica',
  permiso: 'Permiso retribuido',
  asunto_propio: 'Asunto propio',
  maternidad_paternidad: 'Maternidad/Paternidad',
  otro: 'Otro',
};

export default function SolicitudAusenciaModal({ currentUser, techRecord, ausencias = [], onClose }) {
  const queryClient = useQueryClient();
  // Los técnicos usan su propia sesión (sin sesión Base44): sus solicitudes se
  // crean a través del proxy, que sella la identidad del trabajador.
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const [form, setForm] = useState({ tipo: 'vacaciones', dias: [], motivo: '' });

  const diasLaborables = diasLaborablesDe(techRecord);
  const email = currentUser?.email || techRecord?.email || '';
  const diasOcupados = diasComprometidos(ausencias, email, diasLaborables);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.dias.length) throw new Error('Marca al menos un día');
      const rango = rangoDeDias(form.dias);
      const data = {
        technician_email: email,
        technician_name: techRecord?.name || currentUser?.full_name || email,
        technician_id: techRecord?.id || '',
        company_id: techRecord?.company_id || '',
        tipo: form.tipo,
        dias_solicitados: form.dias,
        ...rango,
        estado: 'pendiente',
      };
      if (form.motivo) data.motivo = form.motivo;
      if (sessionTechEmail) {
        // Vía directa y ligera: no depende del proxy de empresa (que puede tardar/saturarse)
        const res = await base44.functions.invoke('solicitarAusencia', {
          session_token: getSessionToken(),
          tipo: form.tipo,
          dias_solicitados: form.dias,
          motivo: form.motivo || undefined,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        return res?.data?.data;
      }
      return base44.entities.Ausencia.create(data);
    },
    onSuccess: () => {
      toast.success('Solicitud enviada, pendiente de aprobación');
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      queryClient.invalidateQueries({ queryKey: ['mis-vacaciones-proxy'] });
      queryClient.invalidateQueries({ queryKey: ['mis-vacaciones-direct'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores-ausencias'] });
      if (sessionTechEmail) { onClose(); return; } // la notificación al gerente ya la crea el servidor
      notificar('vacacion_solicitud', {
        company_id: techRecord?.company_id || '',
        worker_email: email,
        worker_name: techRecord?.name || currentUser?.full_name || '',
        tipo_aus: TIPOS[form.tipo] || 'vacaciones',
        fecha_inicio: rangoDeDias(form.dias).fecha_inicio,
        fecha_fin: rangoDeDias(form.dias).fecha_fin,
        dias: form.dias.length,
      });
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Error al enviar la solicitud'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
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

          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Marca los días que quieres disfrutar</Label>
            <SelectorDias
              value={form.dias}
              onChange={dias => setForm(p => ({ ...p, dias }))}
              diasLaborables={diasLaborables}
              diasOcupados={diasOcupados}
              minDate={iso(new Date())}
            />
          </div>

          {form.dias.length > 0 && (
            <p className="text-sm font-semibold text-blue-600">
              {form.dias.length} día{form.dias.length !== 1 ? 's' : ''} laborable{form.dias.length !== 1 ? 's' : ''} solicitado{form.dias.length !== 1 ? 's' : ''}
            </p>
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
            disabled={createMutation.isPending || form.dias.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}