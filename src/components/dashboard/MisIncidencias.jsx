import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import { AlertTriangle, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY = {
  low:    { label: 'Baja',    cls: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Media',   cls: 'bg-blue-100 text-blue-700' },
  high:   { label: 'Alta',    cls: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-700' },
};

/**
 * Panel de estado de las incidencias del trabajador.
 * Muestra, de forma clara, cuántas tiene pendientes, en curso y resueltas,
 * y el detalle de las que están abiertas.
 */
export default function MisIncidencias({ incidents = [], isAdmin = false, loading = false }) {
  const pendientes = incidents.filter(i => i.status === 'pending');
  const enCurso = incidents.filter(i => i.status === 'in_progress');
  const resueltas = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');
  const abiertas = [...pendientes, ...enCurso];

  const stat = (label, value, icon, cls) => (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3', cls)}>
      <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );

  return (
    <Card className="p-4 bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-800 font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {isAdmin ? 'Incidencias de la empresa' : 'Mis incidencias'}
        </h2>
        <Link to={createPageUrl('Incidents')}>
          <span className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5">
            Ver todas <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {stat('Pendientes', pendientes.length, <Clock className="h-4 w-4 text-yellow-600" />, 'bg-yellow-50 border-yellow-200')}
          {stat('En curso', enCurso.length, <AlertTriangle className="h-4 w-4 text-blue-600" />, 'bg-blue-50 border-blue-200')}
          {stat('Resueltas', resueltas.length, <CheckCircle2 className="h-4 w-4 text-emerald-600" />, 'bg-emerald-50 border-emerald-200')}
        </div>
      )}

      {!loading && abiertas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-3">
          No tienes incidencias abiertas. ¡Todo al día!
        </p>
      ) : !loading && (
        <div className="space-y-2">
          {abiertas.slice(0, 5).map(inc => {
            const pr = PRIORITY[inc.priority] || PRIORITY.medium;
            return (
              <Link key={inc.id} to={createPageUrl('IncidentDetail') + `?id=${inc.id}`}>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inc.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {inc.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                      {inc.assigned_technicians?.length ? ` · ${inc.assigned_technicians.map(a => a.technician_name).filter(Boolean).join(', ')}` : ''}
                    </p>
                  </div>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', pr.cls)}>
                    {pr.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}