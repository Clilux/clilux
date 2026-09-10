// Registro de Limpieza y Desinfección (L+D) — Legionella
// RD 865/2003 / RD 487/2022 — genera un PDF A4 pre-rellenado con la última intervención.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND_RGB = [47, 88, 110];

export function generarRegistroLdPDF({ equipment, building, client, intervention, companyInfo }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 0;

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REGISTRO DE LIMPIEZA Y DESINFECCIÓN', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Prevención de Legionella — RD 865/2003 / RD 487/2022', margin, 18);
  doc.text(`Fecha emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, 23);

  const eq = equipment || {};
  const inter = intervention || {};
  const emp = companyInfo || {};

  y = 34;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DEL EQUIPO', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const lines = [
    `Equipo: ${eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || '—'}`,
    `Tipo: ${eq.equipment_type || '—'}   ·   Volumen balsa: ${eq.balsa_litros ? eq.balsa_litros + ' L' : '—'}`,
    `Cliente: ${client?.name || '—'}   ·   Edificio: ${building?.name || '—'}`,
    `Ubicación: ${eq.location || building?.address || '—'}`,
  ];
  lines.forEach((line) => { doc.text(line, margin, y); y += 4.5; });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DE LA INTERVENCIÓN', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const fecha = inter.fecha ? format(new Date(inter.fecha), 'dd/MM/yyyy', { locale: es }) : '—';
  doc.text(`Fecha: ${fecha}   ·   Tipo: ${inter.tipo_tratamiento || '—'}`, margin, y); y += 4.5;
  doc.text(`Protocolo: ${inter.protocolo_id || '—'}   ·   Estado: ${inter.estado_conservacion || '—'}`, margin, y); y += 4.5;
  doc.text(`Hora inicio: ${inter.hora_inicio || '—'}   ·   Hora fin: ${inter.hora_fin || '—'}`, margin, y); y += 4.5;
  doc.text(`Producto: ${inter.producto_principal || '—'}   ·   Hipoclorito: ${inter.hipoclorito_ml || '—'} ml`, margin, y); y += 4.5;
  doc.text(`pH inicial: ${inter.ph_inicial || '—'}   ·   pH final: ${inter.ph_final || '—'}`, margin, y); y += 4.5;
  doc.text(`Cloro libre inicial: ${inter.cloro_libre_inicial || '—'} ppm   ·   Final: ${inter.cloro_libre_final || '—'} ppm`, margin, y); y += 4.5;
  doc.text(`Tiempo recirculación: ${inter.tiempo_recirculacion_min || '—'} min`, margin, y); y += 4.5;

  if (inter.observaciones) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', margin, y); y += 4.5;
    doc.setFont('helvetica', 'normal');
    const obs = doc.splitTextToSize(inter.observaciones, pageW - margin * 2);
    doc.text(obs, margin, y); y += obs.length * 4;
  }

  // Próxima revisión
  y += 6;
  doc.setFillColor(245, 247, 249);
  doc.rect(margin, y - 4, pageW - margin * 2, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
  doc.setFontSize(9);
  doc.text('PRÓXIMA L+D', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const proxima = inter.proxima_revision_fecha || eq.next_leak_check_date;
  doc.text(proxima ? format(new Date(proxima), 'dd/MM/yyyy', { locale: es }) : '—', margin + 50, y);

  // Responsable técnico
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text('RESPONSABLE TÉCNICO', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Nombre: ${inter.responsable_tecnico_nombre || '—'}`, margin, y); y += 4.5;
  doc.text(`DNI: ${inter.responsable_tecnico_dni || '—'}`, margin, y); y += 4.5;
  doc.text(`Empresa: ${inter.responsable_tecnico_empresa || emp.name || '—'}`, margin, y); y += 4.5;
  doc.text(`Cualificación: ${inter.responsable_tecnico_cualificacion || '—'}`, margin, y); y += 4.5;

  // Firmas
  y = Math.max(y + 8, 250);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Firma aplicador', margin, y + 5);
  doc.text('Firma responsable técnico', pageW - margin - 70, y + 5);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado por Clilux — Conforme RD 865/2003 / RD 487/2022.', margin, 290);

  const nombre = `Registro_LD_${(eq.reference_name || eq.brand || 'equipo').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(nombre);
}