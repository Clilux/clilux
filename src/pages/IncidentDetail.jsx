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
import { AlertTriangle, Calendar, User, Building2, Thermometer, CheckCircle, Loader2, Trash2, Tag, MessageSquare, Clock, ExternalLink } from 'lucide-react';
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

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const [userRole, setUserRole] = useState(isSessionTech ? 'technician' : null);
  const [currentUser, setCurrentUser] = useState(null);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (isSessionTech) return; // técnico de sesión propia: rol ya seteado
    const checkRole = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const clients = await base44.entities.Client.filter({ user_email: user.email });
      setUserRole(clients.length > 0 ? 'client' : 'technician');
    };
    checkRole();
  }, []);

  // Proxy para técnicos de sesión propia
  const { data: proxyData } = useQuery({
    queryKey: ['proxy-incident-detail', incidentId, sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'incident_detail', incident_id: incidentId,
      });
      return res.data?.data || null;
    },
    enabled: isSessionTech && !!incidentId,
  });

  const { data: incidentDirect, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const items = await base44.entities.Incident.filter({ id: incidentId });
      return items[0] || null;
    },
    enabled: !isSessionTech && !!incidentId,
  });

  // Datos finales según modo
  const incident = isSessionTech ? proxyData?.incident : incidentDirect;
  const equipment = isSessionTech ? proxyData?.equipment : undefined;
  const building = isSessionTech ? proxyData?.building : undefined;
  const client = isSessionTech ? proxyData?.client : undefined;
  const isLoadingFinal = isSessionTech ? (!proxyData && !!incidentId) : isLoading;

  useEffect(() => {
    if (incident) {
      setTechnicianNotes(incident.technician_notes || '');
      setResolutionNotes(incident.resolution_notes || '');
      setNewPriority(incident.priority);
      setNewStatus(incident.status);
      setNewLabel(incident.label || '');
    }
  }, [incident]);

  const { data: equipmentDirect } = useQuery({
    queryKey: ['equipment-incident', incident?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: incident.equipment_id });
      return items[0] || null;
    },
    enabled: !isSessionTech && !!incident?.equipment_id,
  });

  const { data: buildingDirect } = useQuery({
    queryKey: ['building-incident', incident?.building_id],
    queryFn: async () => {
      const items = await base44.entities.Building.filter({ id: incident.building_id });
      return items[0] || null;
    },
    enabled: !isSessionTech && !!incident?.building_id,
  });

  const { data: clientDirect } = useQuery({
    queryKey: ['client-incident', incident?.client_id],
    queryFn: async () => {
      const items = await base44.entities.Client.filter({ id: incident.client_id });
      return items[0] || null;
    },
    enabled: !isSessionTech && !!incident?.client_id,
  });

  const finalEquipment = isSessionTech ? equipment : equipmentDirect;
  const finalBuilding = isSessionTech ? building : buildingDirect;
  const finalClient = isSessionTech ? client : clientDirect;

  // Helper: resolver usuario actual (sesión técnica o Base44)
  const resolveUser = async () => {
    if (isSessionTech) {
      return {
        email: sessionTechEmail,
        full_name: sessionStorage.getItem('technician_name') || sessionTechEmail,
      };
    }
    return currentUser || await base44.auth.me();
  };

  // Helper: actualizar incidencia vía proxy (técnicos) o directo (admins)
  const updateIncident = async (id, updateData) => {
    if (isSessionTech) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'incident_update',
        incident_id: id, updates: updateData,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.data;
    }
    return await base44.entities.Incident.update(id, updateData);
  };

  const invalidateIncidentQueries = () => {
    if (isSessionTech) {
      queryClient.invalidateQueries({ queryKey: ['proxy-incident-detail', incidentId, sessionTechEmail] });
      queryClient.invalidateQueries({ queryKey: ['proxy-all', sessionTechEmail] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    }
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const user = await resolveUser();
      const prevStatus = incident.status;
      const updateData = {
        ...data,
        assigned_technician: user.email,
        assigned_technician_name: user.full_name || '',
      };
      if (data.status === 'resolved' || data.status === 'closed') {
        updateData.resolution_date = new Date().toISOString().split('T')[0];
      }
      await updateIncident(incidentId, updateData);

      // Notify client if status changed
      if (data.status && data.status !== prevStatus) {
        base44.functions.invoke('incidentNotifications', {
          type: 'status_changed',
          incidentId,
          oldStatus: prevStatus,
          newStatus: data.status,
        }).catch(() => {});
      }

      // Notify technician if newly assigned
      const wasAssigned = !incident.assigned_technician;
      if (wasAssigned) {
        base44.functions.invoke('incidentNotifications', {
          type: 'technician_assigned',
          incidentId,
          technicianEmail: user.email,
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      invalidateIncidentQueries();
      toast.success('Incidencia actualizada');
    },
    onError: () => toast.error('Error al actualizar la incidencia'),
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const user = await resolveUser();
      const prevStatus = incident.status;
      const historyEntry = {
        date: new Date().toISOString(),
        technician: user.full_name || user.email,
        comment: newComment,
        label: newLabel,
        status: newStatus,
      };
      const updatedHistory = [...(incident.history || []), historyEntry];
      const updateData = {
        history: updatedHistory,
        label: newLabel || incident.label,
        status: newStatus,
        technician_notes: technicianNotes,
        resolution_notes: resolutionNotes,
        assigned_technician: user.email,
      };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolution_date = new Date().toISOString().split('T')[0];
      }
      // Si etiqueta es irreparable, marcar equipo como fuera de servicio
      if (newLabel === 'irreparable' && incident.equipment_id) {
        if (isSessionTech) {
          const eqRes = await base44.functions.invoke('getCompanyData', {
            technician_email: sessionTechEmail, entity: 'equipment_update',
            equipment_id: incident.equipment_id, updates: { status: 'out_of_service' },
          });
          if (eqRes.data?.error) throw new Error(eqRes.data.error);
        } else {
          await base44.entities.Equipment.update(incident.equipment_id, { status: 'out_of_service' });
        }
        queryClient.invalidateQueries({ queryKey: ['equipment-incident', incident.equipment_id] });
      }
      await updateIncident(incidentId, updateData);

      // Notify client if status changed
      if (newStatus && newStatus !== prevStatus) {
        base44.functions.invoke('incidentNotifications', {
          type: 'status_changed',
          incidentId,
          oldStatus: prevStatus,
          newStatus,
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      invalidateIncidentQueries();
      setNewComment('');
      toast.success('Comentario añadido');
    },
    onError: () => toast.error('Error al añadir el comentario'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'incident_delete',
          incident_id: incidentId,
        });
        if (res.data?.error) throw new Error(res.data.error);
      } else {
        await base44.entities.Incident.delete(incidentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['proxy-all', sessionTechEmail] });
      toast.success('Incidencia eliminada');
      navigate(-1);
    },
    onError: () => toast.error('Error al eliminar la incidencia'),
  });

  const handleUpdate = () => {
    updateMutation.mutate({
      priority: newPriority,
      status: newStatus,
      label: newLabel,
      technician_notes: technicianNotes,
      resolution_notes: resolutionNotes,
    });
  };

  const labelConfig = {
    resuelta: { label: 'Resuelta', color: 'bg-green-100 text-green-700 border-green-300' },
    recambio: { label: 'Recambio', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    irreparable: { label: 'Irreparable', color: 'bg-gray-900 text-white border-gray-700' },
  };

  if (isLoadingFinal) {
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
                  {incident.label && labelConfig[incident.label] && (
                    <Badge className={`border ${labelConfig[incident.label].color}`}>
                      <Tag className="h-3 w-3 mr-1" />
                      {labelConfig[incident.label].label}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600">{incident.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <IncidentReport
                incident={incident}
                equipment={finalEquipment}
                client={finalClient}
                building={finalBuilding}
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
            {finalBuilding && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Building2 className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Edificio</p>
                  <p className="text-sm text-slate-700">{finalBuilding.name}</p>
                </div>
              </div>
            )}
            {finalEquipment && (
              <Link to={createPageUrl(`EquipmentDetail?id=${incident.equipment_id}`)} className="block">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors cursor-pointer">
                  <Thermometer className="h-5 w-5 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-teal-600">Equipo afectado</p>
                    <p className="text-sm text-teal-800 font-medium">{finalEquipment.reference_name || `${finalEquipment.brand} ${finalEquipment.model}`}</p>
                    {finalEquipment.location && <p className="text-xs text-teal-600 truncate">{finalEquipment.location}</p>}
                  </div>
                  <ExternalLink className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
                </div>
              </Link>
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

        {/* Historial de comentarios */}
        {(incident.history && incident.history.length > 0) && (
          <Card className="p-6 bg-white border-0 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Historial
              </h3>
              {userRole === 'technician' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 text-xs"
                  onClick={() => {
                    if (confirm('¿Eliminar todo el historial de esta incidencia?')) {
                      base44.entities.Incident.update(incidentId, { history: [] }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
                        toast.success('Historial eliminado');
                      });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Borrar historial
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {[...incident.history].reverse().map((entry, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-slate-700">{entry.technician}</span>
                      {entry.label && labelConfig[entry.label] && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${labelConfig[entry.label].color}`}>
                          <Tag className="h-2.5 w-2.5" />{labelConfig[entry.label].label}
                        </span>
                      )}
                      {entry.status && statusConfig[entry.status] && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[entry.status].color}`}>{statusConfig[entry.status].label}</span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{format(new Date(entry.date), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    {entry.comment && <p className="text-sm text-slate-600">{entry.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {userRole === 'technician' && (
          <>
            {/* Añadir comentario con etiqueta */}
            <Card className="p-6 bg-white border-0 shadow-sm mb-4">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Añadir comentario al historial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Etiqueta</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {[
                      { value: 'resuelta', label: 'Resuelta', cls: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
                      { value: 'recambio', label: 'Recambio', cls: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' },
                      { value: 'irreparable', label: 'Irreparable', cls: 'bg-gray-900 text-white border-gray-700 hover:bg-gray-700' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setNewLabel(newLabel === opt.value ? '' : opt.value)}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${opt.cls} ${newLabel === opt.value ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-70'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {newLabel === 'irreparable' && (
                    <p className="text-xs text-red-600 mt-1 font-medium">⚠ El equipo pasará a estado "No operativo"</p>
                  )}
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
                <Label className="flex items-center gap-2">
                  Comentario
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">👁 Visible para el cliente</span>
                </Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Escribe un comentario que verá el cliente..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => addCommentMutation.mutate()}
                  disabled={addCommentMutation.isPending || (!newComment && !newLabel)}
                  className="bg-slate-800 hover:bg-slate-700"
                >
                  {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Añadir al historial
                </Button>
              </div>
            </Card>

            {/* Gestión general */}
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
                <Label className="flex items-center gap-2">
                  Notas del técnico
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">🔒 Solo visible para técnicos</span>
                </Label>
                <Textarea
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Notas internas sobre la incidencia (el cliente NO las verá)..."
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
          </>
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