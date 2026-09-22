// Modelo de árbol de presupuesto compatible con Presto (FIEBDC-3).
// Nodos: capítulo / subcapítulo (naturaleza 1) y partida (naturaleza 2).
// Regla de oro: un nodo contiene exclusivamente capítulos o exclusivamente partidas.

export const NATC = { capitulo: 1, subcapitulo: 1, partida: 2 };
export const TIPOS_NODO = { capitulo: 'Capítulo', subcapitulo: 'Subcapítulo', partida: 'Partida' };
export const NATURALEZA = { 0: '—', 1: 'Capítulo', 2: 'Partida', 3: 'Partida con descomposición' };

const CARACTERES_CODIGO = /^[A-Za-z0-9ñÑ\-._$#%&]+$/;

const numero = (v, porDefecto = 1) => {
  if (v === '' || v === null || v === undefined) return porDefecto;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : porDefecto;
};

export const redondear = (n, dec = 4) => Math.round((Number(n) || 0) * 10 ** dec) / 10 ** dec;

export const nuevoId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function nuevoNodo(tipo = 'partida', codigo = '') {
  return {
    id: nuevoId(),
    tipo,
    natc: NATC[tipo] || 2,
    codigo,
    resumen: '',
    texto: '',
    unidad: tipo === 'partida' ? 'ud' : '',
    precio: 0,
    mediciones: [],
    hijos: [],
  };
}

export const esCapitulo = (n) => n?.tipo === 'capitulo' || n?.tipo === 'subcapitulo';

/** Código válido para FIEBDC-3: sin espacios, acentos ni separadores reservados. */
export function sanitizarCodigo(codigo) {
  return String(codigo || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9ñÑ\-._$#%&]/g, '_');
}

/** Total de una línea de medición = unidades × longitud × ancho × alto. */
export function medicionTotal(l) {
  return redondear(numero(l?.unidades, 1) * numero(l?.longitud, 1) * numero(l?.ancho, 1) * numero(l?.alto, 1));
}

/** Cantidad de la partida = sumatorio de sus líneas de medición (1 si no hay líneas). */
export function cantidadPartida(nodo) {
  const meds = nodo?.mediciones || [];
  if (meds.length === 0) return 1;
  return redondear(meds.reduce((s, l) => s + medicionTotal(l), 0));
}

export const importePartida = (nodo) =>
  Math.round(cantidadPartida(nodo) * (Number(nodo?.precio) || 0) * (1 - (Number(nodo?.descuento) || 0) / 100) * 100) / 100;

/** Precio unitario neto (sin descuento) que se exporta a Presto, ya que BC3 no admite descuentos. */
export const precioNeto = (nodo) =>
  Math.round((Number(nodo?.precio) || 0) * (1 - (Number(nodo?.descuento) || 0) / 100) * 100) / 100;

export function importeNodo(nodo) {
  if (!nodo) return 0;
  if (nodo.tipo === 'partida') return importePartida(nodo);
  return Math.round((nodo.hijos || []).reduce((s, h) => s + importeNodo(h), 0) * 100) / 100;
}

/** Recorre el árbol en profundidad devolviendo { nodo, profundidad, padre }. */
export function aplanarArbol(arbol = [], profundidad = 0, padre = null, out = []) {
  (arbol || []).forEach((n) => {
    out.push({ nodo: n, profundidad, padre });
    if (esCapitulo(n)) aplanarArbol(n.hijos || [], profundidad + 1, n, out);
  });
  return out;
}

export function partidasArbol(arbol = [], out = []) {
  (arbol || []).forEach((n) => {
    if (n.tipo === 'partida') out.push(n);
    else partidasArbol(n.hijos || [], out);
  });
  return out;
}

export const capitulosArbol = (arbol = []) => (arbol || []).filter(esCapitulo);

/** Partidas aplanadas (estructura `lineas` heredada, para listados y totales). */
export function lineasDesdeArbol(arbol = []) {
  return partidasArbol(arbol).map((p) => ({
    codigo: p.codigo || '',
    concepto: p.resumen || p.codigo || '',
    unidad: p.unidad || 'ud',
    cantidad: cantidadPartida(p),
    precio_unitario: Number(p.precio) || 0,
    descuento: Number(p.descuento) || 0,
    total: importePartida(p),
  }));
}

export const totalArbol = (arbol = []) =>
  Math.round((arbol || []).reduce((s, n) => s + importeNodo(n), 0) * 100) / 100;

/** Convierte presupuestos antiguos de líneas planas en un árbol de un solo capítulo. */
export function migrarLineasAArbol(lineas = []) {
  if (!lineas?.length) return [];
  const capitulo = { ...nuevoNodo('capitulo', '01'), resumen: 'PRESUPUESTO' };
  capitulo.hijos = lineas.map((l, i) => ({
    ...nuevoNodo('partida', l.codigo || `01.${String(i + 1).padStart(2, '0')}`),
    resumen: l.concepto || '',
    unidad: l.unidad || 'ud',
    precio: Number(l.precio_unitario) || 0,
    descuento: Number(l.descuento) || 0,
    mediciones: [{ etiqueta: '', unidades: Number(l.cantidad) || 1, longitud: 1, ancho: 1, alto: 1 }],
  }));
  return [capitulo];
}

/** Árbol efectivo de un presupuesto (migra automáticamente si aún no tiene árbol). */
export const arbolDe = (presupuesto) =>
  presupuesto?.arbol?.length ? presupuesto.arbol : migrarLineasAArbol(presupuesto?.lineas || []);

// ── Operaciones inmutables sobre el árbol ──────────────────────────
const mapNodos = (nodos, fn) =>
  (nodos || []).map((n) => {
    const actualizado = fn(n);
    if (actualizado === null) return null;
    if (esCapitulo(actualizado)) return { ...actualizado, hijos: mapNodos(actualizado.hijos, fn).filter(Boolean) };
    return actualizado;
  }).filter(Boolean);

export const insertarNodo = (arbol, padreId, nodo) => {
  if (!padreId) return [...arbol, nodo];
  return mapNodos(arbol, (n) => (n.id === padreId ? { ...n, hijos: [...(n.hijos || []), nodo] } : n));
};

export const actualizarNodo = (arbol, id, cambios) =>
  mapNodos(arbol, (n) => (n.id === id ? { ...n, ...cambios } : n));

export const eliminarNodo = (arbol, id) => mapNodos(arbol, (n) => (n.id === id ? null : n));

export function moverNodo(arbol, id, direccion) {
  const mover = (nodos) => {
    const idx = nodos.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const destino = idx + direccion;
      if (destino < 0 || destino >= nodos.length) return nodos;
      const copia = [...nodos];
      [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
      return copia;
    }
    return nodos.map((n) => (esCapitulo(n) ? { ...n, hijos: mover(n.hijos || []) } : n));
  };
  return mover(arbol);
}

/** Siguiente código disponible para un hijo del padre indicado. */
export function siguienteCodigo(arbol, padre) {
  const prefijo = padre?.codigo ? `${padre.codigo}.` : '';
  const hermanos = (padre ? padre.hijos : arbol) || [];
  const usados = new Set(aplanarArbol(arbol).map(({ nodo }) => nodo.codigo));
  let n = hermanos.length + 1;
  let codigo = `${prefijo}${String(n).padStart(2, '0')}`;
  while (usados.has(codigo)) {
    n += 1;
    codigo = `${prefijo}${String(n).padStart(2, '0')}`;
  }
  return codigo;
}

/** Validación según las reglas de Presto: jerarquía estricta y campos obligatorios. */
export function validarArbol(arbol = []) {
  const avisos = [];
  const vistos = new Map();

  const revisar = (nodos, camino, padreEsCapitulo) => {
    const tipos = new Set((nodos || []).map((n) => (n.tipo === 'partida' ? 'partida' : 'capitulo')));
    if (tipos.size > 1) {
      avisos.push({
        nivel: 'error',
        mensaje: `Regla de oro de Presto: «${camino || 'el nivel superior'}» mezcla capítulos y partidas. Un nodo debe contener solo capítulos o solo partidas.`,
      });
    }
    (nodos || []).forEach((n) => {
      const codigo = (n.codigo || '').trim();
      const nombre = n.resumen || codigo || TIPOS_NODO[n.tipo] || 'Concepto';
      if (!codigo) {
        avisos.push({ nivel: 'error', mensaje: `«${nombre}» no tiene código.` });
      } else {
        if (!CARACTERES_CODIGO.test(codigo)) {
          avisos.push({ nivel: 'error', mensaje: `El código «${codigo}» contiene caracteres no admitidos por FIEBDC-3 (espacios, acentos, barras).` });
        }
        if (vistos.has(codigo)) {
          avisos.push({ nivel: 'error', mensaje: `El código «${codigo}» está repetido; Presto necesita códigos únicos.` });
        }
        vistos.set(codigo, true);
      }
      if (!(n.resumen || '').trim()) {
        avisos.push({ nivel: 'aviso', mensaje: `El concepto «${codigo || '—'}» no tiene resumen.` });
      }
      if (n.tipo === 'partida') {
        if (!n.unidad) avisos.push({ nivel: 'error', mensaje: `La partida «${codigo}» no tiene unidad de medida.` });
        if (!(Number(n.precio) > 0)) avisos.push({ nivel: 'aviso', mensaje: `La partida «${codigo}» no tiene precio unitario.` });
        if ((n.hijos || []).length) avisos.push({ nivel: 'error', mensaje: `La partida «${codigo}» no puede contener capítulos ni partidas dentro.` });
        (n.mediciones || []).forEach((m, i) => {
          if (medicionTotal(m) === 0) avisos.push({ nivel: 'aviso', mensaje: `La línea ${i + 1} de la partida «${codigo}» mide 0.` });
        });
      } else {
        if (!padreEsCapitulo && padreEsCapitulo !== null) {
          avisos.push({ nivel: 'error', mensaje: `El capítulo «${codigo}» está dentro de una partida.` });
        }
        if ((n.hijos || []).length === 0) avisos.push({ nivel: 'aviso', mensaje: `El capítulo «${codigo}» está vacío.` });
        revisar(n.hijos || [], codigo || camino, true);
      }
    });
  };

  revisar(arbol, '', true);
  return avisos;
}