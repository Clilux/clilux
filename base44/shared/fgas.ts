// Módulo compartido F-Gas (servidor).
// Tabla maestra de PCA (GWP) y normalización de los campos calculados de un
// equipo según el Reglamento (UE) 2024/573.

export const GWP_TABLE: Record<string, number> = {
  'R23': 14800,
  'R32': 675,
  'R125': 3500,
  'R134a': 1430,
  'R143a': 4470,
  'R152a': 124,
  'R227ea': 3220,
  'R236fa': 9810,
  'R245fa': 1030,
  'R365mfc': 794,
  'R404A': 3922,
  'R407A': 2107,
  'R407C': 1774,
  'R407F': 1825,
  'R407H': 1495,
  'R410A': 2088,
  'R410B': 2229,
  'R417A': 2346,
  'R422A': 3143,
  'R422D': 2729,
  'R427A': 2138,
  'R437A': 1805,
  'R438A': 2265,
  'R442A': 1888,
  'R448A': 1387,
  'R449A': 1397,
  'R449B': 1412,
  'R449C': 1396,
  'R450A': 601,
  'R452A': 2140,
  'R452B': 676,
  'R454A': 239,
  'R454B': 466,
  'R454C': 148,
  'R455A': 148,
  'R457A': 139,
  'R458A': 702,
  'R459A': 444,
  'R459B': 544,
  'R466A': 733,
  'R507A': 3985,
  'R513A': 631,
  'R290': 0,
  'R600a': 0,
  'R600': 0,
  'R601': 0,
  'R601a': 0,
  'R744': 1,
  'R717': 0,
  'R170': 0,
  'R1234yf': 0.501,
  'R1234ze': 1.37,
  'R1336mzz(Z)': 2.08,
};

// "R-32", "r32", " R410A " -> "R32", "R410A"
export function normalizeRefrigerant(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const match = s.match(/^R[\s\-]*([0-9A-Za-z]+)(\([A-Za-z0-9]+\))?$/i);
  if (match) {
    const body = match[1].toUpperCase();
    const suffix = match[2] || '';
    return `R${body}${suffix}`;
  }
  return s.replace(/[\s\-]/g, '').toUpperCase();
}

export function gwpDe(refrigerante: any): number | undefined {
  return GWP_TABLE[normalizeRefrigerant(refrigerante)];
}

// tCO₂eq = carga (kg) × PCA / 1000
export function tco2eq(refrigerante: any, cargaKg: any): number | null {
  const gwp = gwpDe(refrigerante);
  if (gwp === undefined || !cargaKg) return null;
  return +((Number(cargaKg) * gwp) / 1000).toFixed(3);
}

// Periodicidad del control de fugas (Art. 5 Reg. UE 2024/573)
export function periodicidadMeses(tco2: any, hasLeakDetection = false, hermeticallySealed = false): number | null {
  const t = Number(tco2) || 0;
  const umbral = hermeticallySealed ? 10 : 5;
  if (t < umbral) return null;
  let base = 12;
  if (t >= 500) base = 3;
  else if (t >= 50) base = 6;
  return hasLeakDetection ? base * 2 : base;
}

export function addMonths(fechaISO: string, months: number): string {
  const base = new Date(fechaISO);
  if (isNaN(base.getTime())) return fechaISO;
  base.setMonth(base.getMonth() + months);
  return base.toISOString().split('T')[0];
}

// Campos calculados de un equipo a partir de su refrigerante y su carga.
// `baseFecha` es la fecha desde la que contar la próxima revisión (por defecto hoy).
export function fgasFieldsFrom(record: any, baseFecha?: string): Record<string, any> {
  const refrigerante = record?.refrigerant_type || record?.technical_data?.tipo_refrigerante || '';
  const carga = Number(record?.refrigerant_charge_kg ?? record?.technical_data?.carga_refrigerante) || 0;
  const gwp = gwpDe(refrigerante);
  const out: Record<string, any> = {};

  if (gwp === undefined || carga <= 0) return out;

  const tco2 = +((carga * gwp) / 1000).toFixed(3);
  out.gwp = gwp;
  out.co2_equivalent_tons = tco2;
  out.has_fluorinated_gas = tco2 >= 5;

  const meses = periodicidadMeses(tco2, !!record?.has_leak_detection_system, !!record?.is_hermetically_sealed);
  if (meses && !record?.leak_check_date_manual) {
    out.next_leak_check_date = addMonths(baseFecha || record?.next_leak_check_date || new Date().toISOString().split('T')[0], meses);
  }
  return out;
}