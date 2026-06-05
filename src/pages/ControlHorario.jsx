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
import { jsPDF } from 'jspdf';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcularHoras, getGeoLocation, formatHoras } from '@/lib/horario-utils';
import EditarRegistroModal from '@/components/horario/EditarRegistroModal';
import AdminHorarioDashboard from '@/components/horario/AdminHorarioDashboard';
import SolicitudAusenciaModal from '@/components/horario/SolicitudAusenciaModal';
import MapaTrayecto from '@/components/horario/MapaTrayecto';

export default function ControlHorario() {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAusencia, setShowAusencia] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState(null);

  // Detectar si hay sesión de técnico propio (no Base44)
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  // Email efectivo: sesión de técnico propio tiene prioridad sobre Base44
  const effectiveEmail = sessionTechEmail || base44User?.email;

  const isAdmin = !isSessionTech && base44User?.role === 'admin';
  const myTechRecord = technicians.find(t => t.email === effectiveEmail || t.user_email === effectiveEmail);
  const jornadaDiaria = myTechRecord?.horas_jornada_diaria || 8;

  // currentUser unificado para compatibilidad con el resto del componente
  const currentUser = isSessionTech
    ? { email: sessionTechEmail, full_name: myTechRecord?.name || sessionTechEmail, role: 'user' }
    : base44User;

  const monthStr = format(viewMonth, 'yyyy-MM');
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-horario', monthStr, effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return [];
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail,
          entity: 'registro_horario_mes',
          mes: monthStr,
        });
        return res.data?.data || [];
      }
      const all = await base44.entities.RegistroHorario.filter({ technician_email: effectiveEmail });
      return all.filter(r => r.fecha?.startsWith(monthStr));
    },
    enabled: !!effectiveEmail,
  });

  const myRegistros = registros;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = myRegistros.find(r => r.fecha === todayStr);

  // --- Mutations ---

  // Helper para actualizar registro via proxy o directo
  const updateRegistro = async (id, updates) => {
    if (isSessionTech) {
      return base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail, entity: 'registro_horario_update', record_id: id, updates,
      });
    }
    return base44.entities.RegistroHorario.update(id, updates);
  };

  const createRegistro = async (record) => {
    if (isSessionTech) {
      return base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail, entity: 'registro_horario_create', record,
      });
    }
    return base44.entities.RegistroHorario.create(record);
  };

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
        const intervalos = [...(todayRecord.intervalos || []), nuevoIntervalo];
        return updateRegistro(todayRecord.id, {
          intervalos, hora_salida: null, finalizada: false,
          ...(geo && { geopoints: [...(todayRecord.geopoints || []), ...geopoints] }),
        });
      }
      return createRegistro({
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
      return updateRegistro(todayRecord.id, { intervalos, hora_salida: now });
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
      return updateRegistro(todayRecord.id, {
        intervalos, hora_salida: now, finalizada: true, ...calcs,
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
  // finalizada = todos los intervalos cerrados Y marcado explícitamente con hora_salida_final
  const jornadaFinalizada = !!(todayRecord?.finalizada);
  // pausada = hay intervalos, el último cerrado, y NO está finalizada
  const jornadaPausada = intervalos.length > 0 && !!ultimoIntervalo?.salida && !jornadaActiva && !jornadaFinalizada;
  const jornadaNoIniciada = !todayRecord || intervalos.length === 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    const techName = myRegistros[0]?.technician_name || currentUser?.full_name || currentUser?.email || '';
    const periodo = format(viewMonth, 'MMMM yyyy', { locale: es });

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Registro de Jornada Laboral', 14, 18);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Técnico: ${techName}`, 14, 28);
    doc.text(`Período: ${periodo}`, 14, 35);
    doc.text(`Horas normales: ${Math.round(totalNormal * 10) / 10}h  |  Horas extra: ${Math.round(totalExtra * 10) / 10}h  |  Días: ${diasTrabajados}`, 14, 42);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 47, 196, 47);

    // Cabeceras tabla
    let y = 54;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    const cols = [14, 45, 72, 99, 120, 141, 162];
    ['Fecha', 'Entrada', 'Salida', 'Normal', 'Extra', 'Pausa', 'Tipo'].forEach((h, i) => doc.text(h, cols[i], y));
    y += 5;
    doc.setDrawColor(180, 180, 180);
    doc.line(14, y, 196, y);
    y += 5;

    doc.setFont(undefined, 'normal');
    const sorted = [...myRegistros].sort((a, b) => a.fecha.localeCompare(b.fecha));
    sorted.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      const dateStr = r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : r.fecha;
      doc.text(dateStr, cols[0], y);
      doc.text(r.hora_entrada || '—', cols[1], y);
      doc.text(r.hora_salida || '—', cols[2], y);
      doc.text(r.horas_normales ? `${r.horas_normales}h` : '—', cols[3], y);
      doc.text(r.horas_extra > 0 ? `${r.horas_extra}h` : '—', cols[4], y);
      doc.text(r.minutos_pausa > 0 ? `${r.minutos_pausa}m` : '—', cols[5], y);
      doc.text(r.tipo_jornada || 'normal', cols[6], y);
      y += 8;
      // Tramos si los hay
      if (r.intervalos?.length > 1) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        const tramosStr = r.intervalos.map((t, i) => `T${i+1}: ${t.entrada}→${t.salida||'?'}`).join('  ');
        doc.text(tramosStr, cols[0] + 4, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        y += 6;
      }
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })} · RD-ley 8/2019`, 14, 285);

    doc.save(`horario_${techName.split(' ')[0]}_${monthStr}.pdf`);
  };

  const exportRowPDF = (r) => {
    const doc = new jsPDF();
    const techName = r.technician_name || currentUser?.full_name || '';

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Parte de Jornada', 14, 18);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const dateLabel = r.fecha ? format(parseISO(r.fecha), "EEEE d 'de' MMMM yyyy", { locale: es }) : r.fecha;
    doc.text(`Técnico: ${techName}`, 14, 28);
    doc.text(`Fecha: ${dateLabel}`, 14, 36);
    doc.text(`Tipo jornada: ${r.tipo_jornada || 'normal'}`, 14, 44);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 49, 196, 49);

    let y = 58;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen', 14, y); y += 8;
    doc.setFont(undefined, 'normal');
    doc.text(`Hora de entrada: ${r.hora_entrada || '—'}`, 14, y); y += 7;
    doc.text(`Hora de salida: ${r.hora_salida || '—'}`, 14, y); y += 7;
    doc.text(`Horas normales: ${r.horas_normales || 0}h`, 14, y); y += 7;
    doc.text(`Horas extra: ${r.horas_extra || 0}h`, 14, y); y += 7;
    doc.text(`Minutos de pausa: ${r.minutos_pausa || 0} min`, 14, y); y += 7;
    if (r.notas) { doc.text(`Notas: ${r.notas}`, 14, y); y += 7; }

    y += 4;
    const tramos = r.intervalos || [];
    if (tramos.length > 0) {
      doc.line(14, y, 196, y); y += 8;
      doc.setFont(undefined, 'bold');
      doc.text('Tramos de trabajo', 14, y); y += 8;
      doc.setFont(undefined, 'normal');
      tramos.forEach((t, i) => {
        doc.text(`Tramo ${i + 1}:  ${t.entrada}  →  ${t.salida || 'en curso'}`, 14, y); y += 7;
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })} · RD-ley 8/2019`, 14, 285);

    doc.save(`jornada_${techName.split(' ')[0]}_${r.fecha}.pdf`);
  };

  if (!effectiveEmail) return null;

  // Panel de técnico — reutilizado tanto en la vista pura de técnico como en admin+técnico
  const renderTechnicianPanel = () => (
    <>
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
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${jornadaActiva ? 'bg-emerald-500 animate-pulse' : jornadaPausada ? 'bg-amber-400' : jornadaFinalizada ? 'bg-slate-300' : 'bg-red-400'}`} />
            <span className="text-sm font-medium text-slate-700">
              {jornadaActiva ? `En jornada desde ${ultimoIntervalo?.entrada}` :
               jornadaPausada ? `Pausada · ${intervalos.length} tramo${intervalos.length > 1 ? 's' : ''}` :
               jornadaFinalizada ? `Finalizada · ${todayRecord?.horas_efectivas || 0}h efectivas` :
               'Sin jornada hoy'}
            </span>
            {jornadaActiva && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">Activo</Badge>}
            {jornadaPausada && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">Pausada</Badge>}
          </div>
          {todayRecord && intervalos.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4 text-center">
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Inicio</p><p className="font-semibold text-emerald-600 text-sm">{intervalos[0]?.entrada || '—'}</p></div>
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Último fin</p><p className="font-semibold text-red-500 text-sm">{ultimoIntervalo?.salida || (jornadaActiva ? '—' : todayRecord.hora_salida || '—')}</p></div>
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Normales</p><p className="font-semibold text-blue-600 text-sm">{todayRecord.horas_normales ? `${todayRecord.horas_normales}h` : '—'}</p></div>
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Extra</p><p className={`font-semibold text-sm ${(todayRecord.horas_extra || 0) > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{(todayRecord.horas_extra || 0) > 0 ? `${todayRecord.horas_extra}h` : '0h'}</p></div>
            </div>
          )}
          {intervalos.length > 0 && (
            <div className="mb-4 text-xs bg-blue-50 rounded-lg p-2.5 space-y-1.5">
              <p className="font-semibold text-blue-700 mb-1">Tramos del día ({intervalos.length})</p>
              {intervalos.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-600">
                  <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="text-emerald-600 font-medium">{t.entrada}</span>
                  <span className="text-slate-400">→</span>
                  <span className={!t.salida ? 'text-emerald-500 font-medium animate-pulse' : 'text-red-500 font-medium'}>{t.salida || 'en curso'}</span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {!jornadaActiva && (
              <Button onClick={() => inicioJornada.mutate()} disabled={inicioJornada.isPending || geoLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                <LogIn className="h-4 w-4 mr-2" />{jornadaPausada || jornadaFinalizada ? 'Reanudar jornada' : 'Iniciar jornada'}
              </Button>
            )}
            {jornadaActiva && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => pausaJornada.mutate()} disabled={pausaJornada.isPending} className="border-amber-300 text-amber-700 hover:bg-amber-50 h-11">
                  <Coffee className="h-4 w-4 mr-2" />Pausa
                </Button>
                <Button variant="outline" onClick={() => finJornada.mutate()} disabled={finJornada.isPending || geoLoading} className="border-red-300 text-red-600 hover:bg-red-50 h-11">
                  <LogOut className="h-4 w-4 mr-2" />Fin jornada
                </Button>
              </div>
            )}
            {jornadaFinalizada && !jornadaActiva && (
              <p className="text-xs text-slate-400 text-center">Jornada finalizada · {todayRecord?.horas_efectivas || 0}h efectivas · Puedes reanudar si es necesario</p>
            )}
          </div>
          {geoLoading && <p className="text-xs text-blue-500 flex items-center gap-1 mt-2"><MapPin className="h-3 w-3 animate-pulse" />Obteniendo ubicación GPS...</p>}
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
          <p className="text-2xl font-bold text-blue-600">{formatHoras(totalNormal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Horas normales</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className={`text-2xl font-bold ${totalExtra > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{formatHoras(totalExtra)}</p>
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
          <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-slate-700 w-36 text-center capitalize">{format(viewMonth, 'MMMM yyyy', { locale: es })}</span>
          <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" />Exportar PDF</Button>
      </div>

      {/* Timeline cronológica del mes */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 capitalize">{format(viewMonth, 'MMMM yyyy', { locale: es })}</span>
          <span className="text-xs text-slate-400 ml-auto">{myRegistros.length} jornadas registradas</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : myRegistros.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Sin registros este mes</div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[52px] top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="divide-y divide-slate-50">
              {myRegistros.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => {
                const isToday = r.fecha === format(new Date(), 'yyyy-MM-dd');
                const isFinalizada = r.finalizada;
                const tramos = r.intervalos || [];
                const horasEfectivas = r.horas_efectivas || r.horas_normales || 0;
                const horasExtra = r.horas_extra || 0;
                return (
                  <div key={r.id} className={`flex gap-0 items-start py-3 pr-3 pl-2 hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-blue-50/40' : ''}`}>
                    {/* Fecha */}
                    <div className="w-12 flex-shrink-0 text-center pt-0.5">
                      <p className={`text-xs font-bold leading-none ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                        {r.fecha ? format(parseISO(r.fecha), 'd', { locale: es }) : '—'}
                      </p>
                      <p className={`text-xs uppercase leading-none mt-0.5 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                        {r.fecha ? format(parseISO(r.fecha), 'EEE', { locale: es }) : ''}
                      </p>
                    </div>
                    {/* Dot en la línea */}
                    <div className="relative flex-shrink-0 w-4 flex items-start justify-center pt-1.5">
                      <div className={`w-3 h-3 rounded-full border-2 z-10 ${
                        isToday && jornadaActiva ? 'bg-emerald-400 border-emerald-500 animate-pulse' :
                        isFinalizada ? 'bg-blue-500 border-blue-400' :
                        tramos.length > 0 ? 'bg-amber-400 border-amber-400' :
                        'bg-slate-200 border-slate-300'
                      }`} />
                    </div>
                    {/* Contenido */}
                    <div className="flex-1 min-w-0 ml-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Hora entrada → salida */}
                        <span className="text-sm font-medium text-slate-700">
                          <span className="text-emerald-600">{r.hora_entrada || '—'}</span>
                          {' → '}
                          <span className={r.hora_salida ? 'text-red-500' : 'text-slate-300'}>{r.hora_salida || (jornadaActiva && isToday ? 'en curso' : '—')}</span>
                        </span>
                        {/* Badges */}
                        {isToday && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">hoy</span>}
                        {isFinalizada && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">✓ cerrada</span>}
                        {horasExtra > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">+{formatHoras(horasExtra)} extra</span>}
                        {r.historial_modificaciones?.length > 0 && <History className="h-3 w-3 text-amber-400" title="Modificado" />}
                        {r.ubicacion_entrada && <MapPin className="h-3 w-3 text-emerald-300" />}
                      </div>
                      {/* Tramos si hay más de uno */}
                      {tramos.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {tramos.map((t, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                              <span className="font-medium text-emerald-600">{t.entrada}</span>
                              <span className="text-slate-300">→</span>
                              <span className={!t.salida ? 'text-emerald-500 animate-pulse font-medium' : 'text-red-500'}>{t.salida || 'en curso'}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Resumen horas */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        {horasEfectivas > 0 && <span className="text-blue-600 font-semibold">{formatHoras(horasEfectivas)}</span>}
                        {r.minutos_pausa > 0 && <span>{r.minutos_pausa}m pausa</span>}
                      </div>
                      {/* Mapa trayecto expandible */}
                      {expandedMapId === r.id && (
                        <div className="mt-2">
                          <MapaTrayecto geopoints={r.geopoints || []} />
                        </div>
                      )}
                    </div>
                    {/* Acciones */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1 pt-0.5">
                      {(r.geopoints?.length > 0 || r.ubicacion_entrada) && (
                        <Button variant="ghost" size="icon" className={`h-7 w-7 ${expandedMapId === r.id ? 'text-blue-500' : 'text-emerald-300 hover:text-emerald-600'}`}
                          onClick={() => setExpandedMapId(expandedMapId === r.id ? null : r.id)} title="Ver trayecto">
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-emerald-600" onClick={() => exportRowPDF(r)} title="PDF jornada"><FileDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-600" onClick={() => setEditingRecord(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-400 mt-3 text-center">RD-ley 8/2019 — Jornada pactada: {jornadaDiaria}h/día</p>
    </>
  );

  // Admin puro (sin registro de técnico): solo panel de análisis
  if (isAdmin && !myTechRecord) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <NavHeader title="Control Horario" />
            <AdminHorarioDashboard currentUser={currentUser} technicians={technicians} myTechRecord={null} />
          </div>
        </div>
      </div>
    );
  }

  // Admin que también es técnico: su ficha de técnico arriba + panel admin debajo
  if (isAdmin && myTechRecord) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <NavHeader title="Control Horario" />

            {/* ── Sección técnico ── */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Mi jornada</p>
              {renderTechnicianPanel()}
            </div>

            {/* ── Sección administración ── */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Panel de administración</p>
              <AdminHorarioDashboard currentUser={currentUser} technicians={technicians} myTechRecord={myTechRecord} />
            </div>
          </div>
        </div>
        {editingRecord && (
          <EditarRegistroModal registro={editingRecord} currentUser={currentUser} jornadaDiaria={jornadaDiaria}
            updateRegistro={updateRegistro}
            onClose={() => { setEditingRecord(null); queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); }} />
        )}
        {showAusencia && (
          <SolicitudAusenciaModal currentUser={currentUser} techRecord={myTechRecord} onClose={() => setShowAusencia(false)} />
        )}
      </div>
    );
  }

  // Técnico puro
  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <NavHeader title="Mi Control Horario" />
          {renderTechnicianPanel()}
        </div>
      </div>
      {editingRecord && (
        <EditarRegistroModal registro={editingRecord} currentUser={currentUser} jornadaDiaria={jornadaDiaria}
          updateRegistro={updateRegistro}
          onClose={() => { setEditingRecord(null); queryClient.invalidateQueries({ queryKey: ['registros-horario'] }); }} />
      )}
      {showAusencia && (
        <SolicitudAusenciaModal currentUser={currentUser} techRecord={myTechRecord} onClose={() => setShowAusencia(false)} />
      )}
    </div>
  );
}