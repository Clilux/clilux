import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DOW_HEADERS, iso, colorTrabajador, diasDeAusencia, diasLaborablesDe } from '@/lib/vacaciones-utils';

/**
 * Calendario mensual de ausencias: cada día muestra quién está de vacaciones,
 * con un color por trabajador. Pendientes en trazo discontinuo.
 */
export default function CalendarioVacaciones({ ausencias = [], technicians = [], mesInicial }) {
  const [mes, setMes] = useState(() => (mesInicial ? parseISO(`${mesInicial}-01`) : new Date()));

  const colorDe = (email) => {
    const idx = technicians.findIndex(t => (t.email || t.user_email) === email);
    return colorTrabajador(idx < 0 ? 0 : idx);
  };
  const nombreDe = (email) => technicians.find(t => (t.email || t.user_email) === email)?.name || email;

  const porDia = useMemo(() => {
    const map = {};
    ausencias.forEach(a => {
      if (a.estado === 'rechazada') return;
      const tech = technicians.find(t => (t.email || t.user_email) === a.technician_email);
      diasDeAusencia(a, diasLaborablesDe(tech)).forEach(d => {
        (map[d] = map[d] || []).push(a);
      });
    });
    return map;
  }, [ausencias, technicians]);

  const start = startOfMonth(mes);
  const offset = (getDay(start) + 6) % 7;
  const dias = eachDayOfInterval({ start, end: endOfMonth(mes) });
  const hoy = iso(new Date());

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-slate-700 capitalize text-sm">{format(mes, 'MMMM yyyy', { locale: es })}</h3>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => addMonths(m, 1))}>
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
          const lista = porDia[k] || [];
          return (
            <div key={k} className={`h-20 border-b border-r border-slate-50 p-1 overflow-hidden ${k === hoy ? 'bg-blue-50/60' : ''}`}>
              <p className={`text-[11px] font-medium mb-0.5 ${k === hoy ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>{format(day, 'd')}</p>
              <div className="space-y-0.5">
                {lista.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    title={`${nombreDe(a.technician_email)} · ${a.estado === 'pendiente' ? 'pendiente' : 'aprobada'}`}
                    className={`text-[10px] px-1 rounded truncate text-white ${a.estado === 'pendiente' ? 'opacity-60 border border-dashed border-white/70' : ''}`}
                    style={{ backgroundColor: colorDe(a.technician_email) }}
                  >
                    {nombreDe(a.technician_email).split(' ')[0]}
                  </div>
                ))}
                {lista.length > 3 && <div className="text-[10px] text-slate-400">+{lista.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {technicians.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-3">
          {technicians.map((t, i) => (
            <div key={t.id || i} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorTrabajador(i) }} />
              {t.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}