import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Calendar, User, Building2, Thermometer, CheckCircle, Loader2, Trash2, Tag, MessageSquare, Clock } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import IncidentReport from '../components/reports/IncidentReport';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
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

export default function IncidentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const incidentId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [userRole, setUserRole] = useState(null);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const user = await base44.auth.me();
      const clients = await base44.entities.Client.filter({ user_email: user.email });
      setUserRole(clients.length > 0 ? 'client' : 'technician');
    };
    checkRole();
  }, []);

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const items = await base44.entities.Incident.filter({ id: incidentId });
      return items[0] || null;
    },
    enabled: !!incidentId,
  });

  useEffect(() => {
    if (incident) {
      setTechnicianNotes(incident.technician_notes || '');
      setResolutionNotes(incident.resolution_notes || '');
      setNewPriority(incident.priority);
      setNewStatus(incident.status);
    }
  }, [incident]);

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

  const { data: client } = useQuery({
    queryKey: ['client-incident', incident?.client_id],
    queryFn: async () => {
      const items = await base44.entities.Client.filter({ id: incident.client_id });
      return items[0] || null;
    },
    enabled: !!incident?.client_id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const updateData = {
        ...data,
        assigned_technician: user.email,
        assigned_technician_name: user.full_name || '',
      };
      if (data.status === 'resolved' || data.status === 'closed') {
        updateData.resolution_date = new Date().toISOString().split('T')[0];
      }
      return base44.entities.Incident.update(incidentId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incidencia actualizada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Incident.delete(incidentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incidencia eliminada');
      navigate(-1);
    },
    onError: () => toast.error('Error al eliminar la incidencia'),
  });

  const handleUpdate = () => {
    updateMutation.mutate({
      priority: newPriority,
      status: newStatus,
      technician_notes: technicianNotes,
      resolution_notes: resolutionNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-slate-500">Incidencia no encontrada</p>
        </div>
      </div>
    );
  }

  const priority = priorityConfig[incident.priority] || priorityConfig.medium;
  const status = statusConfig[incident.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Detalle de Incidencia" />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-4 rounded-2xl",
                incident.priority === 'urgent' ? 'bg-red-50' : 
                incident.priority === 'high' ? 'bg-orange-50' : 'bg-slate-100'
              )}>
                <AlertTriangle className={cn(
                  "h-8 w-8",
                  incident.priority === 'urgent' ? 'text-red-600' : 
                  incident.priority === 'high' ? 'text-orange-600' : 'text-slate-600'
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-xl font-semibold text-slate-800">{incident.title}</h2>
                  <Badge className={priority.color}>{priority.label}</Badge>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                <p className="text-slate-600">{incident.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <IncidentReport
                incident={incident}
                equipment={equipment}
                client={client}
                building={building}
              />
              {userRole === 'technician' && (
                <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Reportado</p>
                <p className="text-sm text-slate-700">{format(new Date(incident.created_date), "dd MMM yyyy HH:mm", { locale: es })}</p>
              </div>
            </div>
            {incident.reported_by_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Reportado por</p>
                  <p className="text-sm text-slate-700">{incident.reported_by_name}</p>
                </div>
              </div>
            )}
            {building && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Building2 className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Edificio</p>
                  <p className="text-sm text-slate-700">{building.name}</p>
                </div>
              </div>
            )}
            {equipment && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Thermometer className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Equipo</p>
                  <p className="text-sm text-slate-700">{equipment.brand} {equipment.model}</p>
                </div>
              </div>
            )}
          </div>

          {incident.photos && incident.photos.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-600 mb-2">Fotos adjuntas</p>
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
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">Resolución</p>
              </div>
              <p className="text-green-700">{incident.resolution_notes}</p>
              {incident.resolution_date && (
                <p className="text-sm text-green-600 mt-2">
                  Resuelto el {format(new Date(incident.resolution_date), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          )}
        </Card>

        {userRole === 'technician' && (
          <Card className="p-6 bg-white border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Gestión de la Incidencia</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Prioridad</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En curso</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <Label>Notas del técnico</Label>
              <Textarea
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Notas internas sobre la incidencia..."
              />
            </div>

            <div className="mb-4">
              <Label>Descripción de la resolución</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Describa cómo se resolvió el problema..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="bg-slate-800 hover:bg-slate-700">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </div>
          </Card>
        )}

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar incidencia?"
          description="Esta incidencia se eliminará permanentemente. Esta acción no se puede deshacer."
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}