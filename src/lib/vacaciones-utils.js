// Utilidades compartidas de vacaciones y ausencias.
// Regla clave: las vacaciones se cuentan en DÍAS LABORABLES. El trabajador marca
// los días concretos que disfruta; los no laborables (según su jornada) no cuentan.

import { format, parseISO, eachDayOfInterval } from 'date-fns';

export const DIAS_VACACIONES_DEFECTO = 22;
export const DIAS_LABORABLES_DEFECTO = [1, 2, 3, 4, 5];

// Cabeceras de la semana empezando en lunes
export const DOW_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MESES_CORTOS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const PALETA = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626', '#4f46e5', '#0d9488', '#c2410c', '#0369a1'];

export function diasLaborablesDe(tech) {
  const d = tech?.dias_laborables;
  return Array.isArray(d) && d.length ? d : DIAS_LABORABLES_DEFECTO;
}

export const iso = (d) => format(d, 'yyyy-MM-dd');
export const isoDe = (fecha) => (typeof fecha === 'string' ? fecha.slice(0, 10) : iso(fecha));

/**
 * Días reales de una ausencia. Si el trabajador marcó días concretos se usan esos;
 * si no (registros antiguos), se derivan los laborables del rango de fechas.
 */
export function diasDeAusencia(ausencia, diasLaborables = DIAS_LABORABLES_DEFECTO) {
  const marcados = ausencia?.dias_solicitados;
  if (Array.isArray(marcados) && marcados.length) {
    return [...marcados].map(isoDe).sort();
  }
  if (!ausencia?.fecha_inicio) return [];
  try {
    return eachDayOfInterval({
      start: parseISO(isoDe(ausencia.fecha_inicio)),
      end: parseISO(isoDe(ausencia.fecha_fin || ausencia.fecha_inicio)),
    })
      .filter(d => diasLaborables.includes(d.getDay()))
      .map(iso);
  } catch {
    return [];
  }
}

/** Rango y total a partir de una lista de días marcados. */
export function rangoDeDias(dias) {
  const s = [...(dias || [])].map(isoDe).sort();
  if (!s.length) return { fecha_inicio: '', fecha_fin: '', dias_totales: 0 };
  return { fecha_inicio: s[0], fecha_fin: s[s.length - 1], dias_totales: s.length };
}

/** Días de una lista repartidos en los 12 meses del año indicado. */
export function diasPorMes(dias, year) {
  const meses = Array(12).fill(0);
  (dias || []).forEach(d => {
    const isoD = isoDe(d);
    if (Number(isoD.slice(0, 4)) === year) {
      const m = Number(isoD.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) meses[m] += 1;
    }
  });
  return meses;
}

export function colorTrabajador(index) {
  return PALETA[index % PALETA.length];
}

export function iniciales(nombre) {
  return (nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

/** Días ya comprometidos (pendientes o aprobados) de un trabajador. */
export function diasComprometidos(ausencias, email, diasLaborables) {
  return (ausencias || [])
    .filter(a => a.technician_email === email && a.estado !== 'rechazada')
    .flatMap(a => diasDeAusencia(a, diasLaborables));
}