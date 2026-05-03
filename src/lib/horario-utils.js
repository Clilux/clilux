// Shared utilities for time tracking calculations

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHours(m) {
  return Math.round((m / 60) * 100) / 100;
}

/**
 * Calculate hours for a registro given the technician's contracted daily hours.
 * Returns { horas_trabajadas, horas_efectivas, horas_normales, horas_extra, minutos_pausa }
 */
export function calcularHoras(registro, jornadaDiaria = 8) {
  if (!registro.hora_entrada || !registro.hora_salida) {
    return { horas_trabajadas: 0, horas_efectivas: 0, horas_normales: 0, horas_extra: 0, minutos_pausa: 0 };
  }
  const totalMins = timeToMinutes(registro.hora_salida) - timeToMinutes(registro.hora_entrada);
  if (totalMins <= 0) return { horas_trabajadas: 0, horas_efectivas: 0, horas_normales: 0, horas_extra: 0, minutos_pausa: 0 };

  const pausas = registro.pausas || [];
  const minutosPausa = pausas.reduce((acc, p) => {
    if (p.inicio && p.fin) {
      return acc + Math.max(0, timeToMinutes(p.fin) - timeToMinutes(p.inicio));
    }
    return acc;
  }, 0);

  const horas_trabajadas = minutesToHours(totalMins);
  const horas_efectivas = minutesToHours(Math.max(0, totalMins - minutosPausa));
  const jornadaMins = jornadaDiaria * 60;
  const efectivasMins = Math.max(0, totalMins - minutosPausa);
  const horas_normales = minutesToHours(Math.min(efectivasMins, jornadaMins));
  const horas_extra = minutesToHours(Math.max(0, efectivasMins - jornadaMins));

  return { horas_trabajadas, horas_efectivas, horas_normales, horas_extra, minutos_pausa: minutosPausa };
}

export async function getGeoLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 0 }
    );
  });
}