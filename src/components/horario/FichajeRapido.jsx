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

export default function FichajeRapido({ currentUser, techRecord }) {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [geoLoading, setGeoLoading] = useState(false);
  const jornadaDiaria = techRecord?.horas_jornada_diaria || 8;

  const { data: todayRecord } = useQuery({
    queryKey: ['fichaje-hoy', currentUser?.email, todayStr],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const results = await base44.entities.RegistroHorario.filter({ technician_email: currentUser.email, fecha: todayStr });
      return results[0] || null;
    },
    enabled: !!currentUser?.email,
    refetchInterval: 60000,
  });

  const { data: ausenciasPendientes = [] } = useQuery({
    queryKey: ['ausencias-pendientes', currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 20);
      return all.filter(a => a.technician_email === currentUser?.email && a.estado === 'pendiente');
    },
    enabled: !!currentUser,
  });

  const entradaMutation = useMutation({
    mutationFn: async () => {
      setGeoLoading(true);
      const geo = await getGeoLocation();
      setGeoLoading(false);
      const now = format(new Date(), 'HH:mm');
      const base = {
        technician_email: currentUser.email,
        technician_name: techRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: techRecord?.id || '',
        company_id: techRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: now,
        tipo_jornada: 'normal',
        pausas: [],
        ...(geo && { ubicacion_entrada: `${geo.lat},${geo.lng}`, geopoints: [{ lat: geo.lat, lng: geo.lng, hora: now, tipo: 'entrada' }] }),
      };
      if (todayRecord) return base44.entities.RegistroHorario.update(todayRecord.id, { hora_entrada: now });
      return base44.entities.RegistroHorario.create(base);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] }); toast.success(`Entrada: ${format(new Date(), 'HH:mm')}`); },
    onError: () => setGeoLoading(false),
  });

  const salidaMutation = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      setGeoLoading(true);
      const geo = await getGeoLocation();
      setGeoLoading(false);
      const now = format(new Date(), 'HH:mm');
      const calcs = calcularHoras({ ...todayRecord, hora_salida: now }, jornadaDiaria);
      const geopoints = [...(todayRecord.geopoints || [])];
      if (geo) geopoints.push({ lat: geo.lat, lng: geo.lng, hora: now, tipo: 'salida' });
      return base44.entities.RegistroHorario.update(todayRecord.id, {
        hora_salida: now, ...calcs,
        ...(geo && { ubicacion_salida: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] }); toast.success(`Salida: ${format(new Date(), 'HH:mm')}`); },
    onError: () => setGeoLoading(false),
  });

  const pausaEnCurso = todayRecord?.pausas?.some(p => !p.fin);
  const fichadoEntrada = !!todayRecord?.hora_entrada;
  const fichadoSalida = !!todayRecord?.hora_salida;
  const isLoading = entradaMutation.isPending || salidaMutation.isPending || geoLoading;

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
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pausaEnCurso ? 'bg-amber-400 animate-pulse' : fichadoEntrada && !fichadoSalida ? 'bg-emerald-500 animate-pulse' : fichadoSalida ? 'bg-slate-300' : 'bg-red-400'}`} />
          <span className="text-sm font-medium text-slate-700 flex-1">
            {pausaEnCurso ? 'En pausa' :
             fichadoSalida ? `Completada · ${todayRecord?.horas_efectivas || 0}h (${todayRecord?.horas_normales || 0}h norm + ${todayRecord?.horas_extra || 0}h ext)` :
             fichadoEntrada ? `Desde ${todayRecord.hora_entrada}` : 'Sin fichar'}
          </span>
          {fichadoEntrada && !fichadoSalida && !pausaEnCurso && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activo</Badge>}
          {pausaEnCurso && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pausa</Badge>}
        </div>

        {/* Mini stats si hay entrada */}
        {fichadoEntrada && (
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

        {/* Botones */}
        <div className="flex gap-2 mb-2">
          <Button size="sm" onClick={() => entradaMutation.mutate()} disabled={isLoading || fichadoEntrada} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9">
            {isLoading && !fichadoEntrada ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5 mr-1" />}
            {fichadoEntrada ? todayRecord.hora_entrada : 'Entrada'}
          </Button>
          <Button size="sm" onClick={() => salidaMutation.mutate()} disabled={isLoading || !fichadoEntrada || fichadoSalida || pausaEnCurso} variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-9">
            {isLoading && fichadoEntrada && !fichadoSalida ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
            {fichadoSalida ? todayRecord.hora_salida : 'Salida'}
          </Button>
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
    </Card>
  );
}