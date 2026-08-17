import { parseISO, isBefore, addDays } from 'date-fns';

// 4 niveles de prioridad con palabras descriptivas
export const NIVEL_CONFIG = {
  ok:           { label: 'Operativo',              dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'border-emerald-200', iconBg: 'bg-emerald-100', iconCls: 'text-emerald-600', order: 3 },
  warning:       { label: 'Atención',               dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200',       ring: 'border-amber-300',  iconBg: 'bg-amber-100',   iconCls: 'text-amber-600',   order: 2 },
  maintenance:   { label: 'Requiere mantenimiento', dot: 'bg-orange-500',  chip: 'bg-orange-50 text-orange-700 border-orange-200',   ring: 'border-orange-300', iconBg: 'bg-orange-100',  iconCls: 'text-orange-600',  order: 1 },
  critical:      { label: 'Crítico',                dot: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200',           ring: 'border-red-300',    iconBg: 'bg-red-100',     iconCls: 'text-red-600',     order: 0 },
};

// ¿Un equipo concreto necesita revisión?
export function equipoNecesitaRevision(eq, today = new Date()) {
  if (eq.status === 'maintenance_needed' || eq.status === 'out_of_service') return true;
  if (eq.first_revision_date && isBefore(parseISO(eq.first_revision_date), today)) return true;
  if (eq.next_leak_check_date && isBefore(parseISO(eq.next_leak_check_date), today)) return true;
  return false;
}

// Calcula el nivel de un edificio a partir de sus incidencias, equipos y revisiones
// Crítico  = solo incidencias urgentes abiertas
// Mantenimiento = equipos que requieren revisión (sin incidencia urgente)
// Atención = incidencias no urgentes abiertas o revisiones vencidas/próximas
// Operativo = nada pendiente
export function calcularNivelEdificio({ incidents = [], equipment = [], revisions = [], today = new Date() }) {
  const openIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');
  const urgentIncidents = openIncidents.filter(i => i.priority === 'urgent');
  const eqReview = equipment.filter(eq => equipoNecesitaRevision(eq, today));
  const next30 = addDays(today, 30);
  const revPending = (revisions || []).filter(
    r => r.status === 'pending' && isBefore(parseISO(r.scheduled_date), next30)
  );

  let level = 'ok';
  if (urgentIncidents.length > 0) level = 'critical';
  else if (eqReview.length > 0) level = 'maintenance';
  else if (openIncidents.length > 0 || revPending.length > 0) level = 'warning';

  return { level, openIncidents, urgentIncidents, eqReview, revPending };
}