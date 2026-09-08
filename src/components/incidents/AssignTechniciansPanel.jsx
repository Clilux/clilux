import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserPlus, X, Check, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Panel de asignación múltiple de técnicos a una incidencia.
 * - gerente/administración: pueden asignar y reasignar.
 * - Recibe la lista de técnicos de la empresa y la incidencia.
 * - Guarda assigned_technicians, acumula all_assignees y registra history.
 */
export default function AssignTechniciansPanel({
  incident,
  technicians,
  isSessionTech,
  sessionTechEmail,
  canAssign,
  onAssigned,
}) {
  const [selected, setSelected] = useState([]); // technician ids
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setSelected((incident?.assigned_technicians || []).map(a => a.technician_id));
  }, [incident?.id, incident?.assigned_technicians]);

  if (!canAssign) {
    // Solo lectura: mostrar asignados
    const assigned = incident?.assigned_technicians || [];
    if (assigned.length === 0) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-card p-4">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-brand-600" /> Técnicos asignados
        </h3>
        <div className="flex flex-wrap gap-2">
          {assigned.map(a => (
            <span key={a.technician_id} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-full border border-brand-200">
              {a.technician_name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const assignMutation = useMutation({
    mutationFn: async (assignedList) => {
      const payload = {
        technician_id: null,
        technician_name: '',
        technician_email: '',
      };
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'incident_assign',
          incident_id: incident.id,
          assigned: assignedList,
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.data;
      }
      // Admin directo: actualiza la incidencia
      const prevAssigned = (incident.assigned_technicians || []).map(a => a.technician_id);
      const allAssignees = Array.from(new Set([...(incident.all_assignees || []), ...assignedList]));
      const historyEntry = {
        date: new Date().toISOString(),
        technician: payload.technician_name || 'Administrador',
        label: prevAssigned.length === 0 ? 'asignacion' : 'reasignacion',
        comment: `Asignación actualizada: ${assignedList.length} técnico(s)`,
      };
      return await base44.entities.Incident.update(incident.id, {
        assigned_technicians: assignedList.map(id => {
          const t = technicians.find(t => t.id === id);
          return { technician_id: id, technician_name: t?.name || '', technician_email: t?.email || '' };
        }),
        assigned_technician_id: assignedList[0] || null,
        all_assignees: allAssignees,
        history: [...(incident.history || []), historyEntry],
      });
    },
    onSuccess: () => {
      setPickerOpen(false);
      toast.success('Asignación actualizada');
      onAssigned?.();
    },
    onError: (err) => toast.error('Error al asignar: ' + (err?.message || 'desconocido')),
  });

  const toggleTech = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const guardar = () => {
    if (selected.length === 0) {
      toast.error('Selecciona al menos un técnico');
      return;
    }
    assignMutation.mutate(selected);
  };

  const currentAssigned = incident?.assigned_technicians || [];

  const removeTech = (id) => {
    assignMutation.mutate(selected.filter(x => x !== id));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-brand-600" /> Técnicos asignados
        </h3>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(v => !v)} className="h-8 text-xs">
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Asignar
        </Button>
      </div>

      {currentAssigned.length === 0 && !pickerOpen && (
        <p className="text-xs text-slate-400">Sin técnicos asignados</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {currentAssigned.map(a => (
          <span key={a.technician_id} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-full border border-brand-200">
            {a.technician_name}
            <button onClick={() => removeTech(a.technician_id)} className="hover:text-red-600 ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {pickerOpen && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-600 mb-2">Selecciona técnicos de la empresa</p>
          <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
            {technicians.length === 0 ? (
              <p className="text-xs text-slate-400">No hay técnicos disponibles</p>
            ) : technicians.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTech(t.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selected.includes(t.id) ? 'bg-brand-50 border border-brand-300 text-brand-700' : 'hover:bg-slate-50 border border-transparent text-slate-700'
                )}
              >
                <span className="truncate">{t.name}{t.worker_type === 'administracion' ? ' · Admin' : ''}</span>
                {selected.includes(t.id) && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setPickerOpen(false); setSelected(currentAssigned.map(a => a.technician_id)); }} className="h-8 text-xs">Cancelar</Button>
            <Button size="sm" onClick={guardar} disabled={assignMutation.isPending} className="h-8 text-xs bg-brand-600 hover:bg-brand-700">
              {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Guardar asignación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}