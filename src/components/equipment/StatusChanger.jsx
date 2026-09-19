import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export const EQUIPMENT_STATUS_OPTIONS = [
  { value: 'operational', label: 'Operativo', dot: 'bg-emerald-500', hint: 'En servicio, con su plan de mantenimiento activo.' },
  { value: 'maintenance_needed', label: 'Requiere mantenimiento', dot: 'bg-amber-500', hint: 'Aviso interno: sigue en servicio.' },
  { value: 'out_of_service', label: 'Fuera de servicio', dot: 'bg-red-500', hint: 'Anula las revisiones pendientes y cierra las incidencias abiertas.' },
  { value: 'sin_contrato', label: 'Sin contrato', dot: 'bg-slate-400', hint: 'Congela el equipo: anula revisiones y lo aísla de los que sí tienen servicio.' },
];

export const equipmentStatusLabel = (value) =>
  EQUIPMENT_STATUS_OPTIONS.find((o) => o.value === value)?.label || value;

/**
 * Etiqueta de estado pulsable: permite cambiar el estado del equipo.
 * Los estados que anulan revisiones piden confirmación.
 */
export default function StatusChanger({ status, canEdit = false, isPending = false, onChange }) {
  const [confirmStatus, setConfirmStatus] = useState(null);
  const current = status || 'operational';

  if (!canEdit) return <StatusBadge status={current} />;

  const pick = (value) => {
    if (value === current) return;
    if (value === 'sin_contrato' || value === 'out_of_service') setConfirmStatus(value);
    else onChange(value);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isPending}>
          <button
            type="button"
            title="Cambiar estado"
            className="inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#2F586E]/40"
          >
            <StatusBadge status={current} />
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Cambiar estado del equipo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {EQUIPMENT_STATUS_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.value} onSelect={() => pick(o.value)} className="flex items-start gap-2 py-2">
              <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', o.dot)} />
              <span className="flex-1">
                <span className={cn('block text-sm', o.value === current ? 'font-semibold text-[#2F586E]' : 'text-slate-700')}>
                  {o.label}
                </span>
                <span className="block text-xs text-slate-400">{o.hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus === 'sin_contrato' ? '¿Marcar el equipo como sin contrato?' : '¿Marcar el equipo fuera de servicio?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus === 'sin_contrato'
                ? 'Se anularán todas las revisiones pendientes y se cerrarán las incidencias abiertas. El equipo y su histórico se conservan congelados, por si vuelve a contratarse el servicio. Si todos los equipos del edificio quedan sin contrato, el edificio también se marcará como sin contrato.'
                : 'Se anularán las revisiones pendientes y se cerrarán las incidencias abiertas del equipo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onChange(confirmStatus); setConfirmStatus(null); }}
              className="bg-[#2F586E] hover:bg-[#25455a]"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}