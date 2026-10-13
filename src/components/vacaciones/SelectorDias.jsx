import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, parseISO, isBefore, startOfDay, startOfWeek, endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DOW_HEADERS, iso, isoDe, DIAS_LABORABLES_DEFECTO } from '@/lib/vacaciones-utils';

/**
 * Calendario para marcar los días concretos de una ausencia.
 * Los días no laborables del trabajador no se pueden marcar y no cuentan.
 */
export default function SelectorDias({
  value = [],
  onChange,
  diasLaborables = DIAS_LABORABLES_DEFECTO,
  diasOcupados = [],
  minDate = null,
}) {
  const [mes, setMes] = useState(() => (value[0] ? parseISO(isoDe(value[0])) : new Date()));

  const ocupados = new Set((diasOcupados || []).map(isoDe));
  const min = minDate ? startOfDay(parseISO(isoDe(minDate))) : null;
  const hoy = iso(new Date());

  const bloqueado = (d) => !diasLaborables.includes(d.getDay()) || ocupados.has(iso(d)) || (min && isBefore(d, min));

  const toggle = (d) => {
    if (bloqueado(d)) return;
    const k = iso(d);
    const s = new Set(value);
    if (s.has(k)) s.delete(k); else s.add(k);
    onChange([...s].sort());
  };

  const addSemana = (offsetSemanas) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + offsetSemanas * 7);
    const s = new Set(value);
    eachDayOfInterval({ start: startOfWeek(ref, { weekStartsOn: 1 }), end: endOfWeek(ref, { weekStartsOn: 1 }) })
      .forEach(d => { if (!bloqueado(d)) s.add(iso(d)); });
    onChange([...s].sort());
    setMes(startOfWeek(ref, { weekStartsOn: 1 }));
  };

  const start = startOfMonth(mes);
  const offset = (getDay(start) + 6) % 7;
  const dias = eachDayOfInterval({ start, end: endOfMonth(mes) });

  const claseDia = (d) => {
    const k = iso(d);
    const sel = value.includes(k);
    if (sel) return 'bg-blue-600 text-white border-blue-600 shadow-sm';
    if (!diasLaborables.includes(d.getDay())) return 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
    if (ocupados.has(k)) return 'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed';
    if (min && isBefore(d, min)) return 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
    return 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300';
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/70">
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h4 className="font-semibold text-slate-700 text-sm capitalize">{format(mes, 'MMMM yyyy', { locale: es })}</h4>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
        {DOW_HEADERS.map(d => (
          <div key={d} className="text-center py-1.5 text-[11px] font-semibold text-slate-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-2 bg-white">
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {dias.map(day => {
          const k = iso(day);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(day)}
              title={ocupados.has(k) ? 'Ya solicitado' : undefined}
              className={`h-9 rounded-lg border text-xs font-medium transition-colors ${claseDia(day)} ${k === hoy ? 'ring-1 ring-blue-300' : ''}`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/70">
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addSemana(0)}>Semana actual (L-V)</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addSemana(1)}>Semana siguiente</Button>
        {value.length > 0 && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => onChange([])}>
            Limpiar
          </Button>
        )}
        <span className="ml-auto text-xs text-slate-400">Los días grises no son laborables</span>
      </div>

      {value.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 bg-white">
          <div className="flex flex-wrap gap-1.5">
            {value.map(k => (
              <span key={k} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                {format(parseISO(k), 'd MMM', { locale: es })}
                <button type="button" onClick={() => onChange(value.filter(v => v !== k))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}