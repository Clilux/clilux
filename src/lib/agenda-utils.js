// Utilidades de la agenda personalizada:
// color por técnico, color por tipo de trabajo y clasificación colectivo/asignado.

// Trabajo colectivo (sin técnico asignado) — lo ve todo el equipo.
export const COLOR_COLECTIVO = {
  dot: 'bg-slate-400',
  bg: 'bg-slate-100',
  text: 'text-slate-600',
  border: 'border-slate-300',
  hex: '#94a3b8',
  label: 'Colectivo',
};

// Color reservado para revisiones completadas.
export const COLOR_COMPLETADA = {
  dot: 'bg-green-500',
  bg: 'bg-green-100',
  text: 'text-green-700',
  border: 'border-green-300',
  hex: '#22c55e',
  label: 'Completada',
};

// Color reservado para revisiones unificadas (agrupación de equipos).
export const COLOR_UNIFICADA = {
  dot: 'bg-emerald-500',
  bg: 'bg-emerald-100',
  text: 'text-emerald-700',
  border: 'border-emerald-300',
  hex: '#10b981',
  label: 'Unificada',
};

// Paleta asignada de forma determinista a cada trabajador.
const PALETA = [
  { dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', hex: '#3b82f6' },
  { dot: 'bg-violet-500', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', hex: '#8b5cf6' },
  { dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', hex: '#f59e0b' },
  { dot: 'bg-rose-500', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', hex: '#f43f5e' },
  { dot: 'bg-teal-500', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', hex: '#14b8a6' },
  { dot: 'bg-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', hex: '#6366f1' },
  { dot: 'bg-pink-500', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', hex: '#ec4899' },
  { dot: 'bg-cyan-600', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', hex: '#0891b2' },
];

// Clave de asignación de una revisión (email > id > nombre), normalizada.
export function claveTecnico(rev) {
  return String(rev?.technician_email || rev?.technician_id || rev?.technician_name || '')
    .trim()
    .toLowerCase();
}

// Un trabajo es colectivo cuando no tiene técnico asignado.
export function esColectiva(rev) {
  return !claveTecnico(rev);
}

// Color estable para un técnico a partir de su email/id.
export function colorTecnico(seed) {
  const s = String(seed || '').trim().toLowerCase();
  if (!s) return COLOR_COLECTIVO;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return PALETA[h % PALETA.length];
}

// Color con el que se pinta una revisión en la agenda.
export function colorRevision(rev) {
  if (!rev) return COLOR_COLECTIVO;
  if (rev.is_unified_revision) return COLOR_UNIFICADA;
  if (rev.status === 'completed') return COLOR_COMPLETADA;
  return colorTecnico(claveTecnico(rev));
}

// Nombre visible del técnico asignado.
export function nombreTecnico(rev) {
  return rev?.technician_name || rev?.technician_email || 'Colectivo';
}