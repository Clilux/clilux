import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Tag, Users, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { mensajeDeError } from '@/lib/errores';

const UNIDADES = ['ud', 'h', 'mes', 'kg', 'm', 'm2', 'servicio'];

export default function ClientTarifasEquipoTab({ client, isSessionTech, sessionTechEmail }) {
  const queryClient = useQueryClient();
  const clientId = client.id;

  // Técnicos disponibles para asignar
  const { data: technicians = [] } = useQuery({
    queryKey: ['techs-for-assign', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'technicians' });
        return res.data?.data || [];
      }
      return base44.entities.Technician.list();
    },
  });

  const asignados = Array.isArray(client.tecnicos_asignados) ? client.tecnicos_asignados : [];

  // ── Asignación de técnicos ─────────────────────────────────────
  const [newTechId, setNewTechId] = useState('');

  const disponibles = useMemo(
    () => technicians.filter(t =>
      t.status !== 'inactive' &&
      !asignados.some(a => a.technician_email && t.email && a.technician_email.toLowerCase() === t.email.toLowerCase())
    ),
    [technicians, asignados]
  );

  const updateClient = useMutation({
    mutationFn: async (updates) => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'client_update',
          record_id: clientId, updates,
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.data;
      }
      return base44.entities.Client.update(clientId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo guardar')),
  });

  const addTechnician = () => {
    const t = technicians.find(x => x.id === newTechId);
    if (!t) return;
    const next = [...asignados, { technician_id: t.id, technician_name: t.name, technician_email: t.email }];
    // El primero pasa a ser el técnico principal (assigned_technician) si no hay.
    const principal = asignedPrincipal(next);
    updateClient.mutate({ tecnicos_asignados: next, ...principal });
    setNewTechId('');
  };

  const removeTechnician = (email) => {
    const next = asignados.filter(a => a.technician_email !== email);
    const principal = asignedPrincipal(next);
    updateClient.mutate({ tecnicos_asignados: next, ...principal });
  };

  // Si no hay assigned_technician, el primero del equipo es el principal.
  const asignedPrincipal = (lista) => {
    if (!lista.length) return { assigned_technician: '', assigned_technician_name: '' };
    const primero = lista[0];
    return { assigned_technician: primero.technician_email, assigned_technician_name: primero.technician_name };
  };

  // ── Tarifas ───────────────────────────────────────────────────
  const tarifas = Array.isArray(client.tarifas) ? client.tarifas : [];
  const [draft, setDraft] = useState(null); // índice editando, o 'new', o null

  const blankTarifa = () => ({ nombre: '', descripcion: '', precio: 0, unidad: 'ud', notas: '' });

  const saveTarifa = (tarifa, index) => {
    if (!tarifa.nombre?.trim()) { toast.error('El nombre de la tarifa es obligatorio'); return; }
    let next;
    if (index === 'new') { next = [...tarifas, tarifa]; }
    else { next = tarifas.map((t, i) => i === index ? tarifa : t); }
    updateClient.mutate({ tarifas: next });
    setDraft(null);
  };

  const deleteTarifa = (index) => {
    const next = tarifas.filter((_, i) => i !== index);
    updateClient.mutate({ tarifas: next });
  };

  return (
    <div className="space-y-6">
      {/* Equipo de técnicos asignados */}
      <Card className="p-5 bg-white border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Técnicos asignados al cliente</h3>
        </div>

        {asignados.length === 0 ? (
          <p className="text-sm text-slate-500 mb-4">Este cliente aún no tiene técnicos asignados.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {asignados.map((a, i) => (
              <div key={a.technician_id || a.technician_email} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{a.technician_name || a.technician_email}</span>
                  {i === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Principal</span>}
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 h-8" onClick={() => removeTechnician(a.technician_email)} disabled={updateClient.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Select value={newTechId} onValueChange={setNewTechId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Añadir técnico al equipo..." /></SelectTrigger>
            <SelectContent>
              {disponibles.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name} {t.email ? `· ${t.email}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addTechnician} disabled={!newTechId || updateClient.isPending} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />Asignar
          </Button>
        </div>
      </Card>

      {/* Tarifas especiales */}
      <Card className="p-5 bg-white border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Tarifas especiales del cliente</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Estas tarifas son visibles para el cliente desde su portal.</p>

        {tarifas.length === 0 && draft !== 'new' ? (
          <p className="text-sm text-slate-500 mb-4">No hay tarifas definidas.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {tarifas.map((t, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{t.nombre}</p>
                  {t.descripcion && <p className="text-xs text-slate-500">{t.descripcion}</p>}
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">{Number(t.precio).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                    <span className="text-slate-400"> / {t.unidad}</span>
                  </p>
                  {t.notas && <p className="text-xs text-slate-400 mt-1">{t.notas}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setDraft(i)} disabled={updateClient.isPending}>Editar</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 h-8" onClick={() => deleteTarifa(i)} disabled={updateClient.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {draft === 'new' || typeof draft === 'number' ? (
          <TarifaEditor
            initial={typeof draft === 'number' ? tarifas[draft] : blankTarifa()}
            onCancel={() => setDraft(null)}
            onSave={(t) => saveTarifa(t, draft)}
            saving={updateClient.isPending}
          />
        ) : (
          <Button variant="outline" onClick={() => setDraft('new')} disabled={updateClient.isPending}>
            <Plus className="h-4 w-4 mr-2" />Añadir tarifa
          </Button>
        )}
      </Card>
    </div>
  );
}

function TarifaEditor({ initial, onSave, onCancel, saving }) {
  const [t, setT] = useState(initial);
  const set = (k, v) => setT(p => ({ ...p, [k]: v }));
  return (
    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nombre *</Label>
          <Input value={t.nombre} onChange={e => set('nombre', e.target.value)} className="mt-1 bg-white" placeholder="Ej. Mantenimiento mensual" />
        </div>
        <div>
          <Label className="text-xs">Descripción</Label>
          <Input value={t.descripcion} onChange={e => set('descripcion', e.target.value)} className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs">Precio</Label>
          <Input type="number" step="0.01" value={t.precio} onChange={e => set('precio', parseFloat(e.target.value) || 0)} className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs">Unidad</Label>
          <Select value={t.unidad} onValueChange={v => set('unidad', v)}>
            <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Notas</Label>
          <Textarea rows={2} value={t.notas} onChange={e => set('notas', e.target.value)} className="mt-1 bg-white" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}><X className="h-4 w-4 mr-1" />Cancelar</Button>
        <Button size="sm" onClick={() => onSave(t)} disabled={saving} className="bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4 mr-1" />Guardar</Button>
      </div>
    </div>
  );
}