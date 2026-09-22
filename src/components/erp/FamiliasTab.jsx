import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search, Layers, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import FamiliaForm from '@/components/erp/FamiliaForm';
import { useErpData } from '@/hooks/useErpData';

/** Familias del catálogo de artículos. */
export default function FamiliasTab() {
  const { erp, isLoading, saveFamilia, deleteFamilia } = useErpData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const familias = erp.familias || [];
  const articulos = erp.articulos || [];

  const filtered = familias.filter(f => !search || (f.nombre || '').toLowerCase().includes(search.toLowerCase()));

  const borrar = async (f) => {
    if (!window.confirm(`¿Eliminar la familia ${f.nombre}?`)) return;
    try {
      await deleteFamilia(f.id);
      toast.success('Familia eliminada');
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Layers className="h-5 w-5 md:h-7 md:w-7 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-800">Familias</h1>
            <p className="text-xs md:text-base text-slate-400">{familias.length} familias de artículos</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />Nueva familia
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar familia..." className="pl-9 md:h-11 md:text-base bg-white" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 md:text-lg">No hay familias que mostrar</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <Card key={f.id} className="p-3.5 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-lg font-medium text-slate-800 truncate">{f.nombre}</p>
                  <p className="text-xs md:text-sm text-slate-400 truncate">
                    {articulos.filter(a => a.familia_id === f.id).length} artículos{f.descripcion ? ` · ${f.descripcion}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Editar" onClick={() => { setEditando(f); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50" title="Eliminar" onClick={() => borrar(f)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FamiliaForm open={showForm} onClose={() => setShowForm(false)} familia={editando} onSave={saveFamilia} />
    </>
  );
}