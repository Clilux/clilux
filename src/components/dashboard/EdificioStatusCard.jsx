import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Building2, MapPin, AlertTriangle, Wrench, ClipboardCheck, ChevronRight, CheckCircle2, Info } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { NIVEL_CONFIG, calcularNivelEdificio } from '@/lib/edificio-nivel';
import LongPressHelp from '@/components/ui/LongPressHelp';
import { PANEL_EDIFICIOS_HELP } from '@/lib/panel-edificios-help';

export default function EdificioStatusCard({ building, client, incidents, equipmentNeedingReview, pendingRevisions, hasPlan }) {
  const today = new Date();
  const { level, urgentIncidents, openIncidents } = calcularNivelEdificio({
    incidents,
    equipment: equipmentNeedingReview,
    revisions: pendingRevisions,
    today,
  });
  const cfg = NIVEL_CONFIG[level];

  const incCount = openIncidents.length;
  const eqCount = equipmentNeedingReview.length;
  const revCount = pendingRevisions.length;

  return (
    <Link to={`${createPageUrl('BuildingDetail')}?id=${building.id}`} className="block h-full">
      <Card className={`border ${cfg.ring} rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer bg-white h-full flex flex-col`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
              <Building2 className={`h-6 w-6 ${cfg.iconCls}`} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-800 font-semibold text-sm leading-tight truncate">{building.name}</p>
              <p className="text-slate-500 text-xs truncate">{client?.name || 'Sin cliente'}</p>
            </div>
          </div>
          <LongPressHelp as="span" help={PANEL_EDIFICIOS_HELP.status[level]} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${cfg.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </LongPressHelp>
        </div>

        {/* Dirección */}
        {building.address && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{building.address}{building.city ? `, ${building.city}` : ''}</span>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <LongPressHelp as="div" help={PANEL_EDIFICIOS_HELP.metricAlertas} className={`rounded-lg p-2.5 text-center ${incCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className={`h-3.5 w-3.5 ${incCount > 0 ? 'text-red-500' : 'text-slate-300'}`} />
            </div>
            <p className={`text-lg font-bold ${incCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{incCount}</p>
            <p className="text-[10px] text-slate-500 leading-tight">Alertas</p>
          </LongPressHelp>
          <LongPressHelp as="div" help={PANEL_EDIFICIOS_HELP.metricEquipos} className={`rounded-lg p-2.5 text-center ${eqCount > 0 ? 'bg-blue-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-center mb-1">
              <Wrench className={`h-3.5 w-3.5 ${eqCount > 0 ? 'text-blue-500' : 'text-slate-300'}`} />
            </div>
            <p className={`text-lg font-bold ${eqCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{eqCount}</p>
            <p className="text-[10px] text-slate-500 leading-tight">A revisar</p>
          </LongPressHelp>
          <LongPressHelp as="div" help={PANEL_EDIFICIOS_HELP.metricRevisiones} className={`rounded-lg p-2.5 text-center ${revCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-center mb-1">
              <ClipboardCheck className={`h-3.5 w-3.5 ${revCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
            </div>
            <p className={`text-lg font-bold ${revCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{revCount}</p>
            <p className="text-[10px] text-slate-500 leading-tight">Revisiones</p>
          </LongPressHelp>
        </div>

        {/* Detalle de alertas urgentes */}
        {urgentIncidents.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Alertas prioritarias</p>
            {urgentIncidents.slice(0, 2).map(inc => (
              <div key={inc.id} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inc.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <span className="text-slate-600 truncate">{inc.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Equipos con problema */}
        {eqCount > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Equipos a revisar</p>
            {equipmentNeedingReview.slice(0, 2).map(eq => (
              <div key={eq.id} className="flex items-center gap-2 text-xs">
                <Wrench className="h-3 w-3 text-blue-400 shrink-0" />
                <span className="text-slate-600 truncate">{eq.reference_name || `${eq.brand} ${eq.model}`}</span>
              </div>
            ))}
            {eqCount > 2 && <p className="text-[10px] text-slate-400 pl-5">+{eqCount - 2} más…</p>}
          </div>
        )}

        {/* Estado vacío */}
        {level === 'ok' && hasPlan && (
          <div className="flex items-center gap-2 text-emerald-600 text-xs mb-3">
            <CheckCircle2 className="h-4 w-4" />
            <span>Sin incidencias pendientes</span>
          </div>
        )}
        {level === 'ok' && !hasPlan && (
          <LongPressHelp as="div" help={PANEL_EDIFICIOS_HELP.sinPlan} className="flex items-center gap-2 text-amber-600 text-xs mb-3">
            <Info className="h-4 w-4 shrink-0" />
            <span>Sin plan de mantenimiento configurado</span>
          </LongPressHelp>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Ver detalle</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </Card>
    </Link>
  );
}