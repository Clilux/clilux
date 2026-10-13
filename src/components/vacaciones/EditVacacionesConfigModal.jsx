import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, X, Info } from 'lucide-react';
import { DIAS_VACACIONES_DEFECTO } from '@/lib/vacaciones-utils';

export default function EditVacacionesConfigModal({ tech, isSessionTech, effectiveEmail, onClose }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [diasTotales, setDiasTotales] = useState(tech.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO);
  const [diasUsadosAnteriores, setDiasUsadosAnteriores] = useState(tech.vacaciones_dias_usados_anteriores ?? 0);
  const [notas, setNotas] = useState(tech.vacaciones_notas ?? '');

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = {
        vacaciones_anuales: Number(diasTotales),
        vacaciones_dias_usados_anteriores: Number(diasUsadosAnteriores),
        vacaciones_notas: notas,
      };
      if (isSessionTech && effectiveEmail) {
        return base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'technician_update_vacaciones', target_id: tech.id, updates });
      }
      return base44.entities.Technician.update(tech.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technicians-proxy'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-company'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores'] });
      toast.success('Vacaciones actualizadas');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-lg">Vacaciones · {tech.name}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="bg-brand-50 rounded-lg p-3 flex items-start gap-2 text-sm text-brand-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Si el trabajador viene de otra aplicación o empieza a mitad de año, indica los días ya utilizados antes de incorporarse a este sistema.</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Días de vacaciones anuales</label>
            <Input type="number" min={0} max={60} value={diasTotales}
              onChange={e => setDiasTotales(e.target.value)} className="w-full" />
            <p className="text-xs text-slate-400 mt-1">Por convenio general: 22 días laborables/año</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Días ya usados antes de entrar al sistema ({currentYear})
            </label>
            <Input type="number" min={0} value={diasUsadosAnteriores}
              onChange={e => setDiasUsadosAnteriores(e.target.value)} className="w-full" />
            <p className="text-xs text-slate-400 mt-1">Días disfrutados en otra app o antes de la incorporación</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Notas</label>
            <Input value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Viene de Factorial, tenía 5 días usados en enero" className="w-full" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Check className="h-4 w-4 mr-2" />Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}