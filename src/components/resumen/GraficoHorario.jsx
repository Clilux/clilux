import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { formatHoras } from '@/lib/horario-utils';

/** Barras apiladas de horas normales + extra por día del mes. */
export default function GraficoHorario({ registros = [], mesLabel = '' }) {
  const data = useMemo(() => {
    return [...(registros || [])]
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(r => ({
        dia: r.fecha ? Number(r.fecha.slice(8, 10)) : 0,
        normales: Math.round((r.horas_efectivas ?? r.horas_normales ?? 0) * 10) / 10,
        extra: Math.round((r.horas_extra || 0) * 10) / 10,
      }))
      .filter(d => d.normales > 0 || d.extra > 0);
  }, [registros]);

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Horas trabajadas · {mesLabel}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 py-12 text-center">Sin registros este mes</p>
      ) : (
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => `${formatHoras(v)}h`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="normales" name="Normales" stackId="a" fill="#2563eb" />
              <Bar dataKey="extra" name="Extra" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}