import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { format, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function ScheduledRevisionsList({ equipmentId }) {
  const { data: scheduledRevisions = [], isLoading } = useQuery({
    queryKey: ['scheduled-revisions-equipment', equipmentId],
    queryFn: async () => {
      const all = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId });
      return all.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!equipmentId,
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // Filtrar revisiones pendientes del mes actual
  const pendingRevisionsThisMonth = scheduledRevisions.filter(sr => {
    if (sr.status !== 'pending') return false;
    const revisionDate = new Date(sr.scheduled_date);
    return revisionDate >= monthStart && revisionDate <= monthEnd;
  });

  if (isLoading) {
    return <div className="text-center py-4 text-slate-500">Cargando...</div>;
  }

  if (pendingRevisionsThisMonth.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Calendar className="h-12 w-12 mx-auto mb-2 text-slate-300" />
        <p>No hay revisiones programadas para {format(today, 'MMMM yyyy', { locale: es })}</p>
      </div>
    );
  }

  const currentMonth = format(today, 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-600 mb-3">
        Revisiones programadas para {currentMonth}
      </h3>
      {pendingRevisionsThisMonth.slice(0, 5).map(revision => {
        const revisionDate = new Date(revision.scheduled_date);
        const isOverdue = isBefore(revisionDate, today);
        
        return (
          <div
            key={revision.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg border",
              isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isOverdue ? "bg-red-100" : "bg-blue-100"
              )}>
                <Clock className={cn("h-5 w-5", isOverdue ? "text-red-600" : "text-blue-600")} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">
                    {revisionTypeLabels[revision.revision_type]}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Vencida
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {format(revisionDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <Link to={createPageUrl(`RevisionForm?id=${revision.id}`)}>
              <Button size="sm" className={isOverdue ? "bg-red-600" : "bg-blue-600"}>
                Realizar
              </Button>
            </Link>
          </div>
        );
      })}
      
      {pendingRevisionsThisMonth.length > 5 && (
        <p className="text-sm text-slate-500 text-center pt-2">
          +{pendingRevisionsThisMonth.length - 5} revisiones más este mes
        </p>
      )}
    </div>
  );
}