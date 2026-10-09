import jsPDF from 'jspdf';
import { gwpDe } from '@/lib/refrigerantes';
import { calcularPlazoControlFugas } from '@/lib/fgas-plazos';

/**
 * Generación de los libros anuales de un edificio:
 *  · Libro de Mantenimiento (RITE): inventario + revisiones + tratamientos L+D + instalador
 *  · Libro de Registro F-Gas: inventario de gases + intervenciones del año
 */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;

const AZUL = [30, 64, 175];
const AZUL_CLARO = [219, 234, 254];
const GRIS = [100, 116, 139];
const GRIS_CLARO = [241, 245, 249];
const AMBAR = [180, 83, 9];

function texto(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function fecha(v) {
  if (!v) return '—';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function num(v, dec = 2) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '—';
  return n.toFixed(dec);
}

export function limpiarNombreArchivo(s) {
  return String(s || 'edificio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function nombreArchivoLibro(tipo, building, year) {
  const base = tipo === 'libro_fgas' ? 'Libro_FGas' : 'Libro_Mantenimiento';
  return `${base}_${limpiarNombreArchivo(building?.name)}_${year}.pdf`;
}

export function tituloLibro(tipo, year) {
  return tipo === 'libro_fgas'
    ? `Libro de Registro F-Gas ${year}`
    : `Libro de Mantenimiento ${year}`;
}

/**
 * Un equipo entra en el ámbito F-Gas solo si realmente lleva gas fluorado:
 * la marca del equipo, o un refrigerante reconocido con carga registrada.
 * Los equipos de agua, aire o sin carga quedan fuera.
 */
export function llevaFGas(e) {
  if (!e) return false;
  if (e.has_fluorinated_gas === true) return true;
  const refrig = e.refrigerant_type || e.technical_data?.tipo_refrigerante;
  if (gwpDe(refrig) === undefined) return false;
  const carga = Number(e.refrigerant_charge_kg ?? e.technical_data?.carga_refrigerante) || 0;
  return carga > 0;
}

/** Equipos con gas a los que les falta información para emitir el libro F-Gas */
export function datosFGasFaltantes(equipment = []) {
  return equipment
    .filter((e) => e.status !== 'sin_contrato' && llevaFGas(e))
    .map((e) => {
      const faltan = [];
      if (!Number(e.refrigerant_charge_kg)) faltan.push('carga de refrigerante (kg)');
      if (!Number(e.co2_equivalent_tons)) faltan.push('tCO₂eq');
      // La fecha de control solo es exigible si el equipo supera el umbral legal.
      const plazo = calcularPlazoControlFugas(e.co2_equivalent_tons, e.has_leak_detection_system, e.is_hermetically_sealed);
      if (!e.next_leak_check_date && plazo.obligatorio) faltan.push('próximo control de fugas');
      return faltan.length ? { equipment: e, faltan } : null;
    })
    .filter(Boolean);
}

// ── utilidades de dibujo ─────────────────────────────────────────

function cabecera(doc, { titulo, anio, empresa, edificio }) {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, PAGE_W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, M, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(texto(empresa), M, 19);
  doc.text(`Año ${anio}`, PAGE_W - M, 12, { align: 'right' });
  doc.text(texto(edificio), PAGE_W - M, 19, { align: 'right' });
  doc.setTextColor(15, 23, 41);
  return 36;
}

function seccion(doc, y, titulo) {
  if (y > PAGE_H - 34) { doc.addPage(); y = M + 4; }
  doc.setFillColor(...AZUL_CLARO);
  doc.rect(M, y - 5, PAGE_W - M * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...AZUL);
  doc.text(titulo.toUpperCase(), M + 2, y + 1);
  doc.setTextColor(15, 23, 41);
  return y + 10;
}

function campos(doc, y, pares) {
  doc.setFontSize(8.5);
  pares.forEach(([etiqueta, valor]) => {
    if (y > PAGE_H - 22) { doc.addPage(); y = M + 4; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS);
    doc.text(`${etiqueta}:`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 41);
    doc.text(doc.splitTextToSize(texto(valor), PAGE_W - M * 2 - 45)[0] || '—', M + 45, y);
    y += 5;
  });
  return y + 2;
}

function tabla(doc, y, columnas, filas, vacio = 'Sin registros') {
  const total = columnas.reduce((s, c) => s + c.w, 0);
  const escala = (PAGE_W - M * 2) / total;
  const cols = columnas.map((c) => ({ ...c, w: c.w * escala }));

  if (!filas.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(vacio, M, y + 3);
    doc.setTextColor(15, 23, 41);
    return y + 8;
  }

  const dibujarCabecera = (yy) => {
    doc.setFillColor(...AZUL);
    doc.rect(M, yy, PAGE_W - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    let x = M;
    cols.forEach((c) => {
      doc.text(c.label, c.align === 'right' ? x + c.w - 1.5 : x + 1.5, yy + 4.8, {
        align: c.align === 'right' ? 'right' : 'left',
      });
      x += c.w;
    });
    doc.setTextColor(15, 23, 41);
    return yy + 7;
  };

  y = dibujarCabecera(y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);

  filas.forEach((fila, i) => {
    const celdas = cols.map((c, idx) => doc.splitTextToSize(texto(fila[idx]), c.w - 3));
    const alto = Math.max(5.5, ...celdas.map((l) => l.length * 3.3 + 2.4));
    if (y + alto > PAGE_H - 18) {
      doc.addPage();
      y = dibujarCabecera(M + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
    }
    if (i % 2 === 1) {
      doc.setFillColor(...GRIS_CLARO);
      doc.rect(M, y, PAGE_W - M * 2, alto, 'F');
    }
    let x = M;
    celdas.forEach((lineas, idx) => {
      const c = cols[idx];
      const tx = c.align === 'right' ? x + c.w - 1.5 : x + 1.5;
      doc.text(lineas, tx, y + 4, { align: c.align === 'right' ? 'right' : 'left' });
      x += c.w;
    });
    y += alto;
  });
  return y + 5;
}

function nota(doc, y, mensaje) {
  if (y > PAGE_H - 26) { doc.addPage(); y = M + 4; }
  doc.setFillColor(254, 243, 199);
  const lineas = doc.splitTextToSize(mensaje, PAGE_W - M * 2 - 8);
  const alto = lineas.length * 4 + 5;
  doc.rect(M, y - 4, PAGE_W - M * 2, alto, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...AMBAR);
  doc.text(lineas, M + 4, y + 1);
  doc.setTextColor(15, 23, 41);
  return y + alto + 4;
}

function firmas(doc, y) {
  if (y > PAGE_H - 40) { doc.addPage(); y = M + 10; }
  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  const ancho = (PAGE_W - M * 2 - 12) / 2;
  doc.line(M, y + 12, M + ancho, y + 12);
  doc.line(M + ancho + 12, y + 12, PAGE_W - M, y + 12);
  doc.text('Firma del responsable técnico', M, y + 17);
  doc.text('Firma del titular de la instalación', M + ancho + 12, y + 17);
  doc.setTextColor(15, 23, 41);
  return y + 24;
}

function pies(doc, etiqueta) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta, M, PAGE_H - 8);
    doc.text(`Página ${i} de ${total}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });
  }
  doc.setTextColor(15, 23, 41);
}

// ── Libro de Mantenimiento ───────────────────────────────────────

export function generarLibroMantenimientoAnual({
  building, client, company, equipment = [], revisions = [], ld = [], instalador = [], year,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const empresa = company?.name || 'Clima';
  let y = cabecera(doc, {
    titulo: 'LIBRO DE MANTENIMIENTO',
    anio: year,
    empresa,
    edificio: building?.name,
  });

  y = seccion(doc, y, 'Datos de la instalación');
  y = campos(doc, y, [
    ['Edificio', building?.name],
    ['Dirección', [building?.address, building?.postal_code, building?.city, building?.province].filter(Boolean).join(', ')],
    ['Titular', client?.name],
    ['CIF/NIF', client?.cif],
    ['Empresa mantenedora', empresa],
    ['CIF mantenedor', company?.cif],
    ['Nº de equipos', equipment.length],
    ['Contacto en instalación', [building?.contact_person, building?.contact_phone].filter(Boolean).join(' · ')],
  ]);

  y = seccion(doc, y, `Inventario de equipos (${equipment.length})`);
  y = tabla(doc, y, [
    { label: 'Referencia', w: 26 },
    { label: 'Tipo', w: 22 },
    { label: 'Marca / Modelo', w: 30 },
    { label: 'Nº serie', w: 22 },
    { label: 'Ubicación', w: 20 },
    { label: 'Estado', w: 18 },
  ], equipment.map((e) => [
    e.reference_name || '—',
    e.equipment_type,
    `${e.brand || ''} ${e.model || ''}`.trim(),
    e.serial_number,
    e.location,
    e.status,
  ]), 'Sin equipos registrados');

  const revAnio = revisions
    .filter((r) => String(r.completed_date || r.scheduled_date || '').slice(0, 4) === String(year))
    .sort((a, b) => String(a.completed_date || a.scheduled_date).localeCompare(String(b.completed_date || b.scheduled_date)));
  const equipoNombre = (id) => {
    const e = equipment.find((x) => x.id === id);
    return e ? (e.reference_name || `${e.brand || ''} ${e.model || ''}`.trim()) : '—';
  };

  y = seccion(doc, y, `Mantenimientos realizados en ${year} (${revAnio.length})`);
  y = tabla(doc, y, [
    { label: 'Fecha', w: 16 },
    { label: 'Equipo', w: 34 },
    { label: 'Tipo', w: 20 },
    { label: 'Técnico', w: 28 },
    { label: 'Observaciones', w: 50 },
  ], revAnio.map((r) => [
    fecha(r.completed_date || r.scheduled_date),
    equipoNombre(r.equipment_id),
    r.revision_type,
    r.technician_name,
    r.notes || (r.status === 'completed' ? '' : `(${r.status})`),
  ]), `Sin mantenimientos registrados en ${year}`);

  if (ld.length) {
    y = seccion(doc, y, `Tratamientos de limpieza y desinfección (${ld.length})`);
    y = tabla(doc, y, [
      { label: 'Fecha', w: 16 },
      { label: 'Equipo', w: 36 },
      { label: 'Tratamiento', w: 30 },
      { label: 'Técnico', w: 30 },
      { label: 'Próxima revisión', w: 22 },
    ], ld.map((r) => [
      fecha(r.fecha),
      equipoNombre(r.equipment_id),
      r.tipo_tratamiento,
      r.tecnico_nombre || r.responsable_tecnico_nombre,
      fecha(r.proxima_revision_fecha),
    ]));
  }

  if (instalador.length) {
    y = seccion(doc, y, `Registros de instalador (${instalador.length})`);
    y = tabla(doc, y, [
      { label: 'Fecha', w: 16 },
      { label: 'Equipo', w: 40 },
      { label: 'Intervención', w: 40 },
      { label: 'Próxima OCA', w: 22 },
    ], instalador.map((r) => [
      fecha(r.fecha_intervencion),
      equipoNombre(r.equipment_id),
      r.tipo_intervencion || r.descripcion || '—',
      fecha(r.proxima_inspeccion_oca_fecha),
    ]));
  }

  y = firmas(doc, y);
  pies(doc, `Libro de Mantenimiento · ${building?.name || ''} · ${year}`);
  return doc;
}

// ── Libro de Registro F-Gas ──────────────────────────────────────

export function generarLibroFGasAnual({
  building, client, company, equipment = [], registros = [], year,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const empresa = company?.name || '';
  let y = cabecera(doc, {
    titulo: 'LIBRO DE REGISTRO F-GAS',
    anio: year,
    empresa,
    edificio: building?.name,
  });

  const equiposGas = equipment.filter(
    (e) => e.status !== 'sin_contrato' && llevaFGas(e),
  );
  const cargaTotal = equiposGas.reduce((s, e) => s + (Number(e.refrigerant_charge_kg) || 0), 0);
  const tco2Total = equiposGas.reduce((s, e) => s + (Number(e.co2_equivalent_tons) || 0), 0);

  y = seccion(doc, y, 'Datos de la instalación y del titular');
  y = campos(doc, y, [
    ['Edificio', building?.name],
    ['Dirección', [building?.address, building?.postal_code, building?.city, building?.province].filter(Boolean).join(', ')],
    ['Titular', client?.name],
    ['CIF/NIF titular', client?.cif],
    ['Empresa mantenedora', empresa],
    ['CIF mantenedor', company?.cif],
    ['Equipos con gases fluorados', equiposGas.length],
    ['Carga total', `${cargaTotal.toFixed(3)} kg`],
    ['Total tCO₂eq', `${tco2Total.toFixed(3)}`],
  ]);

  const faltan = datosFGasFaltantes(equipment);
  if (faltan.length) {
    y = nota(
      doc, y,
      `Aviso: ${faltan.length} equipo(s) tienen información F-Gas incompleta (${faltan
        .map((f) => `${f.equipment.reference_name || f.equipment.model || 'equipo'}: ${f.faltan.join(', ')}`)
        .join('; ')}). Complete los datos para que este libro refleje la situación real de la instalación.`,
    );
  }

  y = seccion(doc, y, `Equipos con gases fluorados (${equiposGas.length})`);
  y = tabla(doc, y, [
    { label: 'Referencia', w: 26 },
    { label: 'Refrigerante', w: 20 },
    { label: 'Carga (kg)', w: 16, align: 'right' },
    { label: 'PCA', w: 14, align: 'right' },
    { label: 'tCO₂eq', w: 16, align: 'right' },
    { label: 'Últ. control', w: 20 },
    { label: 'Próx. control', w: 20 },
  ], equiposGas.map((e) => [
    e.reference_name || `${e.brand || ''} ${e.model || ''}`.trim(),
    e.refrigerant_type || e.technical_data?.tipo_refrigerante,
    num(e.refrigerant_charge_kg, 3),
    num(e.gwp, 0),
    num(e.co2_equivalent_tons, 3),
    fecha(e.last_leak_check_date),
    fecha(e.next_leak_check_date),
  ]), 'Sin equipos con gases fluorados');

  const equipoNombre = (id) => {
    const e = equipment.find((x) => x.id === id);
    return e ? (e.reference_name || `${e.brand || ''} ${e.model || ''}`.trim()) : '—';
  };
  const regAnio = registros
    .slice()
    .sort((a, b) => String(a.fecha_intervencion).localeCompare(String(b.fecha_intervencion)));

  y = seccion(doc, y, `Intervenciones del año (${regAnio.length})`);
  y = tabla(doc, y, [
    { label: 'Fecha', w: 15 },
    { label: 'Equipo', w: 28 },
    { label: 'Intervención', w: 22 },
    { label: 'Refrig.', w: 16 },
    { label: 'Añadido', w: 14, align: 'right' },
    { label: 'Recuperado', w: 16, align: 'right' },
    { label: 'Control', w: 16 },
    { label: 'Técnico', w: 22 },
    { label: 'Carnet', w: 18 },
  ], regAnio.map((r) => [
    fecha(r.fecha_intervencion),
    equipoNombre(r.equipment_id),
    r.tipo_intervencion,
    r.refrigerante_tipo,
    num(r.gas_anyadido_kg, 3),
    num(r.gas_recuperado_kg, 3),
    r.control_fugas_resultado || '—',
    r.tecnico_nombre,
    r.tecnico_cert_num,
  ]), `Sin intervenciones registradas en ${year}`);

  const fugas = regAnio.filter((r) => r.fuga_localizada);
  if (fugas.length) {
    y = seccion(doc, y, `Fugas localizadas y reparación (${fugas.length})`);
    y = tabla(doc, y, [
      { label: 'Fecha', w: 18 },
      { label: 'Equipo', w: 40 },
      { label: 'Ubicación de la fuga', w: 50 },
      { label: 'Fecha reparación', w: 24 },
    ], fugas.map((r) => [
      fecha(r.fecha_intervencion),
      equipoNombre(r.equipment_id),
      r.fuga_ubicacion,
      fecha(r.fuga_fecha_reparacion),
    ]));
  }

  y = firmas(doc, y);
  pies(doc, `Libro de Registro F-Gas · ${building?.name || ''} · ${year}`);
  return doc;
}