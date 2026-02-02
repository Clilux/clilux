import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Calendar, User, Wrench, FileText, Camera } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const maintenanceTypeLabels = {
  monthly: { label: 'Mensual', color: 'bg-blue-100 text-blue-800' },
  quarterly: { label: 'Trimestral', color: 'bg-green-100 text-green-800' },
  biannual: { label: 'Semestral', color: 'bg-amber-100 text-amber-800' },
  annual: { label: 'Anual', color: 'bg-purple-100 text-purple-800' },
  corrective: { label: 'Correctivo', color: 'bg-red-100 text-red-800' },
};

export default function MaintenanceDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const recordId = urlParams.get('id');

  const { data: record, isLoading } = useQuery({
    queryKey: ['maintenance-record', recordId],
    queryFn: async () => {
      const records = await base44.entities.MaintenanceRecord.filter({ id: recordId });
      return records[0] || null;
    },
    enabled: !!recordId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment', record?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: record.equipment_id });
      return items[0] || null;
    },
    enabled: !!record?.equipment_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-slate-500">Registro no encontrado</p>
        </div>
      </div>
    );
  }

  const typeInfo = maintenanceTypeLabels[record.maintenance_type] || { label: record.maintenance_type, color: 'bg-slate-100 text-slate-800' };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Detalle de Mantenimiento" />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-50">
                <Wrench className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Mantenimiento {typeInfo.label}
                  </h2>
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                </div>
                <p className="text-slate-500">
                  {format(new Date(record.maintenance_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <Link to={createPageUrl(`MaintenanceForm?id=${record.id}&equipment_id=${record.equipment_id}`)}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>

          {equipment && (
            <Link to={createPageUrl(`EquipmentDetail?id=${equipment.id}`)}>
              <div className="p-4 rounded-lg bg-slate-50 mb-6 hover:bg-slate-100 transition-colors">
                <p className="text-sm text-slate-500">Equipo</p>
                <p className="font-medium text-slate-800">{equipment.brand} {equipment.model}</p>
                <p className="text-sm text-slate-500">{equipment.location}</p>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {record.technician_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Técnico</p>
                  <p className="text-slate-700">{record.technician_name}</p>
                </div>
              </div>
            )}
            {record.next_maintenance_date && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Próximo mantenimiento</p>
                  <p className="text-slate-700">
                    {format(new Date(record.next_maintenance_date), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form data */}
          {record.form_data && Object.keys(record.form_data).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800 mb-3">Datos del formulario</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(record.form_data).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">{key.replace(/_/g, ' ')}</p>
                    <p className="text-slate-700">
                      {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value || '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.observations && (
            <div className="p-4 rounded-lg bg-slate-50 mb-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Observaciones</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{record.observations}</p>
                </div>
              </div>
            </div>
          )}

          {record.actions_taken && (
            <div className="p-4 rounded-lg bg-slate-50 mb-4">
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Acciones realizadas</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{record.actions_taken}</p>
                </div>
              </div>
            </div>
          )}

          {record.photos && record.photos.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos ({record.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {record.photos.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}