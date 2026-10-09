/**
 * REP — Reglamento de Equipos a Presión (RD 809/2021)
 * Umbral legal de la instalación: PS x V >= 25.000
 */

export const UMBRAL_REP = 25000;

export const HABILITACIONES_REP = [
  { value: 'EIP-1', label: 'EIP-1' },
  { value: 'EIP-2', label: 'EIP-2' },
];

export const TIPOS_INSPECCION_REP = [
  { value: 'nivel_a', label: 'Nivel A - Visual' },
  { value: 'nivel_b', label: 'Nivel B - Fuera de servicio' },
  { value: 'nivel_c', label: 'Nivel C - Prueba Hidrostática' },
];

export const RESULTADOS_INSPECCION_REP = [
  { value: 'favorable', label: 'Favorable' },
  { value: 'condicionado', label: 'Condicionado' },
  { value: 'desfavorable', label: 'Desfavorable' },
];

export const etiquetaTipoInspeccion = (tipo) =>
  TIPOS_INSPECCION_REP.find((t) => t.value === tipo)?.label || tipo || '—';

export const etiquetaResultado = (resultado) =>
  RESULTADOS_INSPECCION_REP.find((r) => r.value === resultado)?.label || resultado || '—';

/** PS x V — producto de la presión máxima (bar) por el volumen (litros) */
export const calcularPsxV = (ps, v) => {
  const presion = Number(ps);
  const volumen = Number(v);
  if (!presion || !volumen) return null;
  return +(presion * volumen).toFixed(2);
};

/** Sumatorio de PS x V de los equipos a presión de una instalación */
export const sumaPsxV = (equipos = []) =>
  equipos.reduce((total, eq) => (eq?.es_equipo_presion ? total + (Number(eq.ps_x_v) || 0) : total), 0);

/** La instalación exige proyecto técnico e ingeniero colegiado */
export const requiereProyectoTecnico = (totalPsxV) => (Number(totalPsxV) || 0) >= UMBRAL_REP;

/** La inspección exige Organismo de Control Autorizado (OCA) */
export const requiereOca = (tipoInspeccion, psxV) =>
  tipoInspeccion === 'nivel_c' ||
  (tipoInspeccion === 'nivel_b' && (Number(psxV) || 0) >= UMBRAL_REP);

/** Empresa EIP-1 ante una instalación que exige proyecto: no puede emitir certificado */
export const bloqueoEip1 = (totalPsxV, habilitacion) =>
  requiereProyectoTecnico(totalPsxV) && habilitacion === 'EIP-1';

export const MENSAJE_PROYECTO = 'Instalación requiere Proyecto Técnico e Ingeniero Colegiado';
export const MENSAJE_EIP1 =
  'Tu empresa está registrada como EIP-1. Esta instalación requiere una habilitación EIP-2 o proyecto externo';