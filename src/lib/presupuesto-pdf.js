// Documento PDF de un presupuesto (A4) con la jerarquía de capítulos y partidas.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { arbolDe, cantidadPartida, esCapitulo, importeNodo, medicionTotal } from '@/lib/presto-arbol';

const AZUL = [79, 70, 229];

const euros = (n) =>
  `${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const fdate = (f) => {
  if (!f) return '—';
  try { return format(new Date(f), 'dd/MM/yyyy'); } catch { return f; }
};

const dimensiones = (m) =>
  [m.unidades, m.longitud, m.ancho, m.alto].map(v => (v === '' || v === undefined ? 1 : v)).join(' × ');

export function buildPresupuestoPDF({ presupuesto, client, empresa }) {
  const p = presupuesto || {};
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
  doc.text('PRESUPUESTO', M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const nombreEmpresa = empresa?.name || empresa?.company_name || '';
  if (nombreEmpresa) doc.text(nombreEmpresa, M, 19);
  doc.setFontSize(10);
  doc.text(`Nº ${p.numero || '—'}`, derecha, 13, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Fecha: ${fdate(p.fecha)}`, derecha, 19, { align: 'right' });
  if (p.fecha_validez) doc.text(`Válido hasta: ${fdate(p.fecha_validez)}`, derecha, 24, { align: 'right' });

  // Cliente y objeto
  y = 40;
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', M, y);
  doc.text('OBJETO', 110, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(client?.name || p.cliente_nombre || '—', M, y + 6);
  const objeto = doc.splitTextToSize(p.titulo || '—', 85);
  doc.text(objeto, 110, y + 6);
  y += 6 + Math.max(objeto.length * 5, 5) + 6;

  const cabeceraTabla = () => {
    doc.setFillColor(240, 241, 246);
    doc.rect(M, y - 5, W - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('CONCEPTO', M + 2, y);
    doc.text('UD', 132, y, { align: 'right' });
    doc.text('CANT.', 150, y, { align: 'right' });
    doc.text('PRECIO', 172, y, { align: 'right' });
    doc.text('IMPORTE', derecha - 2, y, { align: 'right' });
    y += 6;
  };

  const saltoPagina = (alto) => {
    if (y + alto > 268) {
      doc.addPage();
      y = 25;
      cabeceraTabla();
    }
  };

  cabeceraTabla();

  const emitir = (nodos, profundidad) => {
    nodos.forEach((n) => {
      const sangria = M + 2 + profundidad * 5;

      if (esCapitulo(n)) {
        saltoPagina(7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        doc.text(doc.splitTextToSize(`${n.codigo || ''}  ${n.resumen || ''}`, 112), sangria, y);
        doc.setTextColor(...AZUL);
        doc.text(euros(importeNodo(n)), derecha - 2, y, { align: 'right' });
        y += 6;
        doc.setDrawColor(220, 220, 225);
        doc.line(M, y - 2, derecha, y - 2);
        if ((n.hijos || []).length) emitir(n.hijos, profundidad + 1);
        return;
      }

      const texto = doc.splitTextToSize(`${n.codigo || ''}  ${n.resumen || ''}`, 108);
      saltoPagina(texto.length * 4.5 + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(texto, sangria, y);
      doc.text(n.unidad || 'ud', 132, y, { align: 'right' });
      doc.text(String(cantidadPartida(n)), 150, y, { align: 'right' });
      doc.text(euros(n.precio), 172, y, { align: 'right' });
      doc.text(euros(importeNodo(n)), derecha - 2, y, { align: 'right' });
      y += texto.length * 4.5;

      // Líneas de medición (etiqueta, unidades, longitud, ancho, alto)
      (n.mediciones || []).forEach((m) => {
        saltoPagina(4);
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text(`${m.etiqueta ? `${m.etiqueta}: ` : ''}${dimensiones(m)}`, sangria + 4, y);
        doc.text(String(medicionTotal(m)), 150, y, { align: 'right' });
        y += 3.6;
      });

      y += 1.5;
      doc.setDrawColor(240, 240, 242);
      doc.line(M, y - 1.5, derecha, y - 1.5);
    });
  };

  emitir(arbolDe(p), 0);

  // Totales
  y += 4;
  if (y > 250) { doc.addPage(); y = 25; }
  const subtotal = Number(p.subtotal) || 0;
  const ivaPct = Number(p.iva) || 0;
  const ivaImporte = subtotal * ivaPct / 100;
  const total = Number(p.total) || subtotal + ivaImporte;
  const xEtq = 130;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Base imponible', xEtq, y);
  doc.text(euros(subtotal), derecha - 2, y, { align: 'right' });
  doc.text(`IVA ${ivaPct} %`, xEtq, y + 6);
  doc.text(euros(ivaImporte), derecha - 2, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...AZUL);
  doc.text('TOTAL', xEtq, y + 14);
  doc.text(euros(total), derecha - 2, y + 14, { align: 'right' });

  y += 24;
  if (p.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text('OBSERVACIONES', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(doc.splitTextToSize(p.observaciones, W - M * 2), M, y + 5);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text('Documento generado por Clilux · Estructura compatible con FIEBDC-3 (Presto)', M, 288);

  return doc;
}

export function descargarPresupuestoPDF(args) {
  const doc = buildPresupuestoPDF(args);
  doc.save(`Presupuesto_${(args?.presupuesto?.numero || 'borrador').replace(/\s+/g, '_')}.pdf`);
}