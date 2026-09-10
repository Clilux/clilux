// Memoria Técnica RITE — IT.1 del RITE (RD 1027/2007)
// Genera un PDF A4 pre-rellenado con los datos técnicos del equipo e instalación.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND_RGB = [47, 88, 110];

export function generarMemoriaRitePDF({ equipment, building, client, companyInfo }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 0;

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MEMORIA TÉCNICA RITE', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('IT.1 del Reglamento de Instalaciones Térmicas (RD 1027/2007)', margin, 18);
  doc.text(`Fecha emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, 23);

  const eq = equipment || {};
  const bld = building || {};
  const cli = client || {};
  const emp = companyInfo || {};
  const td = eq.technical_data || {};

  const section = (title) => {
    y += 6;
    doc.setFillColor(...BRAND_RGB);
    doc.rect(margin, y - 4, pageW - margin * 2, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, margin + 2, y);
    y += 6;
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
  };
  const row = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    const val = String(value ?? '—');
    const wrapped = doc.splitTextToSize(val, pageW - margin * 2 - 55);
    doc.text(wrapped, margin + 55, y);
    y += Math.max(4.5, wrapped.length * 4);
  };

  y = 32;
  doc.setTextColor(40, 40, 40);

  section('1. IDENTIFICACIÓN DE LA INSTALACIÓN');
  row('Titular', cli.name);
  row('CIF/NIF', cli.cif);
  row('Dirección', `${bld.address || ''}, ${bld.city || ''}`);
  row('Edificio', bld.name);
  row('Ubicación equipo', eq.location);

  section('2. DESCRIPCIÓN DEL EQUIPO');
  row('Equipo', eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim());
  row('Tipo', eq.equipment_type);
  row('Marca / Modelo', `${eq.brand || '—'} / ${eq.model || '—'}`);
  row('Nº serie', eq.serial_number);
  row('Fecha instalación', eq.installation_date ? format(new Date(eq.installation_date), 'dd/MM/yyyy', { locale: es }) : '—');
  row('Potencia frigorífica', eq.cooling_power_kw ? `${eq.cooling_power_kw} kW` : '—');
  row('Potencia calorífica', eq.heating_power_kw ? `${eq.heating_power_kw} kW` : '—');

  section('3. DATOS TÉCNICOS');
  row('Refrigerante', eq.refrigerant_type || '—');
  row('Carga refrigerante', eq.refrigerant_charge_kg ? `${eq.refrigerant_charge_kg} kg` : '—');
  row('GWP', eq.gwp ?? '—');
  row('tCO₂eq', eq.co2_equivalent_tons ?? '—');
  row('Volumen balsa', eq.balsa_litros ? `${eq.balsa_litros} L` : '—');
  row('Tipo combustible', td.tipo_combustible || '—');
  row('Año fabricación', td.año_fabricacion || '—');

  section('4. CUMPLIMIENTO NORMATIVO');
  const power = Math.max(eq.cooling_power_kw || 0, eq.heating_power_kw || 0);
  let cat = 'No clasificado';
  if (power > 0 && power <= 70) cat = '5 kW ≤ P ≤ 70 kW — Mantenimiento simplificado';
  else if (power > 70 && power <= 5000) cat = '70 kW < P ≤ 5.000 kW — Mantenimiento reforzado';
  else if (power > 5000) cat = 'P > 5.000 kW — Director de mantenimiento';
  row('Categoría RITE', cat);
  row('Control de fugas F-Gas', eq.has_fluorinated_gas ? 'Aplicable (Reg. UE 2024/573)' : 'No aplicable');
  row('Próximo control fugas', eq.next_leak_check_date ? format(new Date(eq.next_leak_check_date), 'dd/MM/yyyy', { locale: es }) : '—');

  section('5. EMPRESA MANTENEDORA');
  row('Empresa', emp.name || emp.company_name || '—');
  row('CIF', emp.cif || emp.company_cif || '—');
  row('Dirección', emp.address || emp.company_address || '—');
  row('Teléfono', emp.phone || emp.company_phone || '—');

  if (eq.notes) {
    section('6. OBSERVACIONES');
    const obs = doc.splitTextToSize(eq.notes, pageW - margin * 2);
    doc.text(obs, margin, y);
    y += obs.length * 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado por Clilux — Conforme IT.1 RITE (RD 1027/2007).', margin, 290);

  const nombre = `Memoria_RITE_${(eq.reference_name || eq.brand || 'equipo').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(nombre);
}