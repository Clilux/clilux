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
import { History, MapPin, Plus, Trash2, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MapaRuta from '@/components/horario/MapaRuta';
import { calcularHoras, formatHoras, timeToMinutes } from '@/lib/horario-utils';

export default function EditarRegistroModal({ registro, currentUser, jornadaDiaria = 8, updateRegistro, onClose }) {
  const queryClient = useQueryClient();
  const [horaEntrada, setHoraEntrada] = useState(registro.hora_entrada || '');
  const [horaSalida, setHoraSalida] = useState(registro.hora_salida || '');
  const [tipoJornada, setTipoJornada] = useState(registro.tipo_jornada || 'normal');
  const [notas, setNotas] = useState(registro.notas || '');
  const [motivo, setMotivo] = useState('');
  const [showMapa, setShowMapa] = useState(false);
  const [pausas, setPausas] = useState(() =>
    (registro.pausas || []).map(p => ({ inicio: p.inicio || '', fin: p.fin || '', motivo: p.motivo || '' }))
  );

  // Pausas completas (con inicio y fin) que se guardarán
  const pausasValidas = pausas.filter(p => p.inicio && p.fin);
  const minutosPausaTotal = pausasValidas.reduce(
    (a, p) => a + Math.max(0, (Number(p.fin.slice(0, 2)) * 60 + Number(p.fin.slice(3, 5))) - (Number(p.inicio.slice(0, 2)) * 60 + Number(p.inicio.slice(3, 5)))),
    0
  );

  // Si las horas no cambian se respetan los tramos originales del registro,
  // para no perder las interrupciones al añadir pausas.
  const horasCambiadas = horaEntrada !== (registro.hora_entrada || '') || horaSalida !== (registro.hora_salida || '');
  const tramosRegistro = (registro.intervalos || []).length > 0
    ? registro.intervalos
    : [{ entrada: horaEntrada, salida: horaSalida }];
  const intervalosFinales = horasCambiadas
    ? [{ entrada: horaEntrada, salida: horaSalida }]
    : tramosRegistro;
  // Solo se descuentan las pausas que caen dentro de un tramo trabajado: las que
  // coinciden con un hueco entre tramos ya están excluidas de las horas.
  const pausasDescontables = pausasValidas.filter(p => {
    const ini = timeToMinutes(p.inicio);
    const fin = timeToMinutes(p.fin);
    return intervalosFinales.some(t => {
      if (!t.entrada) return false;
      const finTramo = t.salida ? timeToMinutes(t.salida) : 24 * 60;
      return ini >= timeToMinutes(t.entrada) && fin <= finTramo;
    });
  });
  const calcs = calcularHoras(
    { ...registro, hora_entrada: horaEntrada, hora_salida: horaSalida, intervalos: intervalosFinales, pausas: pausasDescontables },
    jornadaDiaria
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const cambios = [];
      const ahora = new Date().toISOString();
      const usuario = currentUser?.full_name || currentUser?.email || 'Desconocido';

      if (horaEntrada !== registro.hora_entrada) cambios.push({ campo: 'hora_entrada', valor_anterior: registro.hora_entrada || '', valor_nuevo: horaEntrada, fecha_mod: ahora, usuario, motivo });
      if (horaSalida !== registro.hora_salida) cambios.push({ campo: 'hora_salida', valor_anterior: registro.hora_salida || '', valor_nuevo: horaSalida, fecha_mod: ahora, usuario, motivo });
      if (tipoJornada !== registro.tipo_jornada) cambios.push({ campo: 'tipo_jornada', valor_anterior: registro.tipo_jornada || 'normal', valor_nuevo: tipoJornada, fecha_mod: ahora, usuario, motivo });
      if (notas !== registro.notas) cambios.push({ campo: 'notas', valor_anterior: registro.notas || '', valor_nuevo: notas, fecha_mod: ahora, usuario, motivo });

      const pausasPrevias = (registro.pausas || []).filter(p => p.inicio && p.fin);
      const pausasAntes = pausasPrevias.map(p => ({ inicio: p.inicio, fin: p.fin, motivo: p.motivo || '' }));
      if (JSON.stringify(pausasValidas) !== JSON.stringify(pausasAntes)) {
        cambios.push({
          campo: 'pausas',
          valor_anterior: `${pausasPrevias.length} pausa(s)`,
          valor_nuevo: `${pausasValidas.length} pausa(s)`,
          fecha_mod: ahora,
          usuario,
          motivo,
        });
      }

      if (cambios.length === 0) { toast.info('Sin cambios'); return null; }
      if (!motivo.trim()) throw new Error('Debes indicar el motivo de la modificación');

      const historialPrevio = registro.historial_modificaciones || [];
      const doUpdate = updateRegistro || ((id, data) => base44.entities.RegistroHorario.update(id, data));
      return doUpdate(registro.id, {
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        tipo_jornada: tipoJornada,
        notas,
        intervalos: intervalosFinales,
        pausas: pausasValidas,
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

          {horaEntrada && horaSalida && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50 rounded p-2"><span className="font-bold text-blue-600">{formatHoras(calcs.horas_normales)}</span><br />normales</div>
              <div className="bg-orange-50 rounded p-2"><span className="font-bold text-orange-500">{formatHoras(calcs.horas_extra)}</span><br />extra</div>
              <div className="bg-slate-50 rounded p-2"><span className="font-bold text-slate-600">{calcs.minutos_pausa}m</span><br />pausa</div>
            </div>
          )}

          {/* Pausas del registro guardado */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800">Pausas de la jornada</span>
                {minutosPausaTotal > 0 && (
                  <span className="text-[11px] text-amber-600">· {minutosPausaTotal} min</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-100 gap-1"
                onClick={() => setPausas(p => [...p, { inicio: '', fin: '', motivo: '' }])}
              >
                <Plus className="h-3.5 w-3.5" />Añadir pausa
              </Button>
            </div>

            {pausas.length === 0 ? (
              <p className="text-[11px] text-amber-700/70">Sin pausas registradas en esta jornada.</p>
            ) : (
              <div className="space-y-2">
                {pausas.map((p, i) => (
                  <div key={i} className="flex items-end gap-2 bg-white rounded-lg border border-amber-100 p-2">
                    <div className="w-20">
                      <Label className="text-[10px] text-slate-400 mb-0.5 block">Inicio</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs px-2"
                        value={p.inicio}
                        onChange={e => setPausas(prev => prev.map((x, j) => j === i ? { ...x, inicio: e.target.value } : x))}
                      />
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px] text-slate-400 mb-0.5 block">Fin</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs px-2"
                        value={p.fin}
                        onChange={e => setPausas(prev => prev.map((x, j) => j === i ? { ...x, fin: e.target.value } : x))}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-slate-400 mb-0.5 block">Motivo</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Desayuno, comida..."
                        value={p.motivo}
                        onChange={e => setPausas(prev => prev.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 text-slate-300 hover:text-red-500"
                      onClick={() => setPausas(prev => prev.filter((_, j) => j !== i))}
                      title="Quitar pausa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-amber-700/60 mt-2">
              Las pausas se descuentan de las horas efectivas del registro.
            </p>
          </div>

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