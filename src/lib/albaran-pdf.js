// Documento PDF de un albarán de trabajo (A4) con el técnico que lo realiza.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const AZUL = [79, 70, 229];
const GRIS = [90, 90, 90];

const euros = (n) =>
  `${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const fdate = (f) => {
  if (!f) return '—';
  try { return format(new Date(f), 'dd/MM/yyyy'); } catch { return f; }
};

/**
 * jsPDF no admite URLs remotas en addImage: la imagen debe llegar como data URL.
 * Devuelve null si no se puede leer (el documento se emite igualmente).
 */
export async function imagenADataURL(url) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildAlbaranPDF({ albaran = {}, lineas = [], hideRates = false, empresa, firmaDataUrl = null }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  const derecha = W - M;
  let y = 0;

  // Cabecera
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ALBARÁN DE TRABAJO', M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const nombreEmpresa = empresa?.name || empresa?.company_name || '';
  if (nombreEmpresa) doc.text(nombreEmpresa, M, 19);
  doc.setFontSize(10);
  doc.text(`Nº ${albaran.numero || '—'}`, derecha, 13, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Fecha: ${fdate(albaran.fecha)}`, derecha, 19, { align: 'right' });

  // Cliente, técnico y objeto
  y = 42;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('CLIENTE', M, y);
  doc.text('TÉCNICO', 110, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(albaran.client_name || '—', M, y + 6);
  doc.text(albaran.tecnico_nombre || '—', 110, y + 6);
  y += 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('OBJETO', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const objeto = doc.splitTextToSize(albaran.titulo || '—', W - M * 2);
  doc.text(objeto, M, y + 6);
  y += 6 + Math.max(objeto.length * 5, 5) + 4;

  const extras = [
    albaran.capitulo && `Capítulo: ${albaran.capitulo}`,
    albaran.obra_nombre && `Obra: ${albaran.obra_nombre}`,
  ].filter(Boolean);
  if (extras.length) {
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(extras.join('   ·   '), M, y);
    y += 8;
  }

  // Cabecera de líneas
  const cabeceraTabla = () => {
    doc.setFillColor(240, 241, 246);
    doc.rect(M, y - 5, W - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('CONCEPTO', M + 2, y);
    doc.text('UD', 132, y, { align: 'right' });
    doc.text('CANT.', 150, y, { align: 'right' });
    if (!hideRates) {
      doc.text('PRECIO', 172, y, { align: 'right' });
      doc.text('IMPORTE', derecha - 2, y, { align: 'right' });
    }
    y += 6;
  };
  const saltoPagina = (alto) => {
    if (y + alto > 262) { doc.addPage(); y = 25; cabeceraTabla(); }
  };

  cabeceraTabla();

  lineas.forEach((l) => {
    const texto = doc.splitTextToSize(l.descripcion || l.concepto || '', hideRates ? 150 : 108);
    saltoPagina(texto.length * 4.5 + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(texto, M + 2, y);
    doc.text(l.unidad || 'ud', 132, y, { align: 'right' });
    doc.text(String(Number(l.cantidad) || 0), 150, y, { align: 'right' });
    if (!hideRates) {
      doc.text(euros(l.precio_unitario), 172, y, { align: 'right' });
      doc.text(euros(l.subtotal), derecha - 2, y, { align: 'right' });
    }
    y += texto.length * 4.5 + 1.5;
    doc.setDrawColor(240, 240, 242);
    doc.line(M, y - 2, derecha, y - 2);
  });

  // Totales
  if (hideRates) {
    y += 6;
  } else {
    y += 4;
    if (y > 240) { doc.addPage(); y = 25; }
    const base = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0);
    const total = lineas.reduce((s, l) => s + (Number(l.subtotal) || 0), 0);
    const descuento = base - total;
    const xEtq = 130;
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Base', xEtq, y);
    doc.text(euros(base), derecha - 2, y, { align: 'right' });
    if (descuento > 0) {
      y += 6;
      doc.text('Descuento', xEtq, y);
      doc.text(`-${euros(descuento)}`, derecha - 2, y, { align: 'right' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...AZUL);
    doc.text('TOTAL', xEtq, y + 8);
    doc.text(euros(total), derecha - 2, y + 8, { align: 'right' });
    y += 18;
  }

  // Firma
  if (y > 225) { doc.addPage(); y = 25; }
  doc.setDrawColor(210, 210, 215);
  doc.line(M, y, M + 70, y);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  if (firmaDataUrl) {
    try { doc.addImage(firmaDataUrl, 'PNG', M, y - 26, 70, 24); } catch { /* firma no disponible */ }
    doc.text(`Firmado por: ${albaran.firmante_nombre || albaran.client_name || '—'}`, M, y + 5);
  } else {
    doc.text('Firma del cliente', M, y + 5);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text('Documento generado por Clilux', M, 288);

  return doc;
}

export function descargarAlbaranPDF(args) {
  const doc = buildAlbaranPDF(args);
  doc.save(`Albaran_${(args?.albaran?.numero || 'borrador').replace(/\s+/g, '_')}.pdf`);
}