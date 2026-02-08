import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Upload, X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const defaultFieldsConfig = [
  { field_key: 'temp_impulsion', field_label: 'Temp. Impulsión (°C)', field_type: 'number', enabled: true },
  { field_key: 'temp_retorno', field_label: 'Temp. Retorno (°C)', field_type: 'number', enabled: true },
  { field_key: 'temp_exterior', field_label: 'Temp. Exterior (°C)', field_type: 'number', enabled: true },
  { field_key: 'presion_alta', field_label: 'Presión Alta (bar)', field_type: 'number', enabled: true },
  { field_key: 'presion_baja', field_label: 'Presión Baja (bar)', field_type: 'number', enabled: true },
  { field_key: 'consumo_electrico', field_label: 'Consumo Eléctrico (kW)', field_type: 'number', enabled: true },
  { field_key: 'caudal_aire', field_label: 'Caudal de Aire (m³/h)', field_type: 'number', enabled: true },
  { field_key: 'humedad_relativa', field_label: 'Humedad Relativa (%)', field_type: 'number', enabled: true },
  { field_key: 'estado_filtros', field_label: 'Estado de Filtros', field_type: 'select', options: ['bueno', 'aceptable', 'sucio', 'cambiar'], enabled: true },
  { field_key: 'estado_correas', field_label: 'Estado de Correas', field_type: 'select', options: ['bueno', 'desgastado', 'cambiar', 'na'], enabled: true },
  { field_key: 'fugas_refrigerante', field_label: 'Fugas de Refrigerante', field_type: 'checkbox', enabled: true },
  { field_key: 'nivel_aceite', field_label: 'Nivel de Aceite', field_type: 'select', options: ['correcto', 'bajo', 'na'], enabled: true },
  { field_key: 'vibraciones', field_label: 'Vibraciones', field_type: 'select', options: ['normales', 'elevadas', 'excesivas'], enabled: true },
  { field_key: 'ruidos_anomalos', field_label: 'Ruidos Anómalos', field_type: 'checkbox', enabled: true },
  { field_key: 'estado_aislamiento', field_label: 'Estado Aislamiento', field_type: 'select', options: ['bueno', 'deteriorado', 'reparar'], enabled: true },
  { field_key: 'limpieza_unidad', field_label: 'Limpieza Unidad', field_type: 'select', options: ['limpia', 'aceptable', 'sucia'], enabled: true },
];

