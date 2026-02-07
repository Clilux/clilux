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
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = {
  TIPO: 0,
  UBICACION: 1,
  DATOS_BASICOS: 2,
  DATOS_TECNICOS: 3,
  ELEMENTOS: 4,
  REVISION: 5,
  RESUMEN: 6,
};

const equipmentTypes = [
  { value: 'caldera', label: 'Caldera', elementos: ['Quemador', 'Intercambiador', 'Bomba circulación', 'Válvula seguridad', 'Termostato', 'Presostato'] },
  { value: 'enfriadora', label: 'Enfriadora', elementos: ['Compresor', 'Condensador', 'Evaporador', 'Válvula expansión', 'Bomba', 'Filtros'] },
  { value: 'split', label: 'Split / Aire Acondicionado', elementos: ['Compresor', 'Unidad interior', 'Unidad exterior', 'Filtros', 'Drenaje', 'Control remoto'] },
  { value: 'vrf', label: 'VRF / Caudal Variable', elementos: ['Compresores', 'Unidades interiores', 'Unidad exterior', 'Tuberías refrigerante', 'Sistema control'] },
  { value: 'climatizador', label: 'Climatizador / UTA', elementos: ['Ventiladores', 'Baterías frío/calor', 'Filtros', 'Humectador', 'Recuperador'] },
  { value: 'bomba_calor', label: 'Bomba de Calor', elementos: ['Compresor', 'Válvula inversión', 'Intercambiadores', 'Ventiladores', 'Control'] },
];

const frecuenciasIDAE = {
  mensual: ['Filtros aire', 'Nivel agua', 'Fugas', 'Ruidos anómalos'],
  trimestral: ['Limpieza filtros', 'Comprobación presiones', 'Estado baterías', 'Drenajes'],
  semestral: ['Comprobación estanqueidad', 'Carga refrigerante', 'Estado eléctrico', 'Aislamiento'],
  anual: ['Limpieza completa', 'Verificación eficiencia', 'Revisión consumos', 'Comprobación seguridad', 'Mantenimiento preventivo completo'],
};

export default function TutorialEquipo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(STEPS.TIPO);

  const [formData, setFormData] = useState({
    equipment_type: '',
    client_id: '',
    building_id: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    installation_date: '',
    cooling_power_kw: '',
    heating_power_kw: '',
    refrigerant_type: '',
    refrigerant_charge_kg: '',
    notes: '',
    elementos_seleccionados: [],
    mantenimiento: {
      mensual: [],
      trimestral: [],
      semestral: [],
      anual: [],
    },
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

  const selectedEquipmentType = equipmentTypes.find(t => t.value === formData.equipment_type);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        cooling_power_kw: data.cooling_power_kw ? Number(data.cooling_power_kw) : null,
        heating_power_kw: data.heating_power_kw ? Number(data.heating_power_kw) : null,
        refrigerant_charge_kg: data.refrigerant_charge_kg ? Number(data.refrigerant_charge_kg) : null,
        status: 'operational',
        custom_fields: {
          elementos: data.elementos_seleccionados,
          plan_mantenimiento: data.mantenimiento,
        },
      };
      delete cleanData.elementos_seleccionados;
      delete cleanData.mantenimiento;
      return base44.entities.Equipment.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipo creado con éxito');
      navigate(createPageUrl('Equipment'));
    },
    onError: () => {
      toast.error('Error al crear el equipo');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.RESUMEN) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > STEPS.TIPO) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  const toggleElemento = (elemento) => {
    setFormData(prev => ({
      ...prev,
      elementos_seleccionados: prev.elementos_seleccionados.includes(elemento)
        ? prev.elementos_seleccionados.filter(e => e !== elemento)
        : [...prev.elementos_seleccionados, elemento]
    }));
  };

  const toggleMantenimiento = (periodo, tarea) => {
    setFormData(prev => ({
      ...prev,
      mantenimiento: {
        ...prev.mantenimiento,
        [periodo]: prev.mantenimiento[periodo].includes(tarea)
          ? prev.mantenimiento[periodo].filter(t => t !== tarea)
          : [...prev.mantenimiento[periodo], tarea]
      }
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.TIPO:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Tipo de Equipo</h2>
            <p className="text-slate-400 mb-6">Selecciona el tipo de equipo que vas a registrar según la clasificación IT3 del RITE</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipmentTypes.map(type => (
                <Card
                  key={type.value}
                  className={`p-6 cursor-pointer transition-all ${
                    formData.equipment_type === type.value
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => handleChange('equipment_type', type.value)}
                >
                  <h3 className="font-semibold text-white text-lg">{type.label}</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Elementos: {type.elementos.slice(0, 3).join(', ')}...
                  </p>
                </Card>
              ))}
            </div>
          </div>
        );

      case STEPS.UBICACION:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Ubicación del Equipo</h2>
            <p className="text-slate-400 mb-6">¿Dónde está instalado este equipo?</p>
            
            <div>
              <Label className="text-slate-300">Cliente</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(v) => {
                  handleChange('client_id', v);
                  handleChange('building_id', '');
                }}
              >
                <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
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

            <div>
              <Label className="text-slate-300">Edificio</Label>
              <Select 
                value={formData.building_id} 
                onValueChange={(v) => handleChange('building_id', v)}
              >
                <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
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
              <Label className="text-slate-300">Ubicación específica</Label>
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Ej: Cubierta, Planta 2, Sala de máquinas..."
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
        );

      case STEPS.DATOS_BASICOS:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Datos Básicos del Equipo</h2>
            
            <div>
              <Label className="text-slate-300">Marca *</Label>
              <Input
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Ej: Daikin, Mitsubishi, Carrier..."
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Modelo *</Label>
              <Input
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Modelo del equipo"
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Número de Serie</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Número de serie"
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Fecha de Instalación</Label>
              <Input
                type="date"
                value={formData.installation_date}
                onChange={(e) => handleChange('installation_date', e.target.value)}
                className="mt-1 bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
        );

      case STEPS.DATOS_TECNICOS:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Datos Técnicos</h2>
            <p className="text-slate-400 mb-6">Datos técnicos según normativa IT3</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Potencia Frigorífica (kW)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.cooling_power_kw}
                  onChange={(e) => handleChange('cooling_power_kw', e.target.value)}
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Potencia Calorífica (kW)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.heating_power_kw}
                  onChange={(e) => handleChange('heating_power_kw', e.target.value)}
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Tipo de Refrigerante</Label>
                <Input
                  value={formData.refrigerant_type}
                  onChange={(e) => handleChange('refrigerant_type', e.target.value)}
                  placeholder="R-410A, R-32, R-134a..."
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Carga Refrigerante (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.refrigerant_charge_kg}
                  onChange={(e) => handleChange('refrigerant_charge_kg', e.target.value)}
                  className="mt-1 bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Observaciones</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Cualquier información adicional relevante..."
                className="mt-1 bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>
          </div>
        );

      case STEPS.ELEMENTOS:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Elementos del Equipo</h2>
            <p className="text-slate-400 mb-6">Selecciona los elementos que tiene este equipo según IT3</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedEquipmentType?.elementos.map(elemento => (
                <Card
                  key={elemento}
                  className={`p-4 cursor-pointer transition-all ${
                    formData.elementos_seleccionados.includes(elemento)
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => toggleElemento(elemento)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.elementos_seleccionados.includes(elemento)}
                      className="border-white/30"
                    />
                    <span className="text-white text-sm">{elemento}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case STEPS.REVISION:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Plan de Mantenimiento</h2>
            <p className="text-slate-400 mb-6">Selecciona las tareas de mantenimiento según guía IDAE</p>
            
            {Object.entries(frecuenciasIDAE).map(([periodo, tareas]) => (
              <Card key={periodo} className="p-5 bg-white/5 border-white/20">
                <h3 className="font-semibold text-white mb-3 capitalize">
                  Mantenimiento {periodo}
                </h3>
                <div className="space-y-2">
                  {tareas.map(tarea => (
                    <div key={tarea} className="flex items-center gap-3">
                      <Checkbox
                        checked={formData.mantenimiento[periodo].includes(tarea)}
                        onCheckedChange={() => toggleMantenimiento(periodo, tarea)}
                        className="border-white/30"
                      />
                      <span className="text-slate-300 text-sm">{tarea}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );

      case STEPS.RESUMEN:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">Resumen</h2>
            <p className="text-slate-400 mb-6">Verifica los datos antes de crear el equipo</p>
            
            <Card className="p-6 bg-white/5 border-white/20 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Tipo de Equipo</p>
                <p className="text-white font-medium">{selectedEquipmentType?.label}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500">Marca y Modelo</p>
                <p className="text-white font-medium">{formData.brand} {formData.model}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Elementos Seleccionados</p>
                <p className="text-white">{formData.elementos_seleccionados.length} elementos</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Plan de Mantenimiento</p>
                <div className="text-white text-sm space-y-1">
                  {Object.entries(formData.mantenimiento).map(([periodo, tareas]) => (
                    tareas.length > 0 && (
                      <p key={periodo}>
                        {periodo.charAt(0).toUpperCase() + periodo.slice(1)}: {tareas.length} tareas
                      </p>
                    )
                  ))}
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case STEPS.TIPO:
        return formData.equipment_type !== '';
      case STEPS.UBICACION:
        return formData.client_id && formData.building_id;
      case STEPS.DATOS_BASICOS:
        return formData.brand && formData.model;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-white">Tutorial: Nuevo Equipo</h1>
            <span className="text-slate-400 text-sm">
              Paso {currentStep + 1} de {STEPS.RESUMEN + 1}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / (STEPS.RESUMEN + 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          {renderStep()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === STEPS.TIPO}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>

          {currentStep === STEPS.RESUMEN ? (
            <Button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Crear Equipo
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}