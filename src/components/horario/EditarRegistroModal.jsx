import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { History, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MapaRuta from '@/components/horario/MapaRuta';
import { calcularHoras, formatHoras } from '@/lib/horario-utils';

export default function EditarRegistroModal({ registro, currentUser, jornadaDiaria = 8, onClose }) {
  const queryClient = useQueryClient();
  const [horaEntrada, setHoraEntrada] = useState(registro.hora_entrada || '');
  const [horaSalida, setHoraSalida] = useState(registro.hora_salida || '');
  const [tipoJornada, setTipoJornada] = useState(registro.tipo_jornada || 'normal');
  const [notas, setNotas] = useState(registro.notas || '');
  const [motivo, setMotivo] = useState('');
  const [showMapa, setShowMapa] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const cambios = [];
      const ahora = new Date().toISOString();
      const usuario = currentUser?.full_name || currentUser?.email || 'Desconocido';

      if (horaEntrada !== registro.hora_entrada) cambios.push({ campo: 'hora_entrada', valor_anterior: registro.hora_entrada || '', valor_nuevo: horaEntrada, fecha_mod: ahora, usuario, motivo });
      if (horaSalida !== registro.hora_salida) cambios.push({ campo: 'hora_salida', valor_anterior: registro.hora_salida || '', valor_nuevo: horaSalida, fecha_mod: ahora, usuario, motivo });
      if (tipoJornada !== registro.tipo_jornada) cambios.push({ campo: 'tipo_jornada', valor_anterior: registro.tipo_jornada || 'normal', valor_nuevo: tipoJornada, fecha_mod: ahora, usuario, motivo });
      if (notas !== registro.notas) cambios.push({ campo: 'notas', valor_anterior: registro.notas || '', valor_nuevo: notas, fecha_mod: ahora, usuario, motivo });

      if (cambios.length === 0) { toast.info('Sin cambios'); return null; }
      if (!motivo.trim()) throw new Error('Debes indicar el motivo de la modificación');

      // Al editar manualmente la hora de entrada/salida, consolidamos en un único tramo
      // para que el cálculo sea exactamente entrada→salida sin tramos intermedios desfasados
      const intervalosActualizados = [{ entrada: horaEntrada, salida: horaSalida }];

      const calcs = calcularHoras(
        { ...registro, hora_entrada: horaEntrada, hora_salida: horaSalida, intervalos: intervalosActualizados },
        jornadaDiaria
      );
      const historialPrevio = registro.historial_modificaciones || [];
      return base44.entities.RegistroHorario.update(registro.id, {
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        tipo_jornada: tipoJornada,
        notas,
        intervalos: intervalosActualizados,
        ...calcs,
        historial_modificaciones: [...historialPrevio, ...cambios],
      });
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.invalidateQueries({ queryKey: ['registros-horario'] });
      queryClient.invalidateQueries({ queryKey: ['admin-registros'] });
      toast.success('Registro actualizado');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const tieneGeo = registro.geopoints?.length > 0 || registro.ubicacion_entrada || registro.ubicacion_salida;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar registro —{' '}
            {registro.fecha ? format(new Date(registro.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es }) : registro.fecha}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            <span className="font-medium">{registro.technician_name || registro.technician_email}</span>
            {registro.horas_normales > 0 && (
              <span className="ml-3 text-blue-600">{registro.horas_normales}h normales</span>
            )}
            {registro.horas_extra > 0 && (
              <span className="ml-2 text-orange-500">+ {registro.horas_extra}h extra</span>
            )}
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

          {horaEntrada && horaSalida && (() => {
            const c = calcularHoras({ ...registro, hora_entrada: horaEntrada, hora_salida: horaSalida, intervalos: [{ entrada: horaEntrada, salida: horaSalida }] }, jornadaDiaria);
            return (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-blue-50 rounded p-2"><span className="font-bold text-blue-600">{formatHoras(c.horas_normales)}</span><br />normales</div>
                <div className="bg-orange-50 rounded p-2"><span className="font-bold text-orange-500">{formatHoras(c.horas_extra)}</span><br />extra</div>
                <div className="bg-slate-50 rounded p-2"><span className="font-bold text-slate-600">{c.minutos_pausa}m</span><br />pausa</div>
              </div>
            );
          })()}

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
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>

          <div>
            <Label className="text-xs font-semibold text-amber-600 mb-1 block">Motivo de modificación *</Label>
            <Input
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Error al fichar, corrección horaria..."
              className="border-amber-200 focus:border-amber-400"
            />
          </div>

          {tieneGeo && (
            <div>
              <Button variant="outline" size="sm" className="w-full gap-2 mb-2" onClick={() => setShowMapa(v => !v)}>
                <MapPin className="h-4 w-4" />{showMapa ? 'Ocultar mapa' : 'Ver ruta GPS'}
              </Button>
              {showMapa && <MapaRuta registro={registro} />}
            </div>
          )}

          {registro.historial_modificaciones?.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Historial de cambios</span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {registro.historial_modificaciones.map((h, i) => (
                  <div key={i} className="text-xs bg-slate-50 rounded p-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 capitalize">{h.campo}</Badge>
                      <span className="text-slate-400">{h.fecha_mod ? format(new Date(h.fecha_mod), 'dd/MM HH:mm') : ''}</span>
                      <span className="text-slate-500 ml-auto">{h.usuario}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="line-through text-red-400">{h.valor_anterior || '—'}</span>
                      <span>→</span>
                      <span className="text-emerald-600 font-medium">{h.valor_nuevo || '—'}</span>
                    </div>
                    {h.motivo && <p className="text-slate-400 italic mt-0.5">"{h.motivo}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}