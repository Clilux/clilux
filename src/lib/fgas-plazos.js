// Lógica de periodicidad del control de fugas según Art. 5 del
// Reglamento (UE) 2024/573 (F-Gas III).
//
// La periodicidad depende de:
//   1. tCO₂eq del equipo (carga × GWP / 1000)
//   2. si dispone de sistema de detección de fugas (duplica el intervalo)
//   3. si es equipo sellado herméticamente (umbral mínimo 10 tCO₂eq en lugar de 5)
//
// Devuelve { obligatorio, periodicidadMeses, label, sublabel, color, baseMonths }
export function calcularPlazoControlFugas(tco2eq, hasLeakDetectionSystem = false, isHermeticallySealed = false) {
  const t = Number(tco2eq) || 0;
  const umbralMin = isHermeticallySealed ? 10 : 5;

  if (t < umbralMin) {
    return {
      obligatorio: false,
      periodicidadMeses: null,
      label: 'No obligatorio',
      sublabel: `Por debajo del umbral mínimo (${umbralMin} tCO₂eq) — Art. 5`,
      color: 'verde',
      baseMonths: null,
    };
  }

  let baseMonths;
  if (t >= 500) baseMonths = 3;
  else if (t >= 50) baseMonths = 6;
  else baseMonths = 12;

  const months = hasLeakDetectionSystem ? baseMonths * 2 : baseMonths;
  const label = months === 12 ? 'Anual' : months === 24 ? 'Cada 24 meses' : `Cada ${months} meses`;
  const det = hasLeakDetectionSystem ? ' · intervalo duplicado por detector de fugas' : '';
  const color = t >= 500 ? 'rojo' : t >= 50 ? 'naranja' : 'ambar';

  return {
    obligatorio: true,
    periodicidadMeses: months,
    label,
    sublabel: `Art. 5 Reg. (UE) 2024/573${det}`,
    color,
    baseMonths,
  };
}

// Calcula la próxima fecha de control a partir de una fecha base + periodicidad
export function proximaFechaControl(fechaBase, periodicidadMeses) {
  if (!periodicidadMeses || !fechaBase) return null;
  const base = new Date(fechaBase);
  if (isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setMonth(base.getMonth() + periodicidadMeses);
  return next.toISOString().split('T')[0];
}

// Semáforo de vencimiento: verde / ámbar / rojo / gris
export function semaforoVencimiento(fecha, diasAmbar = 30) {
  if (!fecha) return { nivel: 'gris', label: 'Sin fecha', diasRestantes: null };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  if (isNaN(target.getTime())) return { nivel: 'gris', label: 'Sin fecha', diasRestantes: null };
  const dias = Math.round((target - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { nivel: 'rojo', label: 'Vencido', diasRestantes: dias };
  if (dias === 0) return { nivel: 'rojo', label: 'Hoy', diasRestantes: 0 };
  if (dias <= diasAmbar) return { nivel: 'ambar', label: `En ${dias}d`, diasRestantes: dias };
  return { nivel: 'verde', label: `En ${dias}d`, diasRestantes: dias };
}

export const SEMAFORO_STYLES = {
  verde: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ambar: 'bg-amber-100 text-amber-800 border-amber-300',
  rojo: 'bg-red-100 text-red-800 border-red-300',
  naranja: 'bg-orange-100 text-orange-800 border-orange-300',
  gris: 'bg-slate-100 text-slate-600 border-slate-300',
};

// Requisitos RITE según potencia (IT.3 del RITE, tablas 4.1–4.4)
export function riteRequirements(powerKw) {
  const power = Number(powerKw) || 0;
  if (power <= 0) return null;
  if (power <= 70) {
    return {
      category: '5 kW ≤ P ≤ 70 kW',
      maintenance: 'Empresa mantenedora',
      frequency: 'Anual (tabla 4.1)',
      note: 'Mantenimiento simplificado',
    };
  }
  if (power <= 5000) {
    return {
      category: '70 kW < P ≤ 5.000 kW',
      maintenance: 'Empresa mantenedora autorizada',
      frequency: 'Mensual y trimestral (tablas 4.1–4.4)',
      note: 'Mantenimiento reforzado',
    };
  }
  return {
    category: 'P > 5.000 kW',
    maintenance: 'Director de mantenimiento + Empresa mantenedora',
    frequency: 'Mensual, trimestral y semestral (tablas 4.1–4.4)',
    note: 'Mantenimiento intensivo — requiere director de mantenimiento',
  };
}

// Periodicidad Legionella según RD 487/2022 / RD 865/2003 según tipo de equipo
export function legionellaRequirements(equipmentType) {
  if (equipmentType === 'adiabatico' || equipmentType === 'torre_refrigeracion') {
    return { obligatorio: true, frequency: 'Mensual (torres/adiabáticos)', baseMonths: 1 };
  }
  if (equipmentType === 'produccion_acs') {
    return { obligatorio: true, frequency: 'Trimestral (ACS)', baseMonths: 3 };
  }
  return { obligatorio: false, frequency: null, baseMonths: null };
}