import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Calendar, User, ChevronRight, ClipboardCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RevisionCard({ revision, equipmentName, buildingName }) {
  return (
    <Link to={createPageUrl(`RevisionDetail?id=${revision.id}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-slate-800">
                  {format(new Date(revision.revision_date), "dd 'de' MMMM yyyy", { locale: es })}
                </h3>
                <StatusBadge status={revision.revision_type} />
                <StatusBadge status={revision.general_status} />
              </div>
              
              <p className="text-sm text-slate-500 mb-2">
                {equipmentName && `${equipmentName}`}
                {buildingName && ` · ${buildingName}`}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                {revision.technician_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{revision.technician_name}</span>
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