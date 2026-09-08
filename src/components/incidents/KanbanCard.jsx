import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { label: 'Baja', dot: 'bg-slate-400' },
  medium: { label: 'Media', dot: 'bg-blue-500' },
  high: { label: 'Alta', dot: 'bg-orange-500' },
  urgent: { label: 'Urgente', dot: 'bg-red-500' },
};

export default function KanbanCard({ incident, equipmentName, clientName, buildingName, onDelete }) {
  const navigate = useNavigate();
  const priority = priorityConfig[incident.priority] || priorityConfig.medium;

  const safeDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isValid(d) ? format(d, "dd MMM", { locale: es }) : '';
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(incident.id);
  };

  return (
    <Card
      onClick={() => navigate(createPageUrl(`IncidentDetail?id=${incident.id}`))}
      className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("h-2 w-2 rounded-full shrink-0", priority.dot)} />
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-slate-500 border-slate-200">
          {priority.label}
        </Badge>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
            title="Eliminar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        )}
      </div>
      <h4 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">
        {incident.title}
      </h4>
      {incident.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{incident.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
        {clientName && <span className="truncate max-w-[120px]">{clientName}</span>}
        {buildingName && <span className="truncate max-w-[100px]">· {buildingName}</span>}
        {safeDate(incident.created_date) && (
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3" />{safeDate(incident.created_date)}
          </span>
        )}
      </div>
      {(incident.assigned_technicians?.length > 0 || incident.assigned_technician_name) && (
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
          {incident.assigned_technicians?.length > 0 ? (
            <>
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[160px]">
                {incident.assigned_technicians.map(a => a.technician_name).filter(Boolean).join(', ')}
              </span>
            </>
          ) : (
            <>
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[120px]">{incident.assigned_technician_name}</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}