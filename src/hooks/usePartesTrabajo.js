import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { puedeVerCostesTrabajador, veTodoElEquipo } from '@/lib/permisos-trabajador';

/**
 * Partes de trabajo: fuente única de datos para la página de partes, el formulario
 * y el botón de la jornada (Control Horario).
 *
 * - Trabajador en sesión propia (portal): todo pasa por el proxy getCompanyData,
 *   que valida la sesión y aísla por empresa.
 * - Usuario Base44 (gerente/admin de la plataforma): lectura y escritura directas.
 */
export function usePartesTrabajo({ month, withPartes = true } = {}) {
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const sessionToken = sessionStorage.getItem('session_token');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: techRecordDirect = null } = useQuery({
    queryKey: ['partes-tech-record', base44User?.email],
    queryFn: async () => {
      if (!base44User?.email) return null;
      const list = await base44.entities.Technician.filter({ email: base44User.email });
      return list[0] || null;
    },
    enabled: !isSessionTech && !!base44User?.email,
  });

  const isPlatformAdmin = !isSessionTech && base44User?.role === 'admin';
  const effEmail = isSessionTech ? sessionTechEmail : base44User?.email;
  const useProxy = isSessionTech || (!isPlatformAdmin && !!techRecordDirect && !!effEmail);

  const proxyCall = (payload) => base44.functions.invoke('getCompanyData', {
    technician_email: effEmail,
    ...(sessionToken ? { session_token: sessionToken } : {}),
    ...payload,
  });

  const { data: proxyMe = null } = useQuery({
    queryKey: ['partes-me', effEmail],
    queryFn: async () => {
      const res = await proxyCall({ entity: 'me' });
      return res.data?.data || null;
    },
    enabled: isSessionTech && !!effEmail,
  });

  const techRecord = isSessionTech ? proxyMe : techRecordDirect;
  const isAdmin = isPlatformAdmin || techRecord?.is_admin === true;
  const veTodo = veTodoElEquipo(techRecord, isAdmin);
  // Los costes de los trabajadores solo los ve el gerente.
  const hideRates = !puedeVerCostesTrabajador(techRecord, isAdmin);
  const effName = techRecord?.name || base44User?.full_name || '';

  // ── Partes del mes (solo cuando la pantalla los necesita) ──
  const mes = month || new Date().toISOString().slice(0, 7);
  const desde = `${mes}-01`;
  const hasta = `${mes}-31`;

  const { data: partes = [], isLoading } = useQuery({
    queryKey: ['partes-trabajo', mes, useProxy ? 'proxy' : 'direct', effEmail, veTodo],
    queryFn: async () => {
      if (useProxy) {
        const res = await proxyCall({ entity: 'partes_list', desde, hasta });
        return res.data?.data || [];
      }
      const query = { fecha: { $gte: desde, $lte: hasta } };
      const list = await base44.entities.ParteTrabajo.filter(query, { sort: '-fecha' });
      const items = Array.isArray(list) ? list : list.items || [];
      if (isPlatformAdmin) return items;
      return items.filter(p => !techRecordDirect?.company_id || p.company_id === techRecordDirect.company_id);
    },
    enabled: withPartes && !!effEmail,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['partes-clients', useProxy ? 'proxy' : 'direct', effEmail],
    queryFn: async () => {
      if (useProxy) { const res = await proxyCall({ entity: 'clients' }); return res.data?.data || []; }
      return base44.entities.Client.list('-created_date');
    },
    enabled: !!effEmail,
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['partes-obras', useProxy ? 'proxy' : 'direct', effEmail],
    queryFn: async () => {
      if (useProxy) { const res = await proxyCall({ entity: 'obras' }); return res.data?.data || []; }
      return base44.entities.Obra.list('-created_date');
    },
    enabled: !!effEmail,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['partes-technicians', useProxy ? 'proxy' : 'direct', effEmail],
    queryFn: async () => {
      if (useProxy) { const res = await proxyCall({ entity: 'technicians' }); return res.data?.data || []; }
      const all = await base44.entities.Technician.list();
      return techRecordDirect?.company_id ? all.filter(t => t.company_id === techRecordDirect.company_id) : all;
    },
    enabled: !!effEmail && veTodo,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['partes-trabajo'] });
    queryClient.invalidateQueries({ queryKey: ['partes-obra'] });
  };

  /** Crea o actualiza un parte. `id` presente = edición. */
  const saveParte = async (payload, { id, targetEmail } = {}) => {
    const numero = payload.numero || `PT-${Date.now().toString().slice(-6)}`;
    if (useProxy) {
      const res = id
        ? await proxyCall({ entity: 'parte_update', record_id: id, record: payload })
        : await proxyCall({ entity: 'parte_create', record: { ...payload, numero }, target_email: targetEmail || effEmail });
      refresh();
      return res.data;
    }
    const emailDest = targetEmail || effEmail;
    const dest = technicians.find(t => t.email === emailDest || t.user_email === emailDest) || techRecord;
    const costeHora = Number(dest?.coste_hora) || 0;
    const horas = Number(payload.horas) || 0;
    const record = {
      ...payload,
      horas,
      technician_id: dest?.id || '',
      technician_name: dest?.name || effName,
      technician_email: emailDest,
      company_id: techRecord?.company_id || '',
      coste_hora: costeHora,
      coste_total: Math.round(horas * costeHora * 100) / 100,
      created_by_name: effName,
    };
    const data = id
      ? await base44.entities.ParteTrabajo.update(id, record)
      : await base44.entities.ParteTrabajo.create({ ...record, numero });
    refresh();
    return { data };
  };

  const deleteParte = async (id) => {
    if (useProxy) await proxyCall({ entity: 'parte_delete', record_id: id });
    else await base44.entities.ParteTrabajo.delete(id);
    refresh();
  };

  return {
    partes,
    isLoading,
    clients,
    obras,
    technicians,
    techRecord,
    isAdmin,
    veTodo,
    hideRates,
    isSessionTech,
    isPlatformAdmin,
    effEmail,
    effName,
    saveParte,
    deleteParte,
    refresh,
  };
}