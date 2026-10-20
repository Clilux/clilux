import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Euro, HardHat, Pencil, Trash2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ParteTrabajoCard({ parte, hideRates, canEdit, showWorker, onEdit, onDelete }) {
  const fecha = parte.fecha ? format(parseISO(parte.fecha), "EEE d MMM yyyy", { locale: es }) : '—';

  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/70 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-orange-50 flex flex-col items-center justify-center shrink-0">
        <Clock className="h-4 w-4 text-orange-500" />
        <span className="text-[11px] font-bold text-orange-600 leading-none mt-0.5">
          {Number(parte.horas || 0).toLocaleString('es-ES')}h
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showWorker && (
            <span className="font-medium text-slate-700 text-sm flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />{parte.technician_name || parte.technician_email}
            </span>
          )}
          <span className="text-xs text-slate-500 capitalize flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />{fecha}
          </span>
          {parte.obra_nombre ? (
            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
              <HardHat className="h-3 w-3 mr-1" />{parte.obra_nombre}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-slate-400">Sin obra</Badge>
          )}
          {parte.numero && <span className="text-[11px] text-slate-300">{parte.numero}</span>}
        </div>
        <p className="text-sm text-slate-600 mt-1 truncate">{parte.client_name || 'Cliente'}</p>
        {parte.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{parte.descripcion}</p>}
      </div>

      {!hideRates && (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-1 justify-end">
            <Euro className="h-3.5 w-3.5 text-slate-400" />
            {Number(parte.coste_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">
            {Number(parte.coste_hora || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/h
          </p>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => onEdit(parte)} title="Editar parte">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => onDelete(parte)} title="Eliminar parte">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}