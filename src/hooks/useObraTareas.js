import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Trabajos de una obra: listar, crear, actualizar (cerrar) y borrar. */
export default function useObraTareas(obraId, isSessionTech, effectiveEmail) {
  const queryClient = useQueryClient();
  const viaProxy = isSessionTech && !!effectiveEmail;

  const queryKey = ['obra-tareas', obraId, viaProxy ? 'proxy' : 'direct'];

  const { data: tareas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!obraId) return [];
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_tareas', obra_id: obraId });
        return res.data?.data || [];
      }
      const list = await base44.entities.ObraTarea.filter({ obra_id: obraId }, { sort: '-created_date' });
      return Array.isArray(list) ? list : list.items || [];
    },
    enabled: !!obraId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['obra-tareas', obraId] });

  const crear = useMutation({
    mutationFn: async (record) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_tarea_create', record });
        return res.data?.data;
      }
      return base44.entities.ObraTarea.create(record);
    },
    onSuccess: invalidate,
  });

  const actualizar = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_tarea_update', record_id: id, updates });
        return res.data?.data;
      }
      return base44.entities.ObraTarea.update(id, updates);
    },
    onSuccess: invalidate,
  });

  const eliminar = useMutation({
    mutationFn: async (id) => {
      if (viaProxy) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_tarea_delete', record_id: id });
        return res.data?.data;
      }
      return base44.entities.ObraTarea.delete(id);
    },
    onSuccess: invalidate,
  });

  return { tareas, isLoading, crear, actualizar, eliminar };
}