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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, Plus, Building2, User, Camera } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { addMonths, addDays, format } from 'date-fns';

// Campos según IT3 del RITE por tipo de equipo
const fieldsIDAE = {
  caldera: {
    identificacion: ['Marca', 'Modelo', 'Nº serie', 'Potencia nominal (kW)', 'Tipo combustible', 'Año fabricación'],
    funcionamiento: ['Temperatura impulsión (°C)', 'Temperatura retorno (°C)', 'Presión circuito (bar)', 'Temp. humos (°C)', 'CO2 humos (%)', 'CO humos (ppm)', 'Opacidad humos (índice Bacharach)', 'Rendimiento combustión (%)'],
    elementos: ['Estado quemador', 'Estado intercambiador', 'Estado bomba circulación', 'Estado válvula seguridad', 'Estado termostato', 'Estado vaso expansión', 'Fugas circuito', 'Estado aislamiento'],
    limpieza: ['Limpieza quemador', 'Limpieza intercambiador', 'Limpieza conductos humos'],
  },
  enfriadora: {
    identificacion: ['Marca', 'Modelo', 'Nº serie', 'Potencia frigorífica (kW)', 'Tipo refrigerante', 'Carga refrigerante (kg)'],
    funcionamiento: ['Temperatura impulsión (°C)', 'Temperatura retorno (°C)', 'Presión alta (bar)', 'Presión baja (bar)', 'Temp. condensación (°C)', 'Temp. evaporación (°C)', 'Sobrecalentamiento (K)', 'Subenfriamiento (K)', 'Consumo eléctrico (kW)', 'EER'],
    elementos: ['Estado compresor', 'Estado condensador', 'Estado evaporador', 'Estado válvula expansión', 'Estado ventiladores', 'Estado bomba', 'Fugas refrigerante', 'Nivel aceite', 'Estado filtros'],
    limpieza: ['Limpieza condensador', 'Limpieza evaporador', 'Limpieza filtros'],
  },
  split: {
    identificacion: ['Marca', 'Modelo', 'Nº serie', 'Potencia frigorífica (kW)', 'Potencia calorífica (kW)', 'Tipo refrigerante', 'Carga refrigerante (kg)'],
    funcionamiento: ['Temperatura impulsión (°C)', 'Temperatura retorno (°C)', 'Presión alta (bar)', 'Presión baja (bar)', 'Consumo eléctrico (kW)', 'EER/COP'],
    elementos: ['Estado compresor', 'Estado unidad interior', 'Estado unidad exterior', 'Estado filtros', 'Estado drenaje', 'Fugas refrigerante', 'Estado mando'],
    limpieza: ['Limpieza filtros', 'Limpieza unidad interior', 'Limpieza condensador', 'Limpieza drenaje'],
  },
  vrf: {
    identificacion: ['Marca', 'Modelo', 'Nº serie', 'Potencia total (kW)', 'Tipo refrigerante', 'Carga refrigerante (kg)', 'Nº unidades interiores'],
    funcionamiento: ['Temperatura impulsión (°C)', 'Presión alta (bar)', 'Presión baja (bar)', 'Consumo eléctrico total (kW)', 'EER/COP sistema'],
    elementos: ['Estado compresores', 'Estado unidades interiores', 'Estado tuberías', 'Estado válvulas expansión', 'Fugas refrigerante', 'Estado sistema control'],
    limpieza: ['Limpieza filtros unidades', 'Limpieza condensadores', 'Limpieza evaporadores'],
  },
  climatizador: {
    identificacion: ['Marca', 'Modelo', 'Nº serie', 'Caudal nominal (m³/h)', 'Potencia frigorífica (kW)', 'Potencia calorífica (kW)'],
    funcionamiento: ['Temperatura impulsión (°C)', 'Temperatura retorno (°C)', 'Temperatura exterior (°C)', 'Humedad relativa (%)', 'Caudal aire (m³/h)', 'Presión estática (Pa)'],
    elementos: ['Estado ventiladores', 'Estado baterías frío', 'Estado baterías calor', 'Estado filtros', 'Estado humectador', 'Estado recuperador', 'Estado correas', 'Vibraciones'],
    limpieza: ['Limpieza filtros', 'Limpieza baterías', 'Limpieza ventiladores', 'Limpieza bandejas'],
  },
};

