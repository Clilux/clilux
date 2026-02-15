import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Calendar, User, Building2, Thermometer, CheckCircle, ArrowLeft, Home } from 'lucide-react';
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

export default function ClientIncidentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const incidentId = urlParams.get('id');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const items = await base44.entities.Incident.filter({ id: incidentId });
      return items[0] || null;
    },
    enabled: !!incidentId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment-incident', incident?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: incident.equipment_id });
      return items[0] || null;
    },
    enabled: !!incident?.equipment_id,
  });

  const { data: building } = useQuery({
    queryKey: ['building-incident', incident?.building_id],
    queryFn: async () => {
      const items = await base44.entities.Building.filter({ id: incident.building_id });
      return items[0] || null;
    },
    enabled: !!incident?.building_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <Skeleton className="h-64 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-white/10 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-semibold text-white">Incidencia</h1>
          </div>
          <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-16 w-16 text-slate-400" />
              <p className="text-slate-300 text-lg">Incidencia no encontrada</p>
              <div className="flex gap-3">
                <Button onClick={() => navigate(-1)} variant="outline" className="border-white/20 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <Button onClick={() => navigate(createPageUrl('HomeCliente'))} variant="outline" className="border-white/20 text-white">
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const priority = priorityConfig[incident.priority] || priorityConfig.medium;
  const status = statusConfig[incident.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('ClientIncidents'))}
            className="rounded-full hover:bg-white/10 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-white">Detalle de Incidencia</h1>
        </div>

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className={cn(
                "p-4 rounded-2xl",
                incident.priority === 'urgent' ? 'bg-red-500/20' : 
                incident.priority === 'high' ? 'bg-orange-500/20' : 'bg-slate-500/20'
              )}>
                <AlertTriangle className={cn(
                  "h-8 w-8",
                  incident.priority === 'urgent' ? 'text-red-400' : 
                  incident.priority === 'high' ? 'text-orange-400' : 'text-slate-400'
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-xl font-semibold text-white">{incident.title}</h2>
                  <Badge className={priority.color}>{priority.label}</Badge>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                <p className="text-slate-300">{incident.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Reportado</p>
                <p className="text-sm text-white">{format(new Date(incident.created_date), "dd MMM yyyy HH:mm", { locale: es })}</p>
              </div>
            </div>
            {incident.reported_by_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Reportado por</p>
                  <p className="text-sm text-white">{incident.reported_by_name}</p>
                </div>
              </div>
            )}
            {building && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Building2 className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Edificio</p>
                  <p className="text-sm text-white">{building.name}</p>
                </div>
              </div>
            )}
            {equipment && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Thermometer className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Equipo</p>
                  <p className="text-sm text-white">{equipment.brand} {equipment.model}</p>
                </div>
              </div>
            )}
          </div>

          {incident.photos && incident.photos.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-400 mb-2">Fotos adjuntas</p>
              <div className="flex flex-wrap gap-4">
                {incident.photos.map((photo, index) => (
                  <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                    <img src={photo} alt="" className="w-24 h-24 object-cover rounded-lg hover:opacity-90" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {incident.resolution_notes && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="font-medium text-green-300">Resolución</p>
              </div>
              <p className="text-green-200">{incident.resolution_notes}</p>
              {incident.resolution_date && (
                <p className="text-sm text-green-400 mt-2">
                  Resuelto el {format(new Date(incident.resolution_date), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}