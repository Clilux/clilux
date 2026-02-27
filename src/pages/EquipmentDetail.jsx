import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Edit, MapPin, Calendar, FileText, 
  Snowflake, Flame, Wind, Droplet, 
  Shield, Trash2, Wrench
} from 'lucide-react';
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

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

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
  otro: 'Otro',
};

const statusInfo = {
  operational: { label: 'Operativo', color: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-100 text-amber-800', icon: '⚠' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-100 text-red-800', icon: '✕' },
};

export default function EquipmentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Equipment.delete(equipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipo eliminado correctamente');
      navigate(createPageUrl('Equipment'));
    },
    onError: () => {
      toast.error('Error al eliminar el equipo');
    },
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0] || null;
    },
    enabled: !!equipmentId,
  });

  const { data: building } = useQuery({
    queryKey: ['building-equipment', equipment?.building_id],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: equipment.building_id });
      return buildings[0] || null;
    },
    enabled: !!equipment?.building_id,
  });

  const { data: client } = useQuery({
    queryKey: ['client-equipment', equipment?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: equipment.client_id });
      return clients[0] || null;
    },
    enabled: !!equipment?.client_id,
  });

  const { data: scheduledRevisions = [] } = useQuery({
    queryKey: ['scheduled-revisions', equipmentId],
    queryFn: async () => {
      const all = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId });
      return all.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!equipmentId,
  });

  // Related equipment
  const { data: parentEquipment } = useQuery({
    queryKey: ['parent-equipment', equipment?.parent_equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipment.parent_equipment_id });
      return items[0] || null;
    },
    enabled: !!equipment?.parent_equipment_id,
  });

  const { data: childEquipment = [] } = useQuery({
    queryKey: ['child-equipment', equipmentId],
    queryFn: async () => {
      return await base44.entities.Equipment.filter({ parent_equipment_id: equipmentId });
    },
    enabled: !!equipmentId && equipment?.unit_type === 'exterior',
  });

  // Calcular última y próxima revisión
  const completedRevisions = scheduledRevisions.filter(r => r.status === 'completed');
  const pendingRevisions = scheduledRevisions.filter(r => r.status === 'pending');
  
  const lastRevision = completedRevisions.length > 0 
    ? completedRevisions.sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0]
    : null;
  
  const nextRevision = pendingRevisions.length > 0
    ? pendingRevisions[0]
    : null;



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-slate-500">Equipo no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={`${equipment.brand} ${equipment.model}`} />

        {/* Status Overview Card */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {equipment.photo_url && (
              <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                <img 
                  src={equipment.photo_url} 
                  alt={`${equipment.brand} ${equipment.model}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-slate-800">
                      {equipment.brand} {equipment.model}
                    </h2>
                    <StatusBadge status={equipment.status || 'operational'} />
                  </div>
                  <p className="text-slate-500">
                    {equipmentTypeLabels[equipment.equipment_type] || equipment.equipment_type}
                    {equipment.serial_number && ` · S/N: ${equipment.serial_number}`}
                  </p>
                  {building && (
                    <Link 
                      to={createPageUrl(`BuildingDetail?id=${building.id}`)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {building.name}
                    </Link>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <EquipmentReport
                    equipment={equipment}
                    building={building}
                    client={client}
                  />
                  <RevisionsReport
                    equipment={equipment}
                    building={building}
                    client={client}
                    revisions={scheduledRevisions}
                  />
                  <Link to={createPageUrl(`EquipmentForm?id=${equipment.id}`)}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-slate-50">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 ${
                    equipment.status === 'operational' ? 'bg-emerald-100' :
                    equipment.status === 'maintenance_needed' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <Shield className={`h-5 w-5 ${
                      equipment.status === 'operational' ? 'text-emerald-600' :
                      equipment.status === 'maintenance_needed' ? 'text-amber-600' : 'text-red-600'
                    }`} />
                  </div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="text-sm font-medium text-slate-700">
                    {statusInfo[equipment.status]?.label || 'Operativo'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-slate-500">Última revisión</p>
                  <p className="text-sm font-medium text-slate-700">
                    {lastRevision?.completed_date
                      ? format(new Date(lastRevision.completed_date), 'dd/MM/yy')
                      : 'Sin datos'}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-1 ${
                    nextRevision && new Date(nextRevision.scheduled_date) < new Date()
                      ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    <Wrench className={`h-5 w-5 ${
                      nextRevision && new Date(nextRevision.scheduled_date) < new Date()
                        ? 'text-red-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <p className="text-xs text-slate-500">Próxima revisión</p>
                  <p className={`text-sm font-medium ${
                    nextRevision && new Date(nextRevision.scheduled_date) < new Date()
                      ? 'text-red-600' : 'text-slate-700'
                  }`}>
                    {nextRevision?.scheduled_date
                      ? format(new Date(nextRevision.scheduled_date), 'dd/MM/yy')
                      : 'No programada'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Ubicación</p>
                      <p className="text-sm text-slate-700">{equipment.location}</p>
                    </div>
                  </div>
                )}
                {equipment.cooling_power_kw && (
                  <div className="flex items-start gap-2">
                    <Snowflake className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pot. Frigorífica</p>
                      <p className="text-sm text-slate-700">{equipment.cooling_power_kw} kW</p>
                    </div>
                  </div>
                )}
                {equipment.heating_power_kw && (
                  <div className="flex items-start gap-2">
                    <Flame className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pot. Calorífica</p>
                      <p className="text-sm text-slate-700">{equipment.heating_power_kw} kW</p>
                    </div>
                  </div>
                )}
                {equipment.refrigerant_type && (
                  <div className="flex items-start gap-2">
                    <Wind className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Refrigerante</p>
                      <p className="text-sm text-slate-700">{equipment.refrigerant_type}</p>
                    </div>
                  </div>
                )}
                {equipment.refrigerant_charge_kg && (
                  <div className="flex items-start gap-2">
                    <Droplet className="h-4 w-4 text-cyan-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Carga</p>
                      <p className="text-sm text-slate-700">{equipment.refrigerant_charge_kg} kg</p>
                    </div>
                  </div>
                )}
                {equipment.installation_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Instalación</p>
                      <p className="text-sm text-slate-700">
                        {format(new Date(equipment.installation_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Related Equipment */}
          {(parentEquipment || childEquipment.length > 0) && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Wind className="h-5 w-5 text-blue-600" />
                Equipos Relacionados
              </h4>
              {parentEquipment && (
                <div className="mb-2">
                  <p className="text-xs text-slate-500 mb-1">Unidad Exterior:</p>
                  <Link 
                    to={createPageUrl(`EquipmentDetail?id=${parentEquipment.id}`)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {parentEquipment.brand} {parentEquipment.model} - {parentEquipment.location}
                  </Link>
                </div>
              )}
              {childEquipment.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Unidades Interiores ({childEquipment.length}):</p>
                  <div className="space-y-1">
                    {childEquipment.map(child => (
                      <Link 
                        key={child.id}
                        to={createPageUrl(`EquipmentDetail?id=${child.id}`)}
                        className="block text-blue-600 hover:underline text-sm"
                      >
                        • {child.brand} {child.model} - {child.location}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Observaciones editables */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <EditableNotes equipment={equipment} equipmentId={equipmentId} />
        </Card>

        {/* Tabs: Plan de Mantenimiento, Revisiones, Intervenciones, Imágenes, Documentos */}
        <Tabs defaultValue="plan" className="mb-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-6">
            <TabsTrigger value="plan">Plan Mantenimiento</TabsTrigger>
            <TabsTrigger value="revisions">Revisiones</TabsTrigger>
            <TabsTrigger value="interventions">Intervenciones</TabsTrigger>
            <TabsTrigger value="photos">Imágenes</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <MaintenancePlan 
                equipmentId={equipmentId}
                clientId={equipment.client_id}
                buildingId={equipment.building_id}
              />
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

          <TabsContent value="photos">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <PhotosTab equipment={equipment} equipmentId={equipmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <EquipmentDocuments 
              equipment={equipment} 
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] })}
            />
          </TabsContent>
        </Tabs>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar equipo?"
          description={`Se eliminará "${equipment.brand} ${equipment.model}". Esta acción no se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />


      </div>
    </div>
  );
}