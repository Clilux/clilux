import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavHeader from '@/components/navigation/NavHeader';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Coffee, ChevronLeft, ChevronRight, Download, Pencil, MapPin, History, Plus, Calendar, BarChart3 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcularHoras, getGeoLocation } from '@/lib/horario-utils';
import EditarRegistroModal from '@/components/horario/EditarRegistroModal';
import AdminHorarioDashboard from '@/components/horario/AdminHorarioDashboard';
import SolicitudAusenciaModal from '@/components/horario/SolicitudAusenciaModal';

export default function ControlHorario() {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAusencia, setShowAusencia] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [pausaActiva, setPausaActiva] = useState(null); // { inicio: 'HH:MM' }

  const { data: currentUser } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: !!currentUser,
  });

  const isAdmin = currentUser?.role === 'admin';
  const myTechRecord = technicians.find(t => t.user_email === currentUser?.email || t.email === currentUser?.email);
  const jornadaDiaria = myTechRecord?.horas_jornada_diaria || 8;

  const monthStr = format(viewMonth, 'yyyy-MM');
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-horario', monthStr, currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 500);
      if (isAdmin) return all;
      return all.filter(r => r.technician_email === currentUser?.email && r.fecha?.startsWith(monthStr));
    },
    enabled: !!currentUser,
  });

  const myRegistros = isAdmin ? [] : registros.filter(r => r.fecha?.startsWith(monthStr));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = myRegistros.find(r => r.fecha === todayStr);

  // --- Fichaje mutations ---
  const fichaEntrada = useMutation({
    mutationFn: async () => {
      setGeoLoading(true);
      const geo = await getGeoLocation();
      setGeoLoading(false);
      const now = format(new Date(), 'HH:mm');
      const base = {
        technician_email: currentUser.email,
        technician_name: myTechRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: myTechRecord?.id || '',
        company_id: myTechRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: now,
        tipo_jornada: 'normal',
        pausas: [],
        ...(geo && { ubicacion_entrada: `${geo.lat},${geo.lng}`, geopoints: [{ lat: geo.lat, lng: geo.lng, hora: now, tipo: 'entrada' }] }),
      };
      if (todayRecord) return base44.entities.RegistroHorario.update(todayRecord.id, { hora_entrada: now });
      return base44.entities.RegistroHorario.create(base);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Entrada registrada'); },
    onError: () => setGeoLoading(false),
  });

  const fichaSalida = useMutation({
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
        hora_salida: now,
        ...calcs,
        ...(geo && { ubicacion_salida: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Salida registrada'); },
    onError: () => setGeoLoading(false),
  });

  const iniciarPausa = useMutation({
    mutationFn: async () => {
      if (!todayRecord || todayRecord.hora_salida) return;
      const now = format(new Date(), 'HH:mm');
      const pausa = { inicio: now, fin: null, motivo: '' };
      const pausas = [...(todayRecord.pausas || []), pausa];
      setPausaActiva({ inicio: now });
      return base44.entities.RegistroHorario.update(todayRecord.id, { pausas });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Pausa iniciada'); },
  });

  const finalizarPausa = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const now = format(new Date(), 'HH:mm');
      const pausas = (todayRecord.pausas || []).map((p, i) =>
        i === (todayRecord.pausas.length - 1) && !p.fin ? { ...p, fin: now } : p
      );
      setPausaActiva(null);
      const calcs = calcularHoras({ ...todayRecord, pausas }, jornadaDiaria);
      return base44.entities.RegistroHorario.update(todayRecord.id, { pausas, ...calcs });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Pausa finalizada'); },
  });

  // --- Stats ---
  const totalNormal = myRegistros.reduce((a, r) => a + (r.horas_normales || 0), 0);
  const totalExtra = myRegistros.reduce((a, r) => a + (r.horas_extra || 0), 0);
  const diasTrabajados = new Set(myRegistros.map(r => r.fecha)).size;

  const pausaEnCurso = todayRecord?.pausas?.some(p => !p.fin);
  const fichadoEntrada = !!todayRecord?.hora_entrada;
  const fichadoSalida = !!todayRecord?.hora_salida;

  const exportCSV = () => {
    const rows = [['Técnico', 'Fecha', 'Entrada', 'Salida', 'H.Normales', 'H.Extra', 'H.Pausa', 'Tipo', 'Notas']];
    myRegistros.forEach(r => {
      rows.push([
        r.technician_name || r.technician_email, r.fecha,
        r.hora_entrada || '', r.hora_salida || '',
        r.horas_normales || 0, r.horas_extra || 0,
        r.minutos_pausa ? `${r.minutos_pausa}min` : '0',
        r.tipo_jornada || 'normal', r.notas || ''
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `horario_${monthStr}.csv`;
    a.click();
  };

  if (!currentUser) return null;

  // Admin sees a different dashboard
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <NavHeader title="Control Horario" />
          <AdminHorarioDashboard currentUser={currentUser} technicians={technicians} myTechRecord={myTechRecord} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title="Mi Control Horario" />

        {/* Fichaje card */}
        <Card className="bg-white border-0 shadow-sm mb-5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/80" />
              <span className="text-white font-semibold">Jornada de hoy</span>
            </div>
            <span className="text-blue-100 text-xs capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</span>
          </div>

          <div className="p-5">
            {/* Status row */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pausaEnCurso ? 'bg-amber-400 animate-pulse' : fichadoEntrada && !fichadoSalida ? 'bg-emerald-500 animate-pulse' : fichadoSalida ? 'bg-slate-300' : 'bg-red-400'}`} />
              <span className="text-sm font-medium text-slate-700">
                {pausaEnCurso ? 'En pausa' :
                 fichadoSalida ? `Jornada completada · ${todayRecord?.horas_efectivas || 0}h efectivas` :
                 fichadoEntrada ? `En jornada desde ${todayRecord.hora_entrada}` :
                 'Sin fichar hoy'}
              </span>
              {fichadoEntrada && !fichadoSalida && !pausaEnCurso && (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">Activo</Badge>
              )}
              {pausaEnCurso && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">Pausa</Badge>}
            </div>

            {/* Horas resumen */}
            {fichadoEntrada && (
              <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Entrada</p>
                  <p className="font-semibold text-emerald-600 text-sm">{todayRecord.hora_entrada}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Salida</p>
                  <p className="font-semibold text-red-500 text-sm">{todayRecord.hora_salida || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Normales</p>
                  <p className="font-semibold text-blue-600 text-sm">{todayRecord.horas_normales || '—'}h</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Extra</p>
                  <p className={`font-semibold text-sm ${(todayRecord.horas_extra || 0) > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                    {(todayRecord.horas_extra || 0) > 0 ? `${todayRecord.horas_extra}h` : '0h'}
                  </p>
                </div>
              </div>
            )}

            {/* Pausas */}
            {todayRecord?.pausas?.length > 0 && (
              <div className="mb-4 text-xs text-slate-500 bg-amber-50 rounded-lg p-2">
                {todayRecord.pausas.map((p, i) => (
                  <span key={i} className="mr-3">
                    ☕ {p.inicio}{p.fin ? ` → ${p.fin}` : ' (activa)'}
                    {p.fin && ` (${Math.round((p.fin.split(':').reduce((a, v, i) => a + (i === 0 ? v * 60 : +v), 0) - p.inicio.split(':').reduce((a, v, i) => a + (i === 0 ? v * 60 : +v), 0)))}min)`}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                onClick={() => fichaEntrada.mutate()}
                disabled={fichaEntrada.isPending || geoLoading || fichadoEntrada}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                {fichadoEntrada ? `Entrada: ${todayRecord.hora_entrada}` : 'Fichar entrada'}
              </Button>
              <Button
                onClick={() => fichaSalida.mutate()}
                disabled={fichaSalida.isPending || geoLoading || !fichadoEntrada || fichadoSalida || pausaEnCurso}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 h-10"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                {fichadoSalida ? `Salida: ${todayRecord.hora_salida}` : 'Fichar salida'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => iniciarPausa.mutate()}
                disabled={!fichadoEntrada || fichadoSalida || pausaEnCurso}
                className="border-amber-200 text-amber-600 hover:bg-amber-50 h-9 text-sm"
              >
                <Coffee className="h-3.5 w-3.5 mr-1.5" />
                Iniciar pausa
              </Button>
              <Button
                variant="outline"
                onClick={() => finalizarPausa.mutate()}
                disabled={!pausaEnCurso}
                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-9 text-sm"
              >
                <Coffee className="h-3.5 w-3.5 mr-1.5" />
                Fin pausa
              </Button>
            </div>
            {geoLoading && <p className="text-xs text-blue-500 flex items-center gap-1 mt-2"><MapPin className="h-3 w-3 animate-pulse" />Obteniendo ubicación GPS...</p>}

            {/* Edit today + Solicitar ausencia */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              {todayRecord && (
                <Button variant="ghost" size="sm" className="text-xs text-slate-500 gap-1.5" onClick={() => setEditingRecord(todayRecord)}>
                  <Pencil className="h-3.5 w-3.5" />Corregir fichaje
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-xs text-purple-600 gap-1.5 ml-auto" onClick={() => setShowAusencia(true)}>
                <Calendar className="h-3.5 w-3.5" />Solicitar ausencia
              </Button>
            </div>
          </div>
        </Card>

        {/* Monthly stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{Math.round(totalNormal * 10) / 10}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Horas normales</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className={`text-2xl font-bold ${totalExtra > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{Math.round(totalExtra * 10) / 10}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Horas extra</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-700">{diasTrabajados}</p>
            <p className="text-xs text-slate-500 mt-0.5">Días trabajados</p>
          </Card>
        </div>

        {/* Month navigator + export */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-slate-700 w-36 text-center capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        </div>

        {/* Records table */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 text-slate-500 font-medium">Fecha</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Entrada</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Salida</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Normal</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Extra</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Pausa</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : myRegistros.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Sin registros este mes</td></tr>
                ) : (
                  myRegistros.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : '-'}
                      </td>
                      <td className="p-3">
                        <span className="text-emerald-600 font-medium">{r.hora_entrada || '—'}</span>
                        {r.ubicacion_entrada && <MapPin className="h-3 w-3 text-emerald-300 inline ml-1" />}
                      </td>
                      <td className="p-3">
                        <span className="text-red-500 font-medium">{r.hora_salida || '—'}</span>
                        {r.ubicacion_salida && <MapPin className="h-3 w-3 text-red-300 inline ml-1" />}
                      </td>
                      <td className="p-3 font-semibold text-blue-600">{r.horas_normales ? `${r.horas_normales}h` : '—'}</td>
                      <td className="p-3 font-semibold text-orange-500">{r.horas_extra > 0 ? `${r.horas_extra}h` : '—'}</td>
                      <td className="p-3 text-slate-400 text-xs">{r.minutos_pausa > 0 ? `${r.minutos_pausa}m` : '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {r.historial_modificaciones?.length > 0 && (
                            <History className="h-3.5 w-3.5 text-amber-400" title="Modificado" />
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => setEditingRecord(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-slate-400 mt-3 text-center">RD-ley 8/2019 — Jornada pactada: {jornadaDiaria}h/día</p>

        {/* Modals */}
        {editingRecord && (
          <EditarRegistroModal
            registro={editingRecord}
            currentUser={currentUser}
            jornadaDiaria={jornadaDiaria}
            onClose={() => { setEditingRecord(null); queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); }}
          />
        )}
        {showAusencia && (
          <SolicitudAusenciaModal
            currentUser={currentUser}
            techRecord={myTechRecord}
            onClose={() => setShowAusencia(false)}
          />
        )}
      </div>
    </div>
  );
}