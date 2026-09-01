import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, Trash2, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-600' },
};

export default function IncidentCard({ incident, equipmentName, buildingName, showClient = false, clientName, onDelete }) {
  const navigate = useNavigate();
  const priority = priorityConfig[incident.priority] || priorityConfig.medium;
  const status = statusConfig[incident.status] || statusConfig.pending;

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(incident.id);
  };

  const goAlbaran = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({
      new: '1',
      titulo: incident.title || '',
      incident_id: incident.id || '',
    });
    if (incident.client_id) params.set('client_id', incident.client_id);
    navigate(`/GestionTrabajo?${params.toString()}`);
  };

  const safeDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isValid(d) ? format(d, "dd MMM yyyy", { locale: es }) : '';
  };

  return (
    <Card
      onClick={() => navigate(createPageUrl(`IncidentDetail?id=${incident.id}`))}
      className="p-3 sm:p-4 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Fila 1: título + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn("h-2 w-2 rounded-full shrink-0", priority.dot)} />
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
            {incident.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn("text-[10px] sm:text-xs px-2 py-0.5", priority.color)}>{priority.label}</Badge>
          <Badge className={cn("text-[10px] sm:text-xs px-2 py-0.5", status.color)}>{status.label}</Badge>
        </div>
      </div>

      {/* Fila 2: descripción compacta (2 líneas) */}
      {incident.description && (
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 line-clamp-2">
          {incident.description}
        </p>
      )}

      {/* Fila 3: meta compacta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] sm:text-xs text-slate-500">
        {showClient && clientName && (
          <span className="truncate max-w-[120px] sm:max-w-[160px]">{clientName}</span>
        )}
        {equipmentName && (
          <span className="truncate max-w-[120px] sm:max-w-[160px]">· {equipmentName}</span>
        )}
        {buildingName && (
          <span className="truncate max-w-[120px] sm:max-w-[160px]">· {buildingName}</span>
        )}
        {safeDate(incident.created_date) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />{safeDate(incident.created_date)}
          </span>
        )}
        {incident.assigned_technician_name && (
          <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
            <User className="h-3 w-3" />{incident.assigned_technician_name}
          </span>
        )}
      </div>

      {/* Fila 4: acciones siempre visibles (móvil no tiene hover) */}
      {(onDelete || true) && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-100">
          <button
            onClick={goAlbaran}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
            title="Crear albarán de trabajo"
          >
            <FileText className="h-3.5 w-3.5" />Albarán
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
              title="Eliminar incidencia"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}