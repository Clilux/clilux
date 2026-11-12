import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Tag } from 'lucide-react';
import { euros } from '@/lib/erp-config';

/** Selector de tarifas especiales del cliente para añadirlas como línea/partida. */
export default function TarifasPicker({ open, onClose, tarifas = [], onPick }) {
  const [search, setSearch] = useState('');

  const filtered = (tarifas || []).filter(t => {
    const q = search.toLowerCase();
    const texto = `${t.nombre || ''} ${t.descripcion || ''} ${t.notas || ''}`.toLowerCase();
    return !q || texto.includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2"><Tag className="h-5 w-5 text-emerald-600" />Tarifas del cliente</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarifa..." className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Este cliente no tiene tarifas especiales definidas.<br /><span className="text-xs">Añádelas desde la ficha del cliente, pestaña «Tarifas y Equipo».</span></p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t, i) => (
              <button
                key={i}
                onClick={() => onPick(t)}
                className="w-full text-left rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{t.nombre}</p>
                    {t.descripcion && <p className="text-xs text-slate-400 truncate">{t.descripcion}</p>}
                    <p className="text-[11px] text-slate-400">Unidad: {t.unidad || 'ud'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-emerald-700">{euros(Number(t.precio) || 0)}</p>
                    <p className="text-[11px] text-slate-400">/ {t.unidad || 'ud'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}