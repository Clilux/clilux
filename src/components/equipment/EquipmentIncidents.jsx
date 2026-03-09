import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Wrench, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const priorityInfo = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const statusInfo = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700', icon: Wrench },
  resolved: { label: 'Resuelta', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  closed: { label: 'Cerrada', color: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
};

export default function EquipmentIncidents({ equipmentId, isClientView = false }) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents-equipment', equipmentId],
    queryFn: () => base44.entities.Incident.filter({ equipment_id: equipmentId }, '-created_date'),
    enabled: !!equipmentId,
  });

  const visibleIncidents = isClientView
    ? incidents.filter(i => i.status !== 'deleted_by_technician')
    : incidents;

  if (isLoading) {
    return <p className="text-slate-400 text-sm py-4 text-center">Cargando incidencias...</p>;
  }

  if (visibleIncidents.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
        <p className="text-slate-500">No hay incidencias registradas para este equipo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleIncidents.map((incident) => {
        const status = statusInfo[incident.status] || statusInfo.pending;
        const StatusIcon = status.icon;
        const priority = priorityInfo[incident.priority] || priorityInfo.medium;
        const detailUrl = isClientView
          ? createPageUrl(`ClientIncidentDetail?id=${incident.id}`)
          : createPageUrl(`IncidentDetail?id=${incident.id}`);

        return (
          <div key={incident.id} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${status.color}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 leading-tight">{incident.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{incident.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(incident.created_date), "dd 'de' MMMM yyyy", { locale: es })}
                    {incident.reported_by_name && <span>· {incident.reported_by_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <Badge className={status.color}>{status.label}</Badge>
                <Badge className={priority.color}>{priority.label}</Badge>
                <Link to={detailUrl}>
                  <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    Ver detalle <ExternalLink className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </div>
            {incident.resolution_notes && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
                <span className="font-medium">Resolución:</span> {incident.resolution_notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}