// Periodicidades según IT3
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
  const [showNewEquipmentDialog, setShowNewEquipmentDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', cif: '', city: '' });
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '' });
  const [newEquipment, setNewEquipment] = useState({ brand: '', model: '', location: '', equipment_type: 'split' });
  const [scanningEquipment, setScanningEquipment] = useState(false);

  const [formData, setFormData] = useState({
    // Paso 1: Ubicación
    client_id: '',
    building_id: '',
    equipment_id: '',
    
    // Paso 2: Tipo revisión
    revision_type: 'preventive',
    periodicidad: 'trimestral',
    generate_schedule: true,
    start_date: new Date().toISOString().split('T')[0],
    
    // Paso 3: Datos según IT3
    it3_identificacion: {},
    it3_funcionamiento: {},
    it3_elementos: {},
    it3_limpieza: {},
    
    // Paso 4: Observaciones
    observations: '',
    actions_taken: '',
    recommendations: '',
    general_status: 'good',
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

  const filteredBuildings = formData.client_id 
    ? buildings.filter(b => b.client_id === formData.client_id)
    : buildings;

  const filteredEquipment = formData.building_id
    ? equipment.filter(e => e.building_id === formData.building_id)
    : equipment;

  const selectedEquipment = equipment.find(e => e.id === formData.equipment_id);
  const equipmentType = selectedEquipment?.equipment_type || '';
  const fields = fieldsIDAE[equipmentType] || fieldsIDAE.split;

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

  const createEquipmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create({ 
      ...data, 
      client_id: formData.client_id,
      building_id: formData.building_id 
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setFormData(prev => ({ ...prev, equipment_id: data.id }));
      setShowNewEquipmentDialog(false);
      toast.success('Equipo creado');
    },
  });

  const handleScanEquipment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningEquipment(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae los datos técnicos de este equipo de climatización de la imagen. Devuelve: marca, modelo, tipo de equipo (caldera/enfriadora/split/vrf/climatizador), número de serie, potencia, tipo de refrigerante, carga de refrigerante. Si no encuentras algún dato, déjalo vacío.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            brand: { type: "string" },
            model: { type: "string" },
            equipment_type: { type: "string" },
            serial_number: { type: "string" },
            cooling_power_kw: { type: "number" },
            refrigerant_type: { type: "string" },
            refrigerant_charge_kg: { type: "number" }
          }
        }
      });

      setNewEquipment(prev => ({
        ...prev,
        brand: result.brand || prev.brand,
        model: result.model || prev.model,
        equipment_type: result.equipment_type || prev.equipment_type,
      }));

      setFormData(prev => ({
        ...prev,
        it3_identificacion: {
          ...prev.it3_identificacion,
          'Nº serie': result.serial_number || '',
          'Potencia nominal (kW)': result.cooling_power_kw || '',
          'Tipo refrigerante': result.refrigerant_type || '',
          'Carga refrigerante (kg)': result.refrigerant_charge_kg || '',
        }
      }));

      toast.success('Datos escaneados correctamente');
      setShowNewEquipmentDialog(true);
    } catch (error) {
      toast.error('Error al escanear equipo');
    } finally {
      setScanningEquipment(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const startDate = data.start_date || new Date().toISOString().split('T')[0];
      
      // Crear revisión actual
      const revisionData = {
        equipment_id: data.equipment_id,
        building_id: data.building_id,
        client_id: data.client_id,
        revision_date: startDate,
        revision_type: data.revision_type,
        general_status: data.general_status,
        it3_data: {
          ...data.it3_identificacion,
          ...data.it3_funcionamiento,
          ...data.it3_elementos,
          ...data.it3_limpieza,
        },
        observations: data.observations,
        actions_taken: data.actions_taken,
        recommendations: data.recommendations,
        annual_revision_completed: data.periodicidad === 'anual',
      };

      await base44.entities.Revision.create(revisionData);

      // Generar revisiones programadas si está activado
      if (data.generate_schedule) {
        const selectedPeriod = periodicidades.find(p => p.value === data.periodicidad);
        const numRevisions = 12 / selectedPeriod.months; // Generar para el próximo año
        
        const scheduledRevisions = [];
        const startingDate = new Date(startDate);
        for (let i = 1; i <= numRevisions; i++) {
          const nextDate = format(addMonths(startingDate, selectedPeriod.months * i), 'yyyy-MM-dd');
          scheduledRevisions.push(nextDate);
        }

        // Actualizar equipo con próxima revisión
        if (scheduledRevisions.length > 0) {
          await base44.entities.Equipment.update(data.equipment_id, {
            next_revision_date: scheduledRevisions[0],
            last_revision_date: startDate,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Revisión creada y calendario generado');
      navigate(createPageUrl('Calendar'));
    },
    onError: () => {
      toast.error('Error al crear la revisión');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIT3Change = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
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

  const canProceedStep1 = formData.client_id && formData.building_id && formData.equipment_id;
  const canProceedStep2 = formData.revision_type && formData.periodicidad;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Nueva Revisión IT3-RITE" />

        {/* Progress */}
        <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-center justify-between">
            {['Ubicación', 'Tipo Revisión', 'Datos IT3', 'Finalizar'].map((label, idx) => (
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

        {/* Step 1: Ubicación */}
        {step === 1 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Ubicación del Equipo</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={formData.client_id} onValueChange={(v) => {
                    handleChange('client_id', v);
                    handleChange('building_id', '');
                    handleChange('equipment_id', '');
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
                  <Select value={formData.building_id} onValueChange={(v) => {
                    handleChange('building_id', v);
                    handleChange('equipment_id', '');
                  }} disabled={!formData.client_id}>
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

              <div>
                <Label className="text-slate-300">Equipo *</Label>
                <div className="flex gap-2">
                  <Select value={formData.equipment_id} onValueChange={(v) => handleChange('equipment_id', v)} disabled={!formData.building_id}>
                    <SelectTrigger className="flex-1 bg-white/5 border-white/20 text-white">
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
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleScanEquipment}
                    className="hidden"
                    id="scan-equipment"
                  />
                  <label htmlFor="scan-equipment">
                    <Button type="button" size="icon" disabled={!formData.building_id || scanningEquipment} className="bg-purple-600" asChild>
                      <span>
                        {scanningEquipment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                  <Button type="button" size="icon" onClick={() => setShowNewEquipmentDialog(true)} disabled={!formData.building_id} className="bg-blue-600">
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

        {/* Step 2: Tipo Revisión */}
        {step === 2 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Tipo de Revisión</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Tipo *</Label>
                <Select value={formData.revision_type} onValueChange={(v) => handleChange('revision_type', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventiva</SelectItem>
                    <SelectItem value="corrective">Correctiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Periodicidad según IT3 *</Label>
                <Select value={formData.periodicidad} onValueChange={(v) => handleChange('periodicidad', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodicidades.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Fecha de inicio *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox
                  id="generate_schedule"
                  checked={formData.generate_schedule}
                  onCheckedChange={(v) => handleChange('generate_schedule', v)}
                  className="border-white/30"
                />
                <Label htmlFor="generate_schedule" className="text-slate-300 cursor-pointer">
                  Generar calendario automático de revisiones desde la fecha de inicio
                </Label>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep2} className="bg-blue-600">
                Siguiente
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Datos IT3 */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Identificación */}
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <h4 className="font-semibold text-white mb-4">Identificación del Equipo</h4>
              <div className="grid grid-cols-2 gap-4">
                {fields.identificacion?.map(field => (
                  <div key={field}>
                    <Label className="text-slate-300">{field}</Label>
                    <Input
                      value={formData.it3_identificacion[field] || ''}
                      onChange={(e) => handleIT3Change('it3_identificacion', field, e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Funcionamiento */}
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <h4 className="font-semibold text-white mb-4">Parámetros de Funcionamiento</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fields.funcionamiento?.map(field => (
                  <div key={field}>
                    <Label className="text-slate-300 text-sm">{field}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.it3_funcionamiento[field] || ''}
                      onChange={(e) => handleIT3Change('it3_funcionamiento', field, e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Elementos */}
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <h4 className="font-semibold text-white mb-4">Estado de Elementos</h4>
              <div className="grid grid-cols-2 gap-4">
                {fields.elementos?.map(field => (
                  <div key={field}>
                    <Label className="text-slate-300 text-sm">{field}</Label>
                    <Select
                      value={formData.it3_elementos[field] || ''}
                      onValueChange={(v) => handleIT3Change('it3_elementos', field, v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="aceptable">Aceptable</SelectItem>
                        <SelectItem value="revisar">Necesita revisión</SelectItem>
                        <SelectItem value="cambiar">Cambiar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>

            {/* Limpieza */}
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <h4 className="font-semibold text-white mb-4">Tareas de Limpieza</h4>
              <div className="space-y-2">
                {fields.limpieza?.map(field => (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      id={field}
                      checked={formData.it3_limpieza[field] || false}
                      onCheckedChange={(v) => handleIT3Change('it3_limpieza', field, v)}
                      className="border-white/30"
                    />
                    <Label htmlFor={field} className="text-slate-300">{field}</Label>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleNext} className="bg-blue-600">
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Finalizar */}
        {step === 4 && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Observaciones y Finalizar</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Estado General *</Label>
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

              <div>
                <Label className="text-slate-300">Observaciones</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleChange('observations', e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-slate-300">Acciones Realizadas</Label>
                <Textarea
                  value={formData.actions_taken}
                  onChange={(e) => handleChange('actions_taken', e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-slate-300">Recomendaciones</Label>
                <Textarea
                  value={formData.recommendations}
                  onChange={(e) => handleChange('recommendations', e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-green-600">
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Crear Revisión</>
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
                <Label className="text-slate-300">Nombre</Label>
                <Input
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">CIF</Label>
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
                {createClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
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
                <Label className="text-slate-300">Nombre</Label>
                <Input
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({...newBuilding, name: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Dirección</Label>
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
                {createBuildingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewEquipmentDialog} onOpenChange={setShowNewEquipmentDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Nuevo Equipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Tipo de Equipo</Label>
                <Select value={newEquipment.equipment_type} onValueChange={(v) => setNewEquipment({...newEquipment, equipment_type: v})}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caldera">Caldera</SelectItem>
                    <SelectItem value="enfriadora">Enfriadora</SelectItem>
                    <SelectItem value="split">Split</SelectItem>
                    <SelectItem value="vrf">VRF</SelectItem>
                    <SelectItem value="climatizador">Climatizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Marca</Label>
                <Input
                  value={newEquipment.brand}
                  onChange={(e) => setNewEquipment({...newEquipment, brand: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Modelo</Label>
                <Input
                  value={newEquipment.model}
                  onChange={(e) => setNewEquipment({...newEquipment, model: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Ubicación</Label>
                <Input
                  value={newEquipment.location}
                  onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={() => createEquipmentMutation.mutate(newEquipment)}
                disabled={!newEquipment.brand || !newEquipment.model || createEquipmentMutation.isPending}
                className="w-full"
              >
                {createEquipmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Equipo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}