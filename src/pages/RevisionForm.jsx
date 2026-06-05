import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { useCurrentTechnician } from '@/hooks/useCurrentTechnician';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function RevisionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const scheduledRevisionId = urlParams.get('id');
  const { technician, user } = useCurrentTechnician();
  const sessionTechEmail = sessionStorage.getItem('technician_email');

  // ALL hooks at the top - no conditional hooks
  const [formData, setFormData] = useState({});
  const [notes, setNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');

  const isTechSession = !!sessionTechEmail;

  const proxy = async (entity, extra = {}) => {
    const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity, ...extra });
    return res.data;
  };

  // Carga todo en una sola llamada proxy cuando es técnico de sesión
  const { data: revisionDetail, isLoading } = useQuery({
    queryKey: ['scheduled-revision-detail', scheduledRevisionId, isTechSession ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxy('revision_detail', { revision_id: scheduledRevisionId });
        return r.data || null;
      }
      // directo: cargar revisión, luego equipo/cliente/edificio
      const revItems = await base44.entities.ScheduledRevision.filter({ id: scheduledRevisionId });
      const rev = revItems[0] || null;
      if (!rev) return null;
      const [eqItems, cliItems, bldItems] = await Promise.all([
        rev.equipment_id ? base44.entities.Equipment.filter({ id: rev.equipment_id }) : [],
        rev.client_id ? base44.entities.Client.filter({ id: rev.client_id }) : [],
        rev.building_id ? base44.entities.Building.filter({ id: rev.building_id }) : [],
      ]);
      return { revision: rev, equipment: eqItems[0] || null, client: cliItems[0] || null, building: bldItems[0] || null };
    },
    enabled: !!scheduledRevisionId,
  });

  const scheduledRevision = revisionDetail?.revision || null;
  const equipment = revisionDetail?.equipment || null;
  const client = revisionDetail?.client || null;
  const building = revisionDetail?.building || null;

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-revision', isTechSession ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxy('all');
        return r.technicians?.filter(t => t.status === 'active') || [];
      }
      return base44.entities.Technician.filter({ status: 'active' });
    },
  });

  const { data: previousPendingRevisions = [] } = useQuery({
    queryKey: ['previous-revisions', scheduledRevision?.equipment_id, scheduledRevision?.scheduled_date],
    queryFn: async () => {
      let all;
      if (isTechSession) {
        const r = await proxy('equipment_revisions', { equipment_id: scheduledRevision.equipment_id });
        all = r.data || [];
      } else {
        all = await base44.entities.ScheduledRevision.filter({ equipment_id: scheduledRevision.equipment_id, status: 'pending' });
      }
      return all.filter(r =>
        r.id !== scheduledRevision.id &&
        r.status === 'pending' &&
        new Date(r.scheduled_date) < new Date(scheduledRevision.scheduled_date)
      ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!scheduledRevision?.equipment_id && !!scheduledRevision?.scheduled_date && scheduledRevision?.status === 'pending',
  });

  // Auto-fill technician name from current user
  useEffect(() => {
    if (!technicianName && (technician?.name || user?.full_name)) {
      setTechnicianName(technician?.name || user?.full_name || '');
    }
  }, [technician, user]);

  useEffect(() => {
    if (!scheduledRevision || scheduledRevision.status === 'completed') return;
    if (previousPendingRevisions.length > 0) {
      setWarningType('previous');
      setShowWarning(true);
    } else {
      const today = new Date();
      const scheduledDate = new Date(scheduledRevision.scheduled_date);
      const daysDiff = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));
      if (daysDiff > 7) {
        setWarningType('early');
        setShowWarning(true);
      }
    }
  }, [scheduledRevision, previousPendingRevisions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
        revision_data: formData,
        notes: notes,
        technician_name: technicianName || technician?.name || user?.full_name || '',
        technician_id: technician?.id || '',
        technician_email: user?.email || sessionTechEmail || '',
      };
      if (isTechSession) {
        await proxy('revision_update', { revision_id: scheduledRevisionId, updates });
      } else {
        await base44.entities.ScheduledRevision.update(scheduledRevisionId, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revision-detail', scheduledRevisionId] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Revisión completada');
      navigate(-1);
    },
    onError: () => toast.error('Error al guardar la revisión'),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { _completed_date, ...cleanData } = formData;
      const updates = {
        revision_data: cleanData,
        notes: notes,
        technician_name: technicianName,
        ...(formData._completed_date && { completed_date: formData._completed_date }),
      };
      if (isTechSession) {
        await proxy('revision_update', { revision_id: scheduledRevisionId, updates });
      } else {
        await base44.entities.ScheduledRevision.update(scheduledRevisionId, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-revision-detail', scheduledRevisionId] });
      queryClient.invalidateQueries({ queryKey: ['all-revisions-equipment'] });
      toast.success('Revisión actualizada');
      setIsEditing(false);
    },
    onError: () => toast.error('Error al actualizar la revisión'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isTechSession) {
        await proxy('revision_delete', { revision_id: scheduledRevisionId });
      } else {
        await base44.entities.ScheduledRevision.delete(scheduledRevisionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-revisions-equipment'] });
      toast.success('Revisión eliminada');
      navigate(-1);
    },
    onError: () => toast.error('Error al eliminar la revisión'),
  });

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleSubmit = () => {
    if (warningType === 'previous') {
      toast.error('Debes completar primero las revisiones anteriores pendientes');
      return;
    }
    if (warningType === 'early' && showWarning) return;
    saveMutation.mutate();
  };

  const handleConfirmEarly = () => {
    setShowWarning(false);
    saveMutation.mutate();
  };

  const enterEditMode = () => {
    setFormData({ ...(scheduledRevision?.revision_data || {}), _completed_date: scheduledRevision?.completed_date || '' });
    setNotes(scheduledRevision?.notes || '');
    setTechnicianName(scheduledRevision?.technician_name || '');
    setIsEditing(true);
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        </div>
      </div>
    );
  }

  if (!scheduledRevision || !equipment) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-500">Revisión no encontrada</p>
        </div>
      </div>
    );
  }

  const maintenanceConfig = equipment.maintenance_config || {};
  const fields = maintenanceConfig[`${scheduledRevision.revision_type}_fields`] || [];

  // --- Completed revision view ---
  if (scheduledRevision.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <NavHeader title="Revisión Completada" />

          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-800">{equipment.reference_name || `${equipment.brand} ${equipment.model}`}</h2>
                <p className="text-slate-600 text-sm">{equipment.brand} {equipment.model}</p>
                {client && <p className="text-slate-600">{client.name}</p>}
                {building && <p className="text-slate-500 text-sm">{building.name}</p>}
                <p className="text-slate-500 text-sm">
                  Completada: {scheduledRevision.completed_date && format(new Date(scheduledRevision.completed_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                {scheduledRevision.technician_name && (
                  <p className="text-slate-500 text-sm">Técnico: <span className="font-medium text-slate-700">{scheduledRevision.technician_name}</span></p>
                )}
              </div>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                {revisionTypeLabels[scheduledRevision.revision_type]}
              </span>
            </div>
          </Card>

          <Card className="p-6">
            {!isEditing ? (
              <>
                {scheduledRevision.revision_data && Object.keys(scheduledRevision.revision_data).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-slate-700 mb-3">Datos registrados:</h4>
                    <div className="space-y-2">
                      {Object.entries(scheduledRevision.revision_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm py-1 border-b border-slate-100">
                          <span className="text-slate-600">{key}:</span>
                          <span className="font-medium text-slate-800">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {scheduledRevision.notes && (
                  <div className="mb-6 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600"><strong>Observaciones:</strong> {scheduledRevision.notes}</p>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => { if (window.confirm('¿Eliminar esta revisión? Esta acción no se puede deshacer.')) deleteMutation.mutate(); }}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
                    <Button onClick={enterEditMode}>Editar</Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Editar datos</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-700 mb-2">Fecha de realización</Label>
                    <Input
                      type="date"
                      value={formData._completed_date || scheduledRevision.completed_date || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, _completed_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 mb-2">Técnico que realizó la revisión</Label>
                    <Input
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Nombre del técnico"
                    />
                  </div>
                  {fields.map((field, idx) => (
                    <div key={idx}>
                      <Label className="text-slate-700 mb-2">{field.field_label}</Label>
                      {field.field_type === 'text' && (
                        <Input value={formData[field.field_key] || ''} onChange={(e) => handleFieldChange(field.field_key, e.target.value)} />
                      )}
                      {field.field_type === 'number' && (
                        <Input type="number" step="0.01" value={formData[field.field_key] || ''} onChange={(e) => handleFieldChange(field.field_key, e.target.value)} />
                      )}
                      {field.field_type === 'select' && (
                        <Select value={formData[field.field_key] || ''} onValueChange={(v) => handleFieldChange(field.field_key, v)}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {field.field_type === 'checkbox' && (
                        <div className="flex items-center gap-2">
                          <Checkbox id={field.field_key} checked={formData[field.field_key] === true} onCheckedChange={(v) => handleFieldChange(field.field_key, v)} />
                          <Label htmlFor={field.field_key} className="text-slate-600 cursor-pointer">Sí</Label>
                        </div>
                      )}
                    </div>
                  ))}
                  <div>
                    <Label className="text-slate-700 mb-2">Observaciones</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="bg-green-600">
                    {editMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar cambios</>}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // --- Pending revision form ---
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title="Realizar Revisión" />

        {warningType === 'previous' && previousPendingRevisions.length > 0 && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">No se puede realizar esta revisión</h4>
                <p className="text-sm text-red-700 mb-2">
                  Existen revisiones anteriores pendientes que deben completarse primero:
                </p>
                <div className="space-y-1">
                  {previousPendingRevisions.map(rev => (
                    <div key={rev.id} className="text-sm text-red-600">
                      • {revisionTypeLabels[rev.revision_type]} - {format(new Date(rev.scheduled_date), "dd/MM/yyyy")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {warningType === 'early' && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 mb-1">Revisión anticipada</h4>
                <p className="text-sm text-amber-700">
                  Esta revisión está programada para el {format(new Date(scheduledRevision.scheduled_date), "d 'de' MMMM", { locale: es })}.
                  ¿Estás seguro de que quieres realizarla ahora?
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                {equipment.reference_name || `${equipment.brand} ${equipment.model}`}
              </h2>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                {revisionTypeLabels[scheduledRevision.revision_type]}
              </span>
            </div>
            <p className="text-slate-600 text-sm">{equipment.brand} {equipment.model}</p>
            {client && <p className="text-slate-600">{client.name}</p>}
            {building && <p className="text-slate-500 text-sm">{building.name}</p>}
            <p className="text-slate-500 text-sm">
              Programada: {format(new Date(scheduledRevision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos a registrar</h3>

          <div className="space-y-4 mb-6 pb-6 border-b">
            <div>
              <Label className="text-slate-700 mb-2">Técnico que realiza la revisión</Label>
              {technicians.length > 0 ? (
                <select
                  value={technicianName}
                  onChange={e => setTechnicianName(e.target.value)}
                  className="w-full h-9 text-sm border border-input rounded-md px-2 bg-background"
                >
                  <option value="">— Seleccionar técnico —</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.name}>{t.name}{t.specialty ? ` · ${t.specialty}` : ''}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="Nombre del técnico"
                />
              )}
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-500">No hay campos configurados para este tipo de revisión</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={idx}>
                  <Label className="text-slate-700 mb-2">{field.field_label}</Label>
                  {field.field_type === 'text' && (
                    <Input value={formData[field.field_key] || ''} onChange={(e) => handleFieldChange(field.field_key, e.target.value)} placeholder={field.field_label} />
                  )}
                  {field.field_type === 'number' && (
                    <Input type="number" step="0.01" value={formData[field.field_key] || ''} onChange={(e) => handleFieldChange(field.field_key, e.target.value)} placeholder={field.field_label} />
                  )}
                  {field.field_type === 'select' && (
                    <Select value={formData[field.field_key] || ''} onValueChange={(v) => handleFieldChange(field.field_key, v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {field.field_type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <Checkbox id={field.field_key} checked={formData[field.field_key] === true} onCheckedChange={(checked) => handleFieldChange(field.field_key, checked)} />
                      <Label htmlFor={field.field_key} className="text-slate-600 cursor-pointer">Sí</Label>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4">
                <Label className="text-slate-700 mb-2">Observaciones</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Añade cualquier observación o incidencia detectada..." rows={4} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={saveMutation.isPending || warningType === 'previous'}
              className="bg-green-600"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Completar Revisión</>
              )}
            </Button>
          </div>
        </Card>

        <Dialog open={showWarning && warningType === 'early'} onOpenChange={setShowWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Realizar revisión anticipada?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600">
                Esta revisión está programada para el <strong>{format(new Date(scheduledRevision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })}</strong>.
              </p>
              <p className="text-slate-600 mt-2">¿Deseas completarla ahora de todas formas?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWarning(false)}>Cancelar</Button>
              <Button onClick={handleConfirmEarly} className="bg-green-600">Sí, continuar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}