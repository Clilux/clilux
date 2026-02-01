import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const equipmentTypes = [
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
];

const defaultFields = [
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
  { field_key: 'temp_agua_entrada', field_label: 'Temp. Agua Entrada (°C)', field_type: 'number', enabled: false },
  { field_key: 'temp_agua_salida', field_label: 'Temp. Agua Salida (°C)', field_type: 'number', enabled: false },
  { field_key: 'caudal_agua', field_label: 'Caudal Agua (l/h)', field_type: 'number', enabled: false },
  { field_key: 'estado_quemador', field_label: 'Estado del Quemador', field_type: 'select', options: ['bueno', 'ajustar', 'reparar'], enabled: false },
  { field_key: 'analisis_combustion', field_label: 'Análisis de Combustión', field_type: 'text', enabled: false },
];

export default function RevisionFieldSettings() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('split_mural');
  const [fields, setFields] = useState([]);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['revision-field-configs'],
    queryFn: () => base44.entities.RevisionFieldConfig.list(),
  });

  useEffect(() => {
    const existingConfig = configs.find(c => c.equipment_type === selectedType);
    if (existingConfig) {
      setFields(existingConfig.fields);
    } else {
      // Configuración por defecto según el tipo
      let enabledByDefault = [...defaultFields];
      
      // Personalizar según tipo de equipo
      if (selectedType === 'caldera') {
        enabledByDefault = defaultFields.map(f => ({
          ...f,
          enabled: ['temp_impulsion', 'temp_retorno', 'consumo_electrico', 'estado_quemador', 'analisis_combustion', 'estado_aislamiento', 'limpieza_unidad'].includes(f.field_key)
        }));
      } else if (selectedType === 'enfriadora') {
        enabledByDefault = defaultFields.map(f => ({
          ...f,
          enabled: ['temp_impulsion', 'temp_retorno', 'temp_exterior', 'presion_alta', 'presion_baja', 'consumo_electrico', 'fugas_refrigerante', 'nivel_aceite', 'vibraciones', 'ruidos_anomalos', 'temp_agua_entrada', 'temp_agua_salida'].includes(f.field_key)
        }));
      } else if (selectedType === 'split_mural' || selectedType === 'split_cassette') {
        enabledByDefault = defaultFields.map(f => ({
          ...f,
          enabled: ['temp_impulsion', 'temp_retorno', 'estado_filtros', 'fugas_refrigerante', 'ruidos_anomalos', 'limpieza_unidad'].includes(f.field_key)
        }));
      }
      
      setFields(enabledByDefault);
    }
  }, [selectedType, configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingConfig = configs.find(c => c.equipment_type === selectedType);
      if (existingConfig) {
        return base44.entities.RevisionFieldConfig.update(existingConfig.id, {
          equipment_type: selectedType,
          fields: fields,
        });
      }
      return base44.entities.RevisionFieldConfig.create({
        equipment_type: selectedType,
        fields: fields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-field-configs'] });
      toast.success('Configuración guardada');
    },
  });

  const toggleField = (index) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, enabled: !f.enabled } : f));
  };

  const addCustomField = () => {
    setFields(prev => [...prev, {
      field_key: `custom_${Date.now()}`,
      field_label: 'Nuevo campo',
      field_type: 'text',
      enabled: true,
      custom: true,
    }]);
  };

  const updateField = (index, key, value) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const removeField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Configurar Campos de Revisión" />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Label>Tipo de Equipo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-64 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCustomField} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Añadir campo
            </Button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Activa o desactiva los campos que aparecerán en el formulario de revisión para este tipo de equipo.
          </p>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.field_key} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                <Switch
                  checked={field.enabled}
                  onCheckedChange={() => toggleField(index)}
                />
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <Input
                    value={field.field_label}
                    onChange={(e) => updateField(index, 'field_label', e.target.value)}
                    className="bg-white"
                    placeholder="Etiqueta"
                  />
                  <Select value={field.field_type} onValueChange={(v) => updateField(index, 'field_type', v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Selección</SelectItem>
                      <SelectItem value="checkbox">Casilla</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.field_type === 'select' && (
                    <Input
                      value={field.options?.join(', ') || ''}
                      onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                      className="bg-white"
                      placeholder="Opciones (separadas por coma)"
                    />
                  )}
                </div>
                {field.custom && (
                  <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-slate-800 hover:bg-slate-700">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}