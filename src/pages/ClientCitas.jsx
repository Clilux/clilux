import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Plus, Clock, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import { toast } from 'sonner';
import { notificar } from '@/lib/buzon';

const FRANJAS = [
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'indiferente', label: 'Indiferente' },
];
const ESTADO_LABELS = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada', completada: 'Completada' };
const ESTADO_COLORS = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  completada: 'bg-blue-100 text-blue-700',
};

export default function ClientCitas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem('client_id');
    if (id) setClientId(id);
    else navigate(createPageUrl('MenuInicio'));
    const em = localStorage.getItem('clilux_email');
    if (em) { setUserEmail(em); setUserName(em); }
  }, []);

  const { data: client } = useQuery({
    queryKey: ['client-citas', clientId],
    queryFn: async () => {
      const list = await base44.entities.Client.filter({ id: clientId });
      return list[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: citas = [], isLoading } = useQuery({
    queryKey: ['citas-client', clientId],
    queryFn: () => base44.entities.Cita.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const sorted = [...citas].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));

  const createMutation = useMutation({
    mutationFn: async (data) => base44.entities.Cita.create(data),
    onSuccess: (_d, vars) => {
      // Notificar a los técnicos asignados (o al técnico principal)
      const asignados = Array.isArray(client?.tecnicos_asignados) && client.tecnicos_asignados.length
        ? client.tecnicos_asignados
        : (client?.assigned_technician ? [{ technician_email: client.assigned_technician, technician_name: client.assigned_technician_name }] : []);
      const emails = asignados.map(a => a.technician_email).filter(Boolean);
      if (emails.length) {
        notificar('cita_nueva', {
          client_id: clientId,
          client_name: client?.name || '',
          company_id: client?.company_id || '',
          fecha: vars.fecha,
          franja: vars.franja,
          motivo: vars.motivo,
          technician_emails: emails,
        });
      }
      toast.success('Cita solicitada. Tu técnico recibirá el aviso.');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['citas-client', clientId] });
    },
    onError: () => toast.error('No se pudo solicitar la cita'),
  });

  if (!clientId) return null;

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('HomeCliente'))} className="text-white/70 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-white text-xl font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Citas y Tarifas</h1>
          </div>
          <Button onClick={() => setShowForm(s => !s)} className="bg-blue-600 hover:bg-blue-700">
            {showForm ? 'Cancelar' : <><Plus className="h-4 w-4 mr-2" />Pedir cita</>}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Formulario de solicitud */}
        {showForm && (
          <CitaForm
            onSubmit={(d) => createMutation.mutate({
              ...d,
              client_id: clientId,
              client_name: client?.name || '',
              company_id: client?.company_id || '',
              tecnico_email: client?.assigned_technician || '',
              tecnico_name: client?.assigned_technician_name || '',
              tecnicos_asignados: Array.isArray(client?.tecnicos_asignados) ? client.tecnicos_asignados : [],
              created_by_name: userName || userEmail,
              estado: 'pendiente',
            })}
            saving={createMutation.isPending}
          />
        )}

        {/* Historial de citas */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" /> Historial de citas
          </h2>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : sorted.length === 0 ? (
            <Card className="p-8 text-center border">
              <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aún no has solicitado ninguna cita.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sorted.map(c => (
                <Card key={c.id} className="p-4 border shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-slate-800">{c.fecha}</span>
                        {c.franja && c.franja !== 'indiferente' && <span className="text-xs text-slate-500">· {c.franja}</span>}
                        {c.hora && <span className="text-xs text-slate-500">· {c.hora}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] || 'bg-slate-100 text-slate-600'}`}>{ESTADO_LABELS[c.estado] || c.estado}</span>
                      </div>
                      <p className="text-sm text-slate-700">{c.motivo}</p>
                      {c.notas_cliente && <p className="text-xs text-slate-500 mt-1">Notas: {c.notas_cliente}</p>}
                      {c.tecnico_name && <p className="text-xs text-slate-400 mt-1">Técnico: {c.tecnico_name}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tarifas del cliente */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-600" /> Mis tarifas
          </h2>
          {(!client?.tarifas || client.tarifas.length === 0) ? (
            <Card className="p-6 text-center border">
              <p className="text-slate-500 text-sm">No hay tarifas especiales definidas para tu cuenta.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {client.tarifas.map((t, i) => (
                <Card key={i} className="p-4 border shadow-sm">
                  <p className="font-medium text-slate-800">{t.nombre}</p>
                  {t.descripcion && <p className="text-sm text-slate-500">{t.descripcion}</p>}
                  <p className="text-lg font-semibold text-emerald-700 mt-2">
                    {Number(t.precio).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    <span className="text-sm font-normal text-slate-400"> / {t.unidad}</span>
                  </p>
                  {t.notas && <p className="text-xs text-slate-400 mt-2">{t.notas}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CitaForm({ onSubmit, saving }) {
  const [f, setF] = useState({ fecha: '', franja: 'indiferente', hora: '', motivo: '', notas_cliente: '' });
  const today = new Date().toISOString().slice(0, 10);
  const submit = (e) => {
    e.preventDefault();
    if (!f.fecha || !f.motivo.trim()) { toast.error('Indica fecha y motivo'); return; }
    onSubmit(f);
  };
  return (
    <Card className="p-5 border shadow-sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Fecha preferida *</Label>
            <Input type="date" min={today} value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} className="mt-1" required />
          </div>
          <div>
            <Label>Franja</Label>
            <Select value={f.franja} onValueChange={v => setF({ ...f, franja: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FRANJAS.map(x => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hora (opcional)</Label>
            <Input placeholder="Ej. 10:00" value={f.hora} onChange={e => setF({ ...f, hora: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Motivo *</Label>
          <Input placeholder="Motivo de la cita (revisión, consulta, presupuesto...)" value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} className="mt-1" required />
        </div>
        <div>
          <Label>Notas para el técnico</Label>
          <Textarea rows={2} value={f.notas_cliente} onChange={e => setF({ ...f, notas_cliente: e.target.value })} className="mt-1" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Enviando...' : 'Solicitar cita'}
          </Button>
        </div>
      </form>
    </Card>
  );
}