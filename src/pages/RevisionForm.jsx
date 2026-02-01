import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Upload, X } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function RevisionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const revisionId = urlParams.get('id');
  const preselectedEquipmentId = urlParams.get('equipment_id');
  const preselectedBuildingId = urlParams.get('building_id');
  const preselectedClientId = urlParams.get('client_id');
  const isEditing = !!revisionId;

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    equipment_id: preselectedEquipmentId || '',
    building_id: preselectedBuildingId || '',
    client_id: preselectedClientId || '',
    technician_email: '',
    technician_name: '',
    revision_date: new Date().toISOString().split('T')[0],
    revision_type: 'preventive',
    general_status: 'good',
    it3_data: {
      temp_impulsion: '',
      temp_retorno: '',
      temp_exterior: '',
      presion_alta: '',
      presion_baja: '',
      consumo_electrico: '',
      caudal_aire: '',
      humedad_relativa: '',
      estado_filtros: '',
      estado_correas: '',
      fugas_refrigerante: false,
      nivel_aceite: '',
      vibraciones: '',
      ruidos_anomalos: false,
      estado_aislamiento: '',
      limpieza_unidad: '',
    },
    observations: '',
    actions_taken: '',
    recommendations: '',
    next_revision_date: '',
    photos: [],
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (!isEditing) {
        setFormData(prev => ({
          ...prev,
          technician_email: currentUser.email,
          technician_name: currentUser.full_name || '',
        }));
      }
    };
    loadUser();
  }, [isEditing]);

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

  // Obtener el tipo de equipo seleccionado
  const selectedEquipment = equipment.find(e => e.id === formData.equipment_id);
  const equipmentType = selectedEquipment?.equipment_type || '';
  
  // Obtener la configuración de campos para el tipo de equipo
  const fieldConfig = fieldConfigs.find(c => c.equipment_type === equipmentType);
  const enabledFields = fieldConfig?.fields?.filter(f => f.enabled) || [];

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
          setFormData(revisions[0]);
        }
      };
      loadRevision();
    }
  }, [revisionId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        it3_data: {
          ...data.it3_data,
          temp_impulsion: data.it3_data.temp_impulsion ? Number(data.it3_data.temp_impulsion) : null,
          temp_retorno: data.it3_data.temp_retorno ? Number(data.it3_data.temp_retorno) : null,
          temp_exterior: data.it3_data.temp_exterior ? Number(data.it3_data.temp_exterior) : null,
          presion_alta: data.it3_data.presion_alta ? Number(data.it3_data.presion_alta) : null,
          presion_baja: data.it3_data.presion_baja ? Number(data.it3_data.presion_baja) : null,
          consumo_electrico: data.it3_data.consumo_electrico ? Number(data.it3_data.consumo_electrico) : null,
          caudal_aire: data.it3_data.caudal_aire ? Number(data.it3_data.caudal_aire) : null,
          humedad_relativa: data.it3_data.humedad_relativa ? Number(data.it3_data.humedad_relativa) : null,
        },
      };
      
      if (isEditing) {
        return base44.entities.Revision.update(revisionId, cleanData);
      }
      
      // Actualizar fecha de última revisión del equipo
      if (data.equipment_id) {
        await base44.entities.Equipment.update(data.equipment_id, {
          last_revision_date: data.revision_date,
          next_revision_date: data.next_revision_date || null,
          status: data.general_status === 'critical' ? 'out_of_service' : 
                  data.general_status === 'needs_repair' ? 'maintenance_needed' : 'operational',
        });
      }
      
      return base44.entities.Revision.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success(isEditing ? 'Revisión actualizada' : 'Revisión creada');
      if (formData.equipment_id) {
        navigate(createPageUrl(`EquipmentDetail?id=${formData.equipment_id}`));
      } else {
        navigate(-1);
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
      it3_data: { ...prev.it3_data, [field]: value },
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), result.file_url],
      }));
      toast.success('Foto subida');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
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
                    <SelectItem value="it3_rite">IT3 RITE</SelectItem>
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
                <Input
                  value={formData.technician_name}
                  onChange={(e) => handleChange('technician_name', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {(formData.revision_type === 'it3_rite' || formData.revision_type === 'preventive') && (
            <Card className="p-6 bg-white border-0 shadow-sm mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">
                Datos IT3 RITE
                {equipmentType && <span className="text-sm font-normal text-slate-500 ml-2">({equipmentType})</span>}
              </h3>
              
              {enabledFields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {enabledFields.map(field => (
                    <div key={field.field_key}>
                      <Label>{field.field_label}</Label>
                      {field.field_type === 'number' && (
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data[field.field_key] || ''}
                          onChange={(e) => handleIT3Change(field.field_key, e.target.value)}
                          className="mt-1"
                        />
                      )}
                      {field.field_type === 'text' && (
                        <Input
                          value={formData.it3_data[field.field_key] || ''}
                          onChange={(e) => handleIT3Change(field.field_key, e.target.value)}
                          className="mt-1"
                        />
                      )}
                      {field.field_type === 'select' && (
                        <Select 
                          value={formData.it3_data[field.field_key] || ''} 
                          onValueChange={(v) => handleIT3Change(field.field_key, v)}
                        >
                          <SelectTrigger className="mt-1">
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
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id={field.field_key}
                            checked={formData.it3_data[field.field_key] || false}
                            onCheckedChange={(v) => handleIT3Change(field.field_key, v)}
                          />
                          <Label htmlFor={field.field_key} className="text-sm text-slate-600">Sí</Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Tabs defaultValue="temperatures" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="temperatures">Temperaturas</TabsTrigger>
                    <TabsTrigger value="pressures">Presiones</TabsTrigger>
                    <TabsTrigger value="status">Estado</TabsTrigger>
                  </TabsList>

                  <TabsContent value="temperatures" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Temp. Impulsión (°C)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.temp_impulsion}
                          onChange={(e) => handleIT3Change('temp_impulsion', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Temp. Retorno (°C)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.temp_retorno}
                          onChange={(e) => handleIT3Change('temp_retorno', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Temp. Exterior (°C)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.temp_exterior}
                          onChange={(e) => handleIT3Change('temp_exterior', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Humedad Relativa (%)</Label>
                        <Input
                          type="number"
                          value={formData.it3_data.humedad_relativa}
                          onChange={(e) => handleIT3Change('humedad_relativa', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Caudal de Aire (m³/h)</Label>
                        <Input
                          type="number"
                          value={formData.it3_data.caudal_aire}
                          onChange={(e) => handleIT3Change('caudal_aire', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Consumo Eléctrico (kW)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.consumo_electrico}
                          onChange={(e) => handleIT3Change('consumo_electrico', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pressures" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Presión Alta (bar)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.presion_alta}
                          onChange={(e) => handleIT3Change('presion_alta', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Presión Baja (bar)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.it3_data.presion_baja}
                          onChange={(e) => handleIT3Change('presion_baja', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="status" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Estado de Filtros</Label>
                        <Select 
                          value={formData.it3_data.estado_filtros} 
                          onValueChange={(v) => handleIT3Change('estado_filtros', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bueno">Bueno</SelectItem>
                            <SelectItem value="aceptable">Aceptable</SelectItem>
                            <SelectItem value="sucio">Sucio</SelectItem>
                            <SelectItem value="cambiar">Requiere cambio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estado de Correas</Label>
                        <Select 
                          value={formData.it3_data.estado_correas} 
                          onValueChange={(v) => handleIT3Change('estado_correas', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bueno">Bueno</SelectItem>
                            <SelectItem value="desgastado">Desgastado</SelectItem>
                            <SelectItem value="cambiar">Requiere cambio</SelectItem>
                            <SelectItem value="na">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nivel de Aceite</Label>
                        <Select 
                          value={formData.it3_data.nivel_aceite} 
                          onValueChange={(v) => handleIT3Change('nivel_aceite', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="correcto">Correcto</SelectItem>
                            <SelectItem value="bajo">Bajo</SelectItem>
                            <SelectItem value="na">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estado Aislamiento</Label>
                        <Select 
                          value={formData.it3_data.estado_aislamiento} 
                          onValueChange={(v) => handleIT3Change('estado_aislamiento', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bueno">Bueno</SelectItem>
                            <SelectItem value="deteriorado">Deteriorado</SelectItem>
                            <SelectItem value="reparar">Requiere reparación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Limpieza Unidad</Label>
                        <Select 
                          value={formData.it3_data.limpieza_unidad} 
                          onValueChange={(v) => handleIT3Change('limpieza_unidad', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="limpia">Limpia</SelectItem>
                            <SelectItem value="aceptable">Aceptable</SelectItem>
                            <SelectItem value="sucia">Sucia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Vibraciones</Label>
                        <Select 
                          value={formData.it3_data.vibraciones} 
                          onValueChange={(v) => handleIT3Change('vibraciones', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normales">Normales</SelectItem>
                            <SelectItem value="elevadas">Elevadas</SelectItem>
                            <SelectItem value="excesivas">Excesivas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="fugas"
                          checked={formData.it3_data.fugas_refrigerante}
                          onCheckedChange={(v) => handleIT3Change('fugas_refrigerante', v)}
                        />
                        <Label htmlFor="fugas">Fugas de refrigerante detectadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="ruidos"
                          checked={formData.it3_data.ruidos_anomalos}
                          onCheckedChange={(v) => handleIT3Change('ruidos_anomalos', v)}
                        />
                        <Label htmlFor="ruidos">Ruidos anómalos</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
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
            <h3 className="font-semibold text-slate-800 mb-4">Fotos</h3>
            <div className="flex flex-wrap gap-4">
              {formData.photos?.map((photo, index) => (
                <div key={index} className="relative">
                  <img 
                    src={photo} 
                    alt={`Foto ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-slate-400" />
                  )}
                </div>
              </label>
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