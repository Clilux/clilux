// ── Base común de los documentos del ERP ─────────────────────────────
// Presupuestos, albaranes, pedidos y compras comparten la misma estructura
// base: número, fecha, parte (cliente o proveedor), líneas, IVA, totales y
// trazas de origen. Cualquier documento puede generarse a partir de otro y,
// en el futuro, emitirse como factura reutilizando estas mismas funciones.

import { IVA_DEFECTO, calcTotales } from '@/lib/erp-config';
import { arbolDe, lineasDesdeArbol, migrarLineasAArbol } from '@/lib/presto-arbol';

const hoy = () => new Date().toISOString().slice(0, 10);

/** Registro único de tipos de documento. */
export const TIPOS_DOC = {
  presupuesto: { label: 'Presupuesto', plural: 'Presupuestos', prefix: 'PRES', entidad: 'Presupuesto', parte: 'cliente', campoEstado: 'status', lista: 'presupuestos' },
  albaran: { label: 'Albarán', plural: 'Albaranes', prefix: 'ALB', entidad: 'AlbaranTrabajo', parte: 'cliente', campoEstado: 'estado', lista: 'albaranes' },
  pedido: { label: 'Pedido', plural: 'Pedidos', prefix: 'PED', entidad: 'Pedido', parte: 'proveedor', campoEstado: 'estado', lista: 'pedidos' },
  compra: { label: 'Compra', plural: 'Compras', prefix: 'FAC', entidad: 'Compra', parte: 'proveedor', campoEstado: 'estado', lista: 'compras' },
};

/** Conversiones disponibles: siempre entre documentos de la misma parte. */
export const CONVERSIONES = {
  presupuesto: ['albaran'],
  albaran: ['presupuesto'],
  pedido: ['compra'],
  compra: ['pedido'],
};

export const importeLinea = (l) =>
  Math.round((Number(l?.cantidad) || 0) * (Number(l?.precio_unitario) || 0) * (1 - (Number(l?.descuento) || 0) / 100) * 100) / 100;

/** Líneas de cualquier documento en la forma común del ERP. */
export function lineasComunes(doc, tipo) {
  if (!doc) return [];
  const crudas = tipo === 'albaran'
    ? (doc.lineas || []).map(l => ({
        codigo: l.stel_product_ref || '',
        concepto: l.descripcion || l.concepto || '',
        unidad: l.unidad,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        descuento: l.descuento,
      }))
    : (doc.lineas?.length ? doc.lineas : lineasDesdeArbol(arbolDe(doc)));
  return crudas.map(l => ({
    codigo: l.codigo || '',
    concepto: l.concepto || '',
    unidad: l.unidad || 'ud',
    cantidad: Number(l.cantidad) || 0,
    precio_unitario: Number(l.precio_unitario) || 0,
    descuento: Number(l.descuento) || 0,
    total: importeLinea(l),
  }));
}

/** Documento normalizado a la forma común. */
export function normalizar(doc, tipo) {
  const cfg = TIPOS_DOC[tipo] || {};
  const esCliente = cfg.parte === 'cliente';
  return {
    tipo,
    id: doc?.id || null,
    numero: doc?.numero || '',
    fecha: doc?.fecha || hoy(),
    partyId: (esCliente ? doc?.client_id : doc?.proveedor_id) || '',
    partyNombre: (esCliente ? (doc?.cliente_nombre || doc?.client_name) : doc?.proveedor_nombre) || '',
    titulo: doc?.titulo || '',
    iva: doc?.iva ?? IVA_DEFECTO,
    estado: doc?.[cfg.campoEstado] || '',
    notas: doc?.notas || doc?.observaciones || '',
    lineas: lineasComunes(doc, tipo),
  };
}

/** Siguiente número libre del tipo indicado (ALB-2026-0001 / PRES-2026-001). */
export function siguienteNumeroDoc(tipo, lista = []) {
  const { prefix } = TIPOS_DOC[tipo] || {};
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const max = (lista || []).reduce((m, d) => {
    const n = (d?.numero || '').startsWith(head) ? parseInt(d.numero.slice(head.length), 10) || 0 : 0;
    return Math.max(m, n);
  }, 0);
  return `${head}${String(max + 1).padStart(tipo === 'albaran' ? 4 : 3, '0')}`;
}

/**
 * Payload del documento destino a partir de un documento de origen: traslada
 * líneas, IVA y totales, y guarda la trazabilidad (origen_tipo / origen_id /
 * origen_numero) para poder encadenar documentos y facturar más adelante.
 */
export function payloadDestino(origenTipo, doc, destinoTipo, numero, extra = {}) {
  const o = normalizar(doc, origenTipo);
  const etiquetaOrigen = `${TIPOS_DOC[origenTipo]?.label || origenTipo} ${o.numero}`.trim();
  const t = calcTotales(o.lineas, o.iva);
  const comunes = {
    numero,
    fecha: hoy(),
    subtotal: t.subtotal,
    iva: Number(o.iva) || 0,
    total: t.total,
    origen_tipo: origenTipo,
    origen_id: o.id,
    origen_numero: o.numero,
  };
  const nota = [`Generado desde el ${etiquetaOrigen}`, o.notas].filter(Boolean).join('\n');

  switch (destinoTipo) {
    case 'presupuesto':
      return {
        ...comunes,
        titulo: o.titulo || `Generado desde el ${etiquetaOrigen}`,
        client_id: o.partyId,
        cliente_nombre: o.partyNombre,
        fecha_validez: null,
        status: 'borrador',
        lineas: o.lineas,
        arbol: migrarLineasAArbol(o.lineas),
        observaciones: nota,
      };
    case 'albaran':
      return {
        ...comunes,
        titulo: o.titulo || `Trabajos del ${etiquetaOrigen}`,
        client_id: o.partyId,
        client_name: o.partyNombre,
        estado: 'borrador',
        base_imponible: t.subtotal,
        descuento_total: 0,
        lineas: o.lineas.map(l => ({
          descripcion: l.concepto,
          cantidad: l.cantidad,
          unidad: l.unidad,
          precio_unitario: l.precio_unitario,
          descuento: l.descuento,
          subtotal: l.total,
        })),
        tecnico_nombre: extra.tecnicoNombre || '',
        tecnico_email: extra.tecnicoEmail || '',
        notas: nota,
      };
    case 'pedido':
      return { ...comunes, proveedor_id: o.partyId, proveedor_nombre: o.partyNombre, fecha_entrega: null, estado: 'borrador', lineas: o.lineas, notas: nota };
    case 'compra':
      return { ...comunes, proveedor_id: o.partyId, proveedor_nombre: o.partyNombre, num_factura: '', forma_pago: 'transferencia', estado: 'pendiente', lineas: o.lineas, notas: nota };
    default:
      throw new Error(`No se puede convertir en ${destinoTipo}`);
  }
}