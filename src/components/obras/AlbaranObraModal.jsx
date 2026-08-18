import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AlbaranObraModal({ open, onClose, techRecord, registroHorario = null }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    fecha: registroHorario?.fecha || format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: registroHorario?.hora_entrada || '',
    hora_fin: registroHorario?.hora_salida || '',
    horas_trabajadas: registroHorario?.horas_efectivas || registroHorario?.horas_normales || '',
    descripcion_trabajos: '',
    materiales_usados: [],
    notas: '',
  });
  const [nuevoMaterial, setNuevoMaterial] = useState({ descripcion: '', cantidad: 1, precio_unitario: 0 });

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['albaran-clientes', isSessionTech ? sessionTechEmail : 'admin'],
    queryFn: async () => {
      // 1) Preferir clientes sincronizados de STEL Order (requiere auth Base44)
      if (!isSessionTech) {
        try {
          const stelRes = await base44.functions.invoke('stelProxy', { action: 'listClients', payload: {} });
          const stelClients = stelRes.data?.clients || [];
          if (stelClients.length > 0) {
            return stelClients.map(c => ({ id: String(c.id), name: c.name, fiscalId: c.fiscalId || '', source: 'stel' }));
          }
        } catch (_) { /* STEL no configurado → usar clientes locales */ }
      }
      // 2) Clientes locales (proxy para técnicos, directo para admin)
      let localClients = [];
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'all' });
        localClients = res.data?.clients || [];
      } else {
        localClients = await base44.entities.Client.list();
      }
      return localClients.map(c => ({ id: c.id, name: c.name, fiscalId: c.cif || '', source: 'local' }));
    },
    enabled: open,
  });

  const clienteSeleccionado = clientes.find(c => c.id === form.client_id);

  const addMaterial = () => {
    if (!nuevoMaterial.descripcion) return;
    setForm(f => ({ ...f, materiales_usados: [...f.materiales_usados, { ...nuevoMaterial }] }));
    setNuevoMaterial({ descripcion: '', cantidad: 1, precio_unitario: 0 });
  };

  const removeMaterial = (idx) => {
    setForm(f => ({ ...f, materiales_usados: f.materiales_usados.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.client_id || !form.descripcion_trabajos) {
      toast.error('Selecciona un cliente y añade la descripción de trabajos');
      return;
    }
    setSaving(true);
    const numero = `ALB-${Date.now().toString().slice(-6)}`;
    await base44.entities.AlbaranObra.create({
      numero,
      client_id: clienteSeleccionado?.id || '',
      client_name: clienteSeleccionado?.name || '',
      client_source: clienteSeleccionado?.source || 'local',
      stel_client_id: clienteSeleccionado?.source === 'stel' ? clienteSeleccionado?.id : '',
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      horas_trabajadas: parseFloat(form.horas_trabajadas) || 0,
      descripcion_trabajos: form.descripcion_trabajos,
      materiales_usados: form.materiales_usados,
      notas: form.notas,
      tecnico_id: techRecord?.id || '',
      tecnico_nombre: techRecord?.name || '',
      tecnico_email: techRecord?.email || techRecord?.user_email || '',
      company_id: techRecord?.company_id || '',
      registro_horario_id: registroHorario?.id || '',
    });
    queryClient.invalidateQueries({ queryKey: ['albaranes-obra'] });
    toast.success('Albarán creado correctamente');
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo albarán</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingClientes ? "Cargando clientes..." : "Seleccionar cliente..."} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.fiscalId ? ` — ${c.fiscalId}` : ''}{c.source === 'stel' ? ' (STEL)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha y horas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Hora inicio</Label>
              <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Hora fin</Label>
              <Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Horas trabajadas</Label>
            <Input type="number" step="0.5" min="0" value={form.horas_trabajadas}
              onChange={e => setForm(f => ({ ...f, horas_trabajadas: e.target.value }))} className="mt-1" placeholder="Ej: 4.5" />
          </div>

          {/* Descripción */}
          <div>
            <Label>Descripción de trabajos *</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.descripcion_trabajos}
              onChange={e => setForm(f => ({ ...f, descripcion_trabajos: e.target.value }))}
              placeholder="Describe los trabajos realizados..."
            />
          </div>

          {/* Materiales */}
          <div>
            <Label>Materiales utilizados</Label>
            {form.materiales_usados.length > 0 && (
              <div className="mt-2 space-y-1 mb-2">
                {form.materiales_usados.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-2 py-1.5">
                    <span className="flex-1 truncate">{m.descripcion}</span>
                    <span className="text-slate-400 shrink-0">×{m.cantidad}</span>
                    {m.precio_unitario > 0 && <span className="text-slate-400 shrink-0">{m.precio_unitario}€/u</span>}
                    <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <Input value={nuevoMaterial.descripcion} onChange={e => setNuevoMaterial(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Material..." className="flex-1 text-sm" />
              <Input type="number" min="1" value={nuevoMaterial.cantidad}
                onChange={e => setNuevoMaterial(p => ({ ...p, cantidad: Number(e.target.value) }))}
                className="w-16 text-sm" placeholder="Qty" />
              <Input type="number" min="0" step="0.01" value={nuevoMaterial.precio_unitario}
                onChange={e => setNuevoMaterial(p => ({ ...p, precio_unitario: Number(e.target.value) }))}
                className="w-20 text-sm" placeholder="€/u" />
              <Button size="sm" variant="outline" onClick={addMaterial} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas adicionales</Label>
            <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" className="mt-1" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear albarán
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}