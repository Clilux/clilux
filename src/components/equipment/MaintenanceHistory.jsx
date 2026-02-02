import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Calendar, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const maintenanceTypeLabels = {
  monthly: { label: 'Mensual', color: 'bg-blue-100 text-blue-800' },
  quarterly: { label: 'Trimestral', color: 'bg-green-100 text-green-800' },
  biannual: { label: 'Semestral', color: 'bg-amber-100 text-amber-800' },
  annual: { label: 'Anual', color: 'bg-purple-100 text-purple-800' },
  corrective: { label: 'Correctivo', color: 'bg-red-100 text-red-800' },
};

export default function MaintenanceHistory({ equipmentId }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance-records', equipmentId],
    queryFn: () => base44.entities.MaintenanceRecord.filter({ equipment_id: equipmentId }, '-maintenance_date'),
    enabled: !!equipmentId,
  });

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Historial de Mantenimiento ({records.length})
        </h3>
        <Link to={createPageUrl(`MaintenanceForm?equipment_id=${equipmentId}`)}>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Registrar mantenimiento
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8">
          <Wrench className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">No hay registros de mantenimiento</p>
          <Link to={createPageUrl(`MaintenanceForm?equipment_id=${equipmentId}`)}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar primer mantenimiento
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const typeInfo = maintenanceTypeLabels[record.maintenance_type] || { label: record.maintenance_type, color: 'bg-slate-100 text-slate-800' };
            return (
              <Link 
                key={record.id} 
                to={createPageUrl(`MaintenanceDetail?id=${record.id}`)}
                className="block"
              >
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white border">
                      <span className="text-lg font-bold text-slate-800">
                        {format(new Date(record.maintenance_date), 'dd')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(record.maintenance_date), 'MMM', { locale: es })}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                        {record.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-800">Completado</Badge>
                        )}
                      </div>
                      {record.technician_name && (
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {record.technician_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}