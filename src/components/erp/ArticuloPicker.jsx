import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package } from 'lucide-react';
import { euros, precioVenta } from '@/lib/erp-config';

/** Selector de artículos del catálogo para añadirlos como línea. */
export default function ArticuloPicker({ open, onClose, articulos = [], familias = [], onPick }) {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('all');

  const filtered = articulos.filter(a => {
    const q = search.toLowerCase();
    const texto = `${a.nombre || ''} ${a.codigo || ''} ${a.descripcion || ''}`.toLowerCase();
    return (!q || texto.includes(q)) && (filtro === 'all' || a.familia_id === filtro);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Añadir del catálogo</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículo..." className="pl-9" />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Familia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias</SelectItem>
              {familias.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No hay artículos en el catálogo</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <button
                key={a.id}
                onClick={() => onPick(a)}
                className="w-full text-left rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{a.nombre}</p>
                    <p className="text-xs text-slate-400 truncate">{[a.codigo, a.familia, a.unidad].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-indigo-700">{euros(precioVenta(a))}</p>
                    <p className="text-[11px] text-slate-400">PVP {euros(a.pvp)}</p>
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