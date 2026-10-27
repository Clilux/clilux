import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Users, Check } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = [
  { value: 'activa', label: 'Activa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'presupuestada', label: 'Presupuestada' },
];

/**
 * Edición de una obra por parte de gerencia: datos generales y, sobre todo,
 * asignar o cambiar el cliente al que pertenece la obra.
 */
export default function EditarObraModal({ obra, isSessionTech, effectiveEmail, puedeAsignar = false, onSave, onClose }) {
  const [saving, setSaving] = useState(false);
  // Trabajadores asignados a la obra (solo los puede repartir la gerencia).
  const [equipo, setEquipo] = useState(() => (obra.equipo || []).map(e => e.technician_id).filter(Boolean));
  const [form, setForm] = useState({
    nombre: obra.nombre || '',
    client_id: obra.client_id || '',
    building_id: obra.building_id || '',
    estado: obra.estado || 'activa',
    fecha_inicio: (obra.fecha_inicio || '').slice(0, 10),
    fecha_fin_prevista: (obra.fecha_fin_prevista || '').slice(0, 10),
    descripcion: obra.descripcion || '',
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['editar-obra-clients', isSessionTech ? effectiveEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'clients' });
        return res.data?.data || [];
      }
      return base44.entities.Client.list('-created_date');
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['editar-obra-buildings', isSessionTech ? effectiveEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'buildings' });
        return res.data?.data || [];
      }
      return base44.entities.Building.list();
    },
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['editar-obra-techs', isSessionTech ? effectiveEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'technicians' });
        return res.data?.data || [];
      }
      return base44.entities.Technician.list();
    },
    enabled: puedeAsignar,
  });
  const tecnicosActivos = tecnicos.filter(t => t.status !== 'inactive');
  const toggleEquipo = (id) => setEquipo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const clienteSel = clients.find(c => c.id === form.client_id);
  const edificiosCliente = buildings.filter(b => b.client_id === form.client_id);
  const edificioSel = buildings.find(b => b.id === form.building_id);

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('Indica el nombre de la obra'); return; }
    if (!form.client_id) { toast.error('Selecciona el cliente de la obra'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        client_id: form.client_id,
        client_name: clienteSel?.name || '',
        building_id: form.building_id || '',
        building_name: edificioSel?.name || '',
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || '',
        fecha_fin_prevista: form.fecha_fin_prevista || '',
        descripcion: form.descripcion,
      };
      if (puedeAsignar) {
        payload.equipo = equipo.map(id => {
          const t = tecnicos.find(x => x.id === id);
          if (t) return { technician_id: t.id, technician_name: t.name, technician_email: t.email };
          return (obra.equipo || []).find(e => e.technician_id === id);
        }).filter(Boolean);
      }
      await onSave(payload);
      toast.success('Obra actualizada');
      onClose();
    } catch (e) {
      toast.error(e?.message || 'No se pudo guardar la obra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar obra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Nombre de la obra *</Label>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <Label>Cliente *</Label>
            <Select
              value={form.client_id || 'none'}
              onValueChange={v => setForm(f => ({ ...f, client_id: v === 'none' ? '' : v, building_id: '' }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingClients ? 'Cargando clientes...' : 'Seleccionar cliente...'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">Al cambiar el cliente, la obra pasa a facturarse a ese cliente.</p>
          </div>

          <div>
            <Label>Edificio (opcional)</Label>
            <Select
              value={form.building_id || 'none'}
              onValueChange={v => setForm(f => ({ ...f, building_id: v === 'none' ? '' : v }))}
              disabled={!form.client_id}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sin edificio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin edificio</SelectItem>
                {edificiosCliente.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Fin previsto</Label>
              <Input type="date" value={form.fecha_fin_prevista} onChange={e => setForm(f => ({ ...f, fecha_fin_prevista: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {puedeAsignar && (
            <div>
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />Equipo asignado a la obra</Label>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">
                Solo los trabajadores del equipo pueden modificar la obra, sus trabajos y sus observaciones.
              </p>
              <div className="flex flex-wrap gap-2">
                {tecnicosActivos.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay trabajadores activos.</p>
                ) : tecnicosActivos.map(t => {
                  const activo = equipo.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleEquipo(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        activo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}>
                      {activo && <Check className="h-3 w-3" />}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción de los trabajos..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}