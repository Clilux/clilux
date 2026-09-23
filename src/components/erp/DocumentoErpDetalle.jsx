import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, FileText } from 'lucide-react';
import { ESTADOS, euros } from '@/lib/erp-config';

const fecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-ES'); } catch { return f; }
};

const importeLinea = (l) =>
  Math.round((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0) * (1 - (Number(l.descuento) || 0) / 100) * 100) / 100;

/** Ficha de un pedido o una compra: datos, líneas, totales y acceso a la edición. */
export default function DocumentoErpDetalle({ open, onClose, tipo, documento, proveedor, onEdit }) {
  const d = documento || {};
  const lineas = d.lineas || [];
  const estado = (ESTADOS[tipo] || {})[d.estado] || null;
  const subtotal = Number(d.subtotal) || 0;
  const ivaPct = Number(d.iva) || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {tipo === 'compra' ? 'Compra' : 'Pedido'} {d.numero || ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 grid md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Proveedor</p>
              <p className="font-medium text-slate-800">{proveedor?.nombre || d.proveedor_nombre || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha</p>
              <p className="font-medium text-slate-800">{fecha(d.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <p className="font-medium text-slate-800">{estado?.label || d.estado || '—'}</p>
            </div>
            {tipo === 'pedido' && d.fecha_entrega && (
              <div>
                <p className="text-xs text-slate-500">Entrega prevista</p>
                <p className="font-medium text-slate-800">{fecha(d.fecha_entrega)}</p>
              </div>
            )}
            {tipo === 'compra' && d.num_factura && (
              <div>
                <p className="text-xs text-slate-500">Nº factura proveedor</p>
                <p className="font-medium text-slate-800">{d.num_factura}</p>
              </div>
            )}
            {d.obra_nombre && (
              <div>
                <p className="text-xs text-slate-500">Obra</p>
                <p className="font-medium text-slate-800">{d.obra_nombre}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span className="col-span-6">Concepto</span>
              <span className="col-span-1 text-right">Ud</span>
              <span className="col-span-1 text-right">Cant.</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-2 text-right">Importe</span>
            </div>

            {lineas.length === 0 ? (
              <p className="text-slate-500 p-4 text-sm">Este documento no tiene líneas.</p>
            ) : lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-2 text-sm md:text-base border-t border-slate-100">
                <span className="col-span-2 md:col-span-6 min-w-0 truncate text-slate-800">
                  {l.codigo ? <span className="font-mono text-xs text-slate-400 mr-2">{l.codigo}</span> : null}
                  {l.concepto || 'Sin concepto'}
                </span>
                <span className="md:col-span-1 md:text-right text-slate-500">{l.unidad || 'ud'}</span>
                <span className="md:col-span-1 md:text-right text-slate-600">{Number(l.cantidad) || 0}</span>
                <span className="md:col-span-2 md:text-right text-slate-600">{euros(l.precio_unitario)}</span>
                <span className="md:col-span-2 md:text-right font-medium text-slate-800">{euros(importeLinea(l))}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-1 text-sm md:text-base">
              <div className="flex justify-between text-slate-500"><span>Base imponible</span><span>{euros(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>IVA {ivaPct} %</span><span>{euros(subtotal * ivaPct / 100)}</span></div>
              <div className="flex justify-between text-lg font-bold text-indigo-700 border-t border-slate-200 pt-1">
                <span>Total</span><span>{euros(d.total)}</span>
              </div>
            </div>
          </div>

          {d.notas && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Notas</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{d.notas}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" className="gap-2" onClick={() => { onClose(); onEdit?.(d); }}>
              <Pencil className="h-4 w-4" />Editar
            </Button>
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <FileText className="h-4 w-4" />Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}