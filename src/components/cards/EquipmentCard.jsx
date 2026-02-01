import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, ChevronRight, Wind, Flame, Snowflake } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const equipmentTypeIcons = {
  climatizador: Wind,
  enfriadora: Snowflake,
  caldera: Flame,
  bomba_calor: Wind,
  split: Wind,
  vrf: Wind,
  fancoil: Wind,
  uta: Wind,
  rooftop: Wind,
  torre_refrigeracion: Snowflake,
  otro: Wind,
};

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

export default function EquipmentCard({ equipment }) {
  const Icon = equipmentTypeIcons[equipment.equipment_type] || Wind;
  
  return (
    <Link to={createPageUrl(`EquipmentDetail?id=${equipment.id}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-slate-100">
              <Icon className="h-6 w-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-slate-800">{equipment.brand} {equipment.model}</h3>
                <StatusBadge status={equipment.status || 'operational'} />
              </div>
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
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </Card>
    </Link>
  );
}