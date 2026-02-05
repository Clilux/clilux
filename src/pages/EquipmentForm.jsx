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
import { Loader2, Save, Upload, Camera } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const defaultEquipmentTypes = [
  { value: 'split_mural', label: 'Split Mural' },
  { value: 'split_cassette', label: 'Split Cassette' },
  { value: 'split_conductos', label: 'Split Conductos' },
  { value: 'climatizador', label: 'Climatizador' },
  { value: 'enfriadora', label: 'Enfriadora' },
  { value: 'caldera', label: 'Caldera' },
  { value: 'bomba_calor', label: 'Bomba de calor' },
  { value: 'vrf', label: 'VRF / Caudal Variable' },
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
    building_id: preselectedBuildingId || urlParams.get('building_id') || '',
    client_id: preselectedClientId || urlParams.get('client_id') || '',
    equipment_type: urlParams.get('equipment_type') || '',
    brand: urlParams.get('brand') || '',
    model: urlParams.get('model') || '',
    serial_number: urlParams.get('serial_number') || '',
    location: urlParams.get('location') || '',
    installation_date: urlParams.get('installation_date') || '',
    cooling_power_kw: urlParams.get('cooling_power_kw') || '',
    heating_power_kw: urlParams.get('heating_power_kw') || '',
    refrigerant_type: urlParams.get('refrigerant_type') || '',
    refrigerant_charge_kg: urlParams.get('refrigerant_charge_kg') || '',
    warranty_end: urlParams.get('warranty_end') || '',
    next_revision_date: urlParams.get('next_revision_date') || '',
    notes: urlParams.get('notes') || '',
    photo_url: urlParams.get('photo_url') || '',
    status: 'operational',
  });

  const [uploading, setUploading] = useState(false);
  const [extractingData, setExtractingData] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    },
  });

  // Combine default types with custom types from settings
  const equipmentTypes = [
    ...defaultEquipmentTypes,
    ...(settings?.equipment_types || []).map(t => ({ value: t, label: t })),
  ];

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
        navigate(createPageUrl('Equipment'));
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

  const handleTechSheetPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingData(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      toast.success('Analizando ficha técnica...');

      const extractResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae los datos técnicos de esta ficha de equipo de climatización. 
        Identifica: marca, modelo, número de serie, tipo de equipo, potencia frigorífica (kW), 
        potencia calorífica (kW), tipo de refrigerante, carga de refrigerante (kg), 
        fecha de instalación, ubicación, y cualquier otra información técnica relevante.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            brand: { type: "string" },
            model: { type: "string" },
            serial_number: { type: "string" },
            equipment_type: { type: "string" },
            cooling_power_kw: { type: "number" },
            heating_power_kw: { type: "number" },
            refrigerant_type: { type: "string" },
            refrigerant_charge_kg: { type: "number" },
            installation_date: { type: "string" },
            location: { type: "string" },
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        brand: extractResult.brand || prev.brand,
        model: extractResult.model || prev.model,
        serial_number: extractResult.serial_number || prev.serial_number,
        equipment_type: extractResult.equipment_type || prev.equipment_type,
        cooling_power_kw: extractResult.cooling_power_kw || prev.cooling_power_kw,
        heating_power_kw: extractResult.heating_power_kw || prev.heating_power_kw,
        refrigerant_type: extractResult.refrigerant_type || prev.refrigerant_type,
        refrigerant_charge_kg: extractResult.refrigerant_charge_kg || prev.refrigerant_charge_kg,
        installation_date: extractResult.installation_date || prev.installation_date,
        location: extractResult.location || prev.location,
        photo_url: uploadResult.file_url,
      }));

      toast.success('Datos extraídos correctamente');
    } catch (error) {
      toast.error('Error al analizar la ficha técnica');
    } finally {
      setExtractingData(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Equipo' : 'Nuevo Equipo'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Captura de Ficha Técnica */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 mb-1">Capturar Ficha Técnica</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Sube una foto de la ficha técnica del equipo para auto-rellenar los datos
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleTechSheetPhoto}
                    className="hidden"
                    id="tech-sheet-upload"
                  />
                  <label htmlFor="tech-sheet-upload">
                    <Button type="button" variant="outline" asChild disabled={extractingData}>
                      <span className="bg-white">
                        {extractingData ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analizando...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Capturar Ficha
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
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
                onClick={() => {
                  if (formData.building_id) {
                    navigate(createPageUrl(`BuildingDetail?id=${formData.building_id}`));
                  } else {
                    navigate(createPageUrl('Equipment'));
                  }
                }}
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