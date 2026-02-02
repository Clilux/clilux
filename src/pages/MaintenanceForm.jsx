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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, X } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const maintenanceTypes = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'corrective', label: 'Correctivo' },
];

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('equipment_id');
  const recordId = urlParams.get('id');
  const isEditing = !!recordId;

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    equipment_id: equipmentId || '',
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: 'monthly',
    technician_email: '',
    technician_name: '',
    status: 'completed',
    form_data: {},
    observations: '',
    actions_taken: '',
    next_maintenance_date: '',
    photos: [],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (!isEditing) {
          setFormData(prev => ({
            ...prev,
            technician_email: currentUser.email,
            technician_name: currentUser.full_name || currentUser.email,
          }));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, [isEditing]);

  const { data: equipment } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0] || null;
    },
    enabled: !!equipmentId,
  });

  // Get fields based on maintenance type from equipment config
  const maintenanceConfig = equipment?.maintenance_config || {};
  const configFields = maintenanceConfig[`${formData.maintenance_type}_fields`] || [];

  useEffect(() => {
    if (recordId) {
      const loadRecord = async () => {
        const records = await base44.entities.MaintenanceRecord.filter({ id: recordId });
        if (records.length > 0) {
          setFormData(records[0]);
        }
      };
      loadRecord();
    }
  }, [recordId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        building_id: equipment?.building_id,
        client_id: equipment?.client_id,
      };
      if (isEditing) {
        return base44.entities.MaintenanceRecord.update(recordId, cleanData);
      }
      return base44.entities.MaintenanceRecord.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      toast.success(isEditing ? 'Registro actualizado' : 'Mantenimiento registrado');
      navigate(createPageUrl(`EquipmentDetail?id=${equipmentId}`));
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormDataChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      form_data: { ...prev.form_data, [key]: value },
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('photos', [...(formData.photos || []), result.file_url]);
      toast.success('Foto subida');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    handleChange('photos', formData.photos.filter((_, i) => i !== index));
  };

  const renderField = (field) => {
    const value = formData.form_data[field.key] || '';
    
    switch (field.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFormDataChange(field.key, e.target.value)}
            className="mt-1"
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(v) => handleFormDataChange(field.key, v)}
            />
            <span className="text-sm text-slate-600">Sí</span>
          </div>
        );
      case 'select':
        const options = (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
        return (
          <Select value={value} onValueChange={(v) => handleFormDataChange(field.key, v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFormDataChange(field.key, e.target.value)}
            className="mt-1"
            rows={3}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFormDataChange(field.key, e.target.value)}
            className="mt-1"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {equipment && (
              <div className="p-4 rounded-lg bg-slate-50 mb-4">
                <p className="text-sm text-slate-500">Equipo</p>
                <p className="font-medium text-slate-800">{equipment.brand} {equipment.model}</p>
                <p className="text-sm text-slate-500">{equipment.location}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fecha del mantenimiento *</Label>
                <Input
                  type="date"
                  value={formData.maintenance_date}
                  onChange={(e) => handleChange('maintenance_date', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tipo de mantenimiento *</Label>
                <Select value={formData.maintenance_type} onValueChange={(v) => handleChange('maintenance_type', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Técnico</Label>
                <Input
                  value={formData.technician_name}
                  onChange={(e) => handleChange('technician_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Próximo mantenimiento</Label>
                <Input
                  type="date"
                  value={formData.next_maintenance_date}
                  onChange={(e) => handleChange('next_maintenance_date', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Dynamic fields from equipment config */}
            {configFields.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-800 mb-4">
                  Campos del formulario {maintenanceTypes.find(t => t.value === formData.maintenance_type)?.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {configFields.map((field, index) => (
                    <div key={index}>
                      <Label>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <div className="space-y-4">
                <div>
                  <Label>Observaciones</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => handleChange('observations', e.target.value)}
                    className="mt-1"
                    rows={3}
                    placeholder="Observaciones del mantenimiento..."
                  />
                </div>
                <div>
                  <Label>Acciones realizadas</Label>
                  <Textarea
                    value={formData.actions_taken}
                    onChange={(e) => handleChange('actions_taken', e.target.value)}
                    className="mt-1"
                    rows={3}
                    placeholder="Describe las acciones realizadas..."
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <Label>Fotos</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(formData.photos || []).map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="h-20 w-20 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Upload className="h-5 w-5 text-slate-400" />}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-slate-800 hover:bg-slate-700">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isEditing ? 'Guardar Cambios' : 'Registrar Mantenimiento'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}