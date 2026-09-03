import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Edit, MapPin, Calendar, FileText,
  Snowflake, Flame, Wind, Droplet,
  Shield, Trash2, Wrench, ToggleLeft, ToggleRight, Save, X, AlertTriangle, User } from
'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EquipmentDocuments from '../components/equipment/EquipmentDocuments';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import ScheduledRevisionsList from '../components/equipment/ScheduledRevisionsList';
import RevisionsTab from '../components/equipment/RevisionsTab';
import InterventionsTab from '../components/equipment/InterventionsTab';
import PhotosTab from '../components/equipment/PhotosTab';
import EditableNotes from '../components/equipment/EditableNotes';
import EquipmentReport from '../components/reports/EquipmentReport';
import RevisionsReport from '../components/reports/RevisionsReport';
import MaintenancePlan from '../components/equipment/MaintenancePlan';
import COPCalculator from '../components/calculators/COPCalculator';
import SparePartsTab from '../components/equipment/SparePartsTab';
import EquipmentIncidents from '../components/equipment/EquipmentIncidents';
import FGasTab from '../components/equipment/FGasTab';
import LDTab from '../components/equipment/LDTab';
import LibroRegistroTab from '../components/equipment/LibroRegistroTab';
import NfcAssignButton from '../components/equipment/NfcAssignButton';

import { format, isValid } from 'date-fns';

const safeFormat = (value, pattern) => {
  if (!value) return '';
  const dt = new Date(value);
  return isValid(dt) ? format(dt, pattern) : '';
};
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// GWP inline para mostrar cálculos en ficha (mismo dataset que FGasTab)
const GWP_TABLE_INLINE = {
  'R32': 675, 'R134a': 1430, 'R404A': 3922, 'R407A': 2107, 'R407C': 1774,
  'R407F': 1825, 'R407H': 1495, 'R410A': 2088, 'R448A': 1387, 'R449A': 1397,
  'R452A': 2140, 'R452B': 676, 'R454B': 466, 'R507A': 3985, 'R513A': 631,
  'R290': 0, 'R600a': 0, 'R744': 1, 'R717': 0, 'R1234yf': 0.501, 'R1234ze': 1.37,
  'R23': 14800, 'R125': 3500, 'R143a': 4470, 'R152a': 124, 'R227ea': 3220,
  'R236fa': 9810, 'R245fa': 1030, 'R365mfc': 794, 'R417A': 2346, 'R422A': 3143,
  'R422D': 2729, 'R427A': 2138, 'R437A': 1805, 'R438A': 2265, 'R442A': 1888,
  'R449B': 1412, 'R449C': 1396, 'R450A': 601, 'R454A': 239, 'R454C': 148,
  'R455A': 148, 'R457A': 139, 'R458A': 702, 'R459A': 444, 'R466A': 733
};

const equipmentTypeLabels = {
  split_mural: 'Split Mural',
  split_cassette: 'Split Cassette',
  split_conductos: 'Split Conductos',
  climatizador: 'Climatizador',
  enfriadora: 'Enfriadora',
  caldera: 'Caldera',
  bomba_calor: 'Bomba de calor',
  vrf: 'VRF / Caudal Variable',
  fancoil: 'Fancoil',
  uta: 'UTA',
  rooftop: 'Rooftop',
  torre_refrigeracion: 'Torre de refrigeración',
  otro: 'Otro'
};

const statusInfo = {
  operational: { label: 'Operativo', color: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-100 text-amber-800', icon: '⚠' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-100 text-red-800', icon: '✕' }
};

