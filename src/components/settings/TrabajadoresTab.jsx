import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Trash2, Edit, Shield, HardHat, Briefcase, KeyRound, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WorkerDocumentsPanel from '@/components/settings/WorkerDocumentsPanel';

export default function TrabajadoresTab({ techEmail }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', portal_password: '', worker_type: 'tecnico', is_admin: false, status: 'active' });
  const [docsWorker, setDocsWorker] = useState(null);

  const invoke = (entity, extra = {}) =>
    base44.functions.invoke('getCompanyData', { technician_email: techEmail, entity, ...extra });

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['company-workers', techEmail],
    queryFn: async () => {
      const res = await invoke('technicians');
      return res.data?.data || [];
    },
    enabled: !!techEmail,
  });

  const resetForm = () => {
    setForm({ name: '', email: '', portal_password: '', worker_type: 'tecnico', is_admin: false, status: 'active' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setForm({
      name: w.name || '', email: w.email || '', portal_password: '',
      worker_type: w.worker_type || 'tecnico', is_admin: !!w.is_admin, status: w.status || 'active',
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.email) throw new Error('Nombre y email obligatorios');
      if (editingId) {
        const updates = { name: form.name, worker_type: form.worker_type, is_admin: form.is_admin, status: form.status };
        if (form.portal_password) updates.portal_password = form.portal_password;
        const res = await invoke('technician_update', { technician_id: editingId, updates });
        return res.data;
      }
      if (!form.portal_password) throw new Error('La contraseña es obligatoria para nuevos trabajadores');
      const record = {
        name: form.name, email: form.email, portal_password: form.portal_password,
        portal_email: form.email, worker_type: form.worker_type, is_admin: form.is_admin, status: form.status,
      };
      const res = await invoke('technician_create', { record });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-workers', techEmail] });
      toast.success(editingId ? 'Trabajador actualizado' : 'Trabajador creado');
      resetForm();
    },
    onError: (e) => toast.error(e?.message || 'Error al guardar'),
  });

  const toggleStatus = async (w) => {
    try {
      await invoke('technician_update', { technician_id: w.id, updates: { status: w.status === 'active' ? 'inactive' : 'active' } });
      queryClient.invalidateQueries({ queryKey: ['company-workers', techEmail] });
      toast.success(w.status === 'active' ? 'Trabajador desactivado' : 'Trabajador activado');
    } catch (e) { toast.error('Error al cambiar estado'); }
  };

  const removeWorker = async (w) => {
    if (w.email === techEmail) { toast.error('No puedes eliminar tu propia cuenta desde aquí'); return; }
    if (!confirm(`¿Eliminar a ${w.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await invoke('technician_delete', { technician_id: w.id });
      queryClient.invalidateQueries({ queryKey: ['company-workers', techEmail] });
      toast.success('Trabajador eliminado');
    } catch (e) { toast.error('Error al eliminar'); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-card border-0 shadow-sm">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-slate-700">Trabajadores de la empresa</h3>
            <p className="text-xs text-slate-400">Crea, edita y gestiona el equipo de tu empresa. Cada trabajador entra al portal con su email y contraseña.</p>
          </div>
          {!showForm && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />Nuevo trabajador
            </Button>
          )}
        </div>
      </Card>

      {showForm && (
        <Card className="p-5 bg-card border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-700">{editingId ? 'Editar trabajador' : 'Nuevo trabajador'}</h4>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600 mb-1">Nombre completo *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" />
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="trabajador@empresa.com" disabled={!!editingId} />
            </div>
            <div>
              <Label className="text-slate-600 mb-1">{editingId ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}</Label>
              <Input type="text" value={form.portal_password} onChange={e => setForm(p => ({ ...p, portal_password: e.target.value }))} placeholder="Contraseña de acceso al portal" />
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Tipo de trabajador</Label>
              <Select value={form.worker_type} onValueChange={v => setForm(p => ({ ...p, worker_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Técnico de campo</SelectItem>
                  <SelectItem value="administracion">Administración</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 md:mt-7">
              <Checkbox id="is_admin" checked={form.is_admin} onCheckedChange={v => setForm(p => ({ ...p, is_admin: !!v }))} />
              <label htmlFor="is_admin" className="text-sm text-slate-600 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-amber-600" /> Gerente (administrador de empresa)
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <>{editingId ? 'Guardar cambios' : 'Crear trabajador'}</>}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : workers.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">No hay trabajadores. Crea el primero con el botón de arriba.</Card>
      ) : (
        <Card className="bg-card border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {workers.map(w => (
              <div key={w.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 ${w.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {w.photo_url ? <img src={w.photo_url} alt={w.name} className="w-full h-full object-cover" /> : (w.name?.charAt(0)?.toUpperCase() || '?')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-700 truncate">{w.name}</span>
                      {w.is_admin
                        ? <Badge className="bg-amber-100 text-amber-700 border-0 text-xs"><Shield className="h-3 w-3 mr-1" />Gerente</Badge>
                        : <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Trabajador</Badge>}
                      {w.worker_type && (
                        <Badge variant="outline" className="text-xs">
                          {w.worker_type === 'tecnico' ? <><HardHat className="h-3 w-3 mr-1" />Técnico</> : <><Briefcase className="h-3 w-3 mr-1" />Admin</>}
                        </Badge>
                      )}
                      <Badge className={w.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-slate-100 text-slate-500 border-0 text-xs'}>
                        {w.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {w.pin && <Badge variant="outline" className="text-xs"><KeyRound className="h-3 w-3 mr-1" />PIN</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{w.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(w)} className="text-slate-600">
                    {w.status === 'active' ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDocsWorker(w)} title="Documentos"><FileText className="h-4 w-4 text-slate-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(w)}><Edit className="h-4 w-4 text-slate-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeWorker(w)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!docsWorker} onOpenChange={o => !o && setDocsWorker(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Documentos de {docsWorker?.name}</DialogTitle>
          </DialogHeader>
          {docsWorker && (
            <WorkerDocumentsPanel sessionEmail={techEmail} targetEmail={docsWorker.email} canEdit={true} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}