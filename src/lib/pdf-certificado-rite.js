// Certificado RITE de Mantenimiento — IT.3 del RITE (RD 1027/2007)
// Genera un PDF A4 pre-rellenado con los datos del equipo y la configuración de mantenimiento.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND_RGB = [47, 88, 110];

export function generarCertificadoRitePDF({ equipment, building, client, companyInfo }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 0;

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CERTIFICADO DE MANTENIMIENTO RITE', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('IT.3 del Reglamento de Instalaciones Térmicas (RD 1027/2007)  ·  Tablas 4.1–4.4', margin, 18);
  doc.text(`Fecha emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, 23);

  const eq = equipment || {};
  const emp = companyInfo || {};
  const power = Math.max(eq.cooling_power_kw || 0, eq.heating_power_kw || 0);

  y = 34;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DE LA INSTALACIÓN', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const lines = [
    `Equipo: ${eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || '—'}`,
    `Tipo: ${eq.equipment_type || '—'}   ·   Nº serie: ${eq.serial_number || '—'}`,
    `Potencia frigorífica: ${eq.cooling_power_kw || '—'} kW   ·   Potencia calorífica: ${eq.heating_power_kw || '—'} kW`,
    `Cliente: ${client?.name || '—'}`,
    `Edificio: ${building?.name || '—'}   ·   ${building?.address || ''}`,
    `Ubicación: ${eq.location || '—'}`,
    `Fecha instalación: ${eq.installation_date ? format(new Date(eq.installation_date), 'dd/MM/yyyy', { locale: es }) : '—'}`,
  ];
  lines.forEach((line) => { doc.text(line, margin, y); y += 4.5; });

  // Categoría RITE según potencia
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CATEGORIZACIÓN RITE SEGÚN POTENCIA', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let category = 'Sin clasificar', maintType = '—', frequency = '—';
  if (power > 0 && power <= 70) { category = '5 kW ≤ P ≤ 70 kW'; maintType = 'Empresa mantenedora'; frequency = 'Anual (tabla 4.1)'; }
  else if (power > 70 && power <= 5000) { category = '70 kW < P ≤ 5.000 kW'; maintType = 'Empresa mantenedora autorizada'; frequency = 'Mensual y trimestral (tablas 4.1–4.4)'; }
  else if (power > 5000) { category = 'P > 5.000 kW'; maintType = 'Director de mantenimiento + Empresa mantenedora'; frequency = 'Mensual, trimestral y semestral'; }
  doc.text(`Potencia total: ${power} kW`, margin, y); y += 4.5;
  doc.text(`Categoría: ${category}`, margin, y); y += 4.5;
  doc.text(`Mantenimiento: ${maintType}`, margin, y); y += 4.5;
  doc.text(`Frecuencia: ${frequency}`, margin, y); y += 4.5;

  // Plan de mantenimiento configurado
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PLAN DE MANTENIMIENTO CONFIGURADO', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const mc = eq.maintenance_config || {};
  const periods = [
    { key: 'monthly_enabled', label: 'Mensual' },
    { key: 'quarterly_enabled', label: 'Trimestral' },
    { key: 'biannual_enabled', label: 'Semestral' },
    { key: 'annual_enabled', label: 'Anual' },
  ];
  const activos = periods.filter((p) => mc[p.key]).map((p) => p.label);
  doc.text(`Periodicidades activas: ${activos.length ? activos.join(', ') : '—'}`, margin, y); y += 4.5;
  const totalFields = (mc.monthly_fields?.length || 0) + (mc.quarterly_fields?.length || 0) + (mc.biannual_fields?.length || 0) + (mc.annual_fields?.length || 0);
  doc.text(`Parámetros a controlar: ${totalFields}`, margin, y); y += 4.5;

  // Empresa mantenedora
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EMPRESA MANTENEDORA', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Empresa: ${emp.name || emp.company_name || '—'}`, margin, y); y += 4.5;
  doc.text(`CIF: ${emp.cif || emp.company_cif || '—'}`, margin, y); y += 4.5;
  doc.text(`Nº mantenedor RITE: ${eq.fgas_tech_cert_num || eq.rite_cert_num || '—'}`, margin, y); y += 4.5;

  // Firmas
  y = Math.max(y + 10, 230);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Firma técnico mantenedor', margin, y + 5);
  doc.text('Firma cliente / operador', pageW - margin - 70, y + 5);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado por Clilux — Conforme IT.3 RITE (RD 1027/2007).', margin, 290);

  const nombre = `Certificado_RITE_${(eq.reference_name || eq.brand || 'equipo').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(nombre);
}