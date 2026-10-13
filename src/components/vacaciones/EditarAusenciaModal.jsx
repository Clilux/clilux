import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import SelectorDias from './SelectorDias';
import { diasDeAusencia, diasLaborablesDe, rangoDeDias } from '@/lib/vacaciones-utils';

const TIPOS = {
  vacaciones: 'Vacaciones', baja_medica: 'Baja médica', permiso: 'Permiso retribuido',
  asunto_propio: 'Asunto propio', maternidad_paternidad: 'Maternidad/Paternidad', otro: 'Otro',
};

/** El gerente corrige los días concretos de una solicitud ya registrada. */
export default function EditarAusenciaModal({ ausencia, tech, diasOcupados = [], isSessionTech, effectiveEmail, onClose }) {
  const queryClient = useQueryClient();
  const diasLaborables = diasLaborablesDe(tech);

  const [dias, setDias] = useState(() => diasDeAusencia(ausencia, diasLaborables));
  const [estado, setEstado] = useState(ausencia.estado || 'pendiente');
  const [notas, setNotas] = useState(ausencia.notas_admin || '');

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = { dias_solicitados: dias, ...rangoDeDias(dias), estado, notas_admin: notas };
      if (isSessionTech && effectiveEmail) {
        return base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'ausencia_update', record_id: ausencia.id, updates,
        });
      }
      return base44.entities.Ausencia.update(ausencia.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ausencias-company'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores'] });
      toast.success('Días actualizados');
      onClose();
    },
    onError: () => toast.error('No se pudo actualizar la solicitud'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg bg-white p-5 space-y-4 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">Corregir días</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {ausencia.technician_name || ausencia.technician_email} · {TIPOS[ausencia.tipo] || ausencia.tipo}
              {ausencia.fecha_inicio && ` · solicitado del ${format(parseISO(ausencia.fecha_inicio), 'd MMM', { locale: es })} al ${format(parseISO(ausencia.fecha_fin || ausencia.fecha_inicio), 'd MMM yyyy', { locale: es })}`}
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <SelectorDias value={dias} onChange={setDias} diasLaborables={diasLaborables} diasOcupados={diasOcupados} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Nota interna</Label>
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <p className="text-sm font-semibold text-blue-600">{dias.length} día{dias.length !== 1 ? 's' : ''} laborable{dias.length !== 1 ? 's' : ''}</p>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => mutation.mutate()} disabled={mutation.isPending || dias.length === 0}>
            <Check className="h-4 w-4 mr-2" />Guardar días
          </Button>
        </div>
      </Card>
    </div>
  );
}