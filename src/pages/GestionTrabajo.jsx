import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import AlbaranTrabajoCard from '@/components/trabajo/AlbaranTrabajoCard';
import AlbaranTrabajoForm from '@/components/trabajo/AlbaranTrabajoForm';
import DeleteConfirmDialog from '@/components/ui/DeleteConfirmDialog';

export default function GestionTrabajo() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | form
  const [editing, setEditing] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  const effectiveEmail = sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });
  const effEmail = isSessionTech ? effectiveEmail : base44User?.email;

  // Ficha de técnico (para sidebar + creador)
  const { data: techRecord } = useQuery({
    queryKey: ['me-trabajo', effEmail],
    queryFn: async () => {
      if (!effEmail) return null;
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effEmail, entity: 'me' });
        return res.data?.data || null;
      }
      const all = await base44.entities.Technician.list();
      return all.find(t => t.email === effEmail || t.user_email === effEmail) || null;
    },
    enabled: !!effEmail,
  });
  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || techRecord?.is_admin === true;

  const proxyCall = async (payload) => base44.functions.invoke('getCompanyData', { technician_email: effEmail, ...payload });

  const { data: albaranes = [], isLoading } = useQuery({
    queryKey: ['albaranes-trabajo', isSessionTech ? 'proxy' : 'direct', effEmail],
    queryFn: async () => {
      if (!effEmail) return [];
      if (isSessionTech) {
        const res = await proxyCall({ entity: 'albaran_trabajo_list' });
        return res.data?.data || [];
      }
      const all = await base44.entities.AlbaranTrabajo.list('-fecha');
      return all.filter(a => a.company_id === techRecord?.company_id || a.tecnico_email === effEmail || (base44User?.role === 'admin'));
    },
    enabled: !!effEmail,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) { const res = await proxyCall({ entity: 'clients' }); return res.data?.data || []; }
      return base44.entities.Client.list();
    },
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) { const res = await proxyCall({ entity: 'obras' }); return res.data?.data || []; }
      return base44.entities.Obra.list();
    },
  });

  // Prefill desde URL (?new=1&client_id=..&titulo=..&incident_id=..)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('new') === '1') {
      setPrefill({
        client_id: p.get('client_id') || '',
        titulo: p.get('titulo') || '',
        incident_id: p.get('incident_id') || '',
      });
      setView('form');
    }
  }, []);

  const saveAlbaran = async (payload, isEdit, id) => {
    if (isSessionTech) {
      if (isEdit) {
        const res = await proxyCall({ entity: 'albaran_trabajo_update', record_id: id, updates: payload });
        queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });
        return res.data;
      }
      const res = await proxyCall({ entity: 'albaran_trabajo_create', record: payload });
      queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });
      return res.data;
    }
    if (isEdit) {
      const data = await base44.entities.AlbaranTrabajo.update(id, payload);
      queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });
      return { data };
    }
    const data = await base44.entities.AlbaranTrabajo.create({ ...payload, company_id: techRecord?.company_id });
    queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });
    return { data };
  };

  const handleSaved = async (payload, isEdit, id) => {
    return await saveAlbaran(payload, isEdit, id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (isSessionTech) {
        await proxyCall({ entity: 'albaran_trabajo_delete', record_id: deleteTarget.id });
      } else {
        await base44.entities.AlbaranTrabajo.delete(deleteTarget.id);
      }
      queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });
      toast.success('Albarán eliminado');
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    if (isSessionTech) window.location.href = '/';
    else base44.auth.logout('/');
  };

  const filtered = albaranes.filter(a =>
    !search ||
    (a.numero || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.client_name || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  if (view === 'form') {
    return (
      <div className="md:flex min-h-screen bg-slate-50">
        <div className="hidden md:block"><TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isAdmin} isLoading={false} onLogout={handleLogout} techEmail={effEmail} /></div>
        <div className="flex-1 overflow-y-auto">
          <AlbaranTrabajoForm
            record={editing}
            prefill={prefill}
            clients={clients}
            obras={obras}
            existingCount={albaranes.length}
            isSessionTech={isSessionTech}
            effectiveEmail={effEmail}
            techRecord={techRecord}
            onBack={() => { setView('list'); setEditing(null); setPrefill(null); window.history.replaceState({}, '', '/GestionTrabajo'); }}
            onSaved={handleSaved}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-slate-50">
      <div className="hidden md:block"><TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isAdmin} isLoading={false} onLogout={handleLogout} techEmail={effEmail} /></div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Gestión de trabajo</h1>
              <p className="text-sm text-slate-500">Albaranes de trabajo</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditing(null); setPrefill(null); setView('form'); }}>
              <Plus className="h-4 w-4 mr-1" />Nuevo albarán
            </Button>
          </div>

          <div className="mb-4">
            <Input placeholder="Buscar por nº, título o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center bg-white border-0 shadow-sm">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No hay albaranes todavía</p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditing(null); setPrefill(null); setView('form'); }}>
                <Plus className="h-4 w-4 mr-1" />Crear el primer albarán
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => (
                <AlbaranTrabajoCard key={a.id} albaran={a} onEdit={(al) => { setEditing(al); setPrefill(null); setView('form'); }} onDelete={(al) => setDeleteTarget(al)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar albarán?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        isLoading={false}
      />
    </div>
  );
}