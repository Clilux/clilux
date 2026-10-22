import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Observaciones e incidencias de una obra. */
export default function useObraObservaciones(obraId, isSessionTech, effectiveEmail) {
  const queryClient = useQueryClient();
  const viaProxy = isSessionTech && !!effectiveEmail;

  const { data: observaciones = [], isLoading } = useQuery({
    queryKey: ['obra-observaciones', obraId, viaProxy ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (!obraId) return [];
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_observaciones', obra_id: obraId });
        return res.data?.data || [];
      }
      const list = await base44.entities.ObraObservacion.filter({ obra_id: obraId }, { sort: '-fecha' });
      return Array.isArray(list) ? list : list.items || [];
    },
    enabled: !!obraId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['obra-observaciones', obraId] });

  const crear = useMutation({
    mutationFn: async (record) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_observacion_create', record });
        return res.data?.data;
      }
      return base44.entities.ObraObservacion.create(record);
    },
    onSuccess: invalidate,
  });

  const actualizar = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_observacion_update', record_id: id, updates });
        return res.data?.data;
      }
      return base44.entities.ObraObservacion.update(id, updates);
    },
    onSuccess: invalidate,
  });

  const eliminar = useMutation({
    mutationFn: async (id) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_observacion_delete', record_id: id });
        return res.data?.data;
      }
      return base44.entities.ObraObservacion.delete(id);
    },
    onSuccess: invalidate,
  });

  return { observaciones, isLoading, crear, actualizar, eliminar };
}