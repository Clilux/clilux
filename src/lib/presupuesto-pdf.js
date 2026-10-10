// Documento PDF de un presupuesto (A4) con la jerarquía de capítulos y partidas,
// el logo de la empresa emisora y una marca de agua de fondo.
import { jsPDF } from 'jspdf';
import { arbolDe, cantidadPartida, esCapitulo, importeNodo, medicionTotal } from '@/lib/presto-arbol';
import {
  AZUL, AZUL_OSCURO, cabeceraDocumento, cajaDatos, cargarImagen,
  datosCliente, datosEmpresa, decorarPaginas, euros, fdate,
} from '@/lib/pdf-marca';

const W = 210;
const H = 297;
const M = 15;
const derecha = W - M;
const LIMITE = 262; // último milímetro útil antes del pie de página

const dimensiones = (m) =>
  [m.unidades, m.longitud, m.ancho, m.alto].map(v => (v === '' || v === undefined ? 1 : v)).join(' × ');

export async function buildPresupuestoPDF({ presupuesto, client, empresa }) {
  const p = presupuesto || {};
  const logo = await cargarImagen(empresa?.logo_url);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  cabeceraDocumento(doc, {
    titulo: 'PRESUPUESTO',
    empresa,
    logo,
    meta: [
      ['Nº', p.numero || '—'],
      ['Fecha', fdate(p.fecha)],
      p.fecha_validez ? ['Válido hasta', fdate(p.fecha_validez)] : null,
    ].filter(Boolean),
    W, M,
  });

  // ── Emisor y cliente ────────────────────────────────────────────
  y = 43;
  const altoEmisor = cajaDatos(doc, { x: M, y, w: 87, titulo: 'EMISOR', lineas: datosEmpresa(empresa) });
  const altoCliente = cajaDatos(doc, { x: derecha - 87, y, w: 87, titulo: 'CLIENTE', lineas: datosCliente(client) });
  y += Math.max(altoEmisor, altoCliente) + 5;

  // ── Objeto del presupuesto ──────────────────────────────────────
  const objeto = doc.splitTextToSize(p.titulo || 'Sin título', 108);
  const altoObjeto = Math.max(13 + objeto.length * 4.8, 27);
  doc.setFillColor(...AZUL_OSCURO);
  doc.roundedRect(M, y, W - M * 2, altoObjeto, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text('OBJETO DEL PRESUPUESTO', M + 5, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(objeto, M + 5, y + 13);

  let yd = y + 7;
  [['Técnico', p.created_by_name || '—'], ['Estado', p.status || 'borrador']].forEach(([etq, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(165, 180, 252);
    doc.text(String(etq).toUpperCase(), derecha - 5, yd, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(String(val), derecha - 5, yd + 4, { align: 'right' });
    yd += 9;
  });
  y += altoObjeto + 7;

  // ── Tabla de conceptos ──────────────────────────────────────────
  const cabeceraTabla = () => {
    doc.setFillColor(...AZUL);
    doc.rect(M, y - 5.5, W - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('CONCEPTO', M + 3, y);
    doc.text('UD', 132, y, { align: 'right' });
    doc.text('CANT.', 150, y, { align: 'right' });
    doc.text('PRECIO', 172, y, { align: 'right' });
    doc.text('IMPORTE', derecha - 3, y, { align: 'right' });
    y += 6.5;
  };

  const saltoPagina = (alto) => {
    if (y + alto > LIMITE) {
      doc.addPage();
      y = 22;
      cabeceraTabla();
    }
  };

  cabeceraTabla();
  let fila = 0;

  const emitir = (nodos, profundidad) => {
    nodos.forEach((n) => {
      const sangria = M + 3 + profundidad * 5;

      if (esCapitulo(n)) {
        saltoPagina(9);
        doc.setFillColor(238, 242, 255);
        doc.rect(M, y - 4.8, W - M * 2, 7, 'F');
        doc.setDrawColor(...AZUL);
        doc.setLineWidth(0.6);
        doc.line(M, y - 4.8, M, y + 2.2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(49, 46, 129);
        doc.text(doc.splitTextToSize(`${n.codigo || ''}  ${n.resumen || ''}`, 108), sangria, y);
        doc.setTextColor(...AZUL);
        doc.text(euros(importeNodo(n)), derecha - 3, y, { align: 'right' });
        y += 7.5;
        if ((n.hijos || []).length) emitir(n.hijos, profundidad + 1);
        return;
      }

      const texto = doc.splitTextToSize(`${n.codigo || ''}  ${n.resumen || ''}`, 104);
      const alto = texto.length * 4.5 + 3;
      saltoPagina(alto + (n.mediciones || []).length * 3.6);

      fila += 1;
      if (fila % 2 === 0) {
        doc.setFillColor(249, 250, 252);
        doc.rect(M, y - 4.3, W - M * 2, alto, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(texto, sangria, y);
      doc.setTextColor(100, 116, 139);
      doc.text(n.unidad || 'ud', 132, y, { align: 'right' });
      doc.text(String(cantidadPartida(n)), 150, y, { align: 'right' });
      doc.text(euros(n.precio), 172, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(euros(importeNodo(n)), derecha - 3, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += texto.length * 4.5;

      // Líneas de medición (etiqueta, unidades, longitud, ancho, alto)
      (n.mediciones || []).forEach((m) => {
        saltoPagina(4);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${m.etiqueta ? `${m.etiqueta}: ` : ''}${dimensiones(m)}`, sangria + 4, y);
        doc.text(String(medicionTotal(m)), 150, y, { align: 'right' });
        y += 3.6;
      });

      y += 2;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(M, y - 1.6, derecha, y - 1.6);
    });
  };

  emitir(arbolDe(p), 0);

  // ── Totales ─────────────────────────────────────────────────────
  y += 5;
  if (y + 40 > LIMITE) { doc.addPage(); y = 22; }

  const subtotal = Number(p.subtotal) || 0;
  const ivaPct = Number(p.iva) || 0;
  const ivaImporte = subtotal * ivaPct / 100;
  const total = Number(p.total) || subtotal + ivaImporte;

  const anchoTot = 88;
  const xTot = derecha - anchoTot;
  const altoTot = 30;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(xTot, y, anchoTot, altoTot, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Base imponible', xTot + 5, y + 7);
  doc.text(euros(subtotal), derecha - 5, y + 7, { align: 'right' });
  doc.text(`IVA ${ivaPct} %`, xTot + 5, y + 13.5);
  doc.text(euros(ivaImporte), derecha - 5, y + 13.5, { align: 'right' });
  doc.setFillColor(...AZUL);
  doc.roundedRect(xTot, y + 18, anchoTot, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', xTot + 5, y + 25.5);
  doc.text(euros(total), derecha - 5, y + 25.5, { align: 'right' });
  y += altoTot + 8;

  // ── Observaciones ───────────────────────────────────────────────
  if (p.observaciones) {
    const texto = doc.splitTextToSize(p.observaciones, W - M * 2 - 10);
    const alto = 15 + texto.length * 4.4;
    if (y + alto > LIMITE) { doc.addPage(); y = 22; }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(M, y, W - M * 2, alto, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...AZUL);
    doc.text('OBSERVACIONES', M + 5, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(texto, M + 5, y + 13);
  }

  decorarPaginas(doc, { logo, textoMarca: empresa?.name || empresa?.company_name, empresa, W, H, M });

  return doc;
}

export async function descargarPresupuestoPDF(args) {
  const doc = await buildPresupuestoPDF(args);
  doc.save(`Presupuesto_${(args?.presupuesto?.numero || 'borrador').replace(/\s+/g, '_')}.pdf`);
}