import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Check, X, CheckCheck } from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import { useCurrentTechnician } from '@/hooks/useCurrentTechnician';
import { toast } from 'sonner';
import { mensajeDeError } from '@/lib/errores';

const ESTADO_LABELS = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada', completada: 'Completada' };
const ESTADO_COLORS = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  completada: 'bg-blue-100 text-blue-700',
};

export default function TecnicoCitas() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState('pendiente');
  const { user } = useCurrentTechnician();

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  const isAdmin = !isSessionTech && user?.role === 'admin';

  const { data: citas = [], isLoading } = useQuery({
    queryKey: ['citas-tecnico', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'citas_list', solo_mias: true });
        return res.data?.data || [];
      }
      return base44.entities.Cita.list('-created_date');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, estado }) => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'cita_update', record_id: id, updates: { estado } });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data;
      }
      return base44.entities.Cita.update(id, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citas-tecnico'] });
      toast.success('Cita actualizada');
    },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo actualizar')),
  });

  const visible = citas.filter(c => filtro === 'todas' || c.estado === filtro)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Citas de mis clientes" />

        <div className="flex items-center gap-3 mb-6">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[200px] bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="completada">Completadas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : visible.length === 0 ? (
          <Card className="p-10 text-center border">
            <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No hay citas en este estado.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map(c => (
              <Card key={c.id} className="p-4 border shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-slate-800">{c.client_name || 'Cliente'}</span>
                      <span className="text-sm text-slate-600">· {c.fecha}</span>
                      {c.franja && c.franja !== 'indiferente' && <span className="text-xs text-slate-500">· {c.franja}</span>}
                      {c.hora && <span className="text-xs text-slate-500">· {c.hora}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] || 'bg-slate-100 text-slate-600'}`}>{ESTADO_LABELS[c.estado] || c.estado}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.motivo}</p>
                    {c.notas_cliente && <p className="text-xs text-slate-500 mt-1">Cliente: {c.notas_cliente}</p>}
                  </div>
                  {c.estado === 'pendiente' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 border-emerald-200" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: c.id, estado: 'confirmada' })}>
                        <Check className="h-4 w-4 mr-1" />Confirmar
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-200" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: c.id, estado: 'cancelada' })}>
                        <X className="h-4 w-4 mr-1" />Rechazar
                      </Button>
                    </div>
                  )}
                  {c.estado === 'confirmada' && (
                    <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700 border-blue-200" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: c.id, estado: 'completada' })}>
                      <CheckCheck className="h-4 w-4 mr-1" />Marcar realizada
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}