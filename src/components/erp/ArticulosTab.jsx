import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Package, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ArticuloForm from '@/components/erp/ArticuloForm';
import { useErpData } from '@/hooks/useErpData';
import { euros, precioCompra, precioVenta } from '@/lib/erp-config';

/** Catálogo de artículos: familia, nombre, PVP, descuento de compra y % de venta. */
export default function ArticulosTab() {
  const { erp, isLoading, saveArticulo, deleteArticulo } = useErpData();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const articulos = erp.articulos || [];
  const familias = erp.familias || [];

  const filtered = articulos.filter(a => {
    const q = search.toLowerCase();
    const texto = `${a.nombre || ''} ${a.codigo || ''} ${a.descripcion || ''}`.toLowerCase();
    return (!q || texto.includes(q)) && (filtro === 'all' || a.familia_id === filtro);
  });

  const borrar = async (a) => {
    if (!window.confirm(`¿Eliminar el artículo ${a.nombre}?`)) return;
    try {
      await deleteArticulo(a.id);
      toast.success('Artículo eliminado');
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Package className="h-5 w-5 md:h-7 md:w-7 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-800">Artículos</h1>
            <p className="text-xs md:text-base text-slate-400">{articulos.length} artículos en el catálogo</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />Nuevo artículo
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, código o descripción..." className="pl-9 md:h-11 md:text-base bg-white" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-56 md:h-11 md:text-base bg-white"><SelectValue placeholder="Familia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {familias.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 md:text-lg">No hay artículos que mostrar</p>
          <Button onClick={() => { setEditando(null); setShowForm(true); }} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className="p-3.5 border-0 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-lg font-medium text-slate-800 truncate">{a.nombre}</p>
                  <p className="text-xs md:text-sm text-slate-400 truncate">
                    {[a.codigo, a.familia, a.unidad].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">PVP</p>
                  <p className="text-sm md:text-lg font-semibold text-slate-800">{euros(a.pvp)}</p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Dto. compra</p>
                  <p className="text-sm md:text-base text-slate-700">{Number(a.descuento_compra) || 0} %</p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">% venta</p>
                  <p className="text-sm md:text-base text-slate-700">{Number(a.porcentaje_venta) || 0} %</p>
                </div>
                <div className="md:w-36 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Precio venta</p>
                  <p className="text-sm md:text-lg font-semibold text-indigo-700">{euros(precioVenta(a))}</p>
                  <p className="text-[11px] text-slate-400">Compra {euros(precioCompra(a))}</p>
                </div>
                <div className="flex items-center gap-1 md:shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Editar" onClick={() => { setEditando(a); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50" title="Eliminar" onClick={() => borrar(a)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ArticuloForm
        open={showForm}
        onClose={() => setShowForm(false)}
        articulo={editando}
        familias={familias}
        onSave={saveArticulo}
      />
    </>
  );
}