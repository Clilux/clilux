// Certificado de Control de Fugas — Reglamento (UE) 2024/573 (Art. 5)
// Genera un PDF A4 pre-rellenado con los datos del equipo y la última intervención.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND_RGB = [47, 88, 110]; // RAL 5001

export function generarCertificadoFugasPDF({ equipment, building, client, intervention, companyInfo }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 0;

  // Cabecera
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CERTIFICADO DE CONTROL DE FUGAS', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Reglamento (UE) 2024/573 — Art. 5  ·  Gases fluorados de efecto invernadero', margin, 18);
  doc.text(`Fecha emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, 23);

  const inter = intervention || {};
  const emp = companyInfo || {};

  // Datos del operador / empresa mantenedora
  y = 34;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA MANTENEDORA / OPERADOR', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Empresa: ${inter.empresa_mantenedora || emp.name || emp.company_name || '—'}`, margin, y); y += 4.5;
  doc.text(`Cert. empresa F-Gas: ${inter.empresa_cert_num || emp.fgas_company_cert_num || '—'}`, margin, y); y += 4.5;
  doc.text(`Técnico: ${inter.tecnico_nombre || '—'}`, margin, y); y += 4.5;
  doc.text(`Cert. personal F-Gas: ${inter.tecnico_cert_num || '—'}`, margin, y);

  // Datos del equipo
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EQUIPO / INSTALACIÓN', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const eq = equipment || {};
  const equipoLines = [
    `Equipo: ${eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || '—'}`,
    `Tipo: ${eq.equipment_type || '—'}   ·   Nº serie: ${eq.serial_number || '—'}`,
    `Cliente: ${client?.name || '—'}   ·   Edificio: ${building?.name || '—'}`,
    `Ubicación: ${eq.location || building?.address || '—'}`,
    `Refrigerante: ${inter.refrigerante_tipo || eq.refrigerant_type || '—'}   ·   Carga: ${inter.carga_total_kg ?? eq.refrigerant_charge_kg ?? '—'} kg`,
    `GWP: ${inter.gwp ?? eq.gwp ?? '—'}   ·   tCO₂eq: ${inter.co2_equivalent_tons ?? eq.co2_equivalent_tons ?? '—'}`,
  ];
  equipoLines.forEach((line) => { doc.text(line, margin, y); y += 4.5; });

  // Datos de la intervención
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INTERVENCIÓN REALIZADA', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const fechaInt = inter.fecha_intervencion ? format(new Date(inter.fecha_intervencion), 'dd/MM/yyyy', { locale: es }) : '—';
  doc.text(`Fecha: ${fechaInt}   ·   Tipo: ${inter.tipo_intervencion || 'control_fugas'}`, margin, y); y += 4.5;
  doc.text(`Gas añadido: ${inter.gas_anyadido_kg || 0} kg (${inter.tipo_gas_anyadido || '—'})   ·   Gas recuperado: ${inter.gas_recuperado_kg || 0} kg`, margin, y); y += 4.5;

  // Resultado del control de fugas
  const resultado = inter.control_fugas_resultado || 'no_aplica';
  const resultadoLabel = resultado === 'apto' ? 'APTO — Sin fugas detectadas' : resultado === 'no_apto' ? 'NO APTO — Fuga detectada' : 'No aplica';
  doc.setFont('helvetica', 'bold');
  doc.text(`Resultado control de fugas: ${resultadoLabel}`, margin, y); y += 5;
  doc.setFont('helvetica', 'normal');
  if (inter.fuga_localizada || resultado === 'no_apto') {
    doc.text(`Localización fuga: ${inter.fuga_ubicacion || '—'}`, margin, y); y += 4.5;
    doc.text(`Fecha reparación: ${inter.fuga_fecha_reparacion ? format(new Date(inter.fuga_fecha_reparacion), 'dd/MM/yyyy', { locale: es }) : '—'}`, margin, y); y += 4.5;
  }
  if (inter.gestor_residuos) {
    doc.text(`Gestor de residuos: ${inter.gestor_residuos} ${inter.gestor_residuos_num ? `(${inter.gestor_residuos_num})` : ''}`, margin, y); y += 4.5;
  }
  if (inter.observaciones) {
    doc.text('Observaciones:', margin, y); y += 4.5;
    const obs = doc.splitTextToSize(inter.observaciones, pageW - margin * 2);
    doc.text(obs, margin, y); y += obs.length * 4;
  }

  // Próxima revisión
  y += 4;
  doc.setFillColor(245, 247, 249);
  doc.rect(margin, y - 4, pageW - margin * 2, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
  doc.text('PRÓXIMO CONTROL DE FUGAS', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  const proxima = inter.proxima_revision_fecha || eq.next_leak_check_date;
  doc.text(proxima ? format(new Date(proxima), 'dd/MM/yyyy', { locale: es }) : 'No obligatorio', margin + 70, y);

  // Firmas
  y += 20;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Firma técnico', margin, y + 5);
  doc.text('Firma operador / cliente', pageW - margin - 70, y + 5);

  // Pie
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado por Clilux — Conforme Reglamento (UE) 2024/573. Conservación mínima 5 años (Art. 7).', margin, 290);

  const nombre = `Certificado_Fugas_${(eq.reference_name || eq.brand || 'equipo').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(nombre);
}