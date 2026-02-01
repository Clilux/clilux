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
import { Loader2, Save, Upload } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const equipmentTypes = [
  { value: 'climatizador', label: 'Climatizador' },
  { value: 'enfriadora', label: 'Enfriadora' },
  { value: 'caldera', label: 'Caldera' },
  { value: 'bomba_calor', label: 'Bomba de calor' },
  { value: 'split', label: 'Split' },
  { value: 'vrf', label: 'VRF' },
  { value: 'fancoil', label: 'Fancoil' },
  { value: 'uta', label: 'UTA' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'torre_refrigeracion', label: 'Torre de refrigeración' },
  { value: 'otro', label: 'Otro' },
];

export default function EquipmentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  const preselectedBuildingId = urlParams.get('building_id');
  const preselectedClientId = urlParams.get('client_id');
  const isEditing = !!equipmentId;

  const [formData, setFormData] = useState({
    building_id: preselectedBuildingId || '',
    client_id: preselectedClientId || '',
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    installation_date: '',
    cooling_power_kw: '',
    heating_power_kw: '',
    refrigerant_type: '',
    refrigerant_charge_kg: '',
    warranty_end: '',
    next_revision_date: '',
    notes: '',
    photo_url: '',
    status: 'operational',
  });

  const [uploading, setUploading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const filteredBuildings = formData.client_id 
    ? buildings.filter(b => b.client_id === formData.client_id)
    : buildings;

  useEffect(() => {
    if (equipmentId) {
      const loadEquipment = async () => {
        const equipment = await base44.entities.Equipment.filter({ id: equipmentId });
        if (equipment.length > 0) {
          setFormData(equipment[0]);
        }
      };
      loadEquipment();
    }
  }, [equipmentId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        cooling_power_kw: data.cooling_power_kw ? Number(data.cooling_power_kw) : null,
        heating_power_kw: data.heating_power_kw ? Number(data.heating_power_kw) : null,
        refrigerant_charge_kg: data.refrigerant_charge_kg ? Number(data.refrigerant_charge_kg) : null,
      };
      if (isEditing) {
        return base44.entities.Equipment.update(equipmentId, cleanData);
      }
      return base44.entities.Equipment.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success(isEditing ? 'Equipo actualizado' : 'Equipo creado');
      if (formData.building_id) {
        navigate(createPageUrl(`BuildingDetail?id=${formData.building_id}`));
      } else {
        navigate(-1);
      }
    },
    onError: (error) => {
      toast.error('Error al guardar el equipo');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('photo_url', result.file_url);
      toast.success('Foto subida correctamente');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Equipo' : 'Nuevo Equipo'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!preselectedClientId && (
                <div>
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={(v) => {
                      handleChange('client_id', v);
                      handleChange('building_id', '');
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

              <div>
                <Label htmlFor="building_id">Edificio *</Label>
                <Select 
                  value={formData.building_id} 
                  onValueChange={(v) => handleChange('building_id', v)}
                  disabled={!!preselectedBuildingId}
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

              <div>
                <Label htmlFor="equipment_type">Tipo de Equipo *</Label>
                <Select 
                  value={formData.equipment_type} 
                  onValueChange={(v) => handleChange('equipment_type', v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operativo</SelectItem>
                    <SelectItem value="maintenance_needed">Requiere mantenimiento</SelectItem>
                    <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="serial_number">Número de Serie</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => handleChange('serial_number', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="mt-1"
                  placeholder="Ej: Cubierta, Planta 1, Sala de máquinas..."
                />
              </div>

              <div>
                <Label htmlFor="installation_date">Fecha de Instalación</Label>
                <Input
                  id="installation_date"
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => handleChange('installation_date', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="warranty_end">Fin de Garantía</Label>
                <Input
                  id="warranty_end"
                  type="date"
                  value={formData.warranty_end}
                  onChange={(e) => handleChange('warranty_end', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cooling_power_kw">Potencia Frigorífica (kW)</Label>
                <Input
                  id="cooling_power_kw"
                  type="number"
                  step="0.1"
                  value={formData.cooling_power_kw}
                  onChange={(e) => handleChange('cooling_power_kw', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="heating_power_kw">Potencia Calorífica (kW)</Label>
                <Input
                  id="heating_power_kw"
                  type="number"
                  step="0.1"
                  value={formData.heating_power_kw}
                  onChange={(e) => handleChange('heating_power_kw', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="refrigerant_type">Tipo de Refrigerante</Label>
                <Input
                  id="refrigerant_type"
                  value={formData.refrigerant_type}
                  onChange={(e) => handleChange('refrigerant_type', e.target.value)}
                  className="mt-1"
                  placeholder="Ej: R-410A, R-32..."
                />
              </div>

              <div>
                <Label htmlFor="refrigerant_charge_kg">Carga Refrigerante (kg)</Label>
                <Input
                  id="refrigerant_charge_kg"
                  type="number"
                  step="0.1"
                  value={formData.refrigerant_charge_kg}
                  onChange={(e) => handleChange('refrigerant_charge_kg', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="next_revision_date">Próxima Revisión</Label>
                <Input
                  id="next_revision_date"
                  type="date"
                  value={formData.next_revision_date}
                  onChange={(e) => handleChange('next_revision_date', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Foto del Equipo</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Subir foto
                      </span>
                    </Button>
                  </label>
                  {formData.photo_url && (
                    <img 
                      src={formData.photo_url} 
                      alt="Equipo" 
                      className="mt-2 h-24 w-24 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
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
                {isEditing ? 'Guardar Cambios' : 'Crear Equipo'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}