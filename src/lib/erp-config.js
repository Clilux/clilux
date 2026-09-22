// Configuración del módulo ERP (presupuestos, pedidos, compras y proveedores)

export const ESTADOS = {
  presupuesto: {
    borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
    enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
    aceptado: { label: 'Aceptado', color: 'bg-emerald-100 text-emerald-700' },
    rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
  },
  pedido: {
    borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
    enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
    recibido_parcial: { label: 'Recibido parcial', color: 'bg-amber-100 text-amber-700' },
    recibido: { label: 'Recibido', color: 'bg-emerald-100 text-emerald-700' },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  },
  compra: {
    pendiente: { label: 'Pendiente de pago', color: 'bg-amber-100 text-amber-700' },
    pagada: { label: 'Pagada', color: 'bg-emerald-100 text-emerald-700' },
  },
};

export const DOCS = {
  presupuesto: {
    label: 'Presupuesto',
    plural: 'Presupuestos',
    prefix: 'PRES',
    party: 'cliente',
    ruta: '/ErpPresupuestos',
  },
  pedido: {
    label: 'Pedido',
    plural: 'Pedidos',
    prefix: 'PED',
    party: 'proveedor',
    ruta: '/ErpPedidos',
  },
  compra: {
    label: 'Compra',
    plural: 'Compras',
    prefix: 'FAC',
    party: 'proveedor',
    ruta: '/ErpCompras',
  },
};

export const ENTIDADES = {
  presupuesto: 'Presupuesto',
  pedido: 'Pedido',
  compra: 'Compra',
  proveedor: 'Proveedor',
};

export const IVA_DEFECTO = 21;

export const FORMAS_PAGO = {
  contado: 'Contado',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  domiciliado: 'Domiciliado',
};

// Totales de un documento a partir de sus líneas e IVA
export function calcTotales(lineas = [], iva = IVA_DEFECTO) {
  const subtotal = lineas.reduce((s, l) => {
    const base = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
    return s + base * (1 - (Number(l.descuento) || 0) / 100);
  }, 0);
  const ivaPct = Number(iva) || 0;
  const round = (n) => Math.round(n * 100) / 100;
  return {
    subtotal: round(subtotal),
    iva_importe: round(subtotal * ivaPct / 100),
    total: round(subtotal * (1 + ivaPct / 100)),
  };
}

// Siguiente número de documento: PRES-2026-003
export function siguienteNumero(prefix, lista = []) {
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const max = lista
    .map(d => (d.numero || '').startsWith(head) ? parseInt(d.numero.slice(head.length), 10) || 0 : 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

export function euros(n) {
  if (n === null || n === undefined || n === '') return '—';
  return `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}