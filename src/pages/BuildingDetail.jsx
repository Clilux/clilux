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
  Layers, Square, FileText, Thermometer, Trash2, Snowflake, Flame, Leaf, ToggleLeft, ToggleRight,
  LayoutList, LayoutGrid, Table2, HardHat
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import EquipmentCard from '../components/cards/EquipmentCard';
import StatusBadge from '../components/ui/StatusBadge';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import BuildingReport from '../components/reports/BuildingReport';
import BuildingPendientes from '../components/buildings/BuildingPendientes';
import BuildingYearPlan from '../components/buildings/BuildingYearPlan';
import BuildingDocuments from '../components/buildings/BuildingDocuments';
import BuildingDocObra from '../components/buildings/BuildingDocObra';
import RepInspeccionesPanel from '@/components/rep/RepInspeccionesPanel';
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
      const activate = currentStatus === 'inactive';
      const payload = { entity_type: 'building', entity_id: buildingId, activate };
      await base44.functions.invoke('cascadeDeactivate', payload);
      return activate;
    },
    onSuccess: (activate) => {
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['equipment-building', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['revisions-building', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['incidents-building', buildingId] });
      toast.success(activate
        ? 'Edificio activado'
        : 'Edificio desactivado. Equipos, incidencias y revisiones relacionadas también se han desactivado.');
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

  // Conmutar fase "en obras" (solo edición de la ficha, sin tocar mantenimiento)
  const toggleObraMutation = useMutation({
    mutationFn: async (currentEnObras) => {
      const next = !currentEnObras;
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'building_update',
          record_id: buildingId, updates: { en_obras: next },
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.data;
      }
      return base44.entities.Building.update(buildingId, { en_obras: next });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['proxy-building-detail', buildingId, sessionTechEmail] });
      toast.success(data?.en_obras ? 'Edificio marcado como en obras' : 'Edificio traspasado a mantenimiento');
    },
    onError: () => toast.error('No se pudo cambiar la fase del edificio'),
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

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents-building', buildingId],
    queryFn: () => base44.entities.Incident.filter({ building_id: buildingId }),
    enabled: !isSessionTech && !!buildingId,
  });

  // Obras vinculadas al edificio (para determinar si está "en obras")
  const { data: obrasAdmin = [] } = useQuery({
    queryKey: ['obras-building', buildingId],
    queryFn: () => base44.entities.Obra.filter({ building_id: buildingId }),
    enabled: !isSessionTech && !!buildingId,
  });

  // Datos finales según modo
  const finalBuilding = isSessionTech ? proxyData?.building : building;
  const finalClient = isSessionTech ? proxyData?.client : client;
  const finalEquipment = isSessionTech ? (proxyData?.equipment || []) : equipment;
  const finalRevisions = isSessionTech ? (proxyData?.revisions || []) : revisions;
  const finalIncidents = isSessionTech ? (proxyData?.incidents || []) : incidents;
  const finalObras = isSessionTech ? (proxyData?.obras || []) : obrasAdmin;
  const isLoadingFinal = isSessionTech ? !proxyData && !buildingId : isLoading;

  // Un edificio está "en obras" si el flag está activo o si tiene alguna obra no finalizada vinculada.
  const obraActiva = (finalObras || []).some(o => o.estado !== 'finalizada');
  const enObras = finalBuilding?.en_obras === true || obraActiva;

  const totalCoolingKw = finalEquipment.reduce((sum, e) => sum + (parseFloat(e.cooling_power_kw) || 0), 0);
  const totalHeatingKw = finalEquipment.reduce((sum, e) => sum + (parseFloat(e.heating_power_kw) || 0), 0);
  // Suma del F-Gas (tCO₂eq) de los equipos con gas refrigerante del edificio
  const totalFgas = finalEquipment.reduce((sum, e) => sum + (Number(e.co2_equivalent_tons) || 0), 0);

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
              {enObras && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  <HardHat className="h-3.5 w-3.5" /> En obras
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleObraMutation.mutate(enObras)}
                disabled={toggleObraMutation.isPending || obraActiva}
                className={enObras ? 'text-emerald-600 hover:text-emerald-700' : 'text-amber-600 hover:text-amber-700'}
                title={obraActiva
                  ? 'Hay una obra activa vinculada: finalízala o traspásala para pasar a mantenimiento'
                  : (enObras ? 'Marcar como traspasado a mantenimiento' : 'Marcar como en obras')}
              >
                {enObras
                  ? <><ToggleRight className="h-4 w-4 mr-2" />Pasar a mantenimiento</>
                  : <><ToggleLeft className="h-4 w-4 mr-2" />Marcar en obras</>
                }
              </Button>
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
              <Link to={`/RevisionTabla?building_id=${finalBuilding.id}`}>
                <Button variant="outline" size="sm" className="text-slate-600">
                  <Table2 className="h-4 w-4 mr-2" />
                  Tablas de mantenimiento
                </Button>
              </Link>
              <BuildingReport building={finalBuilding} client={finalClient} equipment={finalEquipment} revisions={finalRevisions} />
              <Link to={createPageUrl(`BuildingForm?id=${finalBuilding.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
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

          {/* Potencia instalada y F-Gas (solo en mantenimiento) */}
          {!enObras && (totalCoolingKw > 0 || totalHeatingKw > 0 || totalFgas > 0) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              {totalFgas > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50">
                  <Leaf className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">F-Gas Total</p>
                    <p className="text-slate-700 font-semibold">{totalFgas.toFixed(3)} tCO₂eq</p>
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

        {/* Documentación durante la obra (siempre visible: durante la obra y como histórico) */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <HardHat className="h-5 w-5 text-amber-600" />
            Documentación de la obra
          </h2>
          <BuildingDocObra building={finalBuilding} client={finalClient} />
        </div>

        {enObras ? (
          <Card className="p-6 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3">
              <HardHat className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Edificio en fase de obra</p>
                <p className="text-sm text-amber-700">
                  {obraActiva
                    ? 'Tiene una obra activa vinculada, por lo que los equipos, revisiones, incidencias y libros de mantenimiento permanecen ocultos. Finaliza o traspasa la obra para activar el seguimiento de mantenimiento.'
                    : 'Aún no se ha traspasado a mantenimiento. Los equipos, revisiones, incidencias y libros de mantenimiento permanecen ocultos. Pulsa «Pasar a mantenimiento» para activar el seguimiento.'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
        <BuildingDocuments
          building={finalBuilding}
          client={finalClient}
          equipment={finalEquipment}
          revisions={finalRevisions}
        />

        <RepInspeccionesPanel
          building={finalBuilding}
          equipment={finalEquipment}
          client={finalClient}
          registradoPor={sessionTechEmail || ''}
        />

        <BuildingYearPlan revisions={finalRevisions} />

        <BuildingPendientes
          building={finalBuilding}
          client={finalClient}
          equipment={finalEquipment}
          revisions={finalRevisions}
          incidents={finalIncidents}
        />
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
            </>
            )}

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