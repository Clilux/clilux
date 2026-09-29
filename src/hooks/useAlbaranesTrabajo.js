import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Albaranes de trabajo: única fuente de datos, compartida por el módulo de
 * Servicios (Gestión de trabajo) y el módulo ERP. Al leer y escribir siempre
 * sobre los mismos registros (AlbaranTrabajo), ambos módulos quedan sincronizados.
 */
export function useAlbaranesTrabajo() {
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const effEmail = isSessionTech ? sessionTechEmail : base44User?.email;
  const proxyCall = async (payload) => base44.functions.invoke('getCompanyData', { technician_email: effEmail, ...payload });

  const { data: techRecord } = useQuery({
    queryKey: ['me-trabajo', effEmail],
    queryFn: async () => {
      if (!effEmail) return null;
      if (isSessionTech) {
        const res = await proxyCall({ entity: 'me' });
        return res.data?.data || null;
      }
      const all = await base44.entities.Technician.list();
      return all.find(t => t.email === effEmail || t.user_email === effEmail) || null;
    },
    enabled: !!effEmail,
  });

  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || techRecord?.is_admin === true;
  const hideRates = isSessionTech && !techRecord?.is_admin;
  const effName = techRecord?.name || base44User?.full_name || '';

  const { data: albaranes = [], isLoading } = useQuery({
    queryKey: ['albaranes-trabajo', isSessionTech ? 'proxy' : 'direct', effEmail],
    queryFn: async () => {
      if (!effEmail) return [];
      if (isSessionTech) {
        const res = await proxyCall({ entity: 'albaran_trabajo_list' });
        return res.data?.data || [];
      }
      const all = await base44.entities.AlbaranTrabajo.list('-fecha');
      return all.filter(a => a.company_id === techRecord?.company_id || a.tecnico_email === effEmail || base44User?.role === 'admin');
    },
    enabled: !!effEmail,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) { const res = await proxyCall({ entity: 'clients' }); return res.data?.data || []; }
      return base44.entities.Client.list();
    },
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) { const res = await proxyCall({ entity: 'obras' }); return res.data?.data || []; }
      return base44.entities.Obra.list();
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['albaranes-trabajo'] });

  const saveAlbaran = async (payload, isEdit, id) => {
    if (isSessionTech) {
      if (isEdit) {
        const res = await proxyCall({ entity: 'albaran_trabajo_update', record_id: id, updates: payload });
        refresh();
        return res.data;
      }
      const res = await proxyCall({ entity: 'albaran_trabajo_create', record: payload });
      refresh();
      return res.data;
    }
    if (isEdit) {
      const data = await base44.entities.AlbaranTrabajo.update(id, payload);
      refresh();
      return { data };
    }
    const data = await base44.entities.AlbaranTrabajo.create({ ...payload, company_id: techRecord?.company_id });
    refresh();
    return { data };
  };

  const deleteAlbaran = async (id) => {
    if (isSessionTech) {
      await proxyCall({ entity: 'albaran_trabajo_delete', record_id: id });
    } else {
      await base44.entities.AlbaranTrabajo.delete(id);
    }
    refresh();
  };

  return {
    albaranes,
    isLoading,
    clients,
    obras,
    techRecord,
    isAdmin,
    hideRates,
    isSessionTech,
    effEmail,
    effName,
    saveAlbaran,
    deleteAlbaran,
    refresh,
  };
}