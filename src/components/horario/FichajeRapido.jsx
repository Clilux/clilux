import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Clock, Calendar, ChevronRight, MapPin, Loader2, Coffee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { calcularHoras, getGeoLocation } from '@/lib/horario-utils';
import ConfirmarHoraFichaje from '@/components/horario/ConfirmarHoraFichaje';

export default function FichajeRapido({ currentUser, techRecord }) {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [geoLoading, setGeoLoading] = useState(false);
  const [confirmHora, setConfirmHora] = useState(null);
  const jornadaDiaria = techRecord?.horas_jornada_diaria || 8;

  const isSessionTech = !!sessionStorage.getItem('technician_email');

  const { data: todayRecord, isLoading: loadingFichaje } = useQuery({
    queryKey: ['fichaje-hoy', currentUser?.email, todayStr],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: currentUser.email,
          entity: 'registro_horario_get',
          fecha: todayStr,
        });
        return res.data?.data || null;
      }
      const results = await base44.entities.RegistroHorario.filter({ technician_email: currentUser.email, fecha: todayStr });
      return results[0] || null;
    },
    enabled: !!currentUser?.email,
    refetchInterval: 60000,
  });

  const { data: ausenciasPendientes = [] } = useQuery({
    queryKey: ['ausencias-pendientes', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      if (isSessionTech) {
        try {
          const res = await base44.functions.invoke('getCompanyData', {
            technician_email: currentUser.email,
            entity: 'ausencias_pendientes',
          });
          return res.data?.data || [];
        } catch {
          return [];
        }
      }
      return base44.entities.Ausencia.filter({ technician_email: currentUser.email, estado: 'pendiente' });
    },
    enabled: !!currentUser?.email,
  });

  // Helper para actualizar/crear registro
  const updateRegistro = (id, updates) => {
    if (isSessionTech) {
      return base44.functions.invoke('getCompanyData', {
        technician_email: currentUser.email, entity: 'registro_horario_update', record_id: id, updates,
      });
    }
    return base44.entities.RegistroHorario.update(id, updates);
  };
  const createRegistro = (record) => {
    if (isSessionTech) {
      return base44.functions.invoke('getCompanyData', {
        technician_email: currentUser.email, entity: 'registro_horario_create', record,
      });
    }
    return base44.entities.RegistroHorario.create(record);
  };

  // Estado de jornada basado en intervalos
  const intervalos = todayRecord?.intervalos || [];
  const ultimoIntervalo = intervalos[intervalos.length - 1];
  const jornadaActiva = !!ultimoIntervalo && !ultimoIntervalo.salida;
  const jornadaFinalizada = !!(todayRecord?.finalizada);
  const jornadaPausada = intervalos.length > 0 && !!ultimoIntervalo?.salida && !jornadaFinalizada;
  const jornadaNoIniciada = !todayRecord || intervalos.length === 0;

  // INICIO / REANUDACIÓN (con hora confirmada y ajustable)
  const inicioJornada = useMutation({
    mutationFn: async (opts = {}) => {
      const horaActual = opts.horaActual || format(new Date(), 'HH:mm');
      const hora = opts.hora || horaActual;
      const motivo = opts.motivo;
      setGeoLoading(true);
      const geo = await getGeoLocation().catch(() => null);
      setGeoLoading(false);
      const nuevoIntervalo = { entrada: hora, salida: null };
      const geopoints = geo ? [{ lat: geo.lat, lng: geo.lng, hora, tipo: 'entrada' }] : [];
      const historialEntry = motivo ? [{
        fecha_mod: new Date().toISOString(),
        usuario: currentUser.email,
        campo: 'entrada',
        valor_anterior: horaActual,
        valor_nuevo: hora,
        motivo,
      }] : [];
      if (todayRecord) {
        const historial = [...(todayRecord.historial_modificaciones || []), ...historialEntry];
        return updateRegistro(todayRecord.id, {
          intervalos: [...intervalos, nuevoIntervalo],
          hora_salida: null, finalizada: false, historial_modificaciones: historial,
          ...(geo && { geopoints: [...(todayRecord.geopoints || []), ...geopoints] }),
        });
      }
      return createRegistro({
        technician_email: currentUser.email,
        technician_name: techRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: techRecord?.id || '',
        company_id: techRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: hora,
        tipo_jornada: 'normal',
        pausas: [],
        intervalos: [nuevoIntervalo],
        historial_modificaciones: historialEntry,
        ...(geo && { ubicacion_entrada: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] }); toast.success('Jornada iniciada'); },
    onError: () => { setGeoLoading(false); toast.error('Error al iniciar jornada'); },
  });

  // PAUSA: cierra el intervalo activo
  const pausaJornada = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const now = format(new Date(), 'HH:mm');
      const updatedIntervalos = intervalos.map((t, i) =>
        i === intervalos.length - 1 && !t.salida ? { ...t, salida: now } : t
      );
      return updateRegistro(todayRecord.id, { intervalos: updatedIntervalos, hora_salida: now });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] }); toast.success('Jornada pausada'); },
    onError: () => toast.error('Error al pausar'),
  });

  // FIN JORNADA: cierra intervalo con hora confirmada y ajustable
  const finJornada = useMutation({
    mutationFn: async (opts = {}) => {
      if (!todayRecord) return;
      const horaActual = opts.horaActual || format(new Date(), 'HH:mm');
      const hora = opts.hora || horaActual;
      const motivo = opts.motivo;
      setGeoLoading(true);
      const geo = await getGeoLocation().catch(() => null);
      setGeoLoading(false);
      const updatedIntervalos = intervalos.map((t, i) =>
        i === intervalos.length - 1 && !t.salida ? { ...t, salida: hora } : t
      );
      const calcs = calcularHoras({ ...todayRecord, intervalos: updatedIntervalos, hora_salida: hora }, jornadaDiaria);
      const geopoints = [...(todayRecord.geopoints || [])];
      if (geo) geopoints.push({ lat: geo.lat, lng: geo.lng, hora, tipo: 'salida' });
      const historialEntry = motivo ? [{
        fecha_mod: new Date().toISOString(),
        usuario: currentUser.email,
        campo: 'salida',
        valor_anterior: horaActual,
        valor_nuevo: hora,
        motivo,
      }] : [];
      const historial = [...(todayRecord.historial_modificaciones || []), ...historialEntry];
      return updateRegistro(todayRecord.id, {
        intervalos: updatedIntervalos, hora_salida: hora, finalizada: true, ...calcs, historial_modificaciones: historial,
        ...(geo && { ubicacion_salida: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] }); toast.success('Jornada finalizada'); },
    onError: () => { setGeoLoading(false); toast.error('Error al finalizar jornada'); },
  });

  const isLoading = inicioJornada.isPending || pausaJornada.isPending || finJornada.isPending || geoLoading;

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/80" />
          <span className="text-white font-semibold text-sm">Mi Jornada</span>
        </div>
        <span className="text-blue-100 text-xs capitalize">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </span>
      </div>

      <div className="p-4">
        {/* Estado */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            jornadaActiva ? 'bg-emerald-500 animate-pulse' :
            jornadaPausada ? 'bg-amber-400 animate-pulse' :
            jornadaFinalizada ? 'bg-slate-300' : 'bg-red-400'
          }`} />
          <span className="text-sm font-medium text-slate-700 flex-1">
            {loadingFichaje ? 'Cargando...' :
             jornadaActiva ? `En jornada desde ${ultimoIntervalo?.entrada}` :
             jornadaPausada ? `Pausada · ${intervalos.length} tramo${intervalos.length > 1 ? 's' : ''}` :
             jornadaFinalizada ? `Finalizada · ${todayRecord?.horas_efectivas || 0}h efectivas` :
             'Sin jornada hoy'}
          </span>
          {jornadaActiva && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activo</Badge>}
          {jornadaPausada && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pausa</Badge>}
        </div>

        {/* Mini stats */}
        {todayRecord && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-center">
            <div className="bg-slate-50 rounded p-2">
              <span className="text-slate-400">Normales</span>
              <p className="font-bold text-blue-600">{todayRecord?.horas_normales || '—'}h</p>
            </div>
            <div className="bg-slate-50 rounded p-2">
              <span className="text-slate-400">Extra</span>
              <p className={`font-bold ${(todayRecord?.horas_extra || 0) > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                {(todayRecord?.horas_extra || 0) > 0 ? `${todayRecord.horas_extra}h` : '0h'}
              </p>
            </div>
          </div>
        )}

        {/* Botones de jornada */}
        <div className="space-y-2 mb-2">
          {!jornadaActiva && (
            <Button
              size="sm"
              onClick={() => setConfirmHora({ tipo: 'entrada', horaActual: format(new Date(), 'HH:mm'), accion: 'inicio' })}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LogIn className="h-3.5 w-3.5 mr-1" />}
              {jornadaPausada ? 'Reanudar jornada' : jornadaFinalizada ? 'Reanudar jornada' : 'Iniciar jornada'}
            </Button>
          )}
          {jornadaActiva && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => pausaJornada.mutate()}
                disabled={isLoading}
                className="border-amber-300 text-amber-700 hover:bg-amber-50 h-9"
              >
                {pausaJornada.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Coffee className="h-3.5 w-3.5 mr-1" />}
                Pausa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmHora({ tipo: 'salida', horaActual: format(new Date(), 'HH:mm'), accion: 'fin' })}
                disabled={isLoading}
                className="border-red-200 text-red-600 hover:bg-red-50 h-9"
              >
                {finJornada.isPending || geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
                Fin jornada
              </Button>
            </div>
          )}
        </div>

        {geoLoading && <p className="text-xs text-blue-500 flex items-center gap-1 mb-2"><MapPin className="h-3 w-3 animate-pulse" />GPS...</p>}

        {/* Links rápidos */}
        <div className="border-t border-slate-100 pt-2 flex gap-1 flex-wrap">
          <Link to="/ControlHorario" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 justify-between h-8">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Mis registros</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/GestionAusencias" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-purple-600 hover:bg-purple-50 justify-between h-8">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Ausencias
                {ausenciasPendientes.length > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 text-xs">{ausenciasPendientes.length}</span>}
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {confirmHora && (
        <ConfirmarHoraFichaje
          tipo={confirmHora.tipo}
          horaActual={confirmHora.horaActual}
          onClose={() => setConfirmHora(null)}
          onConfirm={({ hora, motivo, ajustada }) => {
            const accion = confirmHora.accion;
            const horaActual = confirmHora.horaActual;
            setConfirmHora(null);
            if (accion === 'inicio') inicioJornada.mutate({ hora: hora || horaActual, motivo: ajustada ? motivo : null, horaActual });
            else finJornada.mutate({ hora: hora || horaActual, motivo: ajustada ? motivo : null, horaActual });
          }}
        />
      )}
    </Card>
  );
}