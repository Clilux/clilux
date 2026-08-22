import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { CalendarClock, Loader2, AlertTriangle } from 'lucide-react';
import { calcularHoras, formatHoras } from '@/lib/horario-utils';
import { base44 } from '@/api/base44Client';

export default function JornadaAtrasadaModal({ technicians, myTechRecord, isSessionTech, effectiveEmail, selfReport, onClose }) {
  const queryClient = useQueryClient();
  const companyTechs = technicians.filter(t => !myTechRecord?.company_id || t.company_id === myTechRecord.company_id);
  const selfEmail = selfReport ? (myTechRecord?.email || myTechRecord?.user_email || effectiveEmail || '') : '';
  const [targetEmail, setTargetEmail] = useState(selfReport ? selfEmail : (companyTechs[0]?.email || companyTechs[0]?.user_email || ''));
  const [fecha, setFecha] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('08:00');
  const [horaSalida, setHoraSalida] = useState('17:00');
  const [tipoJornada, setTipoJornada] = useState('normal');
  const [notas, setNotas] = useState('');
  const [motivo, setMotivo] = useState('');

  const targetTech = companyTechs.find(t => (t.email || t.user_email) === targetEmail);
  const jornadaDiaria = targetTech?.horas_jornada_diaria || 8;

  const calcs = useMemo(() => {
    if (!horaEntrada || !horaSalida) return null;
    return calcularHoras(
      { hora_entrada: horaEntrada, hora_salida: horaSalida, intervalos: [{ entrada: horaEntrada, salida: horaSalida }] },
      jornadaDiaria
    );
  }, [horaEntrada, horaSalida, jornadaDiaria]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!targetEmail) throw new Error('Selecciona un trabajador');
      if (!fecha) throw new Error('La fecha es obligatoria');
      if (!horaEntrada) throw new Error('La hora de entrada es obligatoria');
      if (!motivo.trim()) throw new Error('El motivo es obligatorio (trazabilidad legal)');
      const record = {
        fecha,
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        tipo_jornada: tipoJornada,
        notas,
        ...(calcs || {}),
      };
      if (isSessionTech) {
        if (selfReport) {
          return base44.functions.invoke('getCompanyData', {
            technician_email: effectiveEmail,
            entity: 'registro_horario_self_create',
            record,
            motivo,
          });
        }
        return base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail,
          entity: 'registro_horario_admin_create',
          target_email: targetEmail,
          record,
          motivo,
        });
      }
      // Plataforma admin (sin sesión técnica) — alta directa
      const target = technicians.find(t => (t.email || t.user_email) === targetEmail);
      const historialEntry = {
        fecha_mod: new Date().toISOString(),
        usuario: selfReport ? (myTechRecord?.name || 'Trabajador') : 'Administrador',
        campo: 'registro_atrasado',
        valor_anterior: '',
        valor_nuevo: fecha,
        motivo,
      };
      return base44.entities.RegistroHorario.create({
        technician_email: targetEmail,
        technician_name: target?.name || targetEmail,
        technician_id: target?.id || '',
        company_id: target?.company_id || '',
        fecha,
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        tipo_jornada: tipoJornada,
        notas,
        pausas: [],
        intervalos: [{ entrada: horaEntrada, salida: horaSalida }],
        historial_modificaciones: [historialEntry],
        finalizada: !!horaSalida,
        ...(calcs || {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registros'] });
      queryClient.invalidateQueries({ queryKey: ['gestion-fichajes'] });
      queryClient.invalidateQueries({ queryKey: ['registros-horario'] });
      toast.success('Jornada registrada');
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Error al registrar la jornada'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            Añadir jornada atrasada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Registra una jornada que el trabajador olvidó fichar. Quedará trazado en el historial del registro
              (Art. 34 ET / RD-ley 8/2019). Si el olvido es reiterado, considera amonestar desde el panel de fichajes tardíos.
            </p>
          </div>

          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Trabajador</Label>
            {selfReport ? (
              <div className="flex items-center gap-2 bg-slate-50 border rounded-md px-3 py-2 text-sm text-slate-600">
                <span className="font-medium">{myTechRecord?.name || targetEmail}</span>
                <Badge variant="secondary" className="ml-auto text-xs">Tú mismo</Badge>
              </div>
            ) : (
              <Select value={targetEmail} onValueChange={setTargetEmail}>
                <SelectTrigger><SelectValue placeholder="Selecciona trabajador" /></SelectTrigger>
                <SelectContent>
                  {companyTechs.map(t => (
                    <SelectItem key={t.id} value={t.email || t.user_email}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Fecha de la jornada</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Hora entrada</Label>
              <Input type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Hora salida</Label>
              <Input type="time" value={horaSalida} onChange={e => setHoraSalida(e.target.value)} />
            </div>
          </div>

          {calcs && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50 rounded p-2"><span className="font-bold text-blue-600">{formatHoras(calcs.horas_normales)}</span><br />normales</div>
              <div className="bg-orange-50 rounded p-2"><span className="font-bold text-orange-500">{formatHoras(calcs.horas_extra)}</span><br />extra</div>
              <div className="bg-slate-50 rounded p-2"><span className="font-bold text-slate-600">{calcs.minutos_pausa}m</span><br />pausa</div>
            </div>
          )}

          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Tipo de jornada</Label>
            <Select value={tipoJornada} onValueChange={setTipoJornada}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="extra">Extra</SelectItem>
                <SelectItem value="guardia">Guardia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Notas</Label>
            <Textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>

          <div>
            <Label className="text-xs font-semibold text-amber-600 mb-1 block">Motivo de la modificación *</Label>
            <Input
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Olvidó fichar, corrección por administrador..."
              className="border-amber-200 focus:border-amber-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">Obligatorio para la trazabilidad ante Inspección de Trabajo.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
            Registrar jornada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}