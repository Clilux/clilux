import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Package, Pencil, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ArticuloForm from '@/components/erp/ArticuloForm';
import ImportarCatalogoModal from '@/components/erp/ImportarCatalogoModal';
import { useErpData } from '@/hooks/useErpData';
import { euros, margenCompra, margenVenta, precioCompra, precioVenta, bajoStockMinimo, controlaStock, stockActual, stockMinimo } from '@/lib/erp-config';

/** Catálogo de artículos: familia, nombre, PVP, descuento de compra y % de venta. */
export default function ArticulosTab() {
  const { erp, isLoading, saveArticulo, saveArticulosBulk, deleteArticulo, saveFamilia, refresh } = useErpData();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [soloBajo, setSoloBajo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [importando, setImportando] = useState(false);

  const articulos = erp.articulos || [];
  const familias = erp.familias || [];

  const bajoMinimo = articulos.filter(bajoStockMinimo);

  const filtered = articulos.filter(a => {
    const q = search.toLowerCase();
    const texto = `${a.nombre || ''} ${a.codigo || ''} ${a.referencia_fabricante || ''} ${a.fabricante || ''} ${a.descripcion || ''}`.toLowerCase();
    return (!q || texto.includes(q))
      && (filtro === 'all' || a.familia_id === filtro)
      && (!soloBajo || bajoStockMinimo(a));
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Package className="h-5 w-5 md:h-7 md:w-7 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-800">Artículos</h1>
            <p className="text-xs md:text-base text-slate-400">{articulos.length} artículos en el catálogo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportando(true)} className="gap-2">
            <Upload className="h-4 w-4" />Importar catálogo
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">Beta</span>
          </Button>
          <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="h-4 w-4" />Nuevo artículo
          </Button>
        </div>
      </div>

      {bajoMinimo.length > 0 && (
        <Card className="p-3 mb-4 border-0 shadow-sm bg-red-50 flex items-center justify-between gap-3 flex-wrap">
          <p className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {bajoMinimo.length} artículo{bajoMinimo.length === 1 ? '' : 's'} en el stock mínimo o por debajo
          </p>
          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100" onClick={() => setSoloBajo(v => !v)}>
            {soloBajo ? 'Ver todos' : 'Ver solo estos'}
          </Button>
        </Card>
      )}

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
        <Button
          variant={soloBajo ? 'default' : 'outline'}
          onClick={() => setSoloBajo(v => !v)}
          className={`gap-2 md:h-11 ${soloBajo ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}>
          <AlertTriangle className="h-4 w-4" />Bajo mínimo
        </Button>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm md:text-lg font-medium text-slate-800 truncate">{a.nombre}</p>
                    {bajoStockMinimo(a) && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 rounded-full px-2 py-0.5">Falta stock</span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 truncate">
                    {[a.codigo, a.referencia_fabricante, a.fabricante, a.familia, a.unidad].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">PVP</p>
                  <p className="text-sm md:text-lg font-semibold text-slate-800">{euros(a.pvp)}</p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Margen compra</p>
                  <p className="text-sm md:text-base text-slate-700">{margenCompra(a).pct} %</p>
                  <p className="text-[11px] text-slate-400">{euros(margenCompra(a).importe)}</p>
                </div>
                <div className="md:w-32 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Margen venta</p>
                  <p className="text-sm md:text-base text-emerald-700">{margenVenta(a).pct} %</p>
                  <p className="text-[11px] text-slate-400">{euros(margenVenta(a).importe)}</p>
                </div>
                <div className="md:w-36 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Precio venta</p>
                  <p className="text-sm md:text-lg font-semibold text-indigo-700">{euros(precioVenta(a))}</p>
                  <p className="text-[11px] text-slate-400">Compra {euros(precioCompra(a))}</p>
                </div>
                <div className="md:w-28 md:shrink-0">
                  <p className="text-[11px] md:text-sm text-slate-400">Stock</p>
                  {controlaStock(a) ? (
                    <>
                      <p className={`text-sm md:text-lg font-semibold ${bajoStockMinimo(a) ? 'text-red-600' : 'text-slate-800'}`}>
                        {stockActual(a).toLocaleString('es-ES')} {a.unidad}
                      </p>
                      <p className="text-[11px] text-slate-400">Mín. {stockMinimo(a).toLocaleString('es-ES')}</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-300">Sin control</p>
                  )}
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
        onCreateFamilia={saveFamilia}
      />

      <ImportarCatalogoModal
        open={importando}
        onClose={() => setImportando(false)}
        familias={familias}
        onSaveArticulos={saveArticulosBulk}
        onCreateFamilia={saveFamilia}
        onDone={refresh}
      />
    </>
  );
}