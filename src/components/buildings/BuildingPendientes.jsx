import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle, Wrench, ClipboardCheck, ChevronRight,
  Thermometer, CheckCircle2, Ban,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { NIVEL_CONFIG, calcularNivelEdificio } from '@/lib/edificio-nivel';
import { cn } from '@/lib/utils';

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

const ROW_CLS = 'flex items-center gap-2 text-sm py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors';

export default function BuildingPendientes({ building, client, equipment = [], revisions = [], incidents = [] }) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { level, openIncidents, eqReview, revPending } = calcularNivelEdificio({
    incidents, equipment, revisions, today,
  });
  const cfg = NIVEL_CONFIG[level];

  const eqNeedsReview = new Set(eqReview.map(e => e.id));
  const equipmentById = {};
  equipment.forEach(e => { equipmentById[e.id] = e; });

  const revOverdue = revPending.filter(r => r.scheduled_date < todayStr);

  const tiles = [
    {
      key: 'equipment', label: 'Equipos', icon: Thermometer, count: equipment.length,
      box: 'bg-slate-50 border-slate-200 hover:border-slate-300',
      boxActive: 'bg-white border-slate-800 ring-1 ring-slate-800',
      num: 'text-slate-800', iconCls: 'text-slate-400', note: '',
    },
    {
      key: 'incidents', label: 'Incidencias', icon: AlertTriangle, count: openIncidents.length,
      box: 'bg-red-50/60 border-red-200 hover:border-red-300',
      boxActive: 'bg-white border-red-500 ring-1 ring-red-500',
      num: openIncidents.length > 0 ? 'text-red-600' : 'text-slate-400', iconCls: 'text-red-500',
      note: openIncidents.length > 0 ? 'abiertas' : 'ninguna',
    },
    {
      key: 'revisions', label: 'Revisiones', icon: ClipboardCheck, count: revPending.length,
      box: 'bg-amber-50/60 border-amber-200 hover:border-amber-300',
      boxActive: 'bg-white border-amber-500 ring-1 ring-amber-500',
      num: revPending.length > 0 ? 'text-amber-600' : 'text-slate-400', iconCls: 'text-amber-500',
      note: revOverdue.length > 0 ? `${revOverdue.length} vencidas` : (revPending.length > 0 ? 'este mes' : 'ninguna'),
    },
  ];

  const defaultKey = openIncidents.length > 0 ? 'incidents'
    : revPending.length > 0 ? 'revisions'
    : 'equipment';
  const [active, setActive] = useState(defaultKey);

  // Cliente de baja o edificio desactivado/sin contrato: no se generan requerimientos
  const sinContrato = building?.status === 'inactive' || building?.status === 'sin_contrato' ||
    (client?.status && client.status !== 'active');
  if (sinContrato) {
    return (
      <Card className="border border-slate-200 rounded-2xl p-5 bg-slate-50 mb-6">
        <div className="flex items-center gap-3">
          <Ban className="h-5 w-5 text-slate-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Sin contrato</h3>
            <p className="text-xs text-slate-500">
              {client?.status && client.status !== 'active' ? 'El cliente está de baja' : 'El edificio está desactivado'}
              {' · '}no se generan requerimientos de mantenimiento para sus equipos.
            </p>
          </div>
        </div>
      </Card>
    );
  }

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

      {/* Cuadrados pulsables: equipos, incidencias y revisiones */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl border p-3 transition-all',
                isActive ? t.boxActive : t.box
              )}
            >
              <Icon className={`h-5 w-5 ${t.iconCls}`} />
              <span className={`text-2xl font-bold leading-none ${t.num}`}>{t.count}</span>
              <span className="text-xs font-medium text-slate-600">{t.label}</span>
              {t.note && <span className="text-[10px] text-slate-400">{t.note}</span>}
            </button>
          );
        })}
      </div>

      {/* Lista del cuadrado seleccionado */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        {active === 'incidents' && (
          openIncidents.length === 0 ? (
            <p className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Sin incidencias abiertas
            </p>
          ) : (
            <div className="space-y-0.5">
              {openIncidents.map(inc => {
                const p = PRIORITY_LABEL[inc.priority] || PRIORITY_LABEL.medium;
                return (
                  <Link key={inc.id} to={`${createPageUrl('IncidentDetail')}?id=${inc.id}`} className={ROW_CLS}>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${p.chip}`}>{p.label}</span>
                    <span className="text-slate-700 truncate flex-1">{inc.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                      {inc.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )
        )}

        {active === 'revisions' && (
          revPending.length === 0 ? (
            <p className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Sin revisiones pendientes
            </p>
          ) : (
            <div className="space-y-0.5">
              {revPending.map(r => {
                const vencida = r.scheduled_date < todayStr;
                const eq = equipmentById[r.equipment_id];
                const eqName = eq ? (eq.reference_name || `${eq.brand} ${eq.model}`) : '';
                return (
                  <Link key={r.id} to={`${createPageUrl('RevisionForm')}?id=${r.id}`} className={ROW_CLS}>
                    <ClipboardCheck className={`h-4 w-4 shrink-0 ${vencida ? 'text-red-400' : 'text-amber-400'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-slate-700 truncate">
                        {REVISION_TYPE_LABEL[r.revision_type] || r.revision_type}
                        {eqName ? ` · ${eqName}` : ''}
                      </span>
                      {r.technician_name && (
                        <span className="block text-[11px] text-slate-400 truncate">{r.technician_name}</span>
                      )}
                    </span>
                    <span className={`text-[11px] shrink-0 ${vencida ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                      {vencida ? 'Vencida ' : ''}{format(parseISO(r.scheduled_date), 'd MMM yyyy', { locale: es })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )
        )}

        {active === 'equipment' && (
          equipment.length === 0 ? (
            <p className="flex items-center gap-2 text-slate-500 text-sm">
              <Thermometer className="h-4 w-4" /> No hay equipos registrados en este edificio
            </p>
          ) : (
            <div className="space-y-0.5">
              {equipment.map(eq => (
                <Link key={eq.id} to={`${createPageUrl('EquipmentDetail')}?id=${eq.id}`} className={ROW_CLS}>
                  <Thermometer className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-slate-700 truncate">
                      {eq.reference_name || `${eq.brand} ${eq.model}`}
                    </span>
                    {eq.location && <span className="block text-[11px] text-slate-400 truncate">{eq.location}</span>}
                  </span>
                  {eqNeedsReview.has(eq.id) && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                      <Wrench className="h-3 w-3" />
                      {eq.status === 'out_of_service' ? 'Fuera de servicio' : 'A revisar'}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
}