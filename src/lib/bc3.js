// Exportación e importación de presupuestos en formato FIEBDC-3 (.bc3) para Presto.
// Registros: ~V versión, ~K coeficientes, ~C concepto (con naturaleza), ~D jerarquía, ~T texto, ~M mediciones.
import {
  aplanarArbol,
  arbolDe,
  esCapitulo,
  importeNodo,
  medicionTotal,
  nuevoNodo,
  precioNeto,
  sanitizarCodigo,
  totalArbol,
} from '@/lib/presto-arbol';

// RIB: '\' y '|' son separadores, por lo que en textos se sustituyen por '_' y '-'
const texto = (v) => String(v ?? '').replace(/\\/g, '_').replace(/\|/g, '-').replace(/\r?\n/g, ' ');
const numero = (v) => {
  const n = Number(String(v ?? 0).replace(',', '.'));
  return Number.isFinite(n) ? String(Math.round(n * 10000) / 10000) : '0';
};
const fechaBC3 = (f) => {
  const d = f ? new Date(f) : new Date();
  if (Number.isNaN(d.getTime())) return '00000000';
  return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
};

const CABECERA_RAIZ = '##';

/** Genera el contenido BC3 del presupuesto respetando la jerarquía capítulos/partidas. */
export function presupuestoToBC3({ presupuesto, empresa }) {
  const p = presupuesto || {};
  const arbol = arbolDe(p);
  const fecha = fechaBC3(p.fecha);
  const lineas = [];

  lineas.push(`~V|${texto(empresa?.name || 'Clilux')}|FIEBDC-3/2020|Clilux ERP||ANSI||2||||`);
  lineas.push('~K|\\2\\2\\2\\2\\2\\2\\2\\EUR\\|');

  // Concepto raíz de la obra (naturaleza 0)
  lineas.push(`~C|${CABECERA_RAIZ}||${texto(p.titulo || `Presupuesto ${p.numero || ''}`)}|${numero(totalArbol(arbol))}|${fecha}|0|`);

  const emitir = (nodos, padreCodigo, camino) => {
    const descomposicion = nodos
      .map((n) => `${sanitizarCodigo(n.codigo)}\\1\\1\\`)
      .join('');
    lineas.push(`~D|${padreCodigo}|${descomposicion}`);

    nodos.forEach((n, i) => {
      const codigo = sanitizarCodigo(n.codigo);
      const posicion = [...camino, i + 1];

      if (n.tipo === 'partida') {
        // Naturaleza 2 = partida
        lineas.push(`~C|${codigo}|${texto(n.unidad || 'ud')}|${texto(n.resumen)}|${numero(precioNeto(n))}|${fecha}|2|`);
        if (n.texto) lineas.push(`~T|${codigo}|${texto(n.texto)}|`);
        (n.mediciones || []).forEach((m) => {
          // ~M|código|posición\|medición_total|tipo\comentario\unidades\longitud\latitud\altura\|
          lineas.push(
            `~M|${codigo}|${posicion.join('\\')}\\|${numero(medicionTotal(m))}|\\${texto(m.etiqueta || '')}\\${numero(m.unidades === '' || m.unidades === undefined ? 1 : m.unidades)}\\${numero(m.longitud === '' || m.longitud === undefined ? 1 : m.longitud)}\\${numero(m.ancho === '' || m.ancho === undefined ? 1 : m.ancho)}\\${numero(m.alto === '' || m.alto === undefined ? 1 : m.alto)}\\|`,
          );
        });
      } else {
        // Naturaleza 1 = capítulo / subcapítulo
        lineas.push(`~C|${codigo}||${texto(n.resumen)}|${numero(importeNodo(n))}|${fecha}|1|`);
        if (n.texto) lineas.push(`~T|${codigo}|${texto(n.texto)}|`);
        if ((n.hijos || []).length) emitir(n.hijos, codigo, posicion);
      }
    });
  };

  if (arbol.length) emitir(arbol, CABECERA_RAIZ, []);

  return lineas.join('\r\n') + '\r\n';
}

const aNumero = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Lee un fichero BC3 (Presto, Arquímedes, CYPE…) y reconstruye el árbol jerárquico. */
export function parseBC3(entrada) {
  const conceptos = new Map();
  const descomposiciones = [];
  const mediciones = [];
  let titulo = '';
  let raizCodigo = null;

  String(entrada || '')
    .split(/\r?\n/)
    .forEach((raw) => {
      const linea = raw.trim();
      if (!linea.startsWith('~')) return;
      const campos = linea.split('|');
      const tipo = campos[0].slice(1).toUpperCase();

      if (tipo === 'C') {
        const codigo = (campos[1] || '').split('\\')[0].trim();
        if (!codigo) return;
        conceptos.set(codigo, {
          codigo,
          unidad: campos[2] || '',
          resumen: (campos[3] || '').replace(/\\\|/g, '|'),
          precio: aNumero(campos[4]),
          natc: (campos[6] || '').trim(),
        });
      } else if (tipo === 'D') {
        const padre = (campos[1] || '').trim();
        const hijos = (campos[2] || '').split('\\').filter(Boolean);
        for (let i = 0; i < hijos.length; i += 3) {
          if (hijos[i]) descomposiciones.push({ padre, hijo: hijos[i].trim() });
        }
      } else if (tipo === 'M' || tipo === 'N') {
        const codigo = (campos[1] || '').split('\\').pop().trim();
        if (!codigo) return;
        const grupo = campos[4] || '';
        if (grupo.includes('\\')) {
          // Formato FIEBDC-3/2016-2024: tipo \ comentario \ unidades \ longitud \ latitud \ altura
          const partes = grupo.split('\\');
          mediciones.push({
            codigo,
            etiqueta: (partes[1] || '').split('#')[0].trim(),
            unidades: partes[2] === '' || partes[2] === undefined ? 1 : aNumero(partes[2]),
            longitud: partes[3] === '' || partes[3] === undefined ? 1 : aNumero(partes[3]),
            ancho: partes[4] === '' || partes[4] === undefined ? 1 : aNumero(partes[4]),
            alto: partes[5] === '' || partes[5] === undefined ? 1 : aNumero(partes[5]),
          });
        } else {
          // Formato clásico: código | nº línea | nº uds | longitud | anchura | altura | tipo | comentario
          mediciones.push({
            codigo,
            unidades: campos[3] === '' || campos[3] === undefined ? 1 : aNumero(campos[3]),
            longitud: campos[4] === '' || campos[4] === undefined ? 1 : aNumero(campos[4]),
            ancho: campos[5] === '' || campos[5] === undefined ? 1 : aNumero(campos[5]),
            alto: campos[6] === '' || campos[6] === undefined ? 1 : aNumero(campos[6]),
            etiqueta: (campos[8] || '').trim(),
          });
        }
      }
    });

  // Construir el árbol a partir de las descomposiciones
  const hijosDe = new Map();
  descomposiciones.forEach(({ padre, hijo }) => {
    if (!hijosDe.has(padre)) hijosDe.set(padre, []);
    hijosDe.get(padre).push(hijo);
  });

  const crear = (codigo, vistos = new Set()) => {
    const c = conceptos.get(codigo);
    const hijos = hijosDe.get(codigo) || [];
    const esPartida = c?.natc === '2' || c?.natc === '3' || (!hijos.length && !!c?.unidad);
    const nodo = {
      ...nuevoNodo(esPartida ? 'partida' : 'capitulo', codigo),
      resumen: c?.resumen || codigo,
      unidad: esPartida ? c?.unidad || 'ud' : '',
      precio: esPartida ? c?.precio || 0 : 0,
      mediciones: esPartida ? mediciones.filter((m) => m.codigo === codigo).map(({ codigo: _, ...m }) => m) : [],
      hijos: [],
    };
    vistos.add(codigo);
    if (!esPartida) {
      nodo.hijos = hijos.filter((h) => conceptos.has(h) && !vistos.has(h)).map((h) => crear(h, vistos));
      if (!nodo.hijos.length) nodo.tipo = 'partida';
    }
    return nodo;
  };

  const hijosDirectos = new Set(descomposiciones.map((d) => d.hijo));
  const raices = [...conceptos.keys()].filter((c) => !hijosDirectos.has(c));
  // Si el fichero tiene un único concepto raíz que engloba todo, se usa como raíz del presupuesto
  const candidatos = raices.filter((c) => (hijosDe.get(c) || []).length);
  const raizFinal = candidatos.length === 1 ? candidatos[0] : null;

  let arbol;
  if (raizFinal) {
    titulo = conceptos.get(raizFinal)?.resumen || '';
    const nodoRaiz = crear(raizFinal);
    // Se elimina el concepto raíz de obra para dejar sus capítulos al primer nivel
    arbol = nodoRaiz.hijos.length ? nodoRaiz.hijos : [nodoRaiz];
  } else {
    arbol = raices.filter((c) => conceptos.has(c)).map((c) => crear(c));
  }

  const planos = aplanarArbol(arbol).map(({ nodo }) => nodo);
  return {
    arbol,
    titulo,
    conceptos: planos.length,
    partidas: planos.filter((n) => n.tipo === 'partida').length,
  };
}

/** Descarga el fichero .bc3 listo para abrir en Presto. */
export function descargarBC3(nombre, contenido) {
  const blob = new Blob(['\uFEFF', contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { esCapitulo };