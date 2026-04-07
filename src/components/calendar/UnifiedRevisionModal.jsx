import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, Wrench, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

const revisionTypeColors = {
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-purple-100 text-purple-700',
  biannual: 'bg-orange-100 text-orange-700',
  annual: 'bg-red-100 text-red-700',
};

export default function UnifiedRevisionModal({ open, onClose, revision, building }) {
  if (!revision) return null;

  const equipmentList = revision.unified_equipment_info || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Revisión Unificada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-slate-800">{building?.name || 'Edificio'}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(new Date(revision.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="text-sm text-slate-500">{equipmentList.length} equipos agrupados</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Equipos incluidos en esta visita:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {equipmentList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                  <Wrench className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.equipment_name}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${revisionTypeColors[item.original_revision_type] || 'bg-blue-100 text-blue-700'}`}>
                    {revisionTypeLabels[item.original_revision_type] || item.original_revision_type}
                  </Badge>
                  <Link
                    to={createPageUrl(`RevisionForm?equipment_id=${item.equipment_id}&revision_type=${item.original_revision_type}&unified_revision_id=${revision.id}&scheduled_date=${revision.scheduled_date}`)}
                    onClick={onClose}
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      Realizar <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}