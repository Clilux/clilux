import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, HelpCircle, SlidersHorizontal, Printer, Send, Calendar as CalendarIcon, Table as TableIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const DOW = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };

function minToHM(min) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, '0')}`;
}

export default function ResumenMensualCalendario({ technicians, myTechRecord }) {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [view, setView] = useState('calendario');
  const [showObjetivo, setShowObjetivo] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [hidden, setHidden] = useState(() => new Set());
  const [tip, setTip] = useState(null); // { id, ds, label }

  const companyTechs = useMemo(
    () => technicians.filter(t => !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id),
    [technicians, myTechRecord]
  );
  const techEmails = useMemo(() => new Set(companyTechs.map(t => t.email || t.user_email)), [companyTechs]);

  const monthStr = format(viewMonth, 'yyyy-MM');
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) }), [viewMonth]);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['resumen-mensual', monthStr, myTechRecord?.company_id],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 3000);
      return all.filter(r => r.fecha?.startsWith(monthStr) && techEmails.has(r.technician_email));
    },
    enabled: companyTechs.length > 0,
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['resumen-mensual-ausencias', monthStr, myTechRecord?.company_id],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 1000);
      const mStart = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(viewMonth), 'yyyy-MM-dd');
      return all.filter(a => a.estado === 'aprobada' && techEmails.has(a.technician_email) &&
        a.fecha_inicio && a.fecha_fin && !(a.fecha_fin < mStart || a.fecha_inicio > mEnd));
    },
    enabled: companyTechs.length > 0,
  });

  // minutes per worker per day + totals + target
  const matrix = useMemo(() => {
    const map = {};
    companyTechs.forEach(t => {
      const email = t.email || t.user_email;
      map[email] = { byDay: {}, total: 0, target: 0, tech: t };
    });
    registros.forEach(r => {
      const m = map[r.technician_email];
      if (!m) return;
      const min = Math.round(((r.horas_efectivas ?? ((r.horas_normales || 0) + (r.horas_extra || 0))) || 0) * 60);
      m.byDay[r.fecha] = (m.byDay[r.fecha] || 0) + min;
      m.total += min;
    });
    companyTechs.forEach(t => {
      const email = t.email || t.user_email;
      const jornada = t.horas_jornada_diaria || 8;
      const laborables = (t.dias_laborables && t.dias_laborables.length ? t.dias_laborables : [1, 2, 3, 4, 5]);
      let workDays = 0;
      days.forEach(d => { if (laborables.includes(getDay(d))) workDays++; });
      map[email].target = workDays * jornada * 60;
    });
    return map;
  }, [registros, companyTechs, days]);

  // ausencia day lookup
  const ausenciaMap = useMemo(() => {
    const m = {};
    ausencias.forEach(a => {
      if (!a.fecha_inicio || !a.fecha_fin) return;
      eachDayOfInterval({ start: parseISO(a.fecha_inicio), end: parseISO(a.fecha_fin) }).forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        (m[a.technician_email] ||= {})[ds] =
          a.tipo === 'vacaciones' ? 'Vacaciones' : a.tipo === 'baja_medica' ? 'Baja médica' : 'Descanso';
      });
    });
    return m;
  }, [ausencias]);

  const resumen = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const m = map[r.technician_email] || { dias: new Set(), normal: 0, extra: 0 };
      m.normal += r.horas_normales || 0;
      m.extra += r.horas_extra || 0;
      m.dias.add(r.fecha);
      map[r.technician_email] = m;
    });
    return companyTechs.map(t => {
      const email = t.email || t.user_email;
      const m = map[email] || { dias: new Set(), normal: 0, extra: 0 };
      return { tech: t, name: t.name, dias: m.dias.size, normal: m.normal, extra: m.extra, total: m.normal + m.extra };
    });
  }, [registros, companyTechs]);

  const visibleTechs = companyTechs.filter(t => !hidden.has(t.id));
  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: es }).toUpperCase();

  const notificarConfirmacion = async () => {
    if (visibleTechs.length === 0) return;
    const company_id = myTechRecord?.company_id;
    let ok = 0;
    for (const t of visibleTechs) {
      const email = t.email || t.user_email;
      try {
        await base44.entities.Notificacion.create({
          recipient_email: email, recipient_type: 'trabajador', company_id,
          tipo: 'confirmar_jornadas', titulo: 'Confirma tus jornadas',
          mensaje: `Revisa y confirma tus jornadas de ${format(viewMonth, 'MMMM yyyy', { locale: es })}.`,
          link: 'ControlHorario', leida: false,
        });
        ok++;
      } catch {}
    }
    toast.success(`Notificación enviada a ${ok} trabajador/es`);
  };

  const toggleWorker = (id) => {
    setHidden(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const cellState = (email, ds, dow, weekend) => {
    const mins = matrix[email]?.byDay[ds] || 0;
    const aus = ausenciaMap[email]?.[ds];
    const isToday = ds === todayStr;
    return { mins, aus, isToday, weekend };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800">Check-in mensual</h3>
          <HelpCircle className="h-4 w-4 text-slate-400" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFiltros(true)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />FILTROS
        </Button>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-1 border-b border-slate-200">
          <button onClick={() => setView('calendario')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px ${view === 'calendario' ? 'border-[#0056b3] text-[#0056b3]' : 'border-transparent text-slate-400'}`}>
            CALENDARIO
          </button>
          <button onClick={() => setView('tabla')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px ${view === 'tabla' ? 'border-[#0056b3] text-[#0056b3]' : 'border-transparent text-slate-400'}`}>
            TABLA
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-slate-700 text-sm min-w-28 text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <Switch checked={showObjetivo} onCheckedChange={setShowObjetivo} />
          Mostrar horas objetivo
        </label>

        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-[#0056b3] hover:bg-[#004494] text-white gap-1.5" onClick={notificarConfirmacion}>
            <Send className="h-3.5 w-3.5" />NOTIFICAR CONFIRMAR JORNADAS
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />IMPRIMIR
          </Button>
        </div>
      </div>

      {/* Calendar matrix */}
      {view === 'calendario' ? (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-white border-b border-r border-slate-100 p-2 min-w-40 text-left">
                    <span className="text-[10px] uppercase text-slate-400">Trabajador</span>
                  </th>
                  {days.map(d => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const isToday = ds === todayStr;
                    return (
                      <th key={ds}
                        className={`border-b border-r border-slate-100 p-1 text-center min-w-9 ${isToday ? 'bg-[#0056b3] text-white' : 'bg-slate-50 text-slate-500'}`}>
                        <div className="text-[10px] font-semibold leading-none">{DOW[getDay(d)]}</div>
                        <div className="text-[11px] leading-none mt-0.5">{format(d, 'd')}</div>
                      </th>
                    );
                  })}
                  <th className="border-b border-l border-slate-100 p-2 text-center min-w-16 bg-slate-50 text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={days.length + 2} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : visibleTechs.length === 0 ? (
                  <tr><td colSpan={days.length + 2} className="p-8 text-center text-slate-400">Sin trabajadores</td></tr>
                ) : visibleTechs.map(t => {
                  const email = t.email || t.user_email;
                  const m = matrix[email] || { byDay: {}, total: 0, target: 0 };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 p-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${t.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {t.photo_url ? <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" /> : (t.name?.charAt(0)?.toUpperCase() || '?')}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-28">{t.name}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const ds = format(d, 'yyyy-MM-dd');
                        const dow = getDay(d);
                        const weekend = isWeekend(d);
                        const { mins, aus, isToday } = cellState(email, ds, dow, weekend);
                        let bg = 'bg-white', txt = 'text-slate-700';
                        if (isToday) { bg = 'bg-[#0056b3]'; txt = 'text-white'; }
                        else if (aus) { bg = 'bg-[#d1e7f9]'; txt = 'text-slate-600'; }
                        else if (weekend && mins === 0) { bg = 'bg-[#eaf2e9]'; }
                        return (
                          <td key={ds} className={`border-b border-r border-slate-100 p-0.5 text-center relative ${bg} ${txt}`}>
                            {aus ? (
                              <div className="relative h-full w-full flex items-center justify-center cursor-default"
                                onMouseEnter={() => setTip({ id: t.id, ds, label: aus })}
                                onMouseLeave={() => setTip(null)}>
                                {mins > 0 && <span className="font-medium">{minToHM(mins)}</span>}
                                {tip && tip.id === t.id && tip.ds === ds && (
                                  <div className="absolute z-50 -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                    {tip.label}
                                  </div>
                                )}
                              </div>
                            ) : mins > 0 ? (
                              <span className="font-medium">{minToHM(mins)}</span>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="border-b border-l border-slate-100 p-2 text-right bg-slate-50">
                        <span className="font-bold text-slate-800">{minToHM(m.total)}</span>
                        {showObjetivo && (
                          <span className="block text-[10px] text-slate-400">/ {minToHM(m.target)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 text-slate-500 font-medium">Trabajador</th>
                  <th className="text-center p-3 text-slate-500 font-medium">Días</th>
                  <th className="text-center p-3 text-slate-500 font-medium">H. normales</th>
                  <th className="text-center p-3 text-slate-500 font-medium">H. extra</th>
                  {showObjetivo && <th className="text-center p-3 text-slate-500 font-medium">Objetivo</th>}
                  <th className="text-center p-3 text-slate-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleTechs.map(({ tech: t, name, dias, normal, extra, total }) => {
                  const email = t.email || t.user_email;
                  const target = matrix[email]?.target || 0;
                  return (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${t.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {t.photo_url ? <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" /> : (t.name?.charAt(0)?.toUpperCase() || '?')}
                          </div>
                          <span className="font-medium text-slate-700">{name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-slate-600">{dias}</td>
                      <td className="p-3 text-center font-semibold text-blue-600">{minToHM(normal * 60)}</td>
                      <td className="p-3 text-center font-semibold text-orange-500">{extra > 0 ? minToHM(extra * 60) : '—'}</td>
                      {showObjetivo && <td className="p-3 text-center text-slate-400">{minToHM(target)}</td>}
                      <td className="p-3 text-center font-bold text-slate-800">{minToHM(total * 60)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Filters dialog */}
      <Dialog open={showFiltros} onOpenChange={setShowFiltros}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mostrar trabajadores</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {companyTechs.map(t => (
              <label key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Switch checked={!hidden.has(t.id)} onCheckedChange={() => toggleWorker(t.id)} />
                <span className="text-sm text-slate-700">{t.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={() => setHidden(new Set())}>Mostrar todos</Button>
            <Button size="sm" onClick={() => setShowFiltros(false)}>Listo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}