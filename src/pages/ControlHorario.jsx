import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavHeader from '@/components/navigation/NavHeader';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Coffee, ChevronLeft, ChevronRight, Download, Pencil, MapPin, History, Calendar, FileDown } from 'lucide-react';
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

  // --- Mutations ---

  // INICIO JORNADA: crea el registro del día con el primer intervalo abierto
  const inicioJornada = useMutation({
    mutationFn: async () => {
      setGeoLoading(true);
      const geo = await getGeoLocation().catch(() => null);
      setGeoLoading(false);
      const now = format(new Date(), 'HH:mm');
      const nuevoIntervalo = { entrada: now, salida: null };
      const geopoints = geo ? [{ lat: geo.lat, lng: geo.lng, hora: now, tipo: 'entrada' }] : [];
      if (todayRecord) {
        // Reanudar: añadir nuevo intervalo
        const intervalos = [...(todayRecord.intervalos || []), nuevoIntervalo];
        return base44.entities.RegistroHorario.update(todayRecord.id, {
          intervalos,
          hora_salida: null,
          ...(geo && { geopoints: [...(todayRecord.geopoints || []), ...geopoints] }),
        });
      }
      // Nuevo día
      return base44.entities.RegistroHorario.create({
        technician_email: currentUser.email,
        technician_name: myTechRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: myTechRecord?.id || '',
        company_id: myTechRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: now,
        tipo_jornada: 'normal',
        pausas: [],
        intervalos: [nuevoIntervalo],
        ...(geo && { ubicacion_entrada: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Jornada iniciada'); },
    onError: () => setGeoLoading(false),
  });

  // PAUSA: cierra el intervalo activo sin cerrar la jornada
  const pausaJornada = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const now = format(new Date(), 'HH:mm');
      const intervalos = (todayRecord.intervalos || []).map((t, i) =>
        i === (todayRecord.intervalos.length - 1) && !t.salida ? { ...t, salida: now } : t
      );
      return base44.entities.RegistroHorario.update(todayRecord.id, { intervalos, hora_salida: now });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Jornada pausada'); },
  });

  // FIN JORNADA: cierra el intervalo activo, calcula totales y marca como finalizada
  const finJornada = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      setGeoLoading(true);
      const geo = await getGeoLocation().catch(() => null);
      setGeoLoading(false);
      const now = format(new Date(), 'HH:mm');
      const intervalos = (todayRecord.intervalos || []).map((t, i) =>
        i === (todayRecord.intervalos.length - 1) && !t.salida ? { ...t, salida: now } : t
      );
      const calcs = calcularHoras({ ...todayRecord, intervalos, hora_salida: now }, jornadaDiaria);
      const geopoints = [...(todayRecord.geopoints || [])];
      if (geo) geopoints.push({ lat: geo.lat, lng: geo.lng, hora: now, tipo: 'salida' });
      return base44.entities.RegistroHorario.update(todayRecord.id, {
        intervalos,
        hora_salida: now,
        ...calcs,
        ...(geo && { ubicacion_salida: `${geo.lat},${geo.lng}`, geopoints }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); toast.success('Jornada finalizada'); },
    onError: () => setGeoLoading(false),
  });

  // --- Stats ---
  const totalNormal = myRegistros.reduce((a, r) => a + (r.horas_normales || 0), 0);
  const totalExtra = myRegistros.reduce((a, r) => a + (r.horas_extra || 0), 0);
  const diasTrabajados = new Set(myRegistros.map(r => r.fecha)).size;

  const intervalos = todayRecord?.intervalos || [];
  const ultimoIntervalo = intervalos[intervalos.length - 1];
  // jornada en curso = hay un intervalo abierto (sin salida)
  const jornadaActiva = !!ultimoIntervalo && !ultimoIntervalo.salida;
  // pausada = hay intervalos y el último está cerrado pero la jornada no ha finalizado
  const jornadaPausada = intervalos.length > 0 && !!ultimoIntervalo?.salida && !todayRecord?.horas_efectivas;
  // finalizada = tiene horas_efectivas calculadas
  const jornadaFinalizada = !!(todayRecord?.horas_efectivas || todayRecord?.horas_normales);
  const jornadaNoIniciada = !todayRecord || intervalos.length === 0;

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

  const exportRowCSV = (r) => {
    const intervalos = r.intervalos || [];
    const tramosStr = intervalos.map((t, i) => `Tramo${i+1}: ${t.entrada}-${t.salida||'en curso'}`).join(' | ');
    const rows = [
      ['Fecha', 'Entrada', 'Salida', 'H.Normales', 'H.Extra', 'Min.Pausa', 'Tipo', 'Tramos', 'Notas'],
      [r.fecha, r.hora_entrada||'', r.hora_salida||'', r.horas_normales||0, r.horas_extra||0, r.minutos_pausa||0, r.tipo_jornada||'normal', tramosStr, r.notas||'']
    ];
    const csv = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jornada_${r.fecha}.csv`;
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
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                jornadaActiva ? 'bg-emerald-500 animate-pulse' :
                jornadaPausada ? 'bg-amber-400' :
                jornadaFinalizada ? 'bg-slate-300' : 'bg-red-400'
              }`} />
              <span className="text-sm font-medium text-slate-700">
                {jornadaActiva ? `En jornada desde ${ultimoIntervalo?.entrada}` :
                 jornadaPausada ? `Pausada · ${intervalos.length} tramo${intervalos.length > 1 ? 's' : ''}` :
                 jornadaFinalizada ? `Finalizada · ${todayRecord?.horas_efectivas || 0}h efectivas` :
                 'Sin jornada hoy'}
              </span>
              {jornadaActiva && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">Activo</Badge>}
              {jornadaPausada && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">Pausada</Badge>}
            </div>

            {/* Horas resumen */}
            {todayRecord && intervalos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Inicio</p>
                  <p className="font-semibold text-emerald-600 text-sm">{intervalos[0]?.entrada || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Último fin</p>
                  <p className="font-semibold text-red-500 text-sm">{ultimoIntervalo?.salida || (jornadaActiva ? '—' : todayRecord.hora_salida || '—')}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Normales</p>
                  <p className="font-semibold text-blue-600 text-sm">{todayRecord.horas_normales ? `${todayRecord.horas_normales}h` : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-400">Extra</p>
                  <p className={`font-semibold text-sm ${(todayRecord.horas_extra || 0) > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                    {(todayRecord.horas_extra || 0) > 0 ? `${todayRecord.horas_extra}h` : '0h'}
                  </p>
                </div>
              </div>
            )}

            {/* Tramos del día */}
            {intervalos.length > 0 && (
              <div className="mb-4 text-xs bg-blue-50 rounded-lg p-2.5 space-y-1.5">
                <p className="font-semibold text-blue-700 mb-1">Tramos del día ({intervalos.length})</p>
                {intervalos.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-600">
                    <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="text-emerald-600 font-medium">{t.entrada}</span>
                    <span className="text-slate-400">→</span>
                    <span className={!t.salida ? 'text-emerald-500 font-medium animate-pulse' : 'text-red-500 font-medium'}>
                      {t.salida || 'en curso'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botones de acción — 3 estados */}
            <div className="space-y-2">
              {/* INICIO JORNADA — visible cuando no está activa */}
              {!jornadaActiva && !jornadaFinalizada && (
                <Button
                  onClick={() => inicioJornada.mutate()}
                  disabled={inicioJornada.isPending || geoLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {jornadaPausada ? 'Reanudar jornada' : 'Iniciar jornada'}
                </Button>
              )}

              {/* PAUSA + FIN — visible cuando está activa */}
              {jornadaActiva && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => pausaJornada.mutate()}
                    disabled={pausaJornada.isPending}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 h-11"
                  >
                    <Coffee className="h-4 w-4 mr-2" />Pausa
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => finJornada.mutate()}
                    disabled={finJornada.isPending || geoLoading}
                    className="border-red-300 text-red-600 hover:bg-red-50 h-11"
                  >
                    <LogOut className="h-4 w-4 mr-2" />Fin jornada
                  </Button>
                </div>
              )}

              {/* Jornada completada */}
              {jornadaFinalizada && (
                <div className="bg-slate-50 rounded-lg p-3 text-center text-sm text-slate-500">
                  ✅ Jornada completada · {todayRecord?.horas_efectivas || 0}h efectivas
                </div>
              )}
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600" onClick={() => exportRowCSV(r)} title="Descargar jornada">
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
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