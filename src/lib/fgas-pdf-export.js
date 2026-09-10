import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPO_LABELS = {
  control_fugas: 'Control Fugas',
  carga_gas: 'Carga Gas',
  recuperacion_gas: 'Recuperación',
  mantenimiento: 'Mantenimiento',
  reparacion: 'Reparación',
  instalacion: 'Instalación',
  desguace: 'Desguace',
  trasvase: 'Trasvase',
  eliminacion: 'Eliminación',
};

export function exportarLibroFGasPDF(registros, companyInfo, filtrosDesc) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;
  const margin = 10;
  let y = margin;

  // Cabecera
  doc.setFillColor(47, 88, 110); // RAL 5001
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('LIBRO DE REGISTRO DE GASES FLUORADOS', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Real Decreto 115/2017  |  Reglamento (UE) 2024/573  |  Conservación mínima: 5 años', margin, 18);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, margin, 23);

  // Datos de la empresa
  y = 34;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA MANIPULADORA:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  const emp = companyInfo || {};
  doc.setFontSize(8);
  doc.text(`${emp.name || emp.company_name || '—'}`, margin, y);
  doc.text(`CIF: ${emp.cif || emp.company_cif || '—'}`, margin + 80, y);
  doc.text(`Cert. Empresa: ${emp.fgas_company_cert_num || '—'}`, margin + 140, y);
  y += 4;
  doc.text(`Dirección: ${emp.address || emp.company_address || '—'}`, margin, y);
  y += 4;
  doc.text(`Tel: ${emp.phone || emp.company_phone || '—'}   Email: ${emp.email || emp.company_email || '—'}`, margin, y);

  // Filtros aplicados
  if (filtrosDesc) {
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Filtros: ${filtrosDesc}`, margin, y);
  }

  // Resumen
  y += 6;
  const totalGasAnyadido = registros.reduce((s, r) => s + (Number(r.gas_anyadido_kg) || 0), 0);
  const totalGasRecuperado = registros.reduce((s, r) => s + (Number(r.gas_recuperado_kg) || 0), 0);
  const totaltCO2 = registros.reduce((s, r) => s + (Number(r.co2_equivalent_tons) || 0), 0);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`RESUMEN: ${registros.length} operaciones | Gas añadido: ${totalGasAnyadido.toFixed(2)} kg | Gas recuperado: ${totalGasRecuperado.toFixed(2)} kg | Total: ${totaltCO2.toFixed(3)} tCO₂eq`, margin, y);

  // Tabla
  y += 4;
  const cols = [
    { header: 'Nº', w: 8 },
    { header: 'Fecha', w: 18 },
    { header: 'Tipo', w: 22 },
    { header: 'Equipo / Cliente', w: 45 },
    { header: 'Refrig.', w: 16 },
    { header: 'Carga', w: 12 },
    { header: 'Gas añ.', w: 14 },
    { header: 'Gas rec.', w: 14 },
    { header: 'tCO₂eq', w: 14 },
    { header: 'Técnico', w: 35 },
    { header: 'Empresa', w: 38 },
    { header: 'Gestor', w: 30 },
  ];
  const colX = [margin];
  cols.forEach((c, i) => colX.push(colX[i] + c.w));

  // Header de tabla
  doc.setFillColor(47, 88, 110);
  doc.rect(margin, y, colX[colX.length - 1] - margin, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  cols.forEach((c, i) => doc.text(c.header, colX[i] + 1, y + 4));
  y += 6;

  // Filas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const registrosOrdenados = [...registros].sort((a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion));
  const rowH = 5;
  let rowNum = 1;

  for (const r of registrosOrdenados) {
    if (y + rowH > pageH - 12) {
      doc.addPage();
      y = margin;
      doc.setFillColor(47, 88, 110);
      doc.rect(margin, y, colX[colX.length - 1] - margin, 6, 'F');
      doc.setTextColor(255, 255, 255);
      cols.forEach((c, i) => doc.text(c.header, colX[i] + 1, y + 4));
      y += 6;
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
    }

    if (rowNum % 2 === 0) {
      doc.setFillColor(245, 247, 249);
      doc.rect(margin, y, colX[colX.length - 1] - margin, rowH, 'F');
    }

    doc.setTextColor(40, 40, 40);
    const equipoText = r.equipment_name || r.client_name || '— (standalone)';
    const fecha = r.fecha_intervencion ? format(new Date(r.fecha_intervencion), 'dd/MM/yy') : '';
    const values = [
      String(rowNum),
      fecha,
      TIPO_LABELS[r.tipo_intervencion] || r.tipo_intervencion || '',
      equipoText.substring(0, 40),
      r.refrigerante_tipo || '',
      r.carga_total_kg ? Number(r.carga_total_kg).toFixed(1) : '',
      r.gas_anyadido_kg ? `+${Number(r.gas_anyadido_kg).toFixed(2)}` : '',
      r.gas_recuperado_kg ? `−${Number(r.gas_recuperado_kg).toFixed(2)}` : '',
      r.co2_equivalent_tons ? Number(r.co2_equivalent_tons).toFixed(3) : '',
      (r.tecnico_nombre || '').substring(0, 25),
      (r.empresa_mantenedora || '').substring(0, 28),
      (r.gestor_residuos || '').substring(0, 22),
    ];
    values.forEach((v, i) => doc.text(String(v), colX[i] + 1, y + 3.5));

    y += rowH;
    rowNum++;
  }

  // Pie con número de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pageCount}`, pageW - 30, pageH - 5);
    doc.text('Documento generado por Clilux — Conforme RD 115/2017', margin, pageH - 5);
  }

  doc.save(`Libro_Registro_FGas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}