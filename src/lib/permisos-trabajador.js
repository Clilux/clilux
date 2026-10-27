/**
 * Reglas de acceso por tipo de trabajador.
 *
 * - tecnico: trabajo de campo. No ve importes ni márgenes, y no entra al ERP.
 * - jefe_equipo: acceso a todo el módulo de Servicios (incluida la economía de
 *   obras) pero nunca al menú gerente (empresa, trabajadores, integraciones).
 * - administracion: personal de oficina. Ve la economía.
 *
 * El gerente puede ajustar estos accesos por trabajador desde sus permisos.
 */

export const WORKER_TYPES = [
  { value: 'tecnico', label: 'Técnico de campo' },
  { value: 'jefe_equipo', label: 'Jefe de equipo' },
  { value: 'administracion', label: 'Personal de administración' },
];

export function workerTypeLabel(workerType) {
  return WORKER_TYPES.find(w => w.value === workerType)?.label || 'Trabajador';
}

export function esJefeEquipo(tech) {
  return tech?.worker_type === 'jefe_equipo';
}

/** Ve todo el trabajo de la empresa (incidencias, obras y mantenimientos). */
export function veTodoElEquipo(tech, isAdmin = false) {
  if (isAdmin) return true;
  return tech?.worker_type === 'jefe_equipo' || tech?.worker_type === 'administracion';
}

/** Ve importes, costes y márgenes (obras y albaranes). */
export function puedeVerEconomia(tech, isAdmin = false) {
  if (isAdmin) return true;
  const permiso = tech?.permisos?.ver_economia;
  if (permiso === true) return true;
  if (permiso === false) return false;
  return tech?.worker_type === 'jefe_equipo' || tech?.worker_type === 'administracion';
}

/**
 * Costes de los trabajadores (€/h y mano de obra): solo gerencia.
 * Ningún otro portal (técnico, jefe de equipo, administración) los ve.
 */
export function puedeVerCostesTrabajador(tech, isAdmin = false) {
  if (isAdmin) return true;
  return tech?.is_admin === true;
}

/**
 * ¿Está el trabajador asignado a esta obra?
 * Se considera asignado si es el responsable, figura en el equipo de la obra
 * o la obra se ha compartido con él.
 */
export function estaAsignadoAObra(obra, tech, { techId, techEmail } = {}) {
  if (!obra) return false;
  const id = techId || tech?.id;
  const email = (techEmail || tech?.email || '').trim().toLowerCase();
  if (id && obra.responsable_id === id) return true;
  const equipo = Array.isArray(obra.equipo) ? obra.equipo : [];
  if (equipo.some(e => (id && e.technician_id === id) || (email && (e.technician_email || '').trim().toLowerCase() === email))) return true;
  const compartida = Array.isArray(obra.shared_with) ? obra.shared_with : [];
  return !!id && compartida.includes(id);
}

/**
 * Puede modificar la obra (datos, trabajos y observaciones).
 * Gerencia, jefe de equipo y administración pueden con cualquier obra.
 * Un técnico de campo, solo con las obras donde está asignado.
 */
export function puedeEditarObra(obra, tech, { isAdmin = false, techId, techEmail } = {}) {
  if (isAdmin) return true;
  if (tech?.is_admin === true) return true;
  if (tech?.worker_type === 'jefe_equipo' || tech?.worker_type === 'administracion') return true;
  return estaAsignadoAObra(obra, tech, { techId, techEmail });
}

/** Acceso al módulo ERP: solo el gerente, el admin de la plataforma o quien tenga el permiso concedido. */
export function puedeAccederErp(tech, { isAdmin = false, isPlatformAdmin = false } = {}) {
  if (isAdmin || isPlatformAdmin) return true;
  return tech?.permisos?.ver_erp === true;
}

/** Acceso al bloque de Automatización (Loxone, Airzone y SCADA). Solo lo concede el gerente. */
export function puedeAccederAutomatizacion(tech, { isAdmin = false, isPlatformAdmin = false } = {}) {
  if (isAdmin || isPlatformAdmin) return true;
  return tech?.permisos?.ver_automatizacion === true;
}