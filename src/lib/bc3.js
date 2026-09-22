// Compatibilidad con Presto: lectura y escritura de ficheros FIEBDC-3 (.bc3)

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const num = (n) => String(Number(n) || 0);
const fechaBC3 = (f) => (f || new Date().toISOString().slice(0, 10)).replace(/-/g, '');

/** Genera el contenido BC3 (FIEBDC-3) de un presupuesto, legible por Presto. */
export function presupuestoToBC3({ presupuesto, client }) {
  const p = presupuesto || {};
  const lineas = p.lineas || [];
  const fecha = fechaBC3(p.fecha);
  const raiz = '##';
  const titulo = p.titulo || `Presupuesto ${p.numero || ''}`;
  const salida = [];

  salida.push(`~V|FIEBDC-3/2020|Clilux ERP||${fecha}|FIEBDC-3/2020|`);
  salida.push(`~K|${raiz}|${esc(titulo)}|${esc(client?.name || p.cliente_nombre || '')}|`);
  salida.push(`~C|${raiz}||${esc(titulo)}|0|${fecha}|0|`);

  lineas.forEach((l, i) => {
    const codigo = `${raiz}.${String(i + 1).padStart(2, '0')}`;
    salida.push(`~C|${codigo}|${esc(l.unidad || 'ud')}|${esc(l.concepto || '')}|${num(l.precio_unitario)}|${fecha}|2|`);
    salida.push(`~D|${raiz}|${codigo}|1|`);
    if (l.descuento) salida.push(`~T|${codigo}|Descuento aplicado: ${num(l.descuento)} %|`);
    salida.push(`~M|${codigo}|0|`);
    salida.push(`~L|${codigo}|1|1|${num(l.cantidad || 1)}|1|||`);
  });

  return salida.join('\r\n') + '\r\n';
}

/** Lee un fichero BC3 y devuelve las líneas importables al presupuesto. */
export function parseBC3(texto) {
  const conceptos = {};
  const medidas = {};
  let titulo = '';
  let medidaActual = null;

  String(texto || '').split(/\r?\n/).forEach((raw) => {
    const linea = raw.trim();
    if (!linea.startsWith('~')) return;
    const partes = linea.split('|');
    const tipo = partes[0].slice(1).toUpperCase();

    if (tipo === 'K') {
      if (!titulo && partes[2]) titulo = partes[2].replace(/\\\|/g, '|');
    } else if (tipo === 'C') {
      const codigo = partes[1];
      if (!codigo) return;
      conceptos[codigo] = {
        codigo,
        unidad: partes[2] || 'ud',
        resumen: (partes[3] || '').replace(/\\\|/g, '|'),
        precio: Number(partes[4]) || 0,
        tipo: partes[6] || '',
      };
    } else if (tipo === 'M') {
      medidaActual = partes[1] || null;
      if (medidaActual && medidas[medidaActual] === undefined) medidas[medidaActual] = 0;
    } else if (tipo === 'L') {
      const codigo = partes[1] || medidaActual;
      if (!codigo) return;
      const nUd = Number(partes[3]) || 1;
      const largo = Number(partes[4]) || 1;
      const ancho = Number(partes[5]) || 1;
      const alto = Number(partes[6]) || 1;
      medidas[codigo] = (medidas[codigo] || 0) + nUd * largo * ancho * alto;
    }
  });

  const lineas = [];
  Object.values(conceptos).forEach((c) => {
    const esPartida = c.tipo === '2' || c.tipo === '3' || (!c.tipo && c.precio > 0);
    if (!esPartida || !c.precio) return;
    const medido = medidas[c.codigo];
    lineas.push({
      codigo: c.codigo,
      concepto: c.resumen || c.codigo,
      unidad: c.unidad || 'ud',
      cantidad: medido > 0 ? medido : 1,
      precio_unitario: c.precio,
      descuento: 0,
    });
  });

  return { lineas, titulo };
}

/** Descarga un fichero .bc3 para abrirlo con Presto. */
export function descargarBC3(nombre, contenido) {
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}