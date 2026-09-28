import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import ErpLayout from '@/components/erp/ErpLayout';
import AlbaranTrabajoCard from '@/components/trabajo/AlbaranTrabajoCard';
import AlbaranTrabajoForm from '@/components/trabajo/AlbaranTrabajoForm';
import DeleteConfirmDialog from '@/components/ui/DeleteConfirmDialog';
import { useAlbaranesTrabajo } from '@/hooks/useAlbaranesTrabajo';
import { euros } from '@/lib/erp-config';

export default function ErpAlbaranes() {
  const {
    albaranes, isLoading, clients, obras, techRecord,
    hideRates, isSessionTech, effEmail, saveAlbaran, deleteAlbaran,
  } = useAlbaranesTrabajo();

  const [view, setView] = useState('list'); // list | form
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = albaranes.filter(a =>
    !search ||
    (a.numero || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.client_name || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const totalImporte = filtered.reduce((s, a) => s + (Number(a.total) || 0), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAlbaran(deleteTarget.id);
      toast.success('Albarán eliminado');
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (view === 'form') {
    return (
      <AlbaranTrabajoForm
        record={editing}
        prefill={null}
        clients={clients}
        obras={obras}
        existingCount={albaranes.length}
        isSessionTech={isSessionTech}
        effectiveEmail={effEmail}
        techRecord={techRecord}
        hideRates={hideRates}
        onBack={() => { setView('list'); setEditing(null); }}
        onSaved={saveAlbaran}
      />
    );
  }

  return (
    <ErpLayout active="albaranes">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-cyan-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 md:h-7 md:w-7 text-cyan-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-800">Albaranes</h1>
            <p className="text-xs md:text-base text-slate-400">Los mismos partes de trabajo del módulo Servicios</p>
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditing(null); setView('form'); }}>
          <Plus className="h-4 w-4 mr-1" />Nuevo albarán
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-2xl md:text-3xl font-bold text-slate-800">{albaranes.length}</p>
          <p className="text-xs md:text-base text-slate-500">Albaranes registrados</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-2xl md:text-3xl font-bold text-emerald-700">
            {albaranes.filter(a => a.estado === 'firmado').length}
          </p>
          <p className="text-xs md:text-base text-slate-500">Firmados por el cliente</p>
        </Card>
        {!hideRates && (
          <Card className="p-4 border-0 shadow-sm">
            <p className="text-2xl md:text-3xl font-bold text-indigo-700">{euros(totalImporte)}</p>
            <p className="text-xs md:text-base text-slate-500">Importe listado</p>
          </Card>
        )}
      </div>

      <div className="mb-4">
        <Input placeholder="Buscar por nº, título o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 h-6 w-6 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center bg-white border-0 shadow-sm">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No hay albaranes todavía</p>
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditing(null); setView('form'); }}>
            <Plus className="h-4 w-4 mr-1" />Crear el primer albarán
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <Badge variant="secondary" className="text-xs">{filtered.length} albarán{filtered.length !== 1 ? 'es' : ''}</Badge>
          {filtered.map(a => (
            <AlbaranTrabajoCard
              key={a.id}
              albaran={a}
              hideRates={hideRates}
              onEdit={(al) => { setEditing(al); setView('form'); }}
              onDelete={(al) => setDeleteTarget(al)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar albarán?"
        description="Se eliminará también del módulo Servicios. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        isLoading={false}
      />
    </ErpLayout>
  );
}