// Catálogo de refrigerantes con su GWP (Potencial de Calentamiento Global).
// GWP según Reglamento (UE) 2024/573 – Anexo I (AR4 para HFCs) y Anexo VI
// (media ponderada para mezclas). Fuente: fabricantes y Gas Servei.
//
// Tabla única (fuente de verdad) usada por FGasTab, CumplimientoTab y
// cualquier cálculo de tCO₂eq.

export const GWP_TABLE = {
  // HFC puros – Sección 1 Anexo I
  'R23':    14800,  // HFC-23 trifluorometano
  'R32':    675,    // HFC-32 difluorometano
  'R125':   3500,   // HFC-125 pentafluoretano
  'R134a':  1430,   // HFC-134a 1,1,1,2-tetrafluoroetano
  'R143a':  4470,   // HFC-143a 1,1,1-trifluoroetano
  'R152a':  124,    // HFC-152a 1,1-difluoroetano
  'R227ea': 3220,   // HFC-227ea heptafluoropropano
  'R236fa': 9810,   // HFC-236fa hexafluoropropano
  'R245fa': 1030,   // HFC-245fa pentafluoropropano
  'R365mfc':794,    // HFC-365mfc pentafluorobutano

  // Mezclas zeótropas – GWP calculado por media ponderada Anexo VI
  'R404A':  3922,
  'R407A':  2107,
  'R407C':  1774,
  'R407F':  1825,
  'R407H':  1495,
  'R410A':  2088,
  'R410B':  2229,
  'R417A':  2346,
  'R422A':  3143,
  'R422D':  2729,
  'R427A':  2138,
  'R437A':  1805,
  'R438A':  2265,
  'R442A':  1888,
  'R448A':  1387,
  'R449A':  1397,
  'R449B':  1412,
  'R449C':  1396,
  'R450A':  601,
  'R452A':  2140,
  'R452B':  676,
  'R454A':  239,
  'R454B':  466,
  'R454C':  148,
  'R455A':  148,
  'R457A':  139,
  'R458A':  702,
  'R459A':  444,
  'R459B':  544,
  'R466A':  733,
  'R507A':  3985,
  'R513A':  631,

  // Refrigerantes naturales – GWP por defecto Anexo VI Reg. 2024/573
  'R290':   0,      // propano
  'R600a':  0,      // isobutano
  'R600':   0,      // butano
  'R601':   0,      // pentano
  'R601a':  0,      // isopentano
  'R744':   1,      // CO2
  'R717':   0,      // amoniaco
  'R170':   0,      // etano
  'R1234yf':0.501,  // HFO-1234yf (Anexo II)
  'R1234ze':1.37,   // HFO-1234ze (Anexo II)
  'R1336mzz(Z)': 2.08, // HFO-1336mzz(Z)
};

export const REFRIGERANTES = Object.entries(GWP_TABLE).map(([value, gwp]) => ({ value, gwp }));

// Normaliza el nombre de un refrigerante para lookup en GWP_TABLE.
// Acepta variantes: "R-32", "r32", "R 32", " R410A " → "R32", "R410A"
// Conserva sufijos entre paréntesis (ej: R1336mzz(Z)).
export function normalizeRefrigerant(raw) {
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

// Devuelve el GWP (number) de un refrigerante, o undefined si no existe.
export function gwpDe(refrigerante) {
  return GWP_TABLE[normalizeRefrigerant(refrigerante)];
}

// Alias semántico para componentes F-Gas.
export const getGWP = gwpDe;

// tCO₂eq = carga (kg) × GWP / 1000
export function tco2eq(refrigerante, cargaKg) {
  const gwp = gwpDe(refrigerante);
  if (gwp === undefined || !cargaKg) return null;
  return +(Number(cargaKg) * gwp / 1000).toFixed(3);
}