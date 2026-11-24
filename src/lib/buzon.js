import { base44 } from '@/api/base44Client';

export async function listarNotificaciones(email) {
  if (!email) return [];
  try {
    const res = await base44.functions.invoke('buzonNotificaciones', { action: 'list', email });
    const out = res.data;
    return Array.isArray(out) ? out : (out?.data || []);
  } catch {
    return [];
  }
}

export async function marcarNotificacionLeida(email, id) {
  if (!email || !id) return;
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'marcar', email, id });
  } catch {}
}

export async function marcarTodasLeidas(email) {
  if (!email) return;
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'marcar', email, todas: true });
  } catch {}
}

export async function archivarNotificacion(email, id, archived = true) {
  if (!email || !id) return;
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'archivar', email, id, archived });
  } catch {}
}

export async function eliminarNotificacion(email, id) {
  if (!email || !id) return;
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'eliminar', email, id });
  } catch {}
}

export async function notificar(tipo, datos) {
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'notificar', tipo, datos });
  } catch {}
}

/**
 * Destino interno de una notificación. Usa el link guardado; si no existe
 * (registros antiguos), lo deriva del tipo de evento.
 */
export function linkPorTipo(n) {
  if (n?.link) return n.link;
  const id = n?.datos?.incident_id || '';
  const map = {
    vacacion_solicitud: '/ControlHorario?tab=vacaciones',
    vacacion_resuelta: '/MisVacaciones',
    incidencia_nueva: '/Incidents',
    incidencia_estado: '/ClientIncidents',
    incidencia_asignacion: `/IncidentDetail?id=${id}`,
    incidencia_modificacion: `/IncidentDetail?id=${id}`,
    cita_nueva: '/TecnicoCitas',
    amonestacion_fichaje_tardio: '/ControlHorario',
  };
  return map[n?.tipo] || '';
}