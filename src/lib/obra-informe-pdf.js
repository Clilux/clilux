import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtFecha = (f) => (f ? format(parseISO(f), "d 'de' MMMM yyyy", { locale: es }) : '—');
const euros = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const ESTADO_TAREA = { pendiente: 'Pendiente', en_curso: 'En curso', realizada: 'Realizada' };
const ESTADO_OBS = { abierta: 'Abierta', resuelta: 'Resuelta' };

/**
 * Genera el informe de obra en PDF.
 * @param {object} obra
 * @param {{tareas:[], observaciones:[], albaranes:[], partes:[], verCostes:boolean}} datos
 * @returns {jsPDF}
 */
export function generarInformeObraPDF(obra, datos = {}) {
  const { tareas = [], observaciones = [], albaranes = [], partes = [], verCostes = false } = datos;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = 16;

  const ensure = (need = 6) => {
    if (y + need > pageH - 14) { doc.addPage(); y = 16; }
  };

  const section = (titulo) => {
    ensure(12);
    y += 3;
    doc.setFillColor(226, 232, 240);
    doc.rect(M, y - 4, pageW - M * 2, 7, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
    doc.text(titulo, M + 2, y + 1);
    y += 6;
  };

  const linea = (label, valor, opts = {}) => {
    ensure(6);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, M, y);
    doc.setTextColor(15, 23, 42); doc.setFont(undefined, opts.bold ? 'bold' : 'normal');
    const txt = String(valor ?? '—');
    const lines = doc.splitTextToSize(txt, pageW - M * 2 - 40);
    doc.text(lines, M + 42, y);
    y += Math.max(5, lines.length * 4.5);
  };

  const parrafo = (texto) => {
    if (!texto) return;
    ensure(8);
    doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(texto, pageW - M * 2);
    lines.forEach((l) => { ensure(5); doc.text(l, M, y); y += 5; });
  };

  // ── Cabecera ──
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('Informe de obra', M, 11);
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.text(obra.nombre || '—', M, 18);
  doc.setFontSize(9);
  doc.text(format(new Date(), "d MMM yyyy · HH:mm", { locale: es }), pageW - M, 18, { align: 'right' });
  y = 32;
  doc.setTextColor(15, 23, 42);

  // ── Datos generales ──
  section('Datos generales');
  linea('Cliente', obra.client_name);
  linea('Edificio', obra.building_name || '—');
  linea('Dirección', obra.building_address || '—');
  linea('Estado', (obra.estado || ''));
  linea('Fecha inicio', fmtFecha(obra.fecha_inicio));
  linea('Fecha fin prevista', fmtFecha(obra.fecha_fin_prevista));
  linea('Fecha fin real', fmtFecha(obra.fecha_fin_real));
  linea('Responsable', obra.responsable_nombre || '—');
  if (obra.equipo?.length) linea('Equipo', obra.equipo.map((e) => e.technician_name || e.technician_email).join(', '));
  if (obra.descripcion) { y += 2; parrafo(obra.descripcion); }

  // ── Resumen económico ──
  const costoMateriales = Number(obra.costo_materiales) || 0;
  const costoTrabajadores = Number(obra.costo_trabajadores) || 0;
  const gastosPartes = partes.reduce((s, p) => s + (Number(p.coste_total) || 0), 0);
  const gastosAlbaranes = albaranes.reduce((s, a) => s + (Number(a.total) || 0), 0);
  const costoTotal = costoTrabajadores + costoMateriales + gastosPartes + gastosAlbaranes;
  const presupuesto = Number(obra.presupuesto_inicial) || 0;
  const margen = presupuesto > 0 ? presupuesto - costoTotal : null;
  const totalFacturado = Number(obra.total_facturado) || 0;

  section('Resumen económico');
  linea('Presupuesto inicial', euros(presupuesto), { bold: true });
  if (verCostes) linea('Coste mano de obra', euros(costoTrabajadores));
  linea('Coste materiales', euros(costoMateriales));
  if (verCostes) linea('Mano de obra por partes', euros(gastosPartes));
  linea('Gastos por partes de trabajo', euros(gastosAlbaranes));
  linea('Coste total', euros(costoTotal), { bold: true });
  if (margen !== null) linea('Margen', `${margen >= 0 ? '+' : ''}${euros(margen)}`, { bold: true });
  linea('Total facturado', euros(totalFacturado), { bold: true });

  // ── Trabajos ──
  if (tareas.length > 0) {
    section('Trabajos');
    tareas.forEach((t) => {
      ensure(10);
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(t.titulo || '—', M, y); y += 5;
      doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      const meta = [
        t.tipo === 'extra' ? 'Extra' : 'Trabajo',
        ESTADO_TAREA[t.estado] || t.estado,
        t.asignado_nombre ? `Asignado: ${t.asignado_nombre}` : null,
        t.horas ? `${t.horas}h` : null,
        t.tipo === 'extra' && t.importe_extra ? euros(t.importe_extra) : null,
      ].filter(Boolean).join('  ·  ');
      if (meta) { ensure(5); doc.setFontSize(9); doc.text(meta, M, y); y += 5; }
      if (t.descripcion) parrafo(t.descripcion);
      y += 2;
    });
  }

  // ── Observaciones e incidencias ──
  if (observaciones.length > 0) {
    section('Observaciones e incidencias');
    observaciones.forEach((o) => {
      ensure(10);
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(`${o.tipo === 'incidencia' ? 'Incidencia' : 'Observación'}: ${o.titulo || '—'}`, M, y); y += 5;
      doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      const meta = [
        ESTADO_OBS[o.estado] || o.estado,
        o.gravedad ? `Gravedad: ${o.gravedad}` : null,
        o.fecha ? fmtFecha(o.fecha) : null,
        o.registrado_por ? `Por: ${o.registrado_por}` : null,
      ].filter(Boolean).join('  ·  ');
      if (meta) { ensure(5); doc.setFontSize(9); doc.text(meta, M, y); y += 5; }
      if (o.descripcion) parrafo(o.descripcion);
      if (o.resolucion) { ensure(5); doc.setFontSize(9); doc.setTextColor(22, 163, 74); doc.text(`Resolución: ${o.resolucion}`, M, y); y += 5; }
      y += 2;
    });
  }

  // ── Partes de horas ──
  if (partes.length > 0) {
    section('Partes de trabajo (horas imputadas)');
    partes.forEach((p) => {
      ensure(8);
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(`${p.technician_name || p.technician_email || '—'}  ·  ${p.fecha ? format(parseISO(p.fecha), 'd MMM yyyy', { locale: es }) : '—'}`, M, y); y += 5;
      doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      const meta = [`${Number(p.horas || 0)} h`, verCostes ? euros(p.coste_total) : null].filter(Boolean).join('  ·  ');
      if (meta) { ensure(5); doc.setFontSize(9); doc.text(meta, M, y); y += 5; }
      if (p.descripcion) parrafo(p.descripcion);
      y += 1;
    });
  }

  // ── Partes de trabajo (albaranes) ──
  if (albaranes.length > 0) {
    section('Partes de trabajo (albaranes)');
    albaranes.forEach((a) => {
      ensure(8);
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(`${a.numero || '—'}  ·  ${a.fecha ? format(parseISO(a.fecha), 'd MMM yyyy', { locale: es }) : '—'}`, M, y); y += 5;
      doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      const meta = [a.tecnico_nombre, a.titulo, euros(a.total)].filter(Boolean).join('  ·  ');
      if (meta) { ensure(5); doc.setFontSize(9); doc.text(meta, M, y); y += 5; }
      if (a.descripcion_trabajos) parrafo(a.descripcion_trabajos);
      y += 1;
    });
  }

  // ── Pie ──
  const totalPag = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPag; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Informe generado el ${format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}`, M, pageH - 8);
    doc.text(`Página ${i} de ${totalPag}`, pageW - M, pageH - 8, { align: 'right' });
  }

  return doc;
}