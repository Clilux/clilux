import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, ChevronRight, Wind, Flame, Snowflake, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatusChanger, { equipmentStatusLabel } from '../equipment/StatusChanger';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const equipmentTypeIcons = {
  split_mural: Wind,
  split_cassette: Wind,
  split_conductos: Wind,
  climatizador: Wind,
  enfriadora: Snowflake,
  caldera: Flame,
  bomba_calor: Wind,
  vrf: Wind,
  fancoil: Wind,
  uta: Wind,
  rooftop: Wind,
  torre_refrigeracion: Snowflake,
  otro: Wind,
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
  otro: 'Otro',
};

export default function EquipmentCard({ equipment }) {
  const Icon = equipmentTypeIcons[equipment.equipment_type] || Wind;
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  // Cambiar el estado del equipo directamente desde la tarjeta
  const changeStatusMutation = useMutation({
    mutationFn: (newStatus) => base44.functions.invoke('cascadeDeactivate', {
      technician_email: sessionTechEmail || undefined,
      entity_type: 'equipment',
      entity_id: equipment.id,
      status: newStatus,
    }),
    onSuccess: (_res, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-building'] });
      queryClient.invalidateQueries({ queryKey: ['building'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      toast.success(`Estado actualizado: ${equipmentStatusLabel(newStatus)}`);
    },
    onError: () => toast.error('No se pudo cambiar el estado del equipo'),
  });

  return (
    <Link to={createPageUrl(`EquipmentDetail?id=${equipment.id}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-slate-100">
              <Icon className="h-6 w-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-0.5">
                {equipment.reference_name && (
                  <h3 className="font-bold text-slate-900 text-base">{equipment.reference_name}</h3>
                )}
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="inline-flex"
                >
                  <StatusChanger
                    status={equipment.status || 'operational'}
                    canEdit={!isSessionTech}
                    isPending={changeStatusMutation.isPending}
                    onChange={(newStatus) => changeStatusMutation.mutate(newStatus)}
                  />
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">{equipment.brand} {equipment.model}</p>
              <p className="text-sm text-slate-500 mb-2">
                {equipmentTypeLabels[equipment.equipment_type] || equipment.equipment_type}
                {equipment.serial_number && ` · S/N: ${equipment.serial_number}`}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                {equipment.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{equipment.location}</span>
                  </div>
                )}
                {equipment.next_revision_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Próx. revisión: {format(new Date(equipment.next_revision_date), 'dd MMM yyyy', { locale: es })}</span>
                  </div>
                )}
                {equipment.created_by_name && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <User className="h-4 w-4" />
                    <span>Creado por: {equipment.created_by_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </Card>
    </Link>
  );
}