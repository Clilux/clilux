import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getSessionToken } from '@/lib/passwordHash';

/**
 * Datos del bloque de Automatización. Con sesión de trabajador propio carga vía
 * automatizacionProxy (aislado por empresa); con sesión Base44 usa la API directa.
 */
export function useAutomatizacion() {
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: myTechRecord } = useQuery({
    queryKey: ['tech-me', sessionTechEmail],
    queryFn: () => base44.functions.invoke('getCompanyData', {
      technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'me',
    }).then(r => r.data?.data || null),
    enabled: isSessionTech,
  });

  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || !!myTechRecord?.is_admin;

  const { data: scadas = [], isLoading } = useQuery({
    queryKey: ['scadas', isSessionTech ? 'tech' : 'admin'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('automatizacionProxy', {
          technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'scada_list',
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.data || [];
      }
      return base44.entities.Scada.list('-created_date');
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['automatizacion-clients', isSessionTech ? 'tech' : 'admin'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'clients',
        });
        return res.data?.data || [];
      }
      return base44.entities.Client.list('name');
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['scadas'] });

  const saveScada = async (record, id) => {
    let data;
    if (isSessionTech) {
      const res = await base44.functions.invoke('automatizacionProxy', {
        technician_email: sessionTechEmail,
        session_token: getSessionToken(),
        entity: id ? 'scada_update' : 'scada_create',
        ...(id ? { record_id: id, updates: record } : { record }),
      });
      if (res.data?.error) throw new Error(res.data.error);
      data = res.data?.data;
    } else {
      data = id
        ? await base44.entities.Scada.update(id, record)
        : await base44.entities.Scada.create(record);
    }
    invalidate();
    return data;
  };

  const deleteScada = async (id) => {
    if (isSessionTech) {
      const res = await base44.functions.invoke('automatizacionProxy', {
        technician_email: sessionTechEmail, session_token: getSessionToken(),
        entity: 'scada_delete', record_id: id,
      });
      if (res.data?.error) throw new Error(res.data.error);
    } else {
      await base44.entities.Scada.delete(id);
    }
    invalidate();
  };

  return { scadas, clients, isLoading, isSessionTech, isAdmin, myTechRecord, saveScada, deleteScada, refresh: invalidate };
}