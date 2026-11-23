import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DOW_HEADERS, iso, diasDeAusencia } from '@/lib/vacaciones-utils';
import { formatHoras } from '@/lib/horario-utils';

/**
 * Calendario mensual unificado: muestra a la vez los días de vacaciones
 * (aprobadas en verde, pendientes en ámbar) y las horas trabajadas cada día
 * (barra de intensidad sobre la jornada pactada, naranja si hay horas extra).
 * Controlado: el mes lo gestiona la página padre para recargar los registros.
 */
export default function CalendarioResumen({ mes, onMesChange, ausencias = [], registros = [], diasLaborables = [1, 2, 3, 4, 5], jornadaDiaria = 8 }) {
  const vacacionesPorDia = useMemo(() => {
    const map = {};
    (ausencias || []).forEach(a => {
      if (a.estado === 'rechazada') return;
      diasDeAusencia(a, diasLaborables).forEach(d => { (map[d] = map[d] || []).push(a); });
    });
    return map;
  }, [ausencias, diasLaborables]);

  const horasPorDia = useMemo(() => {
    const map = {};
    (registros || []).forEach(r => {
      if (!r.fecha) return;
      const eff = r.horas_efectivas ?? r.horas_normales ?? 0;
      const extra = r.horas_extra || 0;
      if (eff > 0 || extra > 0) map[r.fecha] = { total: eff + extra, extra };
    });
    return map;
  }, [registros]);

  const start = startOfMonth(mes);
  const offset = (getDay(start) + 6) % 7;
  const dias = eachDayOfInterval({ start, end: endOfMonth(mes) });
  const hoy = iso(new Date());

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMesChange(subMonths(mes, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-slate-700 capitalize text-sm">{format(mes, 'MMMM yyyy', { locale: es })}</h3>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMesChange(addMonths(mes, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {DOW_HEADERS.map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-semibold text-slate-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} className="h-20 border-b border-r border-slate-50 bg-slate-50/40" />)}
        {dias.map(day => {
          const k = iso(day);
          const vacs = vacacionesPorDia[k] || [];
          const horas = horasPorDia[k];
          const esVac = vacs.length > 0;
          const pendiente = esVac && vacs.some(v => v.estado === 'pendiente');
          const bgVac = esVac ? (pendiente ? 'bg-amber-50' : 'bg-emerald-50') : '';
          const pct = horas && jornadaDiaria ? Math.min(100, Math.round((horas.total / jornadaDiaria) * 100)) : 0;
          return (
            <div key={k} className={`h-20 border-b border-r border-slate-50 p-1 relative ${k === hoy ? 'ring-1 ring-blue-200' : ''} ${bgVac}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-medium ${k === hoy ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>{format(day, 'd')}</p>
                {esVac && <span className={`w-1.5 h-1.5 rounded-full ${pendiente ? 'bg-amber-400' : 'bg-emerald-500'}`} />}
              </div>
              {esVac ? (
                <p className="text-[9px] text-emerald-700 mt-0.5 truncate">{pendiente ? 'Pendiente' : 'Vacaciones'}</p>
              ) : horas ? (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${horas.extra > 0 ? 'bg-orange-400' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">{formatHoras(horas.total)}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-300" />Vacaciones</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-300" />Pendiente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-brand-500" />Horas</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-orange-400" />Con extra</span>
      </div>
    </div>
  );
}