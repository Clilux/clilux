import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Home, Calendar } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function ClientRevisions() {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const storedClientId = sessionStorage.getItem('client_id');
    if (storedClientId) setClientId(storedClientId);
  }, []);

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['client-revisions-page', clientId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ client_id: clientId, status: 'completed' }, '-completed_date'),
    enabled: !!clientId
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['client-equipment-rev', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : 'Equipo';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-500 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 bg-white/10" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-500 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Revisiones" showBack={true} homeUrl="HomeCliente" />

        {revisions.length === 0 ? (
          <Card className="p-12 bg-white/10 border-white/20 text-center">
            <div className="flex flex-col items-center gap-4">
              <ClipboardCheck className="h-16 w-16 text-slate-400" />
              <p className="text-slate-300 text-lg">No hay revisiones completadas</p>
              <Link to={createPageUrl('HomeCliente')}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {revisions.map((revision) => (
              <Card key={revision.id} className="bg-slate-200 p-5 rounded-xl border shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ClipboardCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {getEquipmentName(revision.equipment_id)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-sm text-slate-600">
                          {format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                      {revision.notes && (
                        <p className="text-sm text-slate-500 mt-1">{revision.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700">Completada</Badge>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      {revisionTypeLabels[revision.revision_type] || revision.revision_type}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}