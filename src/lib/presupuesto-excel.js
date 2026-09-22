// Exportación a Excel (.xls) manteniendo la jerarquía de capítulos, subcapítulos y partidas.
import { aplanarArbol, arbolDe, cantidadPartida, importeNodo, medicionTotal, NATURALEZA } from '@/lib/presto-arbol';

const num = (v, dec = 2) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(dec).replace('.', ',') : '';
};

const escapar = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Hoja plana con un registro por concepto y sus líneas de medición debajo. */
export function presupuestoToExcel({ presupuesto, client, empresa }) {
  const p = presupuesto || {};
  const arbol = arbolDe(p);
  const filas = [];

  filas.push(`<tr><td colspan="13" style="font-size:16pt;font-weight:bold">${escapar(p.titulo || `Presupuesto ${p.numero || ''}`)}</td></tr>`);
  filas.push(`<tr><td colspan="13">${escapar(empresa?.name || 'Clilux')} · Presupuesto ${escapar(p.numero || '')} · Cliente: ${escapar(client?.name || p.cliente_nombre || '')} · Fecha: ${escapar(p.fecha || '')}</td></tr>`);
  filas.push('<tr></tr>');
  filas.push(
    '<tr style="background:#4f46e5;color:#ffffff;font-weight:bold">' +
      '<td>Nivel</td><td>Naturaleza</td><td>Código</td><td>Unidad</td><td>Resumen</td><td>Texto / Pliego</td>' +
      '<td>Precio</td><td>Cantidad</td><td>Importe</td>' +
      '<td>Etiqueta medición</td><td>Unidades</td><td>Longitud</td><td>Ancho</td><td>Alto</td><td>Total medición</td>' +
    '</tr>'
  );

  const ancho = (texto) => `<td colspan="6" style="font-weight:bold;background:#eef2ff">${escapar(texto)}</td>`;
  const indentar = (n) => '&nbsp;'.repeat(n * 4);

  const emitir = (nodos) => {
    aplanarArbol(nodos).forEach(({ nodo, profundidad }) => {
      const esPartida = nodo.tipo === 'partida';
      const meds = nodo.mediciones || [];
      const estilo = esPartida ? '' : 'font-weight:bold;background:#f8fafc';
      filas.push(
        `<tr style="${estilo}">` +
          `<td>${profundidad + 1}</td>` +
          `<td>${escapar(NATURALEZA[esPartida ? 2 : 1])}</td>` +
          `<td>${escapar(nodo.codigo)}</td>` +
          `<td>${escapar(esPartida ? nodo.unidad || 'ud' : '')}</td>` +
          `<td>${indentar(profundidad)}${escapar(nodo.resumen)}</td>` +
          `<td>${escapar(nodo.texto || '')}</td>` +
          `<td>${esPartida ? num(nodo.precio) : ''}</td>` +
          `<td>${esPartida ? num(cantidadPartida(nodo), 2) : ''}</td>` +
          `<td>${num(importeNodo(nodo))}</td>` +
          '<td></td><td></td><td></td><td></td><td></td><td></td>' +
        '</tr>'
      );
      if (esPartida && meds.length) {
        meds.forEach((m) => {
          filas.push(
            '<tr style="color:#475569">' +
              '<td></td><td></td><td></td><td></td>' +
              `<td>${indentar(profundidad + 1)}${escapar(m.etiqueta || 'Medición')}</td>` +
              '<td></td><td></td><td></td><td></td>' +
              `<td>${escapar(m.etiqueta || '')}</td>` +
              `<td>${num(m.unidades)}</td><td>${num(m.longitud)}</td><td>${num(m.ancho)}</td><td>${num(m.alto)}</td>` +
              `<td>${num(medicionTotal(m))}</td>` +
            '</tr>'
          );
        });
      }
    });
  };

  emitir(arbol);

  filas.push('<tr></tr>');
  filas.push(`<tr>${ancho('Subtotal')}<td colspan="2">${num(p.subtotal)}</td></tr>`);
  filas.push(`<tr>${ancho(`IVA ${p.iva ?? 21} %`)}<td colspan="2">${num((Number(p.subtotal) || 0) * (Number(p.iva) || 0) / 100)}</td></tr>`);
  filas.push(`<tr>${ancho('TOTAL')}<td colspan="2" style="font-weight:bold">${num(p.total)}</td></tr>`);

  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Presupuesto</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>td{font-family:Calibri,Arial,sans-serif;font-size:10pt;border:0.5pt solid #cbd5e1;padding:2px 4px}</style>
</head><body><table>${filas.join('\n')}</table></body></html>`;
}

export function descargarPresupuestoExcel(args) {
  const contenido = presupuestoToExcel(args);
  const nombre = `Presupuesto_${(args?.presupuesto?.numero || 'borrador').replace(/\s+/g, '_')}.xls`;
  const blob = new Blob(['\uFEFF', contenido], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}