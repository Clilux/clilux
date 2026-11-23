import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { diasDeAusencia } from '@/lib/vacaciones-utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Listado de las vacaciones disfrutadas (aprobadas) del año con sus fechas exactas. */
export default function DisfrutadasDialog({ open, onOpenChange, ausencias = [] }) {
  const year = new Date().getFullYear();
  const lista = ausencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada' && (a.fecha_inicio || '').startsWith(String(year)))
    .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vacaciones disfrutadas · {year}</DialogTitle>
        </DialogHeader>
        {lista.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aún no has disfrutado vacaciones este año.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {lista.map((a, i) => {
              const dias = diasDeAusencia(a);
              return (
                <div key={a.id || i} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      {format(parseISO(a.fecha_inicio), "d MMM", { locale: es })} – {format(parseISO(a.fecha_fin), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {a.dias_totales || dias.length} día{(a.dias_totales || dias.length) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {dias.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dias.map(d => (
                        <span key={d} className="text-[11px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                          {format(parseISO(d), "EEE d MMM", { locale: es })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}