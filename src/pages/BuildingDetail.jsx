import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Edit, Plus, Building2, MapPin, Phone, User, 
  Layers, Square, FileText, Thermometer, Trash2, Snowflake, Flame, ToggleLeft, ToggleRight,
  LayoutList, LayoutGrid
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import EquipmentCard from '../components/cards/EquipmentCard';
import StatusBadge from '../components/ui/StatusBadge';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import BuildingReport from '../components/reports/BuildingReport';
import { toast } from 'sonner';

export default function BuildingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const buildingId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const toggleStatusMutation = useMutation({
    mutationFn: async (currentStatus) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await base44.entities.Building.update(buildingId, { status: newStatus });
      // Si se desactiva, marcar todos los equipos como inactivos
      if (newStatus === 'inactive') {
        const equips = await base44.entities.Equipment.filter({ building_id: buildingId });
        await Promise.all(equips.map(eq => base44.entities.Equipment.update(eq.id, { status: 'out_of_service' })));
        queryClient.invalidateQueries({ queryKey: ['equipment-building', buildingId] });
      }
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      toast.success(newStatus === 'inactive' ? 'Edificio desactivado. Equipos marcados como fuera de servicio.' : 'Edificio activado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Building.delete(buildingId);
    },
    onSuccess: () => {
      toast.success('Edificio eliminado correctamente');
      navigate(createPageUrl('Buildings'));
    },
    onError: () => {
      toast.error('Error al eliminar el edificio');
    },
  });

  // Para técnicos de sesión propia, cargamos datos vía proxy
  const { data: proxyData } = useQuery({
    queryKey: ['proxy-building-detail', buildingId, sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'building_detail', building_id: buildingId,
      });
      return res.data?.data || null;
    },
    enabled: isSessionTech && !!buildingId,
  });

  const { data: building, isLoading } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: buildingId });
      return buildings[0] || null;
    },
    enabled: !isSessionTech && !!buildingId,
  });

  const { data: client } = useQuery({
    queryKey: ['client-building', building?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: building.client_id });
      return clients[0] || null;
    },
    enabled: !isSessionTech && !!building?.client_id,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-building', buildingId],
    queryFn: () => base44.entities.Equipment.filter({ building_id: buildingId }),
    enabled: !isSessionTech && !!buildingId,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions-building', buildingId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ building_id: buildingId }),
    enabled: !isSessionTech && !!buildingId,
  });

  // Datos finales según modo
  const finalBuilding = isSessionTech ? proxyData?.building : building;
  const finalClient = isSessionTech ? proxyData?.client : client;
  const finalEquipment = isSessionTech ? (proxyData?.equipment || []) : equipment;
  const finalRevisions = isSessionTech ? (proxyData?.revisions || []) : revisions;
  const isLoadingFinal = isSessionTech ? !proxyData && !buildingId : isLoading;

  const totalCoolingKw = finalEquipment.reduce((sum, e) => sum + (parseFloat(e.cooling_power_kw) || 0), 0);
  const totalHeatingKw = finalEquipment.reduce((sum, e) => sum + (parseFloat(e.heating_power_kw) || 0), 0);

  if (isLoadingFinal || (isSessionTech && !proxyData)) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!finalBuilding) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-slate-500">Edificio no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={finalBuilding.name} />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50">
                <Building2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{finalBuilding.name}</h2>
                {finalClient && (
                  <Link 
                    to={createPageUrl(`ClientDetail?id=${finalClient.id}`)}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {finalClient.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={finalBuilding.status || 'active'} />
              {!isSessionTech && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleStatusMutation.mutate(finalBuilding.status || 'active')}
                disabled={toggleStatusMutation.isPending}
                className={finalBuilding.status === 'inactive' ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-600'}
              >
                {finalBuilding.status === 'inactive'
                  ? <><ToggleRight className="h-4 w-4 mr-2" />Activar</>
                  : <><ToggleLeft className="h-4 w-4 mr-2" />Desactivar</>
                }
              </Button>
              )}
              <BuildingReport building={finalBuilding} client={finalClient} equipment={finalEquipment} revisions={finalRevisions} />
              {!isSessionTech && <Link to={createPageUrl(`BuildingForm?id=${finalBuilding.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>}
              {!isSessionTech && <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Dirección</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${finalBuilding.address}, ${finalBuilding.postal_code} ${finalBuilding.city}, ${finalBuilding.province}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:text-blue-600 underline transition-colors"
                >
                  {finalBuilding.address}
                </a>
                {(finalBuilding.city || finalBuilding.province) && (
                  <p className="text-slate-600">{finalBuilding.postal_code} {finalBuilding.city}, {finalBuilding.province}</p>
                )}
              </div>
            </div>

            {finalBuilding.floors && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Layers className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Plantas</p>
                  <p className="text-slate-700">{finalBuilding.floors}</p>
                </div>
              </div>
            )}

            {finalBuilding.surface_m2 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Square className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Superficie</p>
                  <p className="text-slate-700">{finalBuilding.surface_m2} m²</p>
                </div>
              </div>
            )}

            {finalBuilding.contact_person && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Contacto</p>
                  <p className="text-slate-700">{finalBuilding.contact_person}</p>
                </div>
              </div>
            )}

            {finalBuilding.contact_phone && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Teléfono</p>
                  <p className="text-slate-700">{finalBuilding.contact_phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Potencia instalada */}
          {(totalCoolingKw > 0 || totalHeatingKw > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {totalCoolingKw > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                  <Snowflake className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Potencia Frigorífica Total</p>
                    <p className="text-slate-700 font-semibold">{totalCoolingKw.toFixed(1)} kW</p>
                  </div>
                </div>
              )}
              {totalHeatingKw > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50">
                  <Flame className="h-5 w-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Potencia Calorífica Total</p>
                    <p className="text-slate-700 font-semibold">{totalHeatingKw.toFixed(1)} kW</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {finalBuilding.notes && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Observaciones</p>
                  <p className="text-slate-700">{finalBuilding.notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Equipos ({finalEquipment.length})
          </h2>
          <div className="flex gap-2 flex-wrap items-center">
            {/* View mode toggle */}
            <div className="flex gap-1 bg-white border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Link to={createPageUrl(`NuevaRevision`)}>
              <Button className="bg-slate-800 hover:bg-slate-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Revisión
              </Button>
            </Link>
          </div>
        </div>

        {finalEquipment.length === 0 ? (
          <Card className="p-8 text-center">
            <Thermometer className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">No hay equipos registrados en este edificio</p>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {finalEquipment.map(eq => (
              <EquipmentCard key={eq.id} equipment={eq} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {finalEquipment.map(eq => (
              <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <div className="text-center">
                    <div className="p-3 rounded-xl bg-slate-100 w-fit mx-auto mb-3">
                      <Thermometer className="h-6 w-6 text-slate-600" />
                    </div>
                    {eq.reference_name && (
                      <p className="font-bold text-slate-900 text-sm mb-0.5 truncate">{eq.reference_name}</p>
                    )}
                    <p className="text-sm font-medium text-slate-700 truncate">{eq.brand} {eq.model}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate">{eq.equipment_type}</p>
                    {eq.location && <p className="text-xs text-slate-400 truncate">{eq.location}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        </div>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar edificio?"
          description={`Se eliminará "${finalBuilding.name}". Esta acción no se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}