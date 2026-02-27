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
  Layers, Square, FileText, Thermometer, Trash2, Snowflake, Flame, ToggleLeft, ToggleRight
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import EquipmentCard from '../components/cards/EquipmentCard';
import StatusBadge from '../components/ui/StatusBadge';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import ExportButton from '../components/ExportButton';
import ImportButton from '../components/ImportButton';
import BuildingReport from '../components/reports/BuildingReport';
import { toast } from 'sonner';

export default function BuildingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const buildingId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      toast.error('No se pueden eliminar edificios relacionados con clientes');
      throw new Error('Eliminación de edificios no permitida');
    },
    onError: () => {
      // Ya mostrado el toast en mutationFn
    },
  });

  const { data: building, isLoading } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: buildingId });
      return buildings[0] || null;
    },
    enabled: !!buildingId,
  });

  const { data: client } = useQuery({
    queryKey: ['client-building', building?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: building.client_id });
      return clients[0] || null;
    },
    enabled: !!building?.client_id,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-building', buildingId],
    queryFn: () => base44.entities.Equipment.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions-building', buildingId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const totalCoolingKw = equipment.reduce((sum, e) => sum + (parseFloat(e.cooling_power_kw) || 0), 0);
  const totalHeatingKw = equipment.reduce((sum, e) => sum + (parseFloat(e.heating_power_kw) || 0), 0);

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

  if (!building) {
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
        <NavHeader title={building.name} />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50">
                <Building2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{building.name}</h2>
                {client && (
                  <Link 
                    to={createPageUrl(`ClientDetail?id=${client.id}`)}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {client.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={building.status || 'active'} />
              <Link to={createPageUrl(`BuildingForm?id=${building.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Dirección</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${building.address}, ${building.postal_code} ${building.city}, ${building.province}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:text-blue-600 underline transition-colors"
                >
                  {building.address}
                </a>
                {(building.city || building.province) && (
                  <p className="text-slate-600">{building.postal_code} {building.city}, {building.province}</p>
                )}
              </div>
            </div>

            {building.floors && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Layers className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Plantas</p>
                  <p className="text-slate-700">{building.floors}</p>
                </div>
              </div>
            )}

            {building.surface_m2 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Square className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Superficie</p>
                  <p className="text-slate-700">{building.surface_m2} m²</p>
                </div>
              </div>
            )}

            {building.contact_person && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Contacto</p>
                  <p className="text-slate-700">{building.contact_person}</p>
                </div>
              </div>
            )}

            {building.contact_phone && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Teléfono</p>
                  <p className="text-slate-700">{building.contact_phone}</p>
                </div>
              </div>
            )}
          </div>

          {building.notes && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Observaciones</p>
                  <p className="text-slate-700">{building.notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Equipos ({equipment.length})
            </h2>
            <div className="flex gap-2 flex-wrap">
              <ImportButton 
                onImport={async (data) => {
                  const equipmentData = data.map(row => ({
                    building_id: building.id,
                    client_id: building.client_id,
                    brand: row.Marca || row.brand || '',
                    model: row.Modelo || row.model || '',
                    serial_number: row['Nº Serie'] || row.serial_number || '',
                    equipment_type: row.Tipo || row.equipment_type || '',
                    location: row.Ubicación || row.location || '',
                    status: row.Estado || row.status || 'operational',
                    installation_date: row['Fecha Instalación'] || row.installation_date || null,
                  }));
                  await base44.entities.Equipment.bulkCreate(equipmentData);
                  queryClient.invalidateQueries({ queryKey: ['equipment-building', buildingId] });
                }} 
                label="Importar"
              />
              <ExportButton
                data={equipment}
                filename={`equipos_${building.name}`}
                columns={[
                  { key: 'brand', label: 'Marca' },
                  { key: 'model', label: 'Modelo' },
                  { key: 'serial_number', label: 'Nº Serie' },
                  { key: 'equipment_type', label: 'Tipo' },
                  { key: 'location', label: 'Ubicación' },
                  { key: 'status', label: 'Estado' },
                  { key: 'installation_date', label: 'Fecha Instalación' },
                ]}
                label="Exportar"
              />
              <Link to={createPageUrl(`NuevaRevision`)}>
                <Button className="bg-slate-800 hover:bg-slate-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Revisión
                </Button>
              </Link>
            </div>
          </div>

          {equipment.length === 0 ? (
            <Card className="p-8 text-center">
              <Thermometer className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No hay equipos registrados en este edificio</p>
              <Link to={createPageUrl(`NuevaRevision`)}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir primera revisión
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {equipment.map(eq => (
                <EquipmentCard key={eq.id} equipment={eq} />
              ))}
            </div>
          )}
        </div>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar edificio?"
          description={`Se eliminará "${building.name}". Esta acción no se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}