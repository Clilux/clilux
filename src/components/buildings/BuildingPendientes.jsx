import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Wrench, ClipboardCheck, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { NIVEL_CONFIG, calcularNivelEdificio } from '@/lib/edificio-nivel';

const PRIORITY_LABEL = {
  urgent: { label: 'Urgente', chip: 'bg-red-100 text-red-700' },
  high:   { label: 'Alta',    chip: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Media',   chip: 'bg-amber-100 text-amber-700' },
  low:    { label: 'Baja',    chip: 'bg-slate-100 text-slate-600' },
};

const REVISION_TYPE_LABEL = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual',
  unified: 'Unificada',
};

export default function BuildingPendientes({ building, equipment = [], revisions = [], incidents = [] }) {
  const today = new Date();
  const { level, openIncidents, urgentIncidents, eqReview, revPending } = calcularNivelEdificio({
    incidents, equipment, revisions, today,
  });
  const cfg = NIVEL_CONFIG[level];
  const hasPending = level !== 'ok';

  return (
    <Card className={`border ${cfg.ring} rounded-2xl p-5 bg-white mb-6`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${cfg.iconCls}`} />
          <h3 className="text-sm font-semibold text-slate-800">Pendientes del edificio</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.chip}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {!hasPending ? (
        <div className="flex items-center gap-2 text-emerald-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sin incidencias ni revisiones pendientes</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Incidencias abiertas */}
          {openIncidents.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Incidencias abiertas ({openIncidents.length})
              </p>
              <div className="space-y-1">
                {openIncidents.slice(0, 4).map(inc => {
                  const p = PRIORITY_LABEL[inc.priority] || PRIORITY_LABEL.medium;
                  return (
                    <Link
                      key={inc.id}
                      to={`${createPageUrl('IncidentDetail')}?id=${inc.id}`}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${p.chip}`}>{p.label}</span>
                      <span className="text-slate-700 truncate flex-1">{inc.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    </Link>
                  );
                })}
                {openIncidents.length > 4 && (
                  <p className="text-[10px] text-slate-400 pl-2">+{openIncidents.length - 4} más…</p>
                )}
              </div>
            </div>
          )}

          {/* Equipos a revisar */}
          {eqReview.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Equipos a revisar ({eqReview.length})
              </p>
              <div className="space-y-1">
                {eqReview.slice(0, 4).map(eq => (
                  <Link
                    key={eq.id}
                    to={`${createPageUrl('EquipmentDetail')}?id=${eq.id}`}
                    className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Wrench className="h-3 w-3 text-orange-400 shrink-0" />
                    <span className="text-slate-700 truncate flex-1">
                      {eq.reference_name || `${eq.brand} ${eq.model}`}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {eq.status === 'out_of_service' ? 'Fuera de servicio' : 'Requiere mantenimiento'}
                    </span>
                  </Link>
                ))}
                {eqReview.length > 4 && (
                  <p className="text-[10px] text-slate-400 pl-2">+{eqReview.length - 4} más…</p>
                )}
              </div>
            </div>
          )}

          {/* Revisiones pendientes */}
          {revPending.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" /> Revisiones pendientes ({revPending.length})
              </p>
              <div className="space-y-1">
                {revPending.slice(0, 4).map(r => {
                  const d = parseISO(r.scheduled_date);
                  const vencida = isBefore(d, today);
                  return (
                    <div key={r.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg">
                      <ClipboardCheck className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="text-slate-700 truncate flex-1">
                        {REVISION_TYPE_LABEL[r.revision_type] || r.revision_type}
                      </span>
                      <span className={`text-[10px] shrink-0 ${vencida ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                        {vencida ? 'Vencida ' : ''}{format(d, "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  );
                })}
                {revPending.length > 4 && (
                  <p className="text-[10px] text-slate-400 pl-2">+{revPending.length - 4} más…</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}