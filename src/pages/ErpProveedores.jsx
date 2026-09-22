import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Truck, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import ErpLayout from '@/components/erp/ErpLayout';
import ProveedorForm from '@/components/erp/ProveedorForm';
import { useErpData } from '@/hooks/useErpData';

export default function ErpProveedores() {
  const { erp, isLoading, saveProveedor, deleteProveedor } = useErpData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const lista = erp.proveedores || [];
  const filtered = lista.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.nombre || '').toLowerCase().includes(q) || (p.cif || '').toLowerCase().includes(q);
  });

  const guardar = async (record, id) => {
    try {
      await saveProveedor(record, id);
      toast.success(id ? 'Proveedor actualizado' : 'Proveedor creado');
    } catch (e) {
      toast.error(e.message || 'No se pudo guardar');
    }
  };

  const borrar = async (p) => {
    if (!window.confirm(`¿Eliminar el proveedor ${p.nombre}?`)) return;
    try {
      await deleteProveedor(p.id);
      toast.success('Proveedor eliminado');
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  return (
    <ErpLayout active="proveedores">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Truck className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Proveedores</h1>
            <p className="text-xs md:text-base text-slate-400">{lista.length} registrados</p>
          </div>
        </div>
        <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />Nuevo
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o CIF..." className="pl-9 md:h-11 md:text-base bg-white" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 md:text-lg">No hay proveedores que mostrar</p>
          <Button onClick={() => { setEditando(null); setShowForm(true); }} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(p => (
            <Card key={p.id} className="p-4 border-0 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 truncate md:text-xl">{p.nombre}</p>
                    <Badge className={`border-0 text-xs md:text-sm ${p.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.status === 'inactive' ? 'Inactivo' : 'Activo'}
                    </Badge>
                  </div>
                  {p.cif && <p className="text-xs md:text-sm text-slate-400 mt-0.5">{p.cif}</p>}
                  <div className="mt-2 space-y-1 text-xs md:text-base text-slate-500">
                    {p.contacto && <p>{p.contacto}</p>}
                    {p.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{p.telefono}</p>}
                    {p.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{p.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Editar" onClick={() => { setEditando(p); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50" title="Eliminar" onClick={() => borrar(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProveedorForm open={showForm} onClose={() => setShowForm(false)} proveedor={editando} onSave={guardar} />
    </ErpLayout>
  );
}