export default function RevisionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const revisionId = urlParams.get('id');
  const preselectedEquipmentId = urlParams.get('equipment_id');
  const preselectedBuildingId = urlParams.get('building_id');
  const preselectedClientId = urlParams.get('client_id');
  const periodParam = urlParams.get('period'); // Mensual, Trimestral, Semestral, Anual
  const isEditing = !!revisionId;

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    equipment_id: preselectedEquipmentId || '',
    building_id: preselectedBuildingId || '',
    client_id: preselectedClientId || '',
    technician_id: '',
    revision_date: new Date().toISOString().split('T')[0],
    revision_type: 'preventive',
    general_status: 'good',
    annual_revision_completed: false,
    it3_data: {},
    observations: '',
    actions_taken: '',
    recommendations: '',
    next_revision_date: '',
    photos: [],
    equipment_photo: '',
    additional_photos: [],
  });

  const [uploading, setUploading] = useState(false);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.filter({ status: 'active' }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: fieldConfigs = [] } = useQuery({
    queryKey: ['revision-field-configs'],
    queryFn: () => base44.entities.RevisionFieldConfig.list(),
  });

  // Obtener el equipo seleccionado y sus campos configurados
  const selectedEquipment = equipment.find(e => e.id === formData.equipment_id);
  const activeFields = useMemo(() => {
    if (!selectedEquipment) return defaultFieldsConfig.filter(f => f.enabled);
    
    // Determinar el período a filtrar
    let periodsToShow = [];
    if (periodParam) {
      const periodMap = {
        'Mensual': 'monthly',
        'Trimestral': 'quarterly',
        'Semestral': 'biannual',
        'Anual': 'annual'
      };
      const periodKey = periodMap[periodParam];
      
      // Si hay configuración de maintenance, usar solo los campos de ese período
      if (selectedEquipment.maintenance_config && periodKey) {
        const fieldsForPeriod = selectedEquipment.maintenance_config[`${periodKey}_fields`] || [];
        return fieldsForPeriod.filter(f => f.enabled !== false);
      }
    }
    
    // Si no hay período o no hay config, usar todos los campos habilitados
    const config = fieldConfigs.find(c => c.equipment_type === selectedEquipment.equipment_type);
    if (config && config.fields) {
      return config.fields.filter(f => f.enabled);
    }
    return defaultFieldsConfig.filter(f => f.enabled);
  }, [selectedEquipment, fieldConfigs, periodParam]);

  // Inicializar it3_data con campos activos cuando cambia el equipo
  useEffect(() => {
    if (selectedEquipment && !isEditing) {
      const newIt3Data = {};
      activeFields.forEach(field => {
        if (field.field_type === 'checkbox') {
          newIt3Data[field.field_key] = false;
        } else {
          newIt3Data[field.field_key] = '';
        }
      });
      setFormData(prev => ({ ...prev, it3_data: newIt3Data }));
    }
  }, [selectedEquipment?.id, activeFields.length]);

  const filteredBuildings = formData.client_id 
    ? buildings.filter(b => b.client_id === formData.client_id)
    : buildings;

  const filteredEquipment = formData.building_id
    ? equipment.filter(e => e.building_id === formData.building_id)
    : equipment;

  useEffect(() => {
    if (revisionId) {
      const loadRevision = async () => {
        const revisions = await base44.entities.Revision.filter({ id: revisionId });
        if (revisions.length > 0) {
          const loadedRevision = revisions[0];
          // Asegurar que it3_data existe y tiene estructura
          setFormData({
            ...loadedRevision,
            it3_data: loadedRevision.it3_data || {},
            photos: loadedRevision.photos || [],
            additional_photos: loadedRevision.additional_photos || [],
          });
        }
      };
      loadRevision();
    }
  }, [revisionId]);

  const scheduledRevisionId = urlParams.get('scheduled_revision_id');
  const revisionTypeParam = urlParams.get('revision_type');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Procesar correctamente it3_data preservando TODOS los campos
      const cleanedIt3Data = {};
      if (data.it3_data && typeof data.it3_data === 'object') {
        Object.entries(data.it3_data).forEach(([key, value]) => {
          // Guardar el valor tal cual si existe
          if (value !== '' && value !== null && value !== undefined) {
            // Convertir a número si es string numérico
            if (typeof value === 'string' && value.trim() !== '') {
              const num = Number(value);
              cleanedIt3Data[key] = !isNaN(num) && /^-?\d+\.?\d*$/.test(value.trim()) ? num : value;
            } else {
              cleanedIt3Data[key] = value;
            }
          }
        });
      }

      const cleanData = {
        equipment_id: data.equipment_id,
        building_id: data.building_id,
        client_id: data.client_id,
        technician_id: data.technician_id || '',
        revision_date: data.revision_date,
        revision_type: data.revision_type,
        general_status: data.general_status,
        annual_revision_completed: data.annual_revision_completed || false,
        it3_data: cleanedIt3Data,
        observations: data.observations || '',
        actions_taken: data.actions_taken || '',
        recommendations: data.recommendations || '',
        next_revision_date: data.next_revision_date || '',
        equipment_photo: data.equipment_photo || '',
        additional_photos: data.additional_photos || [],
        photos: data.photos || [],
      };
      
      let createdRevision;
      if (isEditing) {
        await base44.entities.Revision.update(revisionId, cleanData);
      } else {
        createdRevision = await base44.entities.Revision.create(cleanData);
      }
      
      // Marcar la scheduled revision como completada
      if (scheduledRevisionId && createdRevision) {
        await base44.entities.ScheduledRevision.update(scheduledRevisionId, {
          status: 'completed',
          completed_revision_id: createdRevision.id
        });
      }
      
      // Actualizar fecha de última revisión del equipo
      if (data.equipment_id) {
        await base44.entities.Equipment.update(data.equipment_id, {
          last_revision_date: data.revision_date,
          status: data.general_status === 'critical' ? 'out_of_service' : 
                  data.general_status === 'needs_repair' ? 'maintenance_needed' : 'operational',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      
      const typeLabels = {
        monthly: 'mensual',
        quarterly: 'trimestral',
        biannual: 'semestral',
        annual: 'anual'
      };
      const typeLabel = typeLabels[revisionTypeParam] || '';
      
      toast.success(
        isEditing 
          ? 'Revisión actualizada' 
          : `Revisión ${typeLabel} completada. Próxima revisión programada automáticamente`
      );
      
      if (formData.equipment_id) {
        navigate(createPageUrl(`EquipmentDetail?id=${formData.equipment_id}`));
      } else {
        navigate(createPageUrl('Calendar'));
      }
    },
    onError: (error) => {
      toast.error('Error al guardar la revisión');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIT3Change = (field, value) => {
    setFormData(prev => ({
      ...prev,
      it3_data: { 
        ...prev.it3_data, 
        [field]: value 
      },
    }));
  };

  const handleEquipmentPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        equipment_photo: result.file_url,
      }));
      
      // Actualizar foto del equipo
      if (formData.equipment_id) {
        await base44.entities.Equipment.update(formData.equipment_id, {
          photo_url: result.file_url
        });
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
      }
      
      toast.success('Foto del equipo actualizada');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleAdditionalPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        additional_photos: [...(prev.additional_photos || []), result.file_url],
      }));
      toast.success('Foto añadida');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const removeAdditionalPhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      additional_photos: prev.additional_photos.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Revisión' : 'Nueva Revisión'} />

        <form onSubmit={handleSubmit}>
          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!preselectedClientId && (
                <div>
                  <Label>Cliente</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={(v) => {
                      handleChange('client_id', v);
                      handleChange('building_id', '');
                      handleChange('equipment_id', '');
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!preselectedBuildingId && (
                <div>
                  <Label>Edificio</Label>
                  <Select 
                    value={formData.building_id} 
                    onValueChange={(v) => {
                      handleChange('building_id', v);
                      handleChange('equipment_id', '');
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar edificio" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBuildings.map(building => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Equipo *</Label>
                <Select 
                  value={formData.equipment_id} 
                  onValueChange={(v) => handleChange('equipment_id', v)}
                  disabled={!!preselectedEquipmentId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.brand} {eq.model} - {eq.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha de Revisión *</Label>
                <Input
                  type="date"
                  value={formData.revision_date}
                  onChange={(e) => handleChange('revision_date', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tipo de Revisión *</Label>
                <Select value={formData.revision_type} onValueChange={(v) => handleChange('revision_type', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventivo</SelectItem>
                    <SelectItem value="corrective">Correctivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado General *</Label>
                <Select value={formData.general_status} onValueChange={(v) => handleChange('general_status', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Bueno</SelectItem>
                    <SelectItem value="acceptable">Aceptable</SelectItem>
                    <SelectItem value="needs_repair">Necesita reparación</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Próxima Revisión</Label>
                <Input
                  type="date"
                  value={formData.next_revision_date}
                  onChange={(e) => handleChange('next_revision_date', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Técnico</Label>
                <Select value={formData.technician_id} onValueChange={(v) => handleChange('technician_id', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="annual_revision"
                    checked={formData.annual_revision_completed || false}
                    onCheckedChange={(checked) => handleChange('annual_revision_completed', checked)}
                  />
                  <Label htmlFor="annual_revision" className="font-normal cursor-pointer">
                    Revisión anual completada
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {activeFields.length > 0 && (
            <Card className="p-6 bg-white border-0 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Mantenimiento</h3>
                <Link to={createPageUrl('RevisionFieldSettings')}>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar campos
                  </Button>
                </Link>
              </div>
              
              {selectedEquipment && (
                <p className="text-sm text-slate-500 mb-4">
                  Campos configurados para: <span className="font-medium">{selectedEquipment.equipment_type}</span>
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeFields.map(field => {
                  if (field.field_type === 'number') {
                    return (
                      <div key={field.field_key}>
                        <Label>{field.field_label}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data[field.field_key] || ''}
                          onChange={(e) => handleIT3Change(field.field_key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    );
                  }
                  if (field.field_type === 'select' && field.options) {
                    return (
                      <div key={field.field_key}>
                        <Label>{field.field_label}</Label>
                        <Select 
                          value={String(formData.it3_data[field.field_key] || '')} 
                          onValueChange={(v) => handleIT3Change(field.field_key, v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(opt => (
                              <SelectItem key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  if (field.field_type === 'checkbox') {
                    return (
                      <div key={field.field_key} className="flex items-center gap-2 pt-6">
                        <Checkbox
                          id={field.field_key}
                          checked={formData.it3_data[field.field_key] || false}
                          onCheckedChange={(v) => handleIT3Change(field.field_key, v)}
                        />
                        <Label htmlFor={field.field_key}>{field.field_label}</Label>
                      </div>
                    );
                  }
                  if (field.field_type === 'text') {
                    return (
                      <div key={field.field_key}>
                        <Label>{field.field_label}</Label>
                        <Input
                          value={formData.it3_data[field.field_key] || ''}
                          onChange={(e) => handleIT3Change(field.field_key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          )}

          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Observaciones y Acciones</h3>
            <div className="space-y-4">
              <div>
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleChange('observations', e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Observaciones generales de la revisión..."
                />
              </div>
              <div>
                <Label>Acciones Realizadas</Label>
                <Textarea
                  value={formData.actions_taken}
                  onChange={(e) => handleChange('actions_taken', e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Detalle de las acciones realizadas..."
                />
              </div>
              <div>
                <Label>Recomendaciones</Label>
                <Textarea
                  value={formData.recommendations}
                  onChange={(e) => handleChange('recommendations', e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Recomendaciones para el cliente..."
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Fotos del Equipo</h3>
            
            <div className="mb-6">
              <Label className="text-sm text-slate-600 mb-2 block">Foto Principal del Equipo</Label>
              <p className="text-xs text-slate-500 mb-3">Esta foto se guardará como la foto principal del equipo</p>
              <div className="flex items-center gap-4">
                {formData.equipment_photo && (
                  <img 
                    src={formData.equipment_photo} 
                    alt="Equipo"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEquipmentPhotoUpload}
                  className="hidden"
                  id="equipment-photo-upload"
                />
                <label htmlFor="equipment-photo-upload">
                  <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Subir foto</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Fotos Adicionales de Información</Label>
              <p className="text-xs text-slate-500 mb-3">Fotos complementarias para documentación</p>
              <div className="flex flex-wrap gap-4">
                {formData.additional_photos?.map((photo, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={photo} 
                      alt={`Adicional ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalPhoto(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAdditionalPhotoUpload}
                  className="hidden"
                  id="additional-photo-upload"
                />
                <label htmlFor="additional-photo-upload">
                  <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                </label>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-slate-800 hover:bg-slate-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Guardar Cambios' : 'Crear Revisión'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}