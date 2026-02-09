import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function RevisionsTab({ equipmentId }) {
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['all-revisions-equipment', equipmentId],
    queryFn: async () => {
      const all = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId });
      return all.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    },
    enabled: !!equipmentId,
  });

  const pendingRevisions = revisions.filter(r => r.status === 'pending');
  const completedRevisions = revisions.filter(r => r.status === 'completed');
  const today = new Date();

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Cargando...</div>;
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500 mb-2">No hay revisiones</p>
        <p className="text-sm text-slate-400">Las revisiones programadas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Revisions */}
      {pendingRevisions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Pendientes ({pendingRevisions.length})</h3>
          <div className="space-y-3">
            {pendingRevisions.map(revision => {
              const revisionDate = parseISO(revision.scheduled_date);
              const isOverdue = isBefore(revisionDate, today);
              
              return (
                <div
                  key={revision.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    isOverdue ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
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
          </div>
        </div>
      )}

      {/* Completed Revisions */}
      {completedRevisions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Completadas ({completedRevisions.length})</h3>
          <div className="space-y-3">
            {completedRevisions.map(revision => (
              <div
                key={revision.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">
                        {revisionTypeLabels[revision.revision_type]}
                      </span>
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        Completada
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Programada: {format(parseISO(revision.scheduled_date), "dd/MM/yyyy")} • 
                      Realizada: {revision.completed_date && format(parseISO(revision.completed_date), "dd/MM/yyyy")}
                    </p>
                    {revision.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">{revision.notes}</p>
                    )}
                  </div>
                </div>
                <Link to={createPageUrl(`RevisionForm?id=${revision.id}`)}>
                  <Button variant="outline" size="sm">
                    Ver detalles
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}