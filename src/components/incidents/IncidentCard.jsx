import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-600' },
};

export default function IncidentCard({ incident, equipmentName, buildingName, showClient = false, clientName }) {
  const priority = priorityConfig[incident.priority] || priorityConfig.medium;
  const status = statusConfig[incident.status] || statusConfig.pending;

  return (
    <Link to={createPageUrl(`IncidentDetail?id=${incident.id}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              incident.priority === 'urgent' ? 'bg-red-50' : 
              incident.priority === 'high' ? 'bg-orange-50' : 'bg-slate-100'
            )}>
              <AlertTriangle className={cn(
                "h-6 w-6",
                incident.priority === 'urgent' ? 'text-red-600' : 
                incident.priority === 'high' ? 'text-orange-600' : 'text-slate-600'
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className="font-semibold text-slate-800">{incident.title}</h3>
                <Badge className={priority.color}>{priority.label}</Badge>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              
              <p className="text-sm text-slate-500 mb-2 line-clamp-1">
                {incident.description}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                {showClient && clientName && (
                  <span>{clientName}</span>
                )}
                {equipmentName && (
                  <span>{equipmentName}</span>
                )}
                {buildingName && (
                  <span>· {buildingName}</span>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(incident.created_date), "dd MMM yyyy", { locale: es })}</span>
                </div>
                {incident.assigned_technician_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{incident.assigned_technician_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </Card>
    </Link>
  );
}