import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, AlertCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
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
  
  const [formData, setFormData] = useState({});
  const [notes, setNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: scheduledRevision, isLoading } = useQuery({
    queryKey: ['scheduled-revision', scheduledRevisionId],
    queryFn: async () => {
      const items = await base44.entities.ScheduledRevision.filter({ id: scheduledRevisionId });
      return items[0] || null;
    },
    enabled: !!scheduledRevisionId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment-for-revision', scheduledRevision?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: scheduledRevision.equipment_id });
      return items[0] || null;
    },
    enabled: !!scheduledRevision?.equipment_id,
  });

  const { data: client } = useQuery({
    queryKey: ['client-for-revision', scheduledRevision?.client_id],
    queryFn: async () => {
      const items = await base44.entities.Client.filter({ id: scheduledRevision.client_id });
      return items[0] || null;
    },
    enabled: !!scheduledRevision?.client_id,
  });

  const { data: building } = useQuery({
    queryKey: ['building-for-revision', scheduledRevision?.building_id],
    queryFn: async () => {
      const items = await base44.entities.Building.filter({ id: scheduledRevision.building_id });
      return items[0] || null;
    },
    enabled: !!scheduledRevision?.building_id,
  });

  // Verificar revisiones anteriores pendientes
  const { data: previousPendingRevisions = [] } = useQuery({
    queryKey: ['previous-revisions', scheduledRevision?.equipment_id, scheduledRevision?.scheduled_date],
    queryFn: async () => {
      const all = await base44.entities.ScheduledRevision.filter({ 
        equipment_id: scheduledRevision.equipment_id,
        status: 'pending'
      });
      return all.filter(r => 
        r.id !== scheduledRevision.id && 
        new Date(r.scheduled_date) < new Date(scheduledRevision.scheduled_date)
      ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!scheduledRevision?.equipment_id && !!scheduledRevision?.scheduled_date,
  });

  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');

  useEffect(() => {
    if (scheduledRevision && previousPendingRevisions.length > 0) {
      setWarningType('previous');
      setShowWarning(true);
    } else if (scheduledRevision) {
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
    mutationFn: async (data) => {
      await base44.entities.ScheduledRevision.update(scheduledRevisionId, {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
        revision_data: formData,
        notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Revisión completada');
      navigate(-1);
    },
    onError: () => {
      toast.error('Error al guardar la revisión');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
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

  if (scheduledRevision.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <NavHeader title="Revisión Completada" />
          <Card className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Save className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                Revisión ya completada
              </h3>
              <p className="text-slate-500 mb-6">
                Esta revisión fue completada el {scheduledRevision.completed_date && format(new Date(scheduledRevision.completed_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              {scheduledRevision.revision_data && (
                <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
                  <h4 className="font-medium text-slate-700 mb-3">Datos registrados:</h4>
                  <div className="space-y-2">
                    {Object.entries(scheduledRevision.revision_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-600">{key}:</span>
                        <span className="font-medium text-slate-800">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                  {scheduledRevision.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-slate-600">
                        <strong>Observaciones:</strong> {scheduledRevision.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Button onClick={() => navigate(-1)}>Volver</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const maintenanceConfig = equipment.maintenance_config || {};
  const revisionTypeMap = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    biannual: 'biannual',
    annual: 'annual'
  };
  
  const configKey = revisionTypeMap[scheduledRevision.revision_type];
  const fieldsKey = `${configKey}_fields`;
  const fields = maintenanceConfig[fieldsKey] || [];

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleSubmit = () => {
    if (warningType === 'previous') {
      toast.error('Debes completar primero las revisiones anteriores pendientes');
      return;
    }
    
    if (warningType === 'early' && showWarning) {
      // Solo mostrar el diálogo
      return;
    }
    
    saveMutation.mutate();
  };

  const handleConfirmEarly = () => {
    setShowWarning(false);
    saveMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title="Realizar Revisión" />

        {/* Warning Card */}
        {warningType === 'previous' && previousPendingRevisions.length > 0 && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">No se puede realizar esta revisión</h4>
                <p className="text-sm text-red-700 mb-2">
                  Existe{previousPendingRevisions.length > 1 ? 'n' : ''} {previousPendingRevisions.length} revisión{previousPendingRevisions.length > 1 ? 'es' : ''} anterior{previousPendingRevisions.length > 1 ? 'es' : ''} pendiente{previousPendingRevisions.length > 1 ? 's' : ''} que debe{previousPendingRevisions.length > 1 ? 'n' : ''} completarse primero:
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

        {/* Info Card */}
        <Card className="p-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                {equipment.brand} {equipment.model}
              </h2>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                {revisionTypeLabels[scheduledRevision.revision_type]}
              </span>
            </div>
            {client && <p className="text-slate-600">{client.name}</p>}
            {building && <p className="text-slate-500 text-sm">{building.name}</p>}
            <p className="text-slate-500 text-sm">
              Programada: {format(new Date(scheduledRevision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos a registrar</h3>
          
          {fields.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-500">
                No hay campos configurados para este tipo de revisión
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={idx}>
                  <Label className="text-slate-700 mb-2">{field.field_label}</Label>
                  
                  {field.field_type === 'text' && (
                    <Input
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                      placeholder={field.field_label}
                    />
                  )}
                  
                  {field.field_type === 'number' && (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                      placeholder={field.field_label}
                    />
                  )}
                  
                  {field.field_type === 'select' && (
                    <Select
                      value={formData[field.field_key] || ''}
                      onValueChange={(v) => handleFieldChange(field.field_key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {field.field_type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={field.field_key}
                        checked={formData[field.field_key] === true}
                        onCheckedChange={(checked) => handleFieldChange(field.field_key, checked)}
                      />
                      <Label htmlFor={field.field_key} className="text-slate-600 cursor-pointer">
                        Sí
                      </Label>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4">
                <Label className="text-slate-700 mb-2">Observaciones</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Añade cualquier observación o incidencia detectada..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
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

        {/* Confirmation Dialog for Early Revision */}
        <Dialog open={showWarning && warningType === 'early'} onOpenChange={setShowWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Realizar revisión anticipada?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600">
                Esta revisión está programada para el <strong>{format(new Date(scheduledRevision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })}</strong>.
              </p>
              <p className="text-slate-600 mt-2">
                ¿Deseas completarla ahora de todas formas?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWarning(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmEarly} className="bg-green-600">
                Sí, continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}