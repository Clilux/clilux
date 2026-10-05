import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS = {
  vacaciones: 'Vacaciones',
  baja_medica: 'Baja médica',
  permiso: 'Permiso',
  asunto_propio: 'Asunto propio',
  maternidad_paternidad: 'Mat./Paternidad',
  otro: 'Otro',
};

const BLOQUES = [
  { estado: 'pendiente', titulo: 'Solicitadas (pendientes de aprobar)', icon: Clock, color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  { estado: 'aprobada', titulo: 'Aceptadas', icon: CheckCircle, color: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { estado: 'rechazada', titulo: 'Rechazadas', icon: XCircle, color: 'text-red-400', badge: 'bg-red-100 text-red-700' },
];

function fecha(value) {
  return value ? format(parseISO(value), 'd MMM yyyy', { locale: es }) : '—';
}

export default function MisAusenciasLista({ ausencias = [] }) {
  if (ausencias.length === 0) {
    return (
      <Card className="p-8 text-center bg-white border-0 shadow-sm">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Todavía no has solicitado ninguna ausencia</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {BLOQUES.map(({ estado, titulo, icon: Icon, color, badge }) => {
        const items = ausencias
          .filter(a => a.estado === estado)
          .sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''));
        if (items.length === 0) return null;
        return (
          <div key={estado}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <h3 className="font-semibold text-slate-700 text-sm">{titulo}</h3>
              <Badge className={`${badge} border-0 text-xs`}>{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map(a => (
                <Card key={a.id} className="p-4 bg-white border-0 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{TIPOS[a.tipo] || a.tipo}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {fecha(a.fecha_inicio)} → {fecha(a.fecha_fin)}
                        <span className="text-slate-400 ml-2">({a.dias_totales} día{a.dias_totales !== 1 ? 's' : ''})</span>
                      </p>
                      {a.motivo && <p className="text-xs text-slate-400 mt-1 italic">{a.motivo}</p>}
                    </div>
                    <Badge className={`${badge} border-0 text-xs`}>
                      {estado === 'pendiente' ? 'Pendiente' : estado === 'aprobada' ? 'Aceptada' : 'Rechazada'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}