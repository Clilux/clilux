import React from 'react';
import { cn } from '@/lib/utils';
import { Users, Layers } from 'lucide-react';

/**
 * Carga de trabajo del equipo: cuántas incidencias abiertas (pendiente + en curso)
 * tiene cada técnico y cuántas quedan sin asignar. Da al técnico una vista clara
 * de su propia carga frente a la del resto.
 */
export default function CargaEquipo({ incidents = [], technicians = [], miEmail = '' }) {
  const abiertas = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');

  const conteo = {};
  let colectivas = 0;
  for (const inc of abiertas) {
    const emails = (inc.assigned_technicians || [])
      .map(a => (a.technician_email || '').trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) {
      colectivas++;
      continue;
    }
    for (const em of emails) conteo[em] = (conteo[em] || 0) + 1;
  }

  const miClave = (miEmail || '').trim().toLowerCase();
  const lista = technicians
    .filter(t => t.email)
    .map(t => ({
      email: t.email.trim().toLowerCase(),
      nombre: t.name || t.email,
      total: conteo[t.email.trim().toLowerCase()] || 0,
    }))
    .sort((a, b) => b.total - a.total);

  if (lista.length === 0 && colectivas === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Carga de trabajo</h3>
        <span className="text-xs text-slate-400">incidencias abiertas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {lista.map(t => {
          const yo = miClave && t.email === miClave;
          return (
            <span
              key={t.email}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                yo ? 'border-brand-300 bg-brand-50 text-brand-700 font-semibold' : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
            >
              {t.nombre}{yo && ' (yo)'}
              <span className={cn(
                'min-w-[18px] text-center rounded-full px-1.5 font-bold',
                t.total === 0 ? 'bg-white text-slate-400' : t.total >= 5 ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'
              )}>
                {t.total}
              </span>
            </span>
          );
        })}
        {colectivas > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500">
            <Layers className="h-3 w-3" />
            Sin asignar
            <span className="min-w-[18px] text-center rounded-full px-1.5 font-bold bg-white text-slate-500">{colectivas}</span>
          </span>
        )}
      </div>
    </div>
  );
}