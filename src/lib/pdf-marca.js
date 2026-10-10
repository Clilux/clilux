// Elementos de marca compartidos por los documentos PDF: cabecera, cajas de datos,
// marca de agua y pie de página. Todos los documentos de la app los reutilizan.
import { format } from 'date-fns';

export const AZUL = [79, 70, 229];
export const AZUL_OSCURO = [49, 46, 129];
export const GRIS = [90, 90, 90];

export const euros = (n) =>
  `${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const fdate = (f) => {
  if (!f) return '—';
  try { return format(new Date(f), 'dd/MM/yyyy'); } catch { return f; }
};

const formatoImagen = (dataUrl = '') =>
  /^data:image\/jpe?g/i.test(dataUrl) ? 'JPEG' : /^data:image\/webp/i.test(dataUrl) ? 'WEBP' : 'PNG';

/**
 * jsPDF no admite URLs remotas: la imagen se carga como data URL junto a sus
 * medidas para poder escalarla sin deformarla. Devuelve null si no se puede leer.
 */
export async function cargarImagen(url) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
    const medidas = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, ...medidas };
  } catch {
    return null;
  }
}

/** Devuelve únicamente el data URL de la imagen (o null). */
export async function imagenADataURL(url) {
  const img = await cargarImagen(url);
  return img?.dataUrl || null;
}

/** Líneas con los datos fiscales de la empresa emisora. */
export function datosEmpresa(empresa) {
  const e = empresa || {};
  return [
    e.name || e.company_name || '',
    e.cif ? `CIF: ${e.cif}` : '',
    [e.address, e.postal_code, e.city].filter(Boolean).join(' · '),
    e.province || '',
    e.phone ? `Tel. ${e.phone}` : '',
    e.email || '',
    e.web || '',
  ].filter(Boolean);
}

/** Líneas con los datos fiscales de un cliente. */
export function datosCliente(client) {
  const c = client || {};
  return [
    c.name || '',
    c.cif ? `CIF: ${c.cif}` : '',
    [c.address, c.postal_code, c.city].filter(Boolean).join(' · '),
    c.province || '',
    c.phone ? `Tel. ${c.phone}` : '',
    c.email || '',
  ].filter(Boolean);
}

/** Cabecera del documento: banda de color, logo, título y datos del documento. */
export function cabeceraDocumento(doc, { titulo, empresa, logo, meta = [], W = 210, M = 15 }) {
  const alto = 36;
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, alto, 'F');
  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(0, alto - 2, W, 2, 'F');

  let x = M;
  if (logo) {
    const caja = { x: M, y: 6, w: 28, h: 24 };
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(caja.x, caja.y, caja.w, caja.h, 2, 2, 'F');
    const escala = Math.min((caja.w - 4) / logo.w, (caja.h - 4) / logo.h);
    const w = logo.w * escala;
    const h = logo.h * escala;
    doc.addImage(
      logo.dataUrl, formatoImagen(logo.dataUrl),
      caja.x + (caja.w - w) / 2, caja.y + (caja.h - h) / 2, w, h,
      undefined, 'FAST',
    );
    x = M + caja.w + 6;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(titulo, x, 15);

  const nombre = empresa?.name || empresa?.company_name || '';
  if (nombre) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(199, 210, 254);
    doc.text(nombre, x, 22);
  }

  let ym = 13;
  meta.filter(Boolean).forEach(([etq, val]) => {
    if (!val) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${etq}: ${val}`, W - M, ym, { align: 'right' });
    ym += 5.5;
  });

  return alto;
}

/** Bloque de datos con título y borde suave. Devuelve la altura utilizada. */
export function cajaDatos(doc, { x, y, w, titulo, lineas = [] }) {
  const filas = lineas.length ? lineas : ['—'];
  const alto = 13 + filas.length * 4.6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, alto, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...AZUL);
  doc.text(titulo, x + 4, y + 6);

  filas.forEach((l, i) => {
    const principal = i === 0;
    doc.setFont('helvetica', principal ? 'bold' : 'normal');
    doc.setFontSize(principal ? 9.5 : 8.5);
    doc.setTextColor(principal ? 30 : 71, principal ? 41 : 85, principal ? 59 : 105);
    doc.text(String(l), x + 4, y + 11.5 + i * 4.6);
  });

  return alto;
}

/** Marca de agua centrada: el logo atenuado o, si no hay, el nombre de la empresa. */
export function marcaDeAgua(doc, { logo, texto, W = 210, H = 297 }) {
  if (!logo && !texto) return;
  try {
    doc.setGState(new doc.GState({ opacity: logo ? 0.07 : 0.08 }));
    if (logo) {
      const w = 110;
      const h = w * (logo.h / logo.w);
      doc.addImage(logo.dataUrl, formatoImagen(logo.dataUrl), (W - w) / 2, (H - h) / 2, w, h, undefined, 'FAST', -30);
    } else {
      doc.setTextColor(...AZUL);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(52);
      doc.text(texto, W / 2, H / 2, { align: 'center', angle: 30 });
    }
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch {
    // La marca de agua es decorativa: si falla, el documento se emite igualmente.
  }
}

/** Pie de página con los datos de la empresa y la numeración de páginas. */
export function pieDocumento(doc, { empresa, pagina, total, W = 210, H = 297, M = 15 }) {
  const e = empresa || {};
  const linea = [
    e.name || e.company_name,
    e.cif ? `CIF ${e.cif}` : '',
    e.phone,
    e.email,
    e.web,
  ].filter(Boolean).join(' · ');

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 146, 160);
  doc.text(linea || 'Documento generado por Clilux', M, H - 9);
  doc.text(`Página ${pagina} de ${total}`, W - M, H - 9, { align: 'right' });
}

/** Aplica la marca de agua y el pie a todas las páginas del documento. */
export function decorarPaginas(doc, { logo, textoMarca, empresa, W = 210, H = 297, M = 15 }) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    marcaDeAgua(doc, { logo, texto: textoMarca, W, H });
    pieDocumento(doc, { empresa, pagina: i, total, W, H, M });
  }
}