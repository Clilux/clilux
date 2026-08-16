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

export async function notificar(tipo, datos) {
  try {
    await base44.functions.invoke('buzonNotificaciones', { action: 'notificar', tipo, datos });
  } catch {}
}