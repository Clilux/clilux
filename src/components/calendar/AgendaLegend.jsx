import React from 'react';
import { COLOR_COLECTIVO, COLOR_COMPLETADA, COLOR_UNIFICADA, colorTecnico } from '@/lib/agenda-utils';

// Leyenda de la agenda: color de cada trabajador y tipo de trabajo.
export default function AgendaLegend({ technicians = [], miEmail = '' }) {
  const items = [
    ...technicians.map(t => ({
      key: String(t.email || t.id).toLowerCase(),
      label: t.name || t.email,
      color: colorTecnico(t.email || t.id),
    })),
    { key: 'colectivo', label: 'Colectivo (sin asignar)', color: COLOR_COLECTIVO },
    { key: 'unificada', label: 'Unificada', color: COLOR_UNIFICADA },
    { key: 'completada', label: 'Completada', color: COLOR_COMPLETADA },
  ];

  const miClave = String(miEmail || '').toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-1">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Leyenda</span>
      {items.map(i => (
        <span key={i.key} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className={`w-2.5 h-2.5 rounded-full ${i.color.dot}`} />
          {i.label}
          {miClave && i.key === miClave && <span className="text-slate-400">(yo)</span>}
        </span>
      ))}
    </div>
  );
}