export default function EquipmentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [specs, setSpecs] = useState({});
  const queryClient = useQueryClient();

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-detail'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech
  });
  const isAdminUser = !isSessionTech && currentUser?.role === 'admin';

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Equipment.delete(equipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipo eliminado correctamente');
      navigate(createPageUrl('Equipment'));
    },
    onError: () => {
      toast.error('Error al eliminar el equipo');
    }
  });

  const handleDelete = async () => {
    if (isSessionTech) {
      setDeleting(true);
      try {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'equipment_delete',
          equipment_id: equipmentId
        });
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        queryClient.invalidateQueries({ queryKey: ['proxy-equipment-list', sessionTechEmail] });
        toast.success('Equipo eliminado correctamente');
        navigate(createPageUrl('Equipment'));
      } catch {
        toast.error('Error al eliminar el equipo');
      } finally {
        setDeleting(false);
      }
    } else {
      deleteMutation.mutate();
    }
  };

  const toggleEquipmentStatusMutation = useMutation({
    mutationFn: async (currentStatus) => {
      const newStatus = currentStatus === 'out_of_service' ? 'operational' : 'out_of_service';
      await base44.entities.Equipment.update(equipmentId, { status: newStatus });
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      toast.success(newStatus === 'out_of_service' ? 'Equipo desactivado' : 'Equipo activado');
    }
  });

  // Proxy para técnicos de sesión propia
  const { data: proxyData } = useQuery({
    queryKey: ['proxy-equipment-detail', equipmentId, sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'equipment_detail', equipment_id: equipmentId
      });
      return res.data?.data || null;
    },
    enabled: isSessionTech && !!equipmentId
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0] || null;
    },
    enabled: !isSessionTech && !!equipmentId
  });

  const { data: building } = useQuery({
    queryKey: ['building-equipment', equipment?.building_id],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: equipment.building_id });
      return buildings[0] || null;
    },
    enabled: !isSessionTech && !!equipment?.building_id
  });

  const { data: client } = useQuery({
    queryKey: ['client-equipment', equipment?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: equipment.client_id });
      return clients[0] || null;
    },
    enabled: !isSessionTech && !!equipment?.client_id
  });

  // Datos finales
  const finalEquipment = isSessionTech ? proxyData?.equipment : equipment;
  const finalBuilding = isSessionTech ? proxyData?.building : building;
  const finalClient = isSessionTech ? proxyData?.client : client;
  const isLoadingFinal = isSessionTech ? !proxyData && !!equipmentId : isLoading;

  const { data: scheduledRevisions = [] } = useQuery({
    queryKey: ['scheduled-revisions', equipmentId],
    queryFn: async () => {
      const all = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId });
      return all.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!equipmentId
  });

  // Related equipment
  const { data: parentEquipment } = useQuery({
    queryKey: ['parent-equipment', equipment?.parent_equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipment.parent_equipment_id });
      return items[0] || null;
    },
    enabled: !!equipment?.parent_equipment_id
  });

  const { data: childEquipment = [] } = useQuery({
    queryKey: ['child-equipment', equipmentId],
    queryFn: async () => {
      return await base44.entities.Equipment.filter({ parent_equipment_id: equipmentId });
    },
    enabled: !isSessionTech && !!equipmentId && equipment?.unit_type === 'exterior'
  });

  // Para técnicos: lista de equipos de la empresa para derivar hijos/padre
  const { data: proxyEquipmentList = [] } = useQuery({
    queryKey: ['proxy-equipment-list', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'equipment' });
      return res.data?.data || [];
    },
    enabled: isSessionTech && !!equipmentId
  });
  const proxyChildren = proxyEquipmentList.filter((e) => e.parent_equipment_id === equipmentId);
  const proxyParent = proxyEquipmentList.find((e) => e.id === finalEquipment?.parent_equipment_id) || null;
  const finalChildren = isSessionTech ? proxyChildren : childEquipment;
  const finalParent = isSessionTech ? proxyParent : parentEquipment;

  const updateSpecsMutation = useMutation({
    mutationFn: async (data) => {
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'equipment_update',
          equipment_id: equipmentId,
          updates: data
        });
      } else {
        await base44.entities.Equipment.update(equipmentId, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['proxy-equipment-detail', equipmentId, sessionTechEmail] });
      setEditingSpecs(false);
      toast.success('Datos actualizados');
    },
    onError: () => toast.error('Error al guardar')
  });

  const handleEditSpecs = () => {
    const eq = finalEquipment || equipment || {};
    setSpecs({
      cooling_power_kw: eq.cooling_power_kw || '',
      heating_power_kw: eq.heating_power_kw || '',
      refrigerant_type: eq.refrigerant_type || '',
      refrigerant_charge_kg: eq.refrigerant_charge_kg || '',
      location: eq.location || '',
      balsa_litros: eq.balsa_litros || ''
    });
    setEditingSpecs(true);
  };

  const handleSaveSpecs = () => {
    updateSpecsMutation.mutate({
      cooling_power_kw: specs.cooling_power_kw ? Number(specs.cooling_power_kw) : null,
      heating_power_kw: specs.heating_power_kw ? Number(specs.heating_power_kw) : null,
      refrigerant_type: specs.refrigerant_type || '',
      refrigerant_charge_kg: specs.refrigerant_charge_kg ? Number(specs.refrigerant_charge_kg) : null,
      location: specs.location || '',
      balsa_litros: specs.balsa_litros ? Number(specs.balsa_litros) : null
    });
  };

  // Calcular última y próxima revisión
  const completedRevisions = scheduledRevisions.filter((r) => r.status === 'completed');
  const pendingRevisions = scheduledRevisions.filter((r) => r.status === 'pending');

  const lastRevision = completedRevisions.length > 0 ?
  completedRevisions.sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0] :
  null;

  const nextRevision = pendingRevisions.length > 0 ?
  pendingRevisions[0] :
  null;



  if (isLoadingFinal) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>);

  }

  if (!finalEquipment) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-slate-500">Equipo no encontrado</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={finalEquipment.reference_name || `${finalEquipment.brand} ${finalEquipment.model}`} />

        {/* Status Overview Card */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {finalEquipment.photo_url &&
            <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden bg-slate-100">
                  <img
                  src={finalEquipment.photo_url}
                  alt={`${finalEquipment.brand} ${finalEquipment.model}`}
                  className="w-full h-full object-cover" />
                
                </div>
                <COPCalculator equipment={finalEquipment} />
              </div>
            }
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-800">
                      {finalEquipment.reference_name || `${finalEquipment.brand} ${finalEquipment.model}`}
                    </h2>
                    <StatusBadge status={finalEquipment.status || 'operational'} />
                  </div>
                  {finalEquipment.reference_name &&
                  <p className="text-base text-slate-600 font-medium mb-1">
                      {finalEquipment.brand} {finalEquipment.model}
                    </p>
                  }
                  <p className="text-slate-500 text-sm">
                    {equipmentTypeLabels[finalEquipment.equipment_type] || finalEquipment.equipment_type}
                    {finalEquipment.serial_number && ` · S/N: ${finalEquipment.serial_number}`}
                  </p>
                  {finalBuilding &&
                  <Link
                    to={createPageUrl(`BuildingDetail?id=${finalBuilding.id}`)}
                    className="text-sm text-blue-600 hover:underline">
                    
                      {finalBuilding.name}
                    </Link>
                  }
                  {finalEquipment.created_by_name && (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <User className="h-3.5 w-3.5" />
                      Creado por: {finalEquipment.created_by_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <EquipmentReport
                    equipment={finalEquipment}
                    building={finalBuilding}
                    client={finalClient} />
                  
                  <RevisionsReport
                    equipment={finalEquipment}
                    building={finalBuilding}
                    client={finalClient}
                    revisions={scheduledRevisions} />
                  
                  <NfcAssignButton
                    equipmentId={finalEquipment.id}
                    isSessionTech={isSessionTech}
                    sessionTechEmail={sessionTechEmail}
                    onAssigned={() => {
                      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
                      queryClient.invalidateQueries({ queryKey: ['proxy-equipment-detail', equipmentId, sessionTechEmail] });
                    }}
                  />
                  <Link to={createPageUrl(`EquipmentForm?id=${finalEquipment.id}`)}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  {!isSessionTech &&
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEquipmentStatusMutation.mutate(finalEquipment.status || 'operational')}
                      disabled={toggleEquipmentStatusMutation.isPending}
                      className={finalEquipment.status === 'out_of_service' ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-600'}>
                      {finalEquipment.status === 'out_of_service' ?
                      <><ToggleRight className="h-4 w-4 mr-2" />Activar</> :
                      <><ToggleLeft className="h-4 w-4 mr-2" />Desactivar</>
                      }
                  </Button>
                  }
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-slate-50">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 ${
                  finalEquipment.status === 'operational' ? 'bg-emerald-100' :
                  finalEquipment.status === 'maintenance_needed' ? 'bg-amber-100' : 'bg-red-100'}`
                  }>
                    <Shield className={`h-5 w-5 ${
                    finalEquipment.status === 'operational' ? 'text-emerald-600' :
                    finalEquipment.status === 'maintenance_needed' ? 'text-amber-600' : 'text-red-600'}`
                    } />
                  </div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="text-sm font-medium text-slate-700">
                    {statusInfo[finalEquipment.status]?.label || 'Operativo'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-slate-500">Última revisión</p>
                  <p className="text-sm font-medium text-slate-700">
                    {lastRevision?.completed_date ?
                    (safeFormat(lastRevision.completed_date, 'dd/MM/yy') || 'Sin datos') :
                    'Sin datos'}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 ${
                  nextRevision && new Date(nextRevision.scheduled_date) < new Date() ?
                  'bg-red-100' : 'bg-purple-100'}`
                  }>
                    <Wrench className={`h-5 w-5 ${
                    nextRevision && new Date(nextRevision.scheduled_date) < new Date() ?
                    'text-red-600' : 'text-purple-600'}`
                    } />
                  </div>
                  <p className="text-xs text-slate-500">Próxima revisión</p>
                  <p className={`text-sm font-medium ${
                  nextRevision && new Date(nextRevision.scheduled_date) < new Date() ?
                  'text-red-600' : 'text-slate-700'}`
                  }>
                    {nextRevision?.scheduled_date ?
                    (safeFormat(nextRevision.scheduled_date, 'dd/MM/yy') || 'No programada') :
                    'No programada'}
                  </p>
                </div>
              </div>

              {editingSpecs ?
              <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />Ubicación</p>
                      <Input value={specs.location} onChange={(e) => setSpecs((p) => ({ ...p, location: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Snowflake className="h-3 w-3 text-blue-400" />Pot. Frigorífica (kW)</p>
                      <Input type="number" value={specs.cooling_power_kw} onChange={(e) => setSpecs((p) => ({ ...p, cooling_power_kw: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />Pot. Calorífica (kW)</p>
                      <Input type="number" value={specs.heating_power_kw} onChange={(e) => setSpecs((p) => ({ ...p, heating_power_kw: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Wind className="h-3 w-3" />Refrigerante</p>
                      <Input
                      value={specs.refrigerant_type}
                      onChange={(e) => setSpecs((p) => ({ ...p, refrigerant_type: e.target.value }))}
                      className="h-8 text-sm"
                      list="refrigerant-list-detail"
                      placeholder="ej: R410A, R32..." />
                    
                      <datalist id="refrigerant-list-detail">
                        {Object.keys(GWP_TABLE_INLINE).map((r) => <option key={r} value={r} />)}
                      </datalist>
                      {specs.refrigerant_type && GWP_TABLE_INLINE[specs.refrigerant_type] !== undefined &&
                    <p className="text-xs text-blue-600 mt-0.5">
                          GWP: {GWP_TABLE_INLINE[specs.refrigerant_type]}
                          {specs.refrigerant_charge_kg && ` · ${(Number(specs.refrigerant_charge_kg) * GWP_TABLE_INLINE[specs.refrigerant_type] / 1000).toFixed(3)} tCO₂eq`}
                        </p>
                    }
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Droplet className="h-3 w-3 text-cyan-400" />Carga refrigerante (kg)</p>
                      <Input type="number" value={specs.refrigerant_charge_kg} onChange={(e) => setSpecs((p) => ({ ...p, refrigerant_charge_kg: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    {finalEquipment.equipment_type === 'adiabatico' &&
                  <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Droplet className="h-3 w-3 text-blue-400" />Volumen balsa (L)</p>
                        <Input type="number" value={specs.balsa_litros} onChange={(e) => setSpecs((p) => ({ ...p, balsa_litros: e.target.value }))} className="h-8 text-sm" placeholder="Ej: 72" />
                      </div>
                  }
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveSpecs} disabled={updateSpecsMutation.isPending} className="bg-blue-600">
                      <Save className="h-3 w-3 mr-1" />Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSpecs(false)}>
                      <X className="h-3 w-3 mr-1" />Cancelar
                    </Button>
                  </div>
                </div> :

              <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {finalEquipment.location &&
                  <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Ubicación</p>
                          <p className="text-sm text-slate-700">{finalEquipment.location}</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.cooling_power_kw &&
                  <div className="flex items-start gap-2">
                        <Snowflake className="h-4 w-4 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Pot. Frigorífica</p>
                          <p className="text-sm text-slate-700">{finalEquipment.cooling_power_kw} kW</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.heating_power_kw &&
                  <div className="flex items-start gap-2">
                        <Flame className="h-4 w-4 text-orange-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Pot. Calorífica</p>
                          <p className="text-sm text-slate-700">{finalEquipment.heating_power_kw} kW</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.refrigerant_type &&
                  <div className="flex items-start gap-2">
                        <Wind className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Refrigerante</p>
                          <p className="text-sm text-slate-700">{finalEquipment.refrigerant_type}</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.refrigerant_charge_kg &&
                  <div className="flex items-start gap-2">
                        <Droplet className="h-4 w-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Carga</p>
                          <p className="text-sm text-slate-700">{finalEquipment.refrigerant_charge_kg} kg</p>
                          {finalEquipment.refrigerant_type && (() => {
                        const gwpVal = GWP_TABLE_INLINE[finalEquipment.refrigerant_type] ?? finalEquipment.gwp;
                        if (!gwpVal && gwpVal !== 0) return null;
                        const tco2 = finalEquipment.refrigerant_charge_kg * gwpVal / 1000;
                        return (
                          <p className="text-xs text-slate-400">
                                GWP {gwpVal} · <span className={tco2 >= 5 ? 'text-amber-600 font-medium' : 'text-slate-400'}>{tco2.toFixed(3)} tCO₂eq</span>
                              </p>);

                      })()}
                        </div>
                      </div>
                  }
                    {finalEquipment.balsa_litros &&
                  <div className="flex items-start gap-2">
                        <Droplet className="h-4 w-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Volumen balsa</p>
                          <p className="text-sm text-slate-700">{finalEquipment.balsa_litros} L</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.equipment_type === 'camara_frigorifica' && finalEquipment.technical_data?.clasificacion_seguridad &&
                  <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Clasificación seguridad</p>
                          <p className="text-sm font-semibold text-blue-700">{finalEquipment.technical_data.clasificacion_seguridad}</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.equipment_type === 'camara_frigorifica' && (finalEquipment.technical_data?.temp_min_appcc != null || finalEquipment.technical_data?.temp_max_appcc != null) &&
                  <div className="flex items-start gap-2">
                        <Snowflake className="h-4 w-4 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Rango Tª APPCC</p>
                          <p className="text-sm text-slate-700">{finalEquipment.technical_data.temp_min_appcc ?? '?'}°C / {finalEquipment.technical_data.temp_max_appcc ?? '?'}°C</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.equipment_type === 'camara_frigorifica' && finalEquipment.technical_data?.espesor_aislamiento_mm &&
                  <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Aislamiento</p>
                          <p className="text-sm text-slate-700">{finalEquipment.technical_data.espesor_aislamiento_mm} mm{finalEquipment.technical_data.tipo_panel ? ` · ${finalEquipment.technical_data.tipo_panel}` : ''}</p>
                        </div>
                      </div>
                  }
                    {finalEquipment.installation_date &&
                  <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Instalación</p>
                          <p className="text-sm text-slate-700">
                            {safeFormat(finalEquipment.installation_date, 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                  }
                  </div>
                  <Button size="sm" variant="outline" onClick={handleEditSpecs} className="mt-2 text-xs">
                    <Edit className="h-3 w-3 mr-1" />Editar datos técnicos
                  </Button>
                </div>
              }
            </div>
          </div>



          {/* Related Equipment */}
          {(finalParent || finalEquipment?.unit_type === 'exterior') &&
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Wind className="h-5 w-5 text-blue-600" />
                {finalEquipment?.unit_type === 'exterior' ? 'Unidades Interiores' : 'Unidad Exterior'}
              </h4>
              {finalParent &&
            <div className="mb-2">
                  <p className="text-xs text-slate-500 mb-1">Pertenece a la unidad exterior:</p>
                  <Link to={createPageUrl(`EquipmentDetail?id=${finalParent.id}`)} className="text-blue-600 hover:underline text-sm font-medium">
                    {finalParent.brand} {finalParent.model} - {finalParent.location}
                  </Link>
                </div>
            }
              {finalEquipment?.unit_type === 'exterior' &&
            <div>
                  <p className="text-xs text-slate-500 mb-1">Unidades Interiores ({finalChildren.length}):</p>
                  <div className="space-y-1">
                    {finalChildren.map((child) =>
                  <Link key={child.id} to={createPageUrl(`EquipmentDetail?id=${child.id}`)} className="block text-blue-600 hover:underline text-sm">
                        • {child.technical_data?.indoor_subtype ? `${child.technical_data.indoor_subtype} · ` : ''}{child.brand} {child.model} - {child.location}
                      </Link>
                )}
                    <Link to={createPageUrl(`EquipmentForm?parent=${finalEquipment.id}&building=${finalEquipment.building_id}&client=${finalEquipment.client_id}&type=${finalEquipment.equipment_type}`)} className="inline-flex items-center gap-1 mt-2 text-xs text-blue-700 font-medium hover:underline">
                      + Añadir unidad interior
                    </Link>
                  </div>
                </div>
            }
            </div>
          }
        </Card>

        {/* Observaciones editables */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <EditableNotes equipment={finalEquipment} equipmentId={equipmentId} isSessionTech={isSessionTech} sessionTechEmail={sessionTechEmail} />
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="plan" className="mb-6">
          <div className="bg-white border-b border-gray-200 mb-6 overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto bg-transparent p-0 gap-0 rounded-none">
              {[
                { value: 'plan', label: 'Plan Mant.' },
                { value: 'revisions', label: 'Revisiones' },
                { value: 'interventions', label: 'Intervenciones' },
                { value: 'incidents', label: 'Incidencias' },
                { value: 'photos', label: 'Imágenes' },
                { value: 'spareparts', label: 'Repuestos' },
                { value: 'documents', label: 'Documentos' },
                ...(finalEquipment.refrigerant_type ? [{ value: 'fgas', label: 'F-Gas 🌿' }] : []),
                ...(finalEquipment.equipment_type === 'adiabatico' ? [{ value: 'ld', label: 'L+D 💧' }] : []),
                ...(finalEquipment.equipment_type === 'camara_frigorifica' ? [{ value: 'libro', label: 'Libro 📋' }] : []),
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="md-tab relative h-12 px-4 text-sm font-medium rounded-none border-0 bg-transparent shadow-none text-gray-500 hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <style>{`
            .md-tab { border-bottom: 3px solid transparent; }
            .md-tab[data-state="active"] { color: #1565C0; font-weight: 600; border-bottom: 3px solid #1565C0; }
            .md-tab:hover { color: #1565C0; }
          `}</style>

          <TabsContent value="plan">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <MaintenancePlan
                equipmentId={equipmentId}
                clientId={finalEquipment.client_id}
                buildingId={finalEquipment.building_id} />
              
            </Card>
          </TabsContent>

          <TabsContent value="revisions">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <RevisionsTab equipmentId={equipmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="interventions">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <InterventionsTab equipmentId={equipmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="incidents">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />Historial de Incidencias
              </h3>
              <EquipmentIncidents
                equipmentId={equipmentId}
                clientId={finalEquipment?.client_id}
                buildingId={finalEquipment?.building_id} />
              
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <PhotosTab equipment={finalEquipment} equipmentId={equipmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="spareparts">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <SparePartsTab equipment={finalEquipment} equipmentId={equipmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <EquipmentDocuments
              equipment={finalEquipment}
              isSessionTech={isSessionTech}
              sessionTechEmail={sessionTechEmail}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
                queryClient.invalidateQueries({ queryKey: ['proxy-equipment-detail', equipmentId, sessionTechEmail] });
              }} />
            
          </TabsContent>

          {finalEquipment.refrigerant_type &&
          <TabsContent value="fgas">
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Wind className="h-4 w-4 text-blue-600" />Registro F-Gas — Libro de Gases Fluorados
                </h3>
                <FGasTab equipment={finalEquipment} equipmentId={equipmentId} />
              </Card>
            </TabsContent>
          }

          {finalEquipment.equipment_type === 'adiabatico' &&
          <TabsContent value="ld">
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-cyan-600" />Limpieza y Desinfección (L+D) — Legionella
                </h3>
                <LDTab equipment={finalEquipment} equipmentId={equipmentId} client={finalClient} isAdmin={isAdminUser} />
              </Card>
            </TabsContent>
          }
          {finalEquipment.equipment_type === 'camara_frigorifica' &&
          <TabsContent value="libro">
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-700" />Libro de Registro del Instalador — RSIF
                </h3>
                <LibroRegistroTab equipment={finalEquipment} equipmentId={equipmentId} />
              </Card>
            </TabsContent>
          }
        </Tabs>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar equipo?"
          description={`Se eliminará "${finalEquipment.brand} ${finalEquipment.model}". Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          isLoading={deleting || deleteMutation.isPending} />
        


      </div>
    </div>);

}