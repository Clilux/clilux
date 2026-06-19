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
import { Loader2, Save, Plus, Camera, ArrowLeft, ArrowRight, Upload, Scan } from 'lucide-react';
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
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

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
    { key: 'limpieza_realizada', label: 'Limpieza realizada', type: 'checkbox', periods: ['anual'] }]

  },
  enfriadora: {
    identificacion: [
    { key: 'marca', label: 'Marca *', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
    { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
    { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW) *', type: 'number', required: true },
    { key: 'tipo_refrigerante', label: 'Tipo refrigerante *', type: 'text', required: true },
    { key: 'carga_refrigerante', label: 'Carga refrigerante (kg) *', type: 'number', required: true },
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

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
    { key: 'consumo_agua', label: 'Consumo de agua (m³)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] }]

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
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

    parametros: [
    { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'consumo_electrico', label: 'Consumo eléctrico (kW)', type: 'number', periods: ['trimestral', 'anual'] },
    { key: 'estado_filtros', label: 'Estado filtros', type: 'select', options: ['Limpios', 'Sucios', 'Cambiados'], periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'estado_drenaje', label: 'Estado drenaje', type: 'select', options: ['Correcto', 'Obstruido', 'Limpiado'], periods: ['trimestral', 'anual'] },
    { key: 'limpieza_unidad', label: 'Limpieza unidad realizada', type: 'checkbox', periods: ['trimestral', 'anual'] }]

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
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

    parametros: [
    { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'consumo_total', label: 'Consumo eléctrico total (kW)', type: 'number', periods: ['trimestral', 'anual'] },
    { key: 'estado_compresores', label: 'Estado compresores', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión'], periods: ['trimestral', 'anual'] },
    { key: 'fugas_refrigerante', label: 'Fugas refrigerante detectadas', type: 'checkbox', periods: ['trimestral', 'anual'] },
    { key: 'limpieza_unidades', label: 'Limpieza unidades', type: 'checkbox', periods: ['trimestral', 'anual'] }]

  },
  climatizador: {
    identificacion: [
    { key: 'marca', label: 'Marca *', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
    { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
    { key: 'caudal_nominal', label: 'Caudal nominal (m³/h) *', type: 'number', required: true },
    { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW)', type: 'number', required: false },
    { key: 'potencia_calorifica', label: 'Potencia calorífica (kW)', type: 'number', required: false },
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

    parametros: [
    { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'temp_retorno', label: 'Temperatura retorno (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'humedad_relativa', label: 'Humedad relativa (%)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'caudal_aire', label: 'Caudal aire (m³/h)', type: 'number', periods: ['trimestral', 'anual'] },
    { key: 'estado_filtros', label: 'Estado filtros', type: 'select', options: ['Limpios', 'Sucios', 'Cambiados'], periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'estado_baterias', label: 'Estado baterías', type: 'select', options: ['Bueno', 'Aceptable', 'Limpieza necesaria'], periods: ['trimestral', 'anual'] },
    { key: 'estado_correas', label: 'Estado correas', type: 'select', options: ['Bueno', 'Desgastado', 'Cambiado'], periods: ['trimestral', 'anual'] },
    { key: 'limpieza_realizada', label: 'Limpieza completa realizada', type: 'checkbox', periods: ['anual'] }]

  },
  rooftop: {
    identificacion: [
    { key: 'marca', label: 'Marca *', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
    { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
    { key: 'potencia_frigorifica', label: 'Potencia frigorífica (kW) *', type: 'number', required: true },
    { key: 'potencia_calorifica', label: 'Potencia calorífica (kW)', type: 'number', required: false },
    { key: 'tipo_refrigerante', label: 'Tipo refrigerante *', type: 'text', required: true },
    { key: 'carga_refrigerante', label: 'Carga refrigerante (kg)', type: 'number', required: false },
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

    parametros: [
    { key: 'temp_impulsion', label: 'Temperatura impulsión (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'temp_retorno', label: 'Temperatura retorno (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'presion_alta', label: 'Presión alta (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'presion_baja', label: 'Presión baja (bar)', type: 'number', periods: ['trimestral', 'semestral', 'anual'] },
    { key: 'consumo_electrico', label: 'Consumo eléctrico (kW)', type: 'number', periods: ['trimestral', 'anual'] },
    { key: 'estado_compresor', label: 'Estado compresor', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión', 'Cambiar'], periods: ['trimestral', 'anual'] },
    { key: 'estado_ventiladores', label: 'Estado ventiladores', type: 'select', options: ['Bueno', 'Aceptable', 'Necesita revisión', 'Cambiar'], periods: ['trimestral', 'anual'] },
    { key: 'estado_filtros', label: 'Estado filtros', type: 'select', options: ['Limpios', 'Sucios', 'Cambiados'], periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'limpieza_baterias', label: 'Limpieza baterías', type: 'checkbox', periods: ['trimestral', 'anual'] },
    { key: 'fugas_refrigerante', label: 'Fugas refrigerante detectadas', type: 'checkbox', periods: ['trimestral', 'anual'] }]

  },
  adiabatico: {
    identificacion: [
    { key: 'marca', label: 'Marca *', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
    { key: 'numero_serie', label: 'Nº serie *', type: 'text', required: true },
    { key: 'tipo_sistema', label: 'Tipo de sistema *', type: 'select', options: ['Con depósito y recirculación', 'Sin recirculación (agua perdida)', 'Pulverización'], required: true },
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true },
    { key: 'caudal_agua', label: 'Caudal de agua (l/h)', type: 'number', required: false },
    { key: 'balsa_litros', label: 'Volumen de la balsa (litros)', type: 'number', required: false }],

    parametros: [
    // Parámetros mensuales (según documento Sevilla)
    { key: 'temperatura_agua', label: 'Temperatura agua (°C)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'turbidez', label: 'Turbidez (UNF)', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'ph', label: 'pH', type: 'number', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'biocida', label: 'Nivel de biocida', type: 'text', periods: ['mensual', 'trimestral', 'semestral', 'anual'] },
    { key: 'revision_boquillas', label: 'Revisión y limpieza de boquillas', type: 'checkbox', periods: ['mensual'] },

    // Parámetros semestrales
    { key: 'legionella_ufc', label: 'Legionella (UFC/L)', type: 'number', periods: ['semestral', 'anual'] },
    { key: 'aerobios_totales', label: 'Aerobios totales (UFC/ml)', type: 'number', periods: ['semestral', 'anual'] },

    // Parámetros anuales
    { key: 'limpieza_desinfeccion_completa', label: 'Limpieza y desinfección completa', type: 'checkbox', periods: ['anual'] },
    { key: 'revision_general_instalacion', label: 'Revisión general de instalación', type: 'checkbox', periods: ['anual'] }]

  },
  produccion_acs: {
    identificacion: [
    { key: 'marca', label: 'Marca *', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo *', type: 'text', required: true },
    { key: 'numero_serie', label: 'Nº serie', type: 'text', required: false },
    { key: 'tipo_instalacion', label: 'Tipo de instalación *', type: 'select', options: ['Acumulador', 'Calentamiento instantáneo', 'Intercambiador', 'Depósito'], required: true },
    { key: 'volumen_acumulacion', label: 'Volumen acumulación (L)', type: 'number', required: false },
    { key: 'temperatura_servicio', label: 'Temperatura servicio (°C)', type: 'number', required: false },
    { key: 'ubicacion', label: 'Ubicación *', type: 'text', required: true }],

    parametros: [
    // Control según RD 487/2022
    { key: 'temperatura_agua', label: 'Temperatura agua (°C)', type: 'number', periods: ['mensual', 'trimestral'] },
    { key: 'ph', label: 'pH', type: 'number', periods: ['mensual', 'trimestral'] },
    { key: 'turbidez', label: 'Turbidez (UNF)', type: 'number', periods: ['mensual', 'trimestral'] },
    { key: 'biocida_nivel', label: 'Nivel de biocida', type: 'text', periods: ['mensual', 'trimestral'] },
    { key: 'legionella_ufc', label: 'Legionella (UFC/L)', type: 'number', periods: ['trimestral'] },
    { key: 'aerobios_totales', label: 'Aerobios totales (UFC/ml)', type: 'number', periods: ['trimestral'] },
    { key: 'limpieza_desinfeccion', label: 'Limpieza y desinfección realizada', type: 'checkbox', periods: ['trimestral'] },
    { key: 'estado_aislamiento', label: 'Estado aislamiento', type: 'select', options: ['Bueno', 'Aceptable', 'Deteriorado'], periods: ['trimestral'] },
    { key: 'revision_valvulas', label: 'Revisión válvulas y grifos', type: 'checkbox', periods: ['trimestral'] }]

  }
};

const periodicidades = [
{ value: 'mensual', label: 'Mensual', months: 1 },
{ value: 'trimestral', label: 'Trimestral', months: 3 },
{ value: 'semestral', label: 'Semestral', months: 6 },
{ value: 'anual', label: 'Anual', months: 12 }];


export default function EquipmentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');

  // Técnico en sesión (para auto-registro)
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isTechSession = !!sessionTechEmail;

  const proxyCall = async (entity, extra = {}) => {
    const res = await base44.functions.invoke('getCompanyData', {
      technician_email: sessionTechEmail,
      entity,
      ...extra
    });
    return res.data;
  };

  const { data: sessionTechRecord } = useQuery({
    queryKey: ['session-tech-record', sessionTechEmail],
    queryFn: async () => {
      if (!sessionTechEmail) return null;
      const r = await proxyCall('all');
      // buscar técnico en la lista completa no disponible por proxy; usar datos mínimos
      return { name: sessionTechEmail };
    },
    enabled: !!sessionTechEmail
  });
  const [step, setStep] = useState(1);

  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewBuildingDialog, setShowNewBuildingDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', cif: '', city: '' });
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '' });

  const [formData, setFormData] = useState({
    // Paso 1: Datos técnicos
    reference_name: '',
    equipment_type: '',
    technical_data: {},
    registration_date: new Date().toISOString().split('T')[0],
    installation_date: '',
    warranty_end: '',
    notes: '',
    status: 'operational',
    photo_url: '',
    photos: [],
    custom_fields: [],
    unit_type: 'standalone',
    parent_equipment_id: '',

    // Paso 2: Cliente y edificio
    client_id: '',
    building_id: '',

    // Paso 3: Configuración de mantenimiento
    requires_maintenance: null,
    selected_periods: [],
    maintenance_fields: [],

    // Paso 4: Primera revisión
    first_revision_date: new Date().toISOString().split('T')[0],
    last_revision_date: '',
    starting_period: ''
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  // Cargar equipo existente si estamos editando
  const { data: existingEquipment } = useQuery({
    queryKey: ['equipment-edit', equipmentId, sessionTechEmail],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxyCall('equipment_detail', { equipment_id: equipmentId });
        return r.data?.equipment || null;
      }
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0] || null;
    },
    enabled: !!equipmentId
  });

  // Pre-rellenar formulario cuando se carga el equipo existente
  React.useEffect(() => {
    if (existingEquipment) {
      setFormData({
        reference_name: existingEquipment.reference_name || '',
        equipment_type: existingEquipment.equipment_type,
        technical_data: existingEquipment.technical_data || {},
        registration_date: existingEquipment.registration_date || new Date().toISOString().split('T')[0],
        installation_date: existingEquipment.installation_date || '',
        warranty_end: existingEquipment.warranty_end || '',
        notes: existingEquipment.notes || '',
        status: existingEquipment.status || 'operational',
        photo_url: existingEquipment.photo_url || '',
        photos: existingEquipment.photos || [],
        custom_fields: existingEquipment.technical_data?.custom_fields || [],
        unit_type: existingEquipment.unit_type || 'standalone',
        parent_equipment_id: existingEquipment.parent_equipment_id || '',
        client_id: existingEquipment.client_id,
        building_id: existingEquipment.building_id,
        requires_maintenance: existingEquipment.maintenance_config ? true : null,
        selected_periods: [
        existingEquipment.maintenance_config?.monthly_enabled && 'mensual',
        existingEquipment.maintenance_config?.quarterly_enabled && 'trimestral',
        existingEquipment.maintenance_config?.biannual_enabled && 'semestral',
        existingEquipment.maintenance_config?.annual_enabled && 'anual'].
        filter(Boolean),
        maintenance_fields: [
        ...(existingEquipment.maintenance_config?.monthly_fields || []),
        ...(existingEquipment.maintenance_config?.quarterly_fields || []),
        ...(existingEquipment.maintenance_config?.biannual_fields || []),
        ...(existingEquipment.maintenance_config?.annual_fields || [])].
        filter((v, i, a) => a.findIndex((f) => f.field_key === v.field_key) === i),
        first_revision_date: existingEquipment.first_revision_date || new Date().toISOString().split('T')[0],
        last_revision_date: existingEquipment.last_revision_date || '',
        starting_period: ''
      });
    }
  }, [existingEquipment]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', sessionTechEmail],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxyCall('clients');
        return r.data || [];
      }
      return base44.entities.Client.list();
    }
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', sessionTechEmail],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxyCall('buildings');
        return r.data || [];
      }
      return base44.entities.Building.list();
    }
  });

  const { data: suggestions } = useQuery({
    queryKey: ['equipment-suggestions'],
    queryFn: async () => {
      if (isTechSession) return { brands: [], refrigerants: [], models: [] };
      const items = await base44.entities.EquipmentSuggestions.filter({ setting_key: 'suggestions' });
      return items[0] || { brands: [], refrigerants: [], models: [] };
    }
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['all-equipment', sessionTechEmail],
    queryFn: async () => {
      if (isTechSession) {
        const r = await proxyCall('equipment');
        return r.data || [];
      }
      return base44.entities.Equipment.list();
    }
  });

  const filteredBuildings = formData.client_id ?
  buildings.filter((b) => b.client_id === formData.client_id) :
  buildings;

  const equipmentFields = formData.equipment_type ? camposIDAE[formData.equipment_type] : null;

  // Cámara frigorífica: cálculo automático tCO2eq
  const camaraCargaKg = formData.technical_data?.carga_refrigerante || 0;
  const GWP_CAMARA = { 'R290': 0, 'R744': 1, 'R717': 0, 'R404A': 3922, 'R407C': 1774, 'R448A': 1387, 'R449A': 1397, 'R452A': 2140, 'R134a': 1430, 'R410A': 2088, 'R507A': 3985 };
  const camaraGwp = GWP_CAMARA[formData.technical_data?.tipo_refrigerante] || 0;
  const camaraTco2eq = camaraGwp && camaraCargaKg ? +(Number(camaraCargaKg) * camaraGwp / 1000).toFixed(3) : null;

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormData((prev) => ({ ...prev, client_id: data.id }));
      setShowNewClientDialog(false);
      toast.success('Cliente creado');
    }
  });

  const createBuildingMutation = useMutation({
    mutationFn: (data) => base44.entities.Building.create({ ...data, client_id: formData.client_id }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setFormData((prev) => ({ ...prev, building_id: data.id }));
      setShowNewBuildingDialog(false);
      toast.success('Edificio creado');
    }
  });

  const doUpdate = async (id, updates) => {
    if (isTechSession) {
      await proxyCall('equipment_update', { equipment_id: id, updates });
    } else {
      await base44.entities.Equipment.update(id, updates);
    }
  };

  const buildEquipmentPayload = (data) => ({
    reference_name: data.reference_name,
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
    balsa_litros: data.technical_data.balsa_litros ? Number(data.technical_data.balsa_litros) : null,
    technical_data: { ...data.technical_data, custom_fields: data.custom_fields },
    registration_date: data.registration_date,
    installation_date: data.installation_date || null,
    warranty_end: data.warranty_end || null,
    notes: data.notes || '',
    status: data.status,
    photo_url: data.photo_url || existingEquipment?.photo_url || null,
    photos: data.photos || existingEquipment?.photos || [],
    first_revision_date: data.first_revision_date,
    last_revision_date: data.last_revision_date || null,
    unit_type: data.unit_type || 'standalone',
    parent_equipment_id: data.parent_equipment_id || null,
    maintenance_config: {
      monthly_enabled: data.selected_periods.includes('mensual'),
      monthly_fields: data.maintenance_fields.filter((f) => f.periods.includes('mensual')),
      quarterly_enabled: data.selected_periods.includes('trimestral'),
      quarterly_fields: data.maintenance_fields.filter((f) => f.periods.includes('trimestral')),
      biannual_enabled: data.selected_periods.includes('semestral'),
      biannual_fields: data.maintenance_fields.filter((f) => f.periods.includes('semestral')),
      annual_enabled: data.selected_periods.includes('anual'),
      annual_fields: data.maintenance_fields.filter((f) => f.periods.includes('anual'))
    }
  });

  const generateRevisionDates = (data, eqId) => {
    const periodConfig = {
      'mensual': { type: 'monthly', interval: 1, priority: 1 },
      'trimestral': { type: 'quarterly', interval: 3, priority: 2 },
      'semestral': { type: 'biannual', interval: 6, priority: 3 },
      'anual': { type: 'annual', interval: 12, priority: 4 }
    };
    const firstDate = new Date(data.first_revision_date);
    const endDate = data.last_revision_date ? new Date(data.last_revision_date) : null;
    const allRevisionDates = new Map();
    data.selected_periods.forEach((period) => {
      const config = periodConfig[period];
      if (!config) return;
      const maxMonths = endDate ? Math.ceil((endDate - firstDate) / (1000 * 60 * 60 * 24 * 30.44)) : 12;
      const count = Math.max(1, Math.ceil(maxMonths / config.interval));
      for (let i = 0; i < count; i++) {
        const revisionDate = new Date(firstDate);
        revisionDate.setMonth(firstDate.getMonth() + i * config.interval);
        if (endDate && revisionDate > endDate) break;
        const dateKey = format(revisionDate, 'yyyy-MM-dd');
        const existing = allRevisionDates.get(dateKey);
        if (!existing || config.priority > existing.priority) {
          allRevisionDates.set(dateKey, { date: dateKey, type: config.type, priority: config.priority });
        }
      }
    });
    const records = [];
    allRevisionDates.forEach((revision) => {
      records.push({ equipment_id: eqId, client_id: data.client_id, building_id: data.building_id, scheduled_date: revision.date, revision_type: revision.type, status: 'pending' });
    });
    return records;
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updates = buildEquipmentPayload(data);
      await doUpdate(equipmentId, updates);

      // Regenerar revisiones programadas si hay periodicidades y fecha
      if (data.requires_maintenance !== false && data.selected_periods.length > 0 && data.first_revision_date) {
        if (isTechSession) {
          await proxyCall('revisions_delete_pending', { equipment_id: equipmentId });
          const records = generateRevisionDates(data, equipmentId);
          if (records.length > 0) await proxyCall('revisions_bulk_create', { records });
        } else {
          const existingRevisions = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId, status: 'pending' });
          for (const rev of existingRevisions) await base44.entities.ScheduledRevision.delete(rev.id);
          const records = generateRevisionDates(data, equipmentId);
          if (records.length > 0) await base44.entities.ScheduledRevision.bulkCreate(records);
        }
      }

      return existingEquipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      toast.success('Equipo actualizado y revisiones programadas');
      navigate(createPageUrl(`EquipmentDetail?id=${equipmentId}`));
    },
    onError: () => toast.error('Error al actualizar el equipo')
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Actualizar sugerencias
      const newBrand = data.technical_data.marca;
      const newRefrigerant = data.technical_data.tipo_refrigerante;
      const newModel = data.technical_data.modelo;

      if (newBrand || newRefrigerant || newModel) {
        const currentSuggestions = suggestions || { brands: [], refrigerants: [], models: [] };
        const updatedSuggestions = {
          setting_key: 'suggestions',
          brands: newBrand && !currentSuggestions.brands?.includes(newBrand) ?
          [...(currentSuggestions.brands || []), newBrand] :
          currentSuggestions.brands || [],
          refrigerants: newRefrigerant && !currentSuggestions.refrigerants?.includes(newRefrigerant) ?
          [...(currentSuggestions.refrigerants || []), newRefrigerant] :
          currentSuggestions.refrigerants || [],
          models: newModel && !currentSuggestions.models?.includes(newModel) ?
          [...(currentSuggestions.models || []), newModel] :
          currentSuggestions.models || []
        };

        if (suggestions?.id) {
          await base44.entities.EquipmentSuggestions.update(suggestions.id, updatedSuggestions);
        } else {
          await base44.entities.EquipmentSuggestions.create(updatedSuggestions);
        }
      }

      // Técnico que crea el equipo (desde sesión propia)
      const creatingTechName = sessionTechRecord?.name || null;

      // Crear equipo
      const equipmentData = {
        reference_name: data.reference_name,
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
        balsa_litros: data.technical_data.balsa_litros ? Number(data.technical_data.balsa_litros) : null,
        technical_data: { ...data.technical_data, custom_fields: data.custom_fields },
        registration_date: data.registration_date,
        status: data.status,
        photo_url: data.photo_url || null,
        first_revision_date: data.first_revision_date,
        last_revision_date: data.last_revision_date || null,
        unit_type: data.unit_type || 'standalone',
        parent_equipment_id: data.parent_equipment_id || null,
        ...(creatingTechName ? { created_by_name: creatingTechName } : {}),
        maintenance_config: {
          monthly_enabled: data.selected_periods.includes('mensual'),
          monthly_fields: data.maintenance_fields.filter((f) => f.periods.includes('mensual')),
          quarterly_enabled: data.selected_periods.includes('trimestral'),
          quarterly_fields: data.maintenance_fields.filter((f) => f.periods.includes('trimestral')),
          biannual_enabled: data.selected_periods.includes('semestral'),
          biannual_fields: data.maintenance_fields.filter((f) => f.periods.includes('semestral')),
          annual_enabled: data.selected_periods.includes('anual'),
          annual_fields: data.maintenance_fields.filter((f) => f.periods.includes('anual'))
        }
      };

      let equipment;
      if (isTechSession) {
        const r = await proxyCall('equipment_create', { record: equipmentData });
        equipment = r.data;
      } else {
        equipment = await base44.entities.Equipment.create(equipmentData);
      }

      // Generar revisiones programadas solo si requiere mantenimiento
      if (data.requires_maintenance !== false && data.first_revision_date) {
        const records = generateRevisionDates(data, equipment.id);
        if (records.length > 0) {
          if (isTechSession) {
            await proxyCall('revisions_bulk_create', { records });
          } else {
            await base44.entities.ScheduledRevision.bulkCreate(records);
          }
        }
      }

      return equipment;
    },
    onSuccess: (equipment, data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      const message = data.requires_maintenance === false ?
      'Equipo creado sin mantenimiento programado' :
      'Equipo creado y revisiones programadas';
      toast.success(message);
      navigate(createPageUrl(`EquipmentDetail?id=${equipment.id}`));
    },
    onError: () => {
      toast.error('Error al crear el equipo');
    }
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTechnicalDataChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      technical_data: { ...prev.technical_data, [field]: value }
    }));
  };

  const handleToggleField = (field) => {
    setFormData((prev) => {
      const exists = prev.maintenance_fields.find((f) => f.field_key === field.key);
      if (exists) {
        return {
          ...prev,
          maintenance_fields: prev.maintenance_fields.filter((f) => f.field_key !== field.key)
        };
      } else {
        return {
          ...prev,
          maintenance_fields: [...prev.maintenance_fields, {
            field_key: field.key,
            field_label: field.label,
            field_type: field.type,
            options: field.options,
            periods: field.periods
          }]
        };
      }
    });
  };

  // Guarda parcialmente en modo edición al avanzar paso
  const savePartial = async () => {
    if (!equipmentId) return;
    const updates = buildEquipmentPayload(formData);
    await doUpdate(equipmentId, updates);
    toast.success('Cambios guardados');
    queryClient.invalidateQueries({ queryKey: ['equipment-edit', equipmentId] });
  };

  const handleNext = async () => {
    if (equipmentId) await savePartial();
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => {
        // Mantener foto principal; agregar nueva a galería si ya había una
        const existingPhotos = prev.photos || existingEquipment?.photos || [];
        const newPhotos = prev.photo_url ? [...existingPhotos, prev.photo_url].filter((v, i, a) => a.indexOf(v) === i) : existingPhotos;
        return { ...prev, photo_url: file_url, photos: newPhotos };
      });
      toast.success('Foto subida');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCameraScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Usar IA para extraer datos de la imagen
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de una placa de características de un equipo de climatización y extrae todos los datos técnicos que encuentres. Devuelve los datos en formato JSON con las claves en español.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            marca: { type: "string" },
            modelo: { type: "string" },
            numero_serie: { type: "string" },
            potencia_frigorifica: { type: "number" },
            potencia_calorifica: { type: "number" },
            tipo_refrigerante: { type: "string" },
            carga_refrigerante: { type: "number" },
            año_fabricacion: { type: "number" }
          }
        }
      });

      setScannedData(response);
      setFormData((prev) => ({
        ...prev,
        photo_url: file_url,
        technical_data: { ...prev.technical_data, ...response }
      }));
      toast.success('Datos extraídos de la imagen');
    } catch (error) {
      toast.error('Error al procesar la imagen');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = () => {
    if (equipmentId) {
      updateMutation.mutate(formData);
    } else {
      saveMutation.mutate(formData);
    }
  };

  // Calcular potencia para determinar requisitos RITE
  const getTotalPower = () => {
    const cooling = formData.technical_data?.potencia_frigorifica || 0;
    const heating = formData.technical_data?.potencia_calorifica || formData.technical_data?.potencia_nominal || 0;
    const total = formData.technical_data?.potencia_total || 0;
    return Math.max(cooling, heating, total);
  };

  const getRiteRequirements = () => {
    const power = getTotalPower();
    const type = formData.equipment_type;

    if (!type || power === 0) return null;

    if (power <= 70) {
      return {
        category: '5 kW ≤ P ≤ 70 kW',
        maintenance: 'Empresa mantenedora',
        frequency: 'Según tablas 4.1 y 4.2 (menos frecuente)',
        note: 'Mantenimiento simplificado - Revisiones cada temporada (año)'
      };
    } else if (power > 70 && power <= 5000) {
      return {
        category: '70 kW < P ≤ 5.000 kW',
        maintenance: 'Empresa mantenedora autorizada',
        frequency: 'Según tablas 4.1, 4.2, 4.3 y 4.4',
        note: 'Mantenimiento reforzado - Revisiones mensuales y trimestrales obligatorias'
      };
    } else {
      return {
        category: 'P > 5.000 kW',
        maintenance: 'Director de mantenimiento + Empresa mantenedora',
        frequency: 'Según tablas 4.1, 4.2, 4.3 y 4.4',
        note: 'Mantenimiento intensivo - Requiere director de mantenimiento'
      };
    }
  };

  const canProceedStep1 = formData.reference_name && formData.equipment_type && equipmentFields?.identificacion.every((field) =>
  !field.required || formData.technical_data[field.key]
  );
  const canProceedStep2 = formData.client_id && formData.building_id;
  const canProceedStep3 = formData.requires_maintenance !== null && (
  formData.requires_maintenance === false ||
  formData.selected_periods.length > 0 && formData.maintenance_fields.length > 0);

  const canProceedStep4 = formData.first_revision_date && formData.starting_period;

  return (
    <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 p-6 bg-[hsl(var(--card))]">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={equipmentId ? "Editar Equipo" : "Crear Equipo"} />

        {/* Progress */}
        <Card className="p-4 backdrop-blur-sm border-white/20 mb-6 text-[#1f9335] bg-[#ffffff]/[0.1]">
          <div className="flex items-center justify-between">
            {['Datos Técnicos', 'Cliente y Edificio', 'Periodicidad', 'Programar'].map((label, idx) =>
            <div key={idx} className="flex items-center gap-2 text-[#9d4343]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step > idx + 1 ? 'bg-green-500' : step === idx + 1 ? 'bg-blue-500' : ""}`
              }>
                  <span className="text-white text-sm font-medium">{idx + 1}</span>
                </div>
                <span className="text-sm hidden md:block text-gray-950">{label}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Step 1: Datos Técnicos */}
        {step === 1 &&
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6 bg-[#236470]">Datos Técnicos del Equipo</h3>

            {/* Scan/Photo section */}
            <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="text-white font-medium mb-3">Capturar datos con la cámara</h4>
              <div className="flex gap-3">
                <label className="flex-1">
                  <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraScan}
                  className="hidden"
                  disabled={uploadingPhoto} />
                
                  <Button
                  type="button"
                  className="w-full bg-blue-600"
                  disabled={uploadingPhoto}
                  onClick={() => document.querySelector('input[capture="environment"]')?.click()}>
                  
                    {uploadingPhoto ?
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</> :

                  <><Scan className="h-4 w-4 mr-2" /> Escanear placa</>
                  }
                  </Button>
                </label>
                <label className="flex-1">
                  <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto} />
                
                  <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/20 bg-gray-950/[0.05] text-gray-50"
                  disabled={uploadingPhoto}
                  onClick={() => document.querySelector('input[type="file"]:not([capture])')?.click()}>
                  
                    <Upload className="h-4 w-4 mr-2" />
                    Subir foto
                  </Button>
                </label>
              </div>
              {formData.photo_url &&
            <div className="mt-3">
                  <img src={formData.photo_url} alt="Equipo" className="w-full h-40 object-cover rounded-lg" />
                </div>
            }
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Referencia del Equipo (Nombre) *</Label>
                <Input
                value={formData.reference_name}
                onChange={(e) => handleChange('reference_name', e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                placeholder="Ej: Climatizador Planta 2 / Split Oficina Principal" />
              
              </div>

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
                    <SelectItem value="rooftop">Rooftop</SelectItem>
                    <SelectItem value="adiabatico">Enfriamiento Adiabático / Evaporativo</SelectItem>
                    <SelectItem value="produccion_acs">Producción ACS</SelectItem>
                    <SelectItem value="camara_frigorifica">Cámara Frigorífica</SelectItem>
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
                  className="bg-white/5 border-white/20 text-white" />
                
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

                <div>
                  <Label className="text-slate-300">Fecha de Instalación</Label>
                  <Input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => handleChange('installation_date', e.target.value)}
                  className="bg-white/5 border-white/20 text-white" />
                
                </div>

                <div>
                  <Label className="text-slate-300">Fin de Garantía</Label>
                  <Input
                  type="date"
                  value={formData.warranty_end}
                  onChange={(e) => handleChange('warranty_end', e.target.value)}
                  className="bg-white/5 border-white/20 text-white" />
                
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Observaciones</Label>
                <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={3}
                placeholder="Notas adicionales del equipo..." />
              
              </div>

              {/* ── Campos específicos Cámara Frigorífica ── */}
              {formData.equipment_type === 'camara_frigorifica' &&
            <div className="mt-6 p-4 rounded-xl border-2 border-blue-300 bg-blue-50 space-y-4">
                  <p className="text-sm font-bold text-blue-800 flex items-center gap-2">❄️ Datos específicos — Cámara Frigorífica</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700">Marca *</Label>
                      <Input value={formData.technical_data.marca || ''} onChange={(e) => handleTechnicalDataChange('marca', e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Modelo *</Label>
                      <Input value={formData.technical_data.modelo || ''} onChange={(e) => handleTechnicalDataChange('modelo', e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Nº de serie</Label>
                      <Input value={formData.technical_data.numero_serie || ''} onChange={(e) => handleTechnicalDataChange('numero_serie', e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Ubicación</Label>
                      <Input value={formData.technical_data.ubicacion || ''} onChange={(e) => handleTechnicalDataChange('ubicacion', e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Tipo de refrigerante</Label>
                      <Input value={formData.technical_data.tipo_refrigerante || ''} onChange={(e) => handleTechnicalDataChange('tipo_refrigerante', e.target.value)} className="bg-white" list="camara-ref-list" placeholder="R290, R744, R404A..." />
                      <datalist id="camara-ref-list">
                        {Object.keys(GWP_CAMARA).map((r) => <option key={r} value={r} />)}
                      </datalist>
                    </div>
                    <div>
                      <Label className="text-slate-700">Clasificación de Seguridad</Label>
                      <Select value={formData.technical_data.clasificacion_seguridad || ''} onValueChange={(v) => handleTechnicalDataChange('clasificacion_seguridad', v)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A1">A1 — Alta seguridad (no inflamable, baja toxicidad)</SelectItem>
                          <SelectItem value="A2L">A2L — Baja inflamabilidad (R32, R1234yf…)</SelectItem>
                          <SelectItem value="A2">A2 — Inflamable</SelectItem>
                          <SelectItem value="A3">A3 — Altamente inflamable (R290, R600a…)</SelectItem>
                          <SelectItem value="B1">B1 — Baja toxicidad, no inflamable</SelectItem>
                          <SelectItem value="B2L">B2L — Baja toxicidad, baja inflamabilidad</SelectItem>
                          <SelectItem value="B2">B2 — Baja toxicidad, inflamable</SelectItem>
                          <SelectItem value="B3">B3 — Baja toxicidad, altamente inflamable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-700">Carga de refrigerante (kg)</Label>
                      <Input type="number" value={formData.technical_data.carga_refrigerante || ''} onChange={(e) => handleTechnicalDataChange('carga_refrigerante', e.target.value)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-slate-700">tCO₂eq (calculado automáticamente)</Label>
                      <div className={`h-9 px-3 flex items-center rounded-md border text-sm font-semibold ${camaraTco2eq !== null && camaraTco2eq >= 5 ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        {camaraTco2eq !== null ? `${camaraTco2eq} tCO₂eq` : 'Introduce carga y refrigerante'}
                      </div>
                      {camaraTco2eq !== null &&
                  <p className="text-xs text-slate-500 mt-0.5">
                          {camaraCargaKg} kg × GWP {camaraGwp} / 1000 = {camaraTco2eq} tCO₂eq
                          {camaraTco2eq >= 500 ? ' · Control fugas cada 3 meses' : camaraTco2eq >= 50 ? ' · Control fugas cada 6 meses' : camaraTco2eq >= 5 ? ' · Control fugas anual' : ''}
                        </p>
                  }
                    </div>
                    <div>
                      <Label className="text-slate-700">Temperatura mínima permitida (°C) — APPCC</Label>
                      <Input type="number" value={formData.technical_data.temp_min_appcc || ''} onChange={(e) => handleTechnicalDataChange('temp_min_appcc', e.target.value)} className="bg-white" placeholder="ej: -25" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Temperatura máxima permitida (°C) — APPCC</Label>
                      <Input type="number" value={formData.technical_data.temp_max_appcc || ''} onChange={(e) => handleTechnicalDataChange('temp_max_appcc', e.target.value)} className="bg-white" placeholder="ej: 4" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Espesor aislamiento (mm)</Label>
                      <Input type="number" value={formData.technical_data.espesor_aislamiento_mm || ''} onChange={(e) => handleTechnicalDataChange('espesor_aislamiento_mm', e.target.value)} className="bg-white" placeholder="ej: 100" />
                    </div>
                    <div>
                      <Label className="text-slate-700">Tipo de panel (opcional)</Label>
                      <Select value={formData.technical_data.tipo_panel || ''} onValueChange={(v) => handleTechnicalDataChange('tipo_panel', v)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="poliuretano">Poliuretano (PUR)</SelectItem>
                          <SelectItem value="poliisocianurato">Poliisocianurato (PIR)</SelectItem>
                          <SelectItem value="lana_roca">Lana de roca</SelectItem>
                          <SelectItem value="eps">EPS (Poliestireno expandido)</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-700">Detector de fugas instalado</Label>
                      <Select value={formData.technical_data.detector_fugas || ''} onValueChange={(v) => handleTechnicalDataChange('detector_fugas', v)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí — con detector</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.technical_data.detector_fugas === 'si' && camaraTco2eq !== null && camaraTco2eq >= 5 &&
                  <p className="text-xs text-emerald-700 mt-0.5">✓ Con detector: el intervalo de control de fugas se duplica</p>
                  }
                    </div>
                  </div>
                </div>
            }

              {equipmentFields &&
            <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {equipmentFields.identificacion.map((field) =>
                <div key={field.key}>
                        <Label className="text-slate-300">{field.label}</Label>
                        {field.type === 'select' ?
                  <Select
                    value={formData.technical_data[field.key] || ''}
                    onValueChange={(v) => handleTechnicalDataChange(field.key, v)}>
                    
                            <SelectTrigger className="bg-white/5 border-white/20 text-white">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) =>
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      )}
                            </SelectContent>
                          </Select> :
                  field.key === 'marca' ?
                  <>
                            <Input
                      type={field.type}
                      value={formData.technical_data[field.key] || ''}
                      onChange={(e) => handleTechnicalDataChange(field.key, e.target.value)}
                      list="brands-list"
                      className="bg-white/5 border-white/20 text-white"
                      required={field.required} />
                    
                            <datalist id="brands-list">
                              {suggestions?.brands?.map((brand) =>
                      <option key={brand} value={brand} />
                      )}
                            </datalist>
                          </> :
                  field.key === 'tipo_refrigerante' ?
                  <>
                            <Input
                      type={field.type}
                      value={formData.technical_data[field.key] || ''}
                      onChange={(e) => handleTechnicalDataChange(field.key, e.target.value)}
                      list="refrigerants-list"
                      className="bg-white/5 border-white/20 text-white"
                      required={field.required} />
                    
                            <datalist id="refrigerants-list">
                              {suggestions?.refrigerants?.map((ref) =>
                      <option key={ref} value={ref} />
                      )}
                            </datalist>
                          </> :

                  <Input
                    type={field.type}
                    value={formData.technical_data[field.key] || ''}
                    onChange={(e) => handleTechnicalDataChange(field.key, e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    required={field.required} />

                  }
                      </div>
                )}
                  </div>

                  {/* Custom Fields */}
                  <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-slate-300">Datos Adicionales Personalizados</Label>
                      <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fieldName = prompt('Nombre del campo:');
                      if (!fieldName) return;
                      const fieldValue = prompt('Valor:');
                      if (fieldValue === null) return;
                      setFormData((prev) => ({
                        ...prev,
                        custom_fields: [...(prev.custom_fields || []), { name: fieldName, value: fieldValue }]
                      }));
                    }}
                    className="bg-white/5 border-white/20 text-white">
                    
                        + Añadir campo
                      </Button>
                    </div>
                    {formData.custom_fields?.length > 0 &&
                <div className="space-y-2">
                        {formData.custom_fields.map((field, idx) =>
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-white/5">
                            <span className="text-slate-300 text-sm flex-1">{field.name}: {field.value}</span>
                            <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          custom_fields: prev.custom_fields.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                      
                              ×
                            </Button>
                          </div>
                  )}
                      </div>
                }
                  </div>
                </>
            }
            </div>

            <div className="flex justify-between mt-6">
              <div>
                {equipmentId &&
              <Button onClick={savePartial} variant="outline" className="bg-green-600/20 border-green-500/40 text-green-300 hover:bg-green-600/30">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </Button>
              }
              </div>
              <Button onClick={handleNext} disabled={!canProceedStep1} className="bg-blue-600">
                <ArrowRight className="h-4 w-4 mr-2" />
                Siguiente
              </Button>
            </div>
          </Card>
        }

        {/* Step 2: Cliente, Edificio y Relaciones */}
        {step === 2 &&
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Cliente, Edificio y Relaciones</h3>
            
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
                      {clients.map((c) =>
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    )}
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
                      {filteredBuildings.map((b) =>
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" onClick={() => setShowNewBuildingDialog(true)} disabled={!formData.client_id} className="bg-blue-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Unit Type and Relations - Solo para Split y VRF */}
              {(formData.equipment_type === 'split' || formData.equipment_type === 'vrf') &&
            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <Label className="text-slate-300 mb-3 block">¿Es unidad exterior o interior?</Label>
                  <Select value={formData.unit_type} onValueChange={(v) => {
                handleChange('unit_type', v);
                handleChange('parent_equipment_id', '');
              }}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white mb-4">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exterior">Unidad Exterior</SelectItem>
                      <SelectItem value="interior">Unidad Interior</SelectItem>
                      <SelectItem value="standalone">Independiente</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.unit_type === 'interior' && formData.building_id &&
              <div className="space-y-3">
                      <Label className="text-slate-300">¿Está relacionada con una unidad exterior existente?</Label>
                      <Select value={formData.parent_equipment_id} onValueChange={(v) => handleChange('parent_equipment_id', v)}>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="No / Crear nueva unidad exterior" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>No / Crear nueva unidad exterior</SelectItem>
                          {allEquipment?.
                    filter((eq) =>
                    eq.building_id === formData.building_id &&
                    eq.unit_type === 'exterior' && (
                    eq.equipment_type === 'split' || eq.equipment_type === 'vrf')
                    ).
                    map((eq) =>
                    <SelectItem key={eq.id} value={eq.id}>
                                {eq.brand} {eq.model} - {eq.location}
                              </SelectItem>
                    )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">
                        Si no está relacionada con una unidad exterior existente, déjalo en blanco y créala después
                      </p>
                    </div>
              }
                </div>
            }
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <div className="flex gap-2">
                {equipmentId &&
              <Button onClick={savePartial} variant="outline" className="bg-green-600/20 border-green-500/40 text-green-300 hover:bg-green-600/30">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
              }
                <Button onClick={handleNext} disabled={!canProceedStep2} className="bg-blue-600">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Siguiente
                </Button>
              </div>
            </div>
          </Card>
        }

        {/* Step 3: Configuración de Mantenimiento */}
        {step === 3 && equipmentFields &&
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Configurar Mantenimiento</h3>

            <div className="space-y-6">
              {/* Pregunta si requiere mantenimiento */}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Label className="text-slate-300 mb-3 block text-lg">¿Este equipo requiere mantenimiento periódico?</Label>
                <div className="flex gap-4">
                  <Button
                  type="button"
                  onClick={() => handleChange('requires_maintenance', true)}
                  className={formData.requires_maintenance === true ? 'bg-blue-600' : 'bg-white/5'}>
                  
                    Sí
                  </Button>
                  <Button
                  type="button"
                  onClick={() => handleChange('requires_maintenance', false)}
                  className={formData.requires_maintenance === false ? 'bg-blue-600' : 'bg-white/5'}>
                  
                    No
                  </Button>
                </div>
              </div>

              {formData.requires_maintenance === true &&
            <>
                  {/* Requisitos RITE según potencia */}
                  {getTotalPower() > 0 && getRiteRequirements() &&
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <h4 className="text-white font-semibold mb-2">📋 Requisitos RITE según Potencia</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-200">
                          <strong>Categoría:</strong> {getRiteRequirements().category}
                        </p>
                        <p className="text-blue-200">
                          <strong>Potencia Total:</strong> {getTotalPower()} kW
                        </p>
                        <p className="text-blue-200">
                          <strong>Mantenimiento:</strong> {getRiteRequirements().maintenance}
                        </p>
                        <p className="text-blue-200">
                          <strong>Frecuencia:</strong> {getRiteRequirements().frequency}
                        </p>
                        <p className="text-blue-300 text-xs mt-2 italic">
                          {getRiteRequirements().note}
                        </p>
                      </div>
                    </div>
              }

                  <div>
                <Label className="text-slate-300 mb-3 block">Selecciona las periodicidades *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {periodicidades.map((p) =>
                  <div key={p.value} className="flex items-center gap-2">
                      <Checkbox
                      id={p.value}
                      checked={formData.selected_periods.includes(p.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleChange('selected_periods', [...formData.selected_periods, p.value]);
                        } else {
                          handleChange('selected_periods', formData.selected_periods.filter((v) => v !== p.value));
                        }
                      }}
                      className="border-white/30" />
                    
                      <Label htmlFor={p.value} className="text-slate-300">{p.label}</Label>
                    </div>
                  )}
                </div>
              </div>

              {formData.selected_periods.length > 0 &&
              <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-slate-300">Datos a recoger según RITE-IT3 *</Label>
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fieldName = prompt('Nombre del campo:');
                      if (!fieldName) return;

                      const fieldLabel = prompt('Etiqueta del campo:');
                      if (!fieldLabel) return;

                      const fieldType = prompt('Tipo de campo (text/number/select/checkbox):');
                      if (!fieldType || !['text', 'number', 'select', 'checkbox'].includes(fieldType)) {
                        toast.error('Tipo de campo inválido');
                        return;
                      }

                      let options = null;
                      if (fieldType === 'select') {
                        const optionsStr = prompt('Opciones separadas por coma:');
                        if (optionsStr) {
                          options = optionsStr.split(',').map((o) => o.trim());
                        }
                      }

                      setFormData((prev) => ({
                        ...prev,
                        maintenance_fields: [...prev.maintenance_fields, {
                          field_key: fieldName.toLowerCase().replace(/\s/g, '_'),
                          field_label: fieldLabel,
                          field_type: fieldType,
                          options: options,
                          periods: prev.selected_periods
                        }]
                      }));
                      toast.success('Campo añadido');
                    }}
                    className="bg-white/5 border-white/20 text-white">
                    
                      + Añadir campo manual
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {equipmentFields.parametros.map((param) => {
                    const availablePeriods = param.periods.filter((p) => formData.selected_periods.includes(p));
                    if (availablePeriods.length === 0) return null;

                    const isSelected = formData.maintenance_fields.find((f) => f.field_key === param.key);

                    return (
                      <div key={param.key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <Checkbox
                          id={param.key}
                          checked={!!isSelected}
                          onCheckedChange={() => handleToggleField(param)}
                          className="border-white/30" />
                        
                          <div className="flex-1">
                            <Label htmlFor={param.key} className="text-slate-300 cursor-pointer">
                              {param.label}
                            </Label>
                            <div className="flex gap-2 mt-1">
                              {availablePeriods.map((p) =>
                            <span key={p} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                                  {periodicidades.find((per) => per.value === p)?.label}
                                </span>
                            )}
                            </div>
                          </div>
                        </div>);

                  })}
                  </div>
                </div>
              }

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-slate-300 text-sm">
                      <strong>{formData.maintenance_fields.length}</strong> datos seleccionados para las revisiones
                    </p>
                  </div>
                </>
            }

              {formData.requires_maintenance === false &&
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-green-300 text-sm">
                    El equipo se creará sin programación de mantenimiento. Puedes configurarlo más tarde si es necesario.
                  </p>
                </div>
            }
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <div className="flex gap-2">
              {equipmentId &&
              <Button onClick={savePartial} variant="outline" className="bg-green-600/20 border-green-500/40 text-green-300 hover:bg-green-600/30">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              }
              {formData.requires_maintenance === false ?
              <Button
                onClick={() => {
                  const dataToSubmit = {
                    ...formData,
                    selected_periods: [],
                    maintenance_fields: [],
                    first_revision_date: null,
                    starting_period: null
                  };
                  saveMutation.mutate(dataToSubmit);
                }}
                disabled={saveMutation.isPending}
                className="bg-green-600">
                
                  {saveMutation.isPending ?
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> :

                <><Save className="h-4 w-4 mr-2" /> Crear Equipo</>
                }
                </Button> :

              <Button onClick={handleNext} disabled={!canProceedStep3} className="bg-blue-600">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Siguiente
                </Button>
              }
              </div>
            </div>
          </Card>
        }

        {/* Step 4: Programar Primera Revisión */}
        {step === 4 &&
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Programar Revisiones</h3>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Fecha de Primera Revisión *</Label>
                <Input
                type="date"
                value={formData.first_revision_date}
                onChange={(e) => handleChange('first_revision_date', e.target.value)}
                className="bg-white/5 border-white/20 text-white" />
              
              </div>

              <div>
                <Label className="text-slate-300">Fecha Fin de Revisiones (opcional)</Label>
                <Input
                type="date"
                value={formData.last_revision_date}
                min={formData.first_revision_date}
                onChange={(e) => handleChange('last_revision_date', e.target.value)}
                className="bg-white/5 border-white/20 text-white" />
              
                <p className="text-xs text-slate-400 mt-1">Si no se indica, se generará 1 año de revisiones</p>
              </div>

              <div>
                <Label className="text-slate-300">Tipo de Primera Revisión *</Label>
                <Select value={formData.starting_period} onValueChange={(v) => handleChange('starting_period', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.selected_periods.map((periodValue) => {
                    const period = periodicidades.find((p) => p.value === periodValue);
                    return (
                      <SelectItem key={periodValue} value={periodValue}>
                          {period?.label}
                        </SelectItem>);

                  })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">
                  Las revisiones se programarán automáticamente en la agenda durante todo el año
                </p>
              </div>

              {formData.starting_period &&
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="text-white font-medium mb-2">Plan de Mantenimiento</h4>
                  <p className="text-slate-300 text-sm">
                    Se crearán revisiones para: {formData.selected_periods.map((p) =>
                periodicidades.find((per) => per.value === p)?.label
                ).join(', ')}
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    <strong>Primera revisión:</strong> {periodicidades.find((p) => p.value === formData.starting_period)?.label} - {formData.first_revision_date && format(new Date(formData.first_revision_date), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Las revisiones aparecerán en el calendario y podrás realizarlas desde allí
                  </p>
                </div>
            }
            </div>

            <div className="flex justify-between mt-6">
              <Button onClick={handleBack} variant="outline" className="bg-white/5 border-white/20 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
              <Button
              onClick={handleSubmit}
              disabled={(equipmentId ? updateMutation.isPending : saveMutation.isPending) || !canProceedStep4}
              className="bg-green-600">
              
                {(equipmentId ? updateMutation.isPending : saveMutation.isPending) ?
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {equipmentId ? 'Actualizando...' : 'Creando...'}</> :

              <><Save className="h-4 w-4 mr-2" /> {equipmentId ? 'Actualizar Equipo' : 'Crear Equipo'}</>
              }
              </Button>
            </div>
          </Card>
        }

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
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" />
                
              </div>
              <div>
                <Label className="text-slate-300">CIF *</Label>
                <Input
                  value={newClient.cif}
                  onChange={(e) => setNewClient({ ...newClient, cif: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" />
                
              </div>
              <div>
                <Label className="text-slate-300">Ciudad</Label>
                <Input
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" />
                
              </div>
              <Button
                onClick={() => createClientMutation.mutate(newClient)}
                disabled={!newClient.name || !newClient.cif || createClientMutation.isPending}
                className="w-full">
                
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
                  onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" />
                
              </div>
              <div>
                <Label className="text-slate-300">Dirección *</Label>
                <Input
                  value={newBuilding.address}
                  onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" />
                
              </div>
              <Button
                onClick={() => createBuildingMutation.mutate(newBuilding)}
                disabled={!newBuilding.name || !newBuilding.address || createBuildingMutation.isPending}
                className="w-full">
                
                {createBuildingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Edificio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}