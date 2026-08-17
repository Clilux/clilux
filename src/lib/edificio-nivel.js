import { parseISO, isBefore, addDays, format } from 'date-fns';

// 4 niveles de prioridad con palabras descriptivas
// Niveles por severidad: Crítico (4) > Atención (3) > Mantenimiento (2) > Operativo (1)
export const NIVEL_CONFIG = {
  ok:           { label: 'Operativo',              nivel: 1, dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'border-emerald-200', iconBg: 'bg-emerald-100', iconCls: 'text-emerald-600', order: 3 },
  maintenance:   { label: 'Requiere mantenimiento', nivel: 2, dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200',       ring: 'border-blue-300',    iconBg: 'bg-blue-100',    iconCls: 'text-blue-600',    order: 2 },
  warning:       { label: 'Atención',               nivel: 3, dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200',     ring: 'border-amber-300',   iconBg: 'bg-amber-100',   iconCls: 'text-amber-600',   order: 1 },
  critical:      { label: 'Crítico',                nivel: 4, dot: 'bg-red-500',     chip: 'bg-red-50 text-red-700 border-red-200',           ring: 'border-red-300',     iconBg: 'bg-red-100',     iconCls: 'text-red-600',     order: 0 },
};

// ¿Tiene el equipo un plan de mantenimiento recurrente activo?
export function tienePlanMantenimientoActivo(eq) {
  const mc = eq.maintenance_config;
  if (!mc) return false;
  return !!(mc.monthly_enabled || mc.quarterly_enabled || mc.biannual_enabled || mc.annual_enabled);
}

// ¿Un equipo concreto necesita revisión?
// openIncidentEquipmentIds: IDs de equipos con incidencia abierta. Sirve para
// ignorar estados `maintenance_needed` huérfanos (sin incidencia real).
export function equipoNecesitaRevision(eq, openIncidentEquipmentIds = new Set(), today = new Date()) {
  if (eq.status === 'out_of_service') return true;
  if (eq.status === 'maintenance_needed' && openIncidentEquipmentIds.has(eq.id)) return true;
  // El seguimiento de revisiones se basa en los registros de revisión (vencidos).
  // La fecha de primera revisión NO marca "necesita revisión" por sí sola.
  if (eq.next_leak_check_date && isBefore(parseISO(eq.next_leak_check_date), today)) return true;
  return false;
}

// Calcula el nivel de un edificio a partir de sus incidencias, equipos y revisiones
// Crítico (4)      = incidencias urgentes abiertas
// Atención (3)     = incidencias no urgentes abiertas
// Mantenimiento (2)= equipos que requieren revisión o revisiones pendientes/vencidas
// Operativo (1)    = nada pendiente
export function calcularNivelEdificio({ incidents = [], equipment = [], revisions = [], today = new Date() }) {
  const openIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');
  const urgentIncidents = openIncidents.filter(i => i.priority === 'urgent');
  const eqWithOpenIncident = new Set(openIncidents.filter(i => i.equipment_id).map(i => i.equipment_id));

  const eqReview = equipment.filter(eq => equipoNecesitaRevision(eq, eqWithOpenIncident, today));

  const next30 = addDays(today, 30);
  const revPending = (revisions || []).filter(
    r => r.status === 'pending' && isBefore(parseISO(r.scheduled_date), next30)
  );
  // Solo las revisiones vencidas (fecha pasada y pendientes) marcan "requiere mantenimiento".
  // Las próximas programadas dentro de 30 días son planificación, no alerta.
  const todayStr = format(today, 'yyyy-MM-dd');
  const revOverdue = revPending.filter(r => r.scheduled_date < todayStr);

  let level = 'ok';
  if (urgentIncidents.length > 0) level = 'critical';
  else if (openIncidents.length > 0) level = 'warning';
  else if (eqReview.length > 0 || revOverdue.length > 0) level = 'maintenance';

  return { level, openIncidents, urgentIncidents, eqReview, revPending, revOverdue };
}