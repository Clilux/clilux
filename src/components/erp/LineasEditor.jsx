import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Package } from 'lucide-react';
import ArticuloPicker from '@/components/erp/ArticuloPicker';
import { calcTotales, euros, IVA_DEFECTO } from '@/lib/erp-config';

/** Editor de líneas de un documento ERP (concepto, unidad, cantidad, precio, descuento). */
export default function LineasEditor({ lineas = [], onChange, iva = IVA_DEFECTO, articulos = [], familias = [] }) {
  const [picker, setPicker] = useState(false);

  const set = (i, campo, valor) => {
    onChange(lineas.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  };
  const totalLinea = (l) =>
    (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0) * (1 - (Number(l.descuento) || 0) / 100);

  const añadirDelCatalogo = (a) => {
    onChange([...lineas, {
      codigo: a.codigo || '',
      concepto: a.nombre || a.descripcion || '',
      unidad: a.unidad || 'ud',
      cantidad: 1,
      precio_unitario: Number(a.pvp) || 0,
      descuento: Number(a.descuento_compra) || 0,
    }]);
    setPicker(false);
  };

  const t = calcTotales(lineas, iva);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm md:text-base font-semibold text-slate-700">Líneas</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => setPicker(true)}>
            <Package className="h-3.5 w-3.5" />Del catálogo
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => onChange([...lineas, { codigo: '', concepto: '', unidad: 'ud', cantidad: 1, precio_unitario: 0, descuento: 0 }])}>
            <Plus className="h-3.5 w-3.5" />Añadir
          </Button>
        </div>
      </div>

      {lineas.length === 0 && (
        <p className="text-xs text-slate-400 py-2">Sin líneas todavía. Pulsa «Añadir» o «Del catálogo» para empezar.</p>
      )}

      {lineas.map((l, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-2">
          <div className="flex gap-2">
            <Input value={l.concepto || ''} onChange={e => set(i, 'concepto', e.target.value)} placeholder="Concepto" className="h-9 text-sm" />
            <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-slate-400 hover:text-red-500" onClick={() => onChange(lineas.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Cant.</p>
              <Input type="number" min="0" step="0.01" value={l.cantidad ?? ''} onChange={e => set(i, 'cantidad', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Ud</p>
              <Input value={l.unidad || ''} onChange={e => set(i, 'unidad', e.target.value)} placeholder="ud" className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Precio</p>
              <Input type="number" min="0" step="0.01" value={l.precio_unitario ?? ''} onChange={e => set(i, 'precio_unitario', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Dto %</p>
              <Input type="number" min="0" step="0.01" value={l.descuento ?? ''} onChange={e => set(i, 'descuento', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Total</p>
              <p className="h-8 flex items-center text-sm font-medium text-slate-700">{euros(totalLinea(l))}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-6 pt-1 text-sm md:text-base">
        <span className="text-slate-500">Base: <strong className="text-slate-800">{euros(t.subtotal)}</strong></span>
        <span className="text-slate-500">IVA: <strong className="text-slate-800">{euros(t.iva_importe)}</strong></span>
        <span className="text-slate-500">Total: <strong className="text-indigo-700">{euros(t.total)}</strong></span>
      </div>

      <ArticuloPicker open={picker} onClose={() => setPicker(false)} articulos={articulos} familias={familias} onPick={añadirDelCatalogo} />
    </div>
  );
}