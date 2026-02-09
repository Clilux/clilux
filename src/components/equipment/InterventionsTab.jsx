import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' }
};

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50' },
  in_progress: { label: 'En progreso', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
  resolved: { label: 'Resuelta', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  closed: { label: 'Cerrada', icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-50' }
};

export default function InterventionsTab({ equipmentId }) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents-equipment', equipmentId],
    queryFn: async () => {
      const all = await base44.entities.Incident.filter({ equipment_id: equipmentId });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!equipmentId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Cargando...</div>;
  }

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500 mb-2">No hay intervenciones</p>
        <p className="text-sm text-slate-400">Las incidencias resueltas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map(incident => {
        const StatusIcon = statusConfig[incident.status]?.icon || AlertCircle;
        const statusInfo = statusConfig[incident.status] || statusConfig.pending;
        const priorityInfo = priorityConfig[incident.priority] || priorityConfig.medium;

        return (
          <div
            key={incident.id}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border",
              statusInfo.bg
            )}
          >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusInfo.bg)}>
              <StatusIcon className={cn("h-5 w-5", statusInfo.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-slate-800">{incident.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={priorityInfo.color + " text-xs"}>
                      {priorityInfo.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {statusInfo.label}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {format(parseISO(incident.created_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
                <Link to={createPageUrl(`IncidentDetail?id=${incident.id}`)}>
                  <Button variant="outline" size="sm">
                    Ver detalle
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-slate-600 mb-2">{incident.description}</p>
              {incident.resolution_notes && (
                <div className="mt-2 p-2 rounded bg-white border border-green-200">
                  <p className="text-xs text-slate-500 mb-1">
                    <strong>Solución:</strong>
                  </p>
                  <p className="text-sm text-slate-700">{incident.resolution_notes}</p>
                  {incident.resolution_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      Resuelta: {format(parseISO(incident.resolution_date), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}