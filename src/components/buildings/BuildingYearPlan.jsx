import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Estados del planing anual de un edificio
const ESTADOS = {
  sin_datos: { label: 'Sin revisiones', box: 'border-dashed border-slate-200 bg-white', text: 'text-slate-400', dot: 'bg-slate-200' },
  previsto: { label: 'Previsto', box: 'border-slate-300 bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  caducado: { label: 'Caducado', box: 'border-red-300 bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  parcial: { label: 'Caducado · faltan revisiones', box: 'border-orange-300 bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  realizada: { label: 'Realizada', box: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const LEYENDA = ['previsto', 'caducado', 'parcial', 'realizada'];

// Planing anual del edificio: cada mes se colorea según el estado de sus revisiones
export default function BuildingYearPlan({ revisions = [] }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const months = useMemo(() => {
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const delMes = revisions.filter(
        (r) => String(r.scheduled_date || '').slice(0, 7) === key && r.status !== 'cancelled'
      );
      const realizadas = delMes.filter((r) => r.status === 'completed').length;
      const pendientes = delMes.filter((r) => r.status === 'pending').length;

      let estado = 'sin_datos';
      if (delMes.length > 0) {
        if (pendientes === 0) estado = 'realizada';
        else if (key < mesActual) estado = realizadas > 0 ? 'parcial' : 'caducado';
        else estado = 'previsto';
      }

      return { key, label: MESES[i], total: delMes.length, realizadas, pendientes, estado };
    });
  }, [revisions, year]);

  const totalAno = months.reduce((s, m) => s + m.total, 0);
  const realizadasAno = months.reduce((s, m) => s + m.realizadas, 0);
  const pendientesAno = months.reduce((s, m) => s + m.pendientes, 0);

  return (
    <Card className="p-4 md:p-6 bg-white border-0 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-blue-600" />
          Planing anual {year}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {realizadasAno}/{totalAno} realizadas · {pendientesAno} pendientes
          </span>
          <div className="flex gap-1 bg-white border rounded-lg p-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setYear(year - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setYear(year + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {months.map((m) => {
          const est = ESTADOS[m.estado];
          return (
            <div key={m.key} className={`rounded-xl border p-3 ${est.box}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${est.dot}`} />
                <p className="font-semibold text-slate-700 uppercase text-xs tracking-wide">{m.label}</p>
              </div>
              <p className={`text-xs mt-2 ${est.text}`}>{est.label}</p>
              {m.total > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {m.realizadas} hechas · {m.pendientes} pend.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t">
        {LEYENDA.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-3 w-3 rounded-full ${ESTADOS[k].dot}`} />
            {ESTADOS[k].label}
          </span>
        ))}
      </div>
    </Card>
  );
}