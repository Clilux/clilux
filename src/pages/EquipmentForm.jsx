import React, { useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, Plus, Camera, ArrowLeft, ArrowRight } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

// Campos según RITE-IT3 por tipo de equipo
const camposIDAE = {
  caldera: {
    identificacion: [
      { key: 'marca', label: 'Marca *', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
      { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
      { key: 'potencia_nominal', label: 'Potencia nominal (kW) *', type: 'number', required: true },
      { key: 'tipo_combustible', label: 'Tipo combustible *', type: 'select', options: ['Gas natural', 'Gasóleo', 'Biomasa', 'GLP'], required: true },
      { key: 'año_fabricacion', label: 'Año fabricación *', type: 'number', required: true },
      { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    ],
    parametros: [
      { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'temp_retorno', label: 'Temperatura retorno (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'presion_circuito', label: 'Presión circuito (bar)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'temp_humos', label: 'Temp. humos (°C)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'co2_humos', label: 'CO2 humos (%)', type: 'number', periods: ['anual'] },
      { key: 'co_humos', label: 'CO humos (ppm)', type: 'number', periods: ['anual'] },
      { key: 'opacidad_humos', label: 'Opacidad humos (Bacharach)', type: 'number', periods: ['anual'] },
      { key: 'rendimiento_combustion', label: 'Rendimiento combustión (%)', type: 'number', periods: ['anual'] },
      { key: 'estado_quemador', label: 'Estado quemador', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión', 'Cambiar'], periods: ['trimestral', 'anual'] },
      { key: 'estado_intercambiador', label: 'Estado intercambiador', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión', 'Cambiar'], periods: ['anual'] },
      { key: 'limpieza_realizada', label: 'Limpieza realizada', type: 'checkbox', periods: ['anual'] },
    ]
  },
  enfriadora: {
    identificacion: [
      { key: 'marca', label: 'Marca *', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
      { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
      { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW) *', type: 'number', required: true },
      { key: 'tipo_refrigerante', label: 'Tipo refrigerante *', type: 'text', required: true },
      { key: 'carga_refrigerante', label: 'Carga refrigerante (kg) *', type: 'number', required: true },
      { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    ],
    parametros: [
      { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'temp_retorno', label: 'Temperatura retorno (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'temp_condensacion', label: 'Temp. condensación (°C)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'temp_evaporacion', label: 'Temp. evaporación (°C)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'consumo_electrico', label: 'Consumo eléctrico (kW)', type: 'number', periods: ['trimestral', 'anual'] },
      { key: 'eer', label: 'EER', type: 'number', periods: ['anual'] },
      { key: 'estado_compresor', label: 'Estado compresor', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión', 'Cambiar'], periods: ['trimestral', 'anual'] },
      { key: 'fugas_refrigerante', label: 'Fugas refrigerante detectadas', type: 'checkbox', periods: ['trimestral', 'anual'] },
      { key: 'limpieza_condensador', label: 'Limpieza condensador', type: 'checkbox', periods: ['trimestral', 'anual'] },
    ]
  },
  split: {
    identificacion: [
      { key: 'marca', label: 'Marca *', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
      { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
      { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW) *', type: 'number', required: true },
      { key: 'potencia_calorifica', label: 'Potencia calorífica (kW)', type: 'number', required: false },
      { key: 'tipo_refrigerante', label: 'Tipo refrigerante *', type: 'text', required: true },
      { key: 'carga_refrigerante', label: 'Carga refrigerante (kg)', type: 'number', required: false },
      { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    ],
    parametros: [
      { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'consumo_electrico', label: 'Consumo eléctrico (kW)', type: 'number', periods: ['trimestral', 'anual'] },
      { key: 'estado_filtros', label: 'Estado filtros', type: 'select', options: ['Limpios', 'Sucios', 'Cambiados'], periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'estado_drenaje', label: 'Estado drenaje', type: 'select', options: ['Correcto', 'Obstruido', 'Limpiado'], periods: ['trimestral', 'anual'] },
      { key: 'limpieza_unidad', label: 'Limpieza unidad realizada', type: 'checkbox', periods: ['trimestral', 'anual'] },
    ]
  },
  vrf: {
    identificacion: [
      { key: 'marca', label: 'Marca *', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
      { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
      { key: 'potencia_total', label: 'Potencia total (kW) *', type: 'number', required: true },
      { key: 'tipo_refrigerante', label: 'Tipo refrigerante *', type: 'text', required: true },
      { key: 'carga_refrigerante', label: 'Carga refrigerante (kg) *', type: 'number', required: true },
      { key: 'num_unidades_interiores', label: 'Nº unidades interiores', type: 'number', required: false },
      { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    ],
    parametros: [
      { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
      { key: 'consumo_total', label: 'Consumo eléctrico total (kW)', type: 'number', periods: ['trimestral', 'anual'] },
      { key: 'estado_compresores', label: 'Estado compresores', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión'], periods: ['trimestral', 'anual'] },
      { key: 'fugas_refrigerante', label: 'Fugas refrigerante detectadas', type: 'checkbox', periods: ['trimestral', 'anual'] },
      { key: 'limpieza_unidades', label: 'Limpieza unidades', type: 'checkbox', periods: ['trimestral', 'anual'] },
    ]
  },
  climatizador: {
    identificacion: [
      { key: 'marca', label: 'Marca *', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
      { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
      { key: 'caudal_nominal', label: 'Caudal nominal (m³/h) *', type: 'number', required: true },
      { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW)', type: 'number', required: false },
      { key: 'potencia_calorifica', label: 'Potencia calorífica (kW)', type: 'number', required: false },
      { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    ],
    parametros: [
      { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'temp_retorno', label: 'Temperatura retorno (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'humedad_relativa', label: 'Humedad relativa (%)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'caudal_aire', label: 'Caudal aire (m³/h)', type: 'number', periods: ['trimestral', 'anual'] },
      { key: 'estado_filtros', label: 'Estado filtros', type: 'select', options: ['Limpios', 'Sucios', 'Cambiados'], periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
      { key: 'estado_baterias', label: 'Estado baterías', type: 'select', options: ['Bueno', 'Aceptable', 'Limpieza necesaria'], periods: ['trimestral', 'anual'] },
      { key: 'estado_correas', label: 'Estado correas', type: 'select', options: ['Bueno', 'Desgastado', 'Cambiado'], periods: ['trimestral', 'anual'] },
      { key: 'limpieza_realizada', label: 'Limpieza completa realizada', type: 'checkbox', periods: ['anual'] },
    ]
  }
};

const periodicidades = [
  { value: 'mensual', label: 'Mensual', months: 1 },
  { value: 'trimestral', label: 'Trimestral', months: 3 },
  { value: 'semestral', label: 'Semestral', months: 6 },
  { value: 'anual', label: 'Anual', months: 12 },
];

export default function EquipmentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewBuildingDialog, setShowNewBuildingDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', cif: '', city: '' });
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '' });

  const [formData, setFormData] = useState({
    // Paso 1: Datos técnicos
    equipment_type: '',
    technical_data: {},
    registration_date: new Date().toISOString().split('T')[0],
    status: 'operational',
    
    // Paso 2: Cliente y edificio
    client_id: '',
    building_id: '',
    
    // Paso 3: Configuración de mantenimiento
    selected_periods: [],
    maintenance_fields: [],
    
    // Paso 4: Primera revisión
    first_revision_date: new Date().toISOString().split('T')[0],
    starting_period: '',
  });

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

  const equipmentFields = formData.equipment_type ? camposIDAE[formData.equipment_type] : null;

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormData(prev => ({ ...prev, client_id: data.id }));
      setShowNewClientDialog(false);
      toast.success('Cliente creado');
    },
  });

  const createBuildingMutation = useMutation({
    mutationFn: (data) => base44.entities.Building.create({ ...data, client_id: formData.client_id }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setFormData(prev => ({ ...prev, building_id: data.id }));
      setShowNewBuildingDialog(false);
      toast.success('Edificio creado');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Crear equipo
      const equipmentData = {
        client_id: data.client_id,
        building_id: data.building_id,
        equipment_type: data.equipment_type,
        brand: data.technical_data.marca || '',
        model: data.technical_data.modelo || '',
        serial_number: data.technical_data.numero_serie || '',
        location: data.technical_data.ubicacion || '',
        cooling_power_kw: data.technical_data.potencia_frigorifica || data.technical_data.potencia_nominal || null,
        heating_power_kw: data.technical_data.potencia_calorifica || null,
        refrigerant_type: data.technical_data.tipo_refrigerante || '',
        refrigerant_charge_kg: data.technical_data.carga_refrigerante || null,
        technical_data: data.technical_data,
        registration_date: data.registration_date,
        status: data.status,
        first_revision_date: data.first_revision_date,
        maintenance_config: {
          monthly_enabled: data.selected_periods.includes('mensual'),
          monthly_fields: data.maintenance_fields.filter(f => f.periods.includes('mensual')),
          quarterly_enabled: data.selected_periods.includes('trimestral'),
          quarterly_fields: data.maintenance_fields.filter(f => f.periods.includes('trimestral')),
          biannual_enabled: data.selected_periods.includes('semestral'),
          biannual_fields: data.maintenance_fields.filter(f => f.periods.includes('semestral')),
          annual_enabled: data.selected_periods.includes('anual'),
          annual_fields: data.maintenance_fields.filter(f => f.periods.includes('anual')),
        }
      };

      const equipment = await base44.entities.Equipment.create(equipmentData);

      // Generar revisiones programadas para el año
      const scheduledRevisions = [];
      const firstDate = new Date(data.first_revision_date);
      
      for (let i = 0; i < 12; i++) {
        const currentDate = new Date(firstDate);
        currentDate.setMonth(firstDate.getMonth() + i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Mensual
        if (data.selected_periods.includes('mensual')) {
          scheduledRevisions.push({
            equipment_id: equipment.id,
            client_id: data.client_id,
            building_id: data.building_id,
            scheduled_date: dateStr,
            revision_type: 'monthly',
            status: 'pending'
          });
        }
        
        // Trimestral (cada 3 meses)
        if (data.selected_periods.includes('trimestral') && i % 3 === 0) {
          scheduledRevisions.push({
            equipment_id: equipment.id,
            client_id: data.client_id,
            building_id: data.building_id,
            scheduled_date: dateStr,
            revision_type: 'quarterly',
            status: 'pending'
          });
        }
        
        // Semestral (cada 6 meses)
        if (data.selected_periods.includes('semestral') && i % 6 === 0) {
          scheduledRevisions.push({
            equipment_id: equipment.id,
            client_id: data.client_id,
            building_id: data.building_id,
            scheduled_date: dateStr,
            revision_type: 'biannual',
            status: 'pending'
          });
        }
        
        // Anual (una vez)
        if (data.selected_periods.includes('anual') && i === 0) {
          scheduledRevisions.push({
            equipment_id: equipment.id,
            client_id: data.client_id,
            building_id: data.building_id,
            scheduled_date: dateStr,
            revision_type: 'annual',
            status: 'pending'
          });
        }
      }
      
      // Crear todas las revisiones programadas
      if (scheduledRevisions.length > 0) {
        await base44.entities.ScheduledRevision.bulkCreate(scheduledRevisions);
      }

      return equipment;
    },
    onSuccess: (equipment) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      toast.success('Equipo creado y revisiones programadas');
      navigate(createPageUrl(`EquipmentDetail?id=${equipment.id}`));
    },
    onError: () => {
      toast.error('Error al crear el equipo');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechnicalDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      technical_data: { ...prev.technical_data, [field]: value }
    }));
  };

  const handleToggleField = (field) => {
    setFormData(prev => {
      const exists = prev.maintenance_fields.find(f => f.field_key === field.key);
      if (exists) {
        return {
          ...prev,
          maintenance_fields: prev.maintenance_fields.filter(f => f.field_key !== field.key)
        };
      } else {
        return {
          ...prev,
          maintenance_fields: [...prev.maintenance_fields, {
            field_key: field.key,
            field_label: field.label,
            field_type: field.type,
            options: field.options,
            periods: field.periods,
          }]
        };
      }
    });
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  const canProceedStep1 = formData.equipment_type && equipmentFields?.identificacion.every(field => 
    !field.required || formData.technical_data[field.key]
  );
  const canProceedStep2 = formData.client_id && formData.building_id;
  const canProceedStep3 = formData.selected_periods.length > 0 && formData.maintenance_fields.length > 0;
  const canProceedStep4 = formData.first_revision_date && formData.starting_period;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Crear Equipo" />

        {/* Progress */}
        <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-center justify-between">
            {['Datos Técnicos', 'Cliente y Edificio', 'Periodicidad', 'Programar'].map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step > idx + 1 ? 'bg-green-500' : step === idx + 1 ? 'bg-blue-500' : 'bg-white/20'
                }`}>
                  <span className="text-white text-sm font-medium">{idx + 1}</span>
                </div>
                <span className="text-white text-sm hidden md:block">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Step 1: Datos Técnicos */}
        {step === 1 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Datos Técnicos del Equipo</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Tipo de Equipo según RITE *</Label>
                <Select value={formData.equipment_type} onValueChange={(v) => handleChange('equipment_type', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caldera">Caldera</SelectItem>
                    <SelectItem value="enfriadora">Enfriadora</SelectItem>
                    <SelectItem value="split">Split / Multi-split</SelectItem>
                    <SelectItem value="vrf">VRF / VRV</SelectItem>
                    <SelectItem value="climatizador">Climatizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Fecha de Registro *</Label>
                  <Input
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => handleChange('registration_date', e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Estado del Equipo *</Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operativo</SelectItem>
                      <SelectItem value="maintenance_needed">Requiere mantenimiento</SelectItem>
                      <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {equipmentFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {equipmentFields.identificacion.map(field => (
                    <div key={field.key}>
                      <Label className="text-slate-300">{field.label}</Label>
                      {field.type === 'select' ? (
                        <Select
                          value={formData.technical_data[field.key] || ''}
                          onValueChange={(v) => handleTechnicalDataChange(field.key, v)}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type}
                          value={formData.technical_data[field.key] || ''}
                          onChange={(e) => handleTechnicalDataChange(field.key, e.target.value)}
                          className="bg-white/5 border-white/20 text-white"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleNext} disabled={!canProceedStep1} className="bg-blue-600">
                <ArrowRight className="h-4 w-4 mr-2" />
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Cliente y Edificio */}
        {step === 2 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Cliente y Edificio</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={formData.client_id} onValueChange={(v) => {
                    handleChange('client_id', v);
                    handleChange('building_id', '');
                  }}>
                    <SelectTrigger className="flex-1 bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" onClick={() => setShowNewClientDialog(true)} className="bg-blue-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Edificio *</Label>
                <div className="flex gap-2">
                  <Select value={formData.building_id} onValueChange={(v) => handleChange('building_id', v)} disabled={!formData.client_id}>
                    <SelectTrigger className="flex-1 bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Seleccionar edificio" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBuildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" onClick={() => setShowNewBuildingDialog(true)} disabled={!formData.client_id} className="bg-blue-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep2} className="bg-blue-600">
                <ArrowRight className="h-4 w-4 mr-2" />
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Configuración de Mantenimiento */}
        {step === 3 && equipmentFields && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Configurar Datos a Recoger</h3>

            <div className="space-y-6">
              <div>
                <Label className="text-slate-300 mb-3 block">Selecciona las periodicidades *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {periodicidades.map(p => (
                    <div key={p.value} className="flex items-center gap-2">
                      <Checkbox
                        id={p.value}
                        checked={formData.selected_periods.includes(p.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleChange('selected_periods', [...formData.selected_periods, p.value]);
                          } else {
                            handleChange('selected_periods', formData.selected_periods.filter(v => v !== p.value));
                          }
                        }}
                        className="border-white/30"
                      />
                      <Label htmlFor={p.value} className="text-slate-300">{p.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.selected_periods.length > 0 && (
                <div>
                  <Label className="text-slate-300 mb-3 block">Datos a recoger según RITE-IT3 *</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {equipmentFields.parametros.map(param => {
                      const availablePeriods = param.periods.filter(p => formData.selected_periods.includes(p));
                      if (availablePeriods.length === 0) return null;

                      const isSelected = formData.maintenance_fields.find(f => f.field_key === param.key);

                      return (
                        <div key={param.key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <Checkbox
                            id={param.key}
                            checked={!!isSelected}
                            onCheckedChange={() => handleToggleField(param)}
                            className="border-white/30"
                          />
                          <div className="flex-1">
                            <Label htmlFor={param.key} className="text-slate-300 cursor-pointer">
                              {param.label}
                            </Label>
                            <div className="flex gap-2 mt-1">
                              {availablePeriods.map(p => (
                                <span key={p} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                                  {periodicidades.find(per => per.value === p)?.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-slate-300 text-sm">
                  <strong>{formData.maintenance_fields.length}</strong> datos seleccionados para las revisiones
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep3} className="bg-blue-600">
                <ArrowRight className="h-4 w-4 mr-2" />
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Programar Primera Revisión */}
        {step === 4 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Programar Revisiones</h3>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Fecha de Primera Revisión *</Label>
                <Input
                  type="date"
                  value={formData.first_revision_date}
                  onChange={(e) => handleChange('first_revision_date', e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Tipo de Primera Revisión *</Label>
                <Select value={formData.starting_period} onValueChange={(v) => handleChange('starting_period', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.selected_periods.map(periodValue => {
                      const period = periodicidades.find(p => p.value === periodValue);
                      return (
                        <SelectItem key={periodValue} value={periodValue}>
                          {period?.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">
                  Las revisiones se programarán automáticamente en la agenda durante todo el año
                </p>
              </div>

              {formData.starting_period && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="text-white font-medium mb-2">Plan de Mantenimiento</h4>
                  <p className="text-slate-300 text-sm">
                    Se crearán revisiones para: {formData.selected_periods.map(p => 
                      periodicidades.find(per => per.value === p)?.label
                    ).join(', ')}
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    <strong>Primera revisión:</strong> {periodicidades.find(p => p.value === formData.starting_period)?.label} - {formData.first_revision_date && format(new Date(formData.first_revision_date), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Las revisiones aparecerán en el calendario y podrás realizarlas desde allí
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending || !canProceedStep4} className="bg-green-600">
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Crear Equipo</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Nombre *</Label>
                <Input
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">CIF *</Label>
                <Input
                  value={newClient.cif}
                  onChange={(e) => setNewClient({...newClient, cif: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Ciudad</Label>
                <Input
                  value={newClient.city}
                  onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={() => createClientMutation.mutate(newClient)}
                disabled={!newClient.name || !newClient.cif || createClientMutation.isPending}
                className="w-full"
              >
                {createClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Cliente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewBuildingDialog} onOpenChange={setShowNewBuildingDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Nuevo Edificio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Nombre *</Label>
                <Input
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({...newBuilding, name: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Dirección *</Label>
                <Input
                  value={newBuilding.address}
                  onChange={(e) => setNewBuilding({...newBuilding, address: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={() => createBuildingMutation.mutate(newBuilding)}
                disabled={!newBuilding.name || !newBuilding.address || createBuildingMutation.isPending}
                className="w-full"
              >
                {createBuildingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Edificio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}