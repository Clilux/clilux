import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Edit, Plus, MapPin, Calendar, FileText, 
  Thermometer, Snowflake, Flame, Wind, Droplet, ClipboardCheck, FileBarChart
} from 'lucide-react';
import RevisionReport from '../components/reports/RevisionReport';
import NavHeader from '../components/navigation/NavHeader';
import RevisionCard from '../components/cards/RevisionCard';
import StatusBadge from '../components/ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const equipmentTypeLabels = {
  climatizador: 'Climatizador',
  enfriadora: 'Enfriadora',
  caldera: 'Caldera',
  bomba_calor: 'Bomba de calor',
  split: 'Split',
  vrf: 'VRF',
  fancoil: 'Fancoil',
  uta: 'UTA',
  rooftop: 'Rooftop',
  torre_refrigeracion: 'Torre de refrigeración',
  otro: 'Otro',
};

export default function EquipmentDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  const [showReport, setShowReport] = useState(false);

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

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions-equipment', equipmentId],
    queryFn: () => base44.entities.Revision.filter({ equipment_id: equipmentId }, '-revision_date'),
    enabled: !!equipmentId,
  });

  const { data: client } = useQuery({
    queryKey: ['client-equipment', equipment?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: equipment.client_id });
      return clients[0] || null;
    },
    enabled: !!equipment?.client_id,
  });

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
                <Link to={createPageUrl(`EquipmentForm?id=${equipment.id}`)}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

          {equipment.notes && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Observaciones</p>
                  <p className="text-slate-700">{equipment.notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Historial de Revisiones ({revisions.length})
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowReport(true)}>
                <FileBarChart className="h-4 w-4 mr-2" />
                Generar Informe
              </Button>
              <Link to={createPageUrl(`RevisionForm?equipment_id=${equipment.id}&building_id=${equipment.building_id}&client_id=${equipment.client_id}`)}>
                <Button className="bg-slate-800 hover:bg-slate-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Revisión
                </Button>
              </Link>
            </div>
          </div>

          {revisions.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No hay revisiones registradas</p>
              <Link to={createPageUrl(`RevisionForm?equipment_id=${equipment.id}&building_id=${equipment.building_id}&client_id=${equipment.client_id}`)}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera revisión
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {revisions.map(revision => (
                <RevisionCard 
                  key={revision.id} 
                  revision={revision}
                  equipmentName={`${equipment.brand} ${equipment.model}`}
                  buildingName={building?.name}
                />
              ))}
            </div>
          )}
        </div>

        {showReport && (
          <RevisionReport
            equipment={equipment}
            revisions={revisions}
            building={building}
            client={client}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </div>
  );
}