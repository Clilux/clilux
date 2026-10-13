import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MESES_CORTOS, diasDeAusencia, diasLaborablesDe, diasPorMes,
} from '@/lib/vacaciones-utils';

const TIPOS = {
  vacaciones: 'Vacaciones', baja_medica: 'Baja médica', permiso: 'Permiso',
  asunto_propio: 'Asunto propio', maternidad_paternidad: 'Mat./Paternidad', otro: 'Otro',
};

const ESTADOS = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
};

/** Detalle expandido de un trabajador: barras por mes, periodos y corrección de días. */
export default function DetalleTrabajador({ tech, ausencias = [], year, onEdit, onDelete }) {
  const diasLaborables = diasLaborablesDe(tech);
  const aprobadas = ausencias.filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada');
  const diasAprobados = aprobadas.flatMap(a => diasDeAusencia(a, diasLaborables));
  const porMes = diasPorMes(diasAprobados, year);
  const maxMes = Math.max(1, ...porMes);

  const periodos = [...ausencias].sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Días disfrutados por mes · {year}</p>
        <div className="flex items-end gap-1.5 h-20">
          {porMes.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-slate-400">{n > 0 ? n : ''}</span>
              <div
                className="w-full rounded-t bg-blue-500"
                style={{ height: `${Math.max(2, (n / maxMes) * 56)}px`, opacity: n > 0 ? 1 : 0.15 }}
                title={`${MESES_CORTOS[i]}: ${n} día${n !== 1 ? 's' : ''}`}
              />
              <span className="text-[9px] text-slate-400">{MESES_CORTOS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {periodos.length === 0 ? (
        <p className="text-xs text-slate-400">Sin ausencias registradas este año.</p>
      ) : (
        <div className="space-y-2">
          {periodos.map(a => {
            const dias = diasDeAusencia(a, diasLaborables);
            const otrosDias = ausencias
              .filter(x => x.id !== a.id && x.estado !== 'rechazada')
              .flatMap(x => diasDeAusencia(x, diasLaborables));
            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{TIPOS[a.tipo] || a.tipo}</Badge>
                      <Badge className={`${ESTADOS[a.estado] || ESTADOS.pendiente} border-0 text-xs`}>
                        {a.estado === 'aprobada' ? 'Aprobada' : a.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {a.fecha_inicio && format(parseISO(a.fecha_inicio), 'd MMM', { locale: es })} → {a.fecha_fin && format(parseISO(a.fecha_fin), 'd MMM yyyy', { locale: es })}
                      </span>
                      <span className="text-xs font-semibold text-blue-600">{dias.length}d</span>
                    </div>
                    {a.motivo && <p className="text-xs text-slate-400 mt-1">{a.motivo}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onEdit && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500 hover:text-blue-600"
                        onClick={() => onEdit(a, otrosDias)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Días
                      </Button>
                    )}
                    {onDelete && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {dias.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dias.map(d => (
                      <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {format(parseISO(d), 'd MMM', { locale: es })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}