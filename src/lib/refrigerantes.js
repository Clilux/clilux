// Catálogo de refrigerantes más usados con su GWP (Potencial de Calentamiento Global).
// GWP según valores IPCC habituales para cálculo de tCO₂eq.
export const REFRIGERANTES = [
  { value: 'R410A', gwp: 2088 },
  { value: 'R32', gwp: 675 },
  { value: 'R134a', gwp: 1430 },
  { value: 'R407C', gwp: 1774 },
  { value: 'R407A', gwp: 2107 },
  { value: 'R407F', gwp: 1825 },
  { value: 'R404A', gwp: 3922 },
  { value: 'R507A', gwp: 3985 },
  { value: 'R448A', gwp: 1387 },
  { value: 'R449A', gwp: 1397 },
  { value: 'R452A', gwp: 2140 },
  { value: 'R452B', gwp: 676 },
  { value: 'R454B', gwp: 466 },
  { value: 'R513A', gwp: 631 },
  { value: 'R1234yf', gwp: 0.501 },
  { value: 'R1234ze', gwp: 1.37 },
  { value: 'R290', gwp: 0 },
  { value: 'R600a', gwp: 0 },
  { value: 'R744', gwp: 1 },
  { value: 'R717', gwp: 0 },
];

export const GWP_REF = Object.fromEntries(REFRIGERANTES.map((r) => [r.value, r.gwp]));

export function gwpDe(refrigerante) {
  return GWP_REF[refrigerante];
}

// tCO₂eq = carga (kg) × GWP / 1000
export function tco2eq(refrigerante, cargaKg) {
  const gwp = GWP_REF[refrigerante];
  if (gwp === undefined || !cargaKg) return null;
  return +(Number(cargaKg) * gwp / 1000).toFixed(3);
}