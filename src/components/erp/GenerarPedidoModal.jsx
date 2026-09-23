import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { arbolDe, cantidadPartida, partidasArbol } from '@/lib/presto-arbol';
import { IVA_DEFECTO, calcTotales, euros, precioCompra, siguienteNumero } from '@/lib/erp-config';

const hoy = () => new Date().toISOString().slice(0, 10);

const buscarArticulo = (articulos, nodo) => {
  const codigo = (nodo.codigo || '').trim().toLowerCase();
  const resumen = (nodo.resumen || '').trim().toLowerCase();
  return articulos.find(a => codigo && (a.codigo || '').trim().toLowerCase() === codigo)
    || articulos.find(a => resumen && (a.nombre || '').trim().toLowerCase() === resumen)
    || null;
};

/** Líneas del pedido: partidas del presupuesto valoradas a precio de compra del catálogo. */
const lineasDePresupuesto = (presupuesto, articulos) =>
  partidasArbol(arbolDe(presupuesto)).map((nodo) => {
    const art = buscarArticulo(articulos, nodo);
    const coste = art ? precioCompra(art) : (Number(nodo.coste) || 0);
    return {
      codigo: nodo.codigo || '',
      concepto: nodo.resumen || nodo.codigo || '',
      unidad: nodo.unidad || 'ud',
      cantidad: cantidadPartida(nodo),
      precio_unitario: coste,
      descuento: 0,
    };
  });

/** Genera un pedido a proveedor a partir de un presupuesto aceptado. */
export default function GenerarPedidoModal({ open, onClose, presupuesto, proveedores = [], articulos = [], pedidos = [], onCreated }) {
  const [proveedorId, setProveedorId] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProveedorId('');
    setFechaEntrega('');
    setLineas(presupuesto ? lineasDePresupuesto(presupuesto, articulos) : []);
  }, [open, presupuesto, articulos]);

  const set = (i, campo, valor) => setLineas(prev => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  const t = calcTotales(lineas, IVA_DEFECTO);
  const proveedor = proveedores.find(p => p.id === proveedorId);

  const guardar = async () => {
    setSaving(true);
    try {
      await onCreated({
        numero: siguienteNumero('PED', pedidos),
        fecha: hoy(),
        proveedor_id: proveedorId,
        proveedor_nombre: proveedor?.nombre || '',
        fecha_entrega: fechaEntrega || null,
        lineas: lineas.map(l => ({ ...l, cantidad: Number(l.cantidad) || 0, precio_unitario: Number(l.precio_unitario) || 0, total: Math.round((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0) * 100) / 100 })),
        subtotal: t.subtotal,
        iva: IVA_DEFECTO,
        total: t.total,
        estado: 'borrador',
        notas: `Generado desde el presupuesto ${presupuesto?.numero || ''}`.trim(),
      });
      toast.success('Pedido generado');
      onClose();
    } catch (e) {
      toast.error(e.message || 'No se pudo generar el pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Generar pedido desde {presupuesto?.numero || 'el presupuesto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Proveedor *</Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                <SelectContent>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              {proveedores.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Crea primero un proveedor en el módulo Proveedores.</p>
              )}
            </div>
            <div>
              <Label>Entrega prevista</Label>
              <Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} className="mt-1" />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Los precios se toman del coste de compra del artículo del catálogo. Revísalos antes de crear el pedido.
          </p>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span className="col-span-5">Concepto</span>
              <span className="col-span-2 text-right">Cant.</span>
              <span className="col-span-2 text-right">Precio compra</span>
              <span className="col-span-2 text-right">Importe</span>
              <span className="col-span-1" />
            </div>
            {lineas.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">El presupuesto no tiene partidas que pedir.</p>
            ) : lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-2 items-center border-t border-slate-100">
                <div className="col-span-2 md:col-span-5 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{l.concepto}</p>
                  <p className="text-[11px] text-slate-400">{l.codigo} · {l.unidad}</p>
                </div>
                <div className="md:col-span-2">
                  <Input type="number" min="0" step="0.01" value={l.cantidad ?? ''} onChange={e => set(i, 'cantidad', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Input type="number" min="0" step="0.01" value={l.precio_unitario ?? ''} onChange={e => set(i, 'precio_unitario', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="md:col-span-2 md:text-right text-sm font-medium text-slate-800">
                  {euros((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0))}
                </div>
                <div className="md:col-span-1 flex md:justify-end">
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500" onClick={() => setLineas(prev => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-6 text-sm md:text-base">
            <span className="text-slate-500">Base: <strong className="text-slate-800">{euros(t.subtotal)}</strong></span>
            <span className="text-slate-500">IVA: <strong className="text-slate-800">{euros(t.iva_importe)}</strong></span>
            <span className="text-slate-500">Total: <strong className="text-indigo-700">{euros(t.total)}</strong></span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={guardar}
              disabled={!proveedorId || lineas.length === 0 || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Crear pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}