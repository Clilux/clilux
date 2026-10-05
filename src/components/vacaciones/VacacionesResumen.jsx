import React from 'react';
import { Card } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, Clock, TrendingDown } from 'lucide-react';

export default function VacacionesResumen({ diasAnuales, diasAnteriores, diasDisfrutados, diasPendientes, diasDisponibles }) {
  const consumidos = diasAnteriores + diasDisfrutados;
  const porcentaje = diasAnuales > 0 ? Math.min(100, Math.round((consumidos / diasAnuales) * 100)) : 0;
  const barraCls = porcentaje >= 100 ? 'bg-red-500' : porcentaje >= 80 ? 'bg-orange-400' : 'bg-brand-500';

  const tarjetas = [
    { label: 'Días al año', value: diasAnuales, icon: CalendarDays, cls: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Disfrutados', value: diasDisfrutados, icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Por aprobar', value: diasPendientes, icon: Clock, cls: 'text-amber-600', bg: 'bg-amber-50' },
    {
      label: 'Disponibles', value: diasDisponibles, icon: TrendingDown,
      cls: diasDisponibles <= 5 ? 'text-red-500' : 'text-brand-600',
      bg: diasDisponibles <= 5 ? 'bg-red-50' : 'bg-slate-50',
    },
  ];

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tarjetas.map(({ label, value, icon: Icon, cls, bg }) => (
          <Card key={label} className="p-4 bg-white border-0 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`h-5 w-5 ${cls}`} />
            </div>
            <p className={`text-2xl font-bold ${cls}`}>{value}d</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-3 p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Consumidos {consumidos} de {diasAnuales} días</span>
          <span>{diasDisponibles} disponibles</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barraCls}`} style={{ width: `${porcentaje}%` }} />
        </div>
        {diasPendientes > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            Tienes {diasPendientes} día{diasPendientes !== 1 ? 's' : ''} pendiente{diasPendientes !== 1 ? 's' : ''} de aprobación.
          </p>
        )}
        {diasAnteriores > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Incluye {diasAnteriores} día{diasAnteriores !== 1 ? 's' : ''} disfrutado{diasAnteriores !== 1 ? 's' : ''} antes de usar este sistema.
          </p>
        )}
      </Card>
    </div>
  );
}