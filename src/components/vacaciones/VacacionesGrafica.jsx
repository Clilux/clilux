import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/** Gráfica comparativa: días disfrutados, pendientes y disponibles por trabajador. */
export default function VacacionesGrafica({ datos = [] }) {
  if (!datos.length) return null;
  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Días de vacaciones por trabajador</h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="disfrutados" name="Disfrutados" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendientes" name="Pendientes" stackId="a" fill="#f59e0b" />
            <Bar dataKey="restantes" name="Disponibles" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}