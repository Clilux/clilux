import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

/** Donut de vacaciones del año: disfrutadas, pendientes y disponibles. */
export default function GraficoVacaciones({ diasDisfrutados = 0, diasPendientes = 0, diasDisponibles = 0 }) {
  const data = [
    { name: 'Disfrutados', value: diasDisfrutados, color: '#059669' },
    { name: 'Pendientes', value: diasPendientes, color: '#f59e0b' },
    { name: 'Disponibles', value: diasDisponibles, color: '#e2e8f0' },
  ].filter(d => d.value > 0);

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Vacaciones del año</h3>
        <span className="text-xs text-slate-400">{diasDisponibles} disponibles</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 py-12 text-center">Sin datos de vacaciones</p>
      ) : (
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} días`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}