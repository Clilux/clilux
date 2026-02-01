import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  operational: { label: 'Operativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-100 text-red-700 border-red-200' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactivo', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  good: { label: 'Bueno', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  acceptable: { label: 'Aceptable', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  needs_repair: { label: 'Necesita reparación', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-200' },
  preventive: { label: 'Preventivo', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  corrective: { label: 'Correctivo', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  it3_rite: { label: 'IT3 RITE', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  
  return (
    <Badge variant="outline" className={cn("font-medium", config.color)}>
      {config.label}
    </Badge>
  );
}