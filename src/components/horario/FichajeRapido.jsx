import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function FichajeRapido({ currentUser, techRecord }) {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: todayRecord } = useQuery({
    queryKey: ['fichaje-hoy', currentUser?.email, todayStr],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 10);
      return all.find(r => r.fecha === todayStr && r.technician_email === currentUser?.email) || null;
    },
    enabled: !!currentUser,
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

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  const entradaMutation = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), 'HH:mm');
      if (todayRecord) {
        return base44.entities.RegistroHorario.update(todayRecord.id, { hora_entrada: now });
      }
      return base44.entities.RegistroHorario.create({
        technician_email: currentUser.email,
        technician_name: techRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: techRecord?.id || '',
        company_id: techRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: now,
        tipo_jornada: 'normal',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] });
      toast.success(`Entrada registrada: ${format(new Date(), 'HH:mm')}`);
    },
  });

  const salidaMutation = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const now = format(new Date(), 'HH:mm');
      const horas = Math.max(0, (timeToMinutes(now) - timeToMinutes(todayRecord.hora_entrada)) / 60);
      return base44.entities.RegistroHorario.update(todayRecord.id, {
        hora_salida: now,
        horas_totales: Math.round(horas * 100) / 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichaje-hoy'] });
      toast.success(`Salida registrada: ${format(new Date(), 'HH:mm')}`);
    },
  });

  const fichadoEntrada = !!todayRecord?.hora_entrada;
  const fichadoSalida = !!todayRecord?.hora_salida;

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
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
        {/* Estado actual */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${fichadoEntrada && !fichadoSalida ? 'bg-emerald-500 animate-pulse' : fichadoSalida ? 'bg-slate-300' : 'bg-red-400'}`} />
          <span className="text-sm font-medium text-slate-700">
            {fichadoSalida ? `Jornada completada · ${todayRecord?.horas_totales}h` :
             fichadoEntrada ? `En jornada desde las ${todayRecord.hora_entrada}` :
             'Sin fichar hoy'}
          </span>
          {fichadoEntrada && !fichadoSalida && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">Activo</Badge>
          )}
        </div>

        {/* Horario */}
        {(fichadoEntrada || fichadoSalida) && (
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <LogIn className="h-3.5 w-3.5" />
              <span className="font-medium">{todayRecord?.hora_entrada}</span>
            </div>
            {fichadoSalida && (
              <div className="flex items-center gap-1.5 text-red-500">
                <LogOut className="h-3.5 w-3.5" />
                <span className="font-medium">{todayRecord?.hora_salida}</span>
              </div>
            )}
          </div>
        )}

        {/* Botones fichaje */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            onClick={() => entradaMutation.mutate()}
            disabled={entradaMutation.isPending || fichadoEntrada}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
          >
            <LogIn className="h-3.5 w-3.5 mr-1.5" />
            {fichadoEntrada ? 'Entrada registrada' : 'Fichar entrada'}
          </Button>
          <Button
            size="sm"
            onClick={() => salidaMutation.mutate()}
            disabled={salidaMutation.isPending || !fichadoEntrada || fichadoSalida}
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-9"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            {fichadoSalida ? 'Salida registrada' : 'Fichar salida'}
          </Button>
        </div>

        {/* Links rápidos */}
        <div className="border-t border-slate-100 pt-3 flex gap-2 flex-wrap">
          <Link to="/ControlHorario" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 justify-between">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Mis registros</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/GestionAusencias" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-purple-600 hover:bg-purple-50 justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Ausencias
                {ausenciasPendientes.length > 0 && (
                  <span className="bg-amber-500 text-white rounded-full px-1.5 py-0 text-xs">{ausenciasPendientes.length}</span>
                )}
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}