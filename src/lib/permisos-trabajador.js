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

/** Acceso al módulo ERP: solo el gerente, el admin de la plataforma o quien tenga el permiso concedido. */
export function puedeAccederErp(tech, { isAdmin = false, isPlatformAdmin = false } = {}) {
  if (isAdmin || isPlatformAdmin) return true;
  return tech?.permisos?.ver_erp === true;
}