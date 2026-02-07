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
import { Loader2, Save, Plus, Camera, Link as LinkIcon, ExternalLink } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

// Campos requeridos según IDAE por tipo de equipo
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

export default function NuevaRevision() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewBuildingDialog, setShowNewBuildingDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', cif: '', city: '' });
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '' });
  const [scanning, setScanning] = useState(false);
  const [searchingDocs, setSearchingDocs] = useState(false);

  const [formData, setFormData] = useState({
    // Paso 1: Tipo equipo y ubicación
    equipment_type: '',
    client_id: '',
    building_id: '',
    
    // Paso 2: Datos técnicos
    equipment_data: {},
    equipment_links: [],
    
    // Paso 3: Campos de revisión personalizados
    selected_periods: [],
    revision_fields: [], // {field_key, field_label, field_type, periods: [], options: []}
    
    // Paso 4: Programación
    first_revision_date: new Date().toISOString().split('T')[0],
    starting_period: '',
    do_revision_now: false,
    revision_data: {},
    observations: '',
    general_status: 'good',
  });

  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);
  const [newField, setNewField] = useState({
    field_label: '',
    field_type: 'text',
    periods: [],
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

  const handleScanEquipment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae los datos técnicos de este equipo de climatización. Devuelve todos los campos que encuentres: marca, modelo, número de serie, potencia, tipo de refrigerante, carga de refrigerante, año de fabricación, etc.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            marca: { type: "string" },
            modelo: { type: "string" },
            numero_serie: { type: "string" },
            potencia_nominal: { type: "number" },
            potencia_frigorifica: { type: "number" },
            potencia_calorifica: { type: "number" },
            tipo_refrigerante: { type: "string" },
            carga_refrigerante: { type: "number" },
            año_fabricacion: { type: "number" },
            tipo_combustible: { type: "string" },
            caudal_nominal: { type: "number" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        equipment_data: { ...prev.equipment_data, ...result }
      }));

      toast.success('Datos escaneados');
    } catch (error) {
      toast.error('Error al escanear');
    } finally {
      setScanning(false);
    }
  };

  const handleSearchDocs = async () => {
    if (!formData.equipment_data.marca || !formData.equipment_data.modelo) {
      toast.error('Necesitas marca y modelo primero');
      return;
    }

    setSearchingDocs(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca imágenes de fichas técnicas y manuales en PDF del equipo ${formData.equipment_data.marca} ${formData.equipment_data.modelo}. Devuelve hasta 5 resultados con título y URL directa a la imagen o PDF.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" }
                }
              }
            }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        equipment_links: result.links || []
      }));

      toast.success(`${result.links?.length || 0} documentos encontrados`);
    } catch (error) {
      toast.error('Error al buscar documentación');
    } finally {
      setSearchingDocs(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Calcular próxima revisión según período inicial
      const selectedPeriod = periodicidades.find(p => p.value === data.starting_period);
      const firstDate = new Date(data.first_revision_date);
      const nextRevisionDate = selectedPeriod 
        ? format(addMonths(firstDate, selectedPeriod.months), 'yyyy-MM-dd')
        : null;

      // Crear equipo con campos de revisión personalizados
      const equipmentData = {
        client_id: data.client_id,
        building_id: data.building_id,
        equipment_type: data.equipment_type,
        brand: data.equipment_data.marca || '',
        model: data.equipment_data.modelo || '',
        serial_number: data.equipment_data.numero_serie || '',
        location: data.equipment_data.ubicacion || '',
        cooling_power_kw: data.equipment_data.potencia_frigorifica || data.equipment_data.potencia_nominal || null,
        heating_power_kw: data.equipment_data.potencia_calorifica || null,
        refrigerant_type: data.equipment_data.tipo_refrigerante || '',
        refrigerant_charge_kg: data.equipment_data.carga_refrigerante || null,
        custom_fields: data.equipment_data,
        documents: data.equipment_links.map(link => ({
          name: link.title,
          url: link.url,
          type: 'manual'
        })),
        next_revision_date: nextRevisionDate,
        maintenance_config: {
          monthly_enabled: data.selected_periods.includes('mensual'),
          monthly_fields: data.revision_fields.filter(f => f.periods.includes('mensual')),
          quarterly_enabled: data.selected_periods.includes('trimestral'),
          quarterly_fields: data.revision_fields.filter(f => f.periods.includes('trimestral')),
          biannual_enabled: data.selected_periods.includes('semestral'),
          biannual_fields: data.revision_fields.filter(f => f.periods.includes('semestral')),
          annual_enabled: data.selected_periods.includes('anual'),
          annual_fields: data.revision_fields.filter(f => f.periods.includes('anual')),
        }
      };

      const equipment = await base44.entities.Equipment.create(equipmentData);

      // Si quiere hacer revisión ahora
      if (data.do_revision_now) {
        const revisionData = {
          equipment_id: equipment.id,
          building_id: data.building_id,
          client_id: data.client_id,
          revision_date: data.first_revision_date,
          revision_type: 'preventive',
          general_status: data.general_status,
          it3_data: data.revision_data,
          observations: data.observations,
          annual_revision_completed: data.starting_period === 'anual',
        };

        await base44.entities.Revision.create(revisionData);
        
        // Actualizar última revisión
        await base44.entities.Equipment.update(equipment.id, {
          last_revision_date: data.first_revision_date,
          next_revision_date: nextRevisionDate,
        });
      }

      return equipment;
    },
    onSuccess: (equipment) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      toast.success('Equipo creado con plan de revisiones');
      navigate(createPageUrl(`EquipmentDetail?id=${equipment.id}`));
    },
    onError: () => {
      toast.error('Error al crear');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEquipmentDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      equipment_data: { ...prev.equipment_data, [field]: value }
    }));
  };

  const handleRevisionDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      revision_data: { ...prev.revision_data, [field]: value }
    }));
  };

  const handleToggleField = (field) => {
    setFormData(prev => {
      const exists = prev.revision_fields.find(f => f.field_key === field.key);
      if (exists) {
        return {
          ...prev,
          revision_fields: prev.revision_fields.filter(f => f.field_key !== field.key)
        };
      } else {
        return {
          ...prev,
          revision_fields: [...prev.revision_fields, {
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

  const handleAddCustomField = () => {
    if (!newField.field_label || newField.periods.length === 0) {
      toast.error('Completa todos los campos');
      return;
    }

    const fieldKey = newField.field_label.toLowerCase().replace(/\s+/g, '_');
    setFormData(prev => ({
      ...prev,
      revision_fields: [...prev.revision_fields, {
        field_key: fieldKey,
        field_label: newField.field_label,
        field_type: newField.field_type,
        periods: newField.periods,
        custom: true,
      }]
    }));

    setNewField({ field_label: '', field_type: 'text', periods: [] });
    setShowNewFieldDialog(false);
    toast.success('Campo añadido');
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

  const canProceedStep1 = formData.equipment_type && formData.client_id && formData.building_id;
  const canProceedStep2 = equipmentFields?.identificacion.every(field => 
    !field.required || formData.equipment_data[field.key]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Crear Equipo y Primera Revisión" />

        {/* Progress */}
        <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-center justify-between">
            {['Tipo y Ubicación', 'Datos Técnicos', 'Periodicidad', 'Programar'].map((label, idx) => (
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

        {/* Step 1: Tipo y Ubicación */}
        {step === 1 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Tipo de Equipo y Ubicación</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Tipo de Equipo según IDAE *</Label>
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
                <p className="text-xs text-slate-400 mt-1">Determina los datos requeridos según normativa IT3</p>
              </div>

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

            <div className="flex justify-end mt-6">
              <Button onClick={handleNext} disabled={!canProceedStep1} className="bg-blue-600">
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Datos Técnicos */}
        {step === 2 && equipmentFields && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Datos Técnicos según IDAE</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleScanEquipment}
                  className="hidden"
                  id="scan-photo"
                />
                <label htmlFor="scan-photo">
                  <Button type="button" disabled={scanning} className="bg-purple-600" asChild>
                    <span>
                      {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                      Escanear Placa
                    </span>
                  </Button>
                </label>
                <Button
                  type="button"
                  onClick={handleSearchDocs}
                  disabled={searchingDocs || !formData.equipment_data.marca}
                  className="bg-indigo-600"
                >
                  {searchingDocs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                  Buscar Docs
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {equipmentFields.identificacion.map(field => (
                <div key={field.key}>
                  <Label className="text-slate-300">{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      value={formData.equipment_data[field.key] || ''}
                      onValueChange={(v) => handleEquipmentDataChange(field.key, v)}
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
                      value={formData.equipment_data[field.key] || ''}
                      onChange={(e) => handleEquipmentDataChange(field.key, e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            {formData.equipment_links.length > 0 && (
              <div className="mb-6">
                <Label className="text-slate-300 mb-2 block">Documentación Encontrada</Label>
                <div className="space-y-2">
                  {formData.equipment_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm">{link.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep2} className="bg-blue-600">
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Campos de Revisión */}
        {step === 3 && equipmentFields && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Configurar Campos de Revisión</h3>
              <Button onClick={() => setShowNewFieldDialog(true)} className="bg-green-600">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Campo
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-slate-300 mb-3 block">Selecciona las periodicidades de revisión</Label>
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
                  <Label className="text-slate-300 mb-3 block">Selecciona los elementos a revisar (según IDAE)</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {equipmentFields.parametros.map(param => {
                      const availablePeriods = param.periods.filter(p => formData.selected_periods.includes(p));
                      if (availablePeriods.length === 0) return null;

                      const isSelected = formData.revision_fields.find(f => f.field_key === param.key);

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

              {formData.revision_fields.filter(f => f.custom).length > 0 && (
                <div>
                  <Label className="text-slate-300 mb-3 block">Campos personalizados</Label>
                  <div className="space-y-2">
                    {formData.revision_fields.filter(f => f.custom).map(field => (
                      <div key={field.field_key} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">{field.field_label}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              revision_fields: prev.revision_fields.filter(f => f.field_key !== field.field_key)
                            }))}
                            className="text-red-400 hover:text-red-300"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-slate-300 text-sm">
                  <strong>{formData.revision_fields.length}</strong> campos seleccionados para las revisiones
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleNext} className="bg-blue-600">
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Programar */}
        {step === 4 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Programar Plan de Revisiones</h3>

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
                <Label className="text-slate-300">Período Inicial *</Label>
                <Select value={formData.starting_period} onValueChange={(v) => handleChange('starting_period', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar período" />
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
                  {formData.starting_period && formData.first_revision_date && (() => {
                    const period = periodicidades.find(p => p.value === formData.starting_period);
                    const nextDate = format(addMonths(new Date(formData.first_revision_date), period.months), 'dd/MM/yyyy');
                    return `Próxima revisión: ${nextDate}`;
                  })()}
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                <Checkbox
                  id="do_now"
                  checked={formData.do_revision_now}
                  onCheckedChange={(v) => handleChange('do_revision_now', v)}
                  className="border-white/30"
                />
                <div>
                  <Label htmlFor="do_now" className="text-slate-300 cursor-pointer">
                    Realizar revisión ahora
                  </Label>
                  <p className="text-xs text-slate-400">
                    Marca esta opción para hacer la primera revisión inmediatamente
                  </p>
                </div>
              </div>

              {formData.do_revision_now && (
                <div>
                  <Label className="text-slate-300">Estado del Equipo *</Label>
                  <Select value={formData.general_status} onValueChange={(v) => handleChange('general_status', v)}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
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
              )}

              {formData.do_revision_now && formData.revision_fields.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-slate-300 block">Datos de la Revisión</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-white/5 max-h-64 overflow-y-auto">
                    {formData.revision_fields.map(field => (
                      <div key={field.field_key}>
                        <Label className="text-slate-300 text-sm">{field.field_label}</Label>
                        {field.field_type === 'select' ? (
                          <Select
                            value={formData.revision_data[field.field_key] || ''}
                            onValueChange={(v) => handleRevisionDataChange(field.field_key, v)}
                          >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.field_type === 'checkbox' ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Checkbox
                              checked={formData.revision_data[field.field_key] || false}
                              onCheckedChange={(v) => handleRevisionDataChange(field.field_key, v)}
                              className="border-white/30"
                            />
                          </div>
                        ) : (
                          <Input
                            type={field.field_type}
                            value={formData.revision_data[field.field_key] || ''}
                            onChange={(e) => handleRevisionDataChange(field.field_key, e.target.value)}
                            className="bg-white/5 border-white/20 text-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.do_revision_now && (
                <div>
                  <Label className="text-slate-300">Observaciones de la Revisión</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => handleChange('observations', e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    rows={3}
                    placeholder="Observaciones de esta revisión..."
                  />
                </div>
              )}

              {formData.starting_period && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="text-white font-medium mb-2">Plan de Mantenimiento</h4>
                  <p className="text-slate-300 text-sm">
                    Periodicidades configuradas: {formData.selected_periods.map(p => 
                      periodicidades.find(per => per.value === p)?.label
                    ).join(', ')}
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    <strong>Período inicial:</strong> {periodicidades.find(p => p.value === formData.starting_period)?.label}
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Las siguientes revisiones se programarán automáticamente según el período más corto
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending || !formData.starting_period} className="bg-green-600">
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

        <Dialog open={showNewFieldDialog} onOpenChange={setShowNewFieldDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Añadir Campo Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Nombre del Campo *</Label>
                <Input
                  value={newField.field_label}
                  onChange={(e) => setNewField({...newField, field_label: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="Ej: Estado de válvulas"
                />
              </div>
              <div>
                <Label className="text-slate-300">Tipo de Dato *</Label>
                <Select value={newField.field_type} onValueChange={(v) => setNewField({...newField, field_type: v})}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="checkbox">Sí/No</SelectItem>
                    <SelectItem value="select">Opciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Periodicidades *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {periodicidades.map(p => (
                    <div key={p.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`new-${p.value}`}
                        checked={newField.periods.includes(p.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewField({...newField, periods: [...newField.periods, p.value]});
                          } else {
                            setNewField({...newField, periods: newField.periods.filter(v => v !== p.value)});
                          }
                        }}
                        className="border-white/30"
                      />
                      <Label htmlFor={`new-${p.value}`} className="text-slate-300">{p.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleAddCustomField}
                disabled={!newField.field_label || newField.periods.length === 0}
                className="w-full"
              >
                Añadir Campo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}