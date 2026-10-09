import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const sesionPortal = () => (
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('technician_email') : null
);

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Inspecciones REP de un edificio: listado, alta/edición, borrado y apertura del acta.
 * Funciona igual con sesión de portal (vía getCompanyData) y con usuario Base44.
 */
export function useRepInspecciones(buildingId, client) {
  const queryClient = useQueryClient();
  const email = sesionPortal();
  const isSession = !!email;

  const { data: inspecciones = [], isLoading } = useQuery({
    queryKey: ['rep-inspecciones', buildingId, isSession],
    queryFn: async () => {
      if (isSession) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: email, entity: 'rep_list', building_id: buildingId,
        });
        return res.data?.data || [];
      }
      const res = await base44.entities.InspeccionREP.filter(
        { building_id: buildingId }, { sort: '-fecha_inspeccion', limit: 200 },
      );
      return res.items;
    },
    enabled: !!buildingId,
  });

  const { data: company } = useQuery({
    queryKey: ['rep-company', client?.company_id, isSession],
    queryFn: async () => {
      if (isSession) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: email, entity: 'company',
        });
        return res.data?.data || null;
      }
      const res = await base44.entities.Company.filter({ company_id: client.company_id });
      return res[0] || null;
    },
    enabled: isSession || !!client?.company_id,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['rep-inspecciones', buildingId] });
  };

  const guardar = async (record, file) => {
    if (isSession) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: email,
        entity: record.id ? 'rep_update' : 'rep_create',
        record_id: record.id,
        record,
        filename: file?.name,
        content_type: file?.type,
        file_base64: file ? await fileToBase64(file) : undefined,
      });
      if (res.data?.error) throw new Error(res.data.error);
      refrescar();
      return res.data?.data;
    }

    let acta = {};
    if (file) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      acta = { acta_url: file_uri, acta_nombre: file.name };
    }

    if (record.id) {
      const { id, ...updates } = record;
      const data = await base44.entities.InspeccionREP.update(id, { ...updates, ...acta });
      refrescar();
      return data;
    }
    const data = await base44.entities.InspeccionREP.create({ ...record, ...acta });
    refrescar();
    return data;
  };

  const borrar = async (id) => {
    if (isSession) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: email, entity: 'rep_delete', record_id: id,
      });
      if (res.data?.error) throw new Error(res.data.error);
    } else {
      await base44.entities.InspeccionREP.delete(id);
    }
    refrescar();
  };

  const abrirActa = async (inspeccion) => {
    if (!inspeccion?.acta_url) return;
    let url = inspeccion.acta_url;
    if (isSession) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: email, entity: 'rep_url', record_id: inspeccion.id,
      });
      url = res.data?.data || null;
    } else {
      const signed = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: inspeccion.acta_url, expires_in: 600,
      });
      url = signed.signed_url;
    }
    if (url) window.open(url, '_blank', 'noopener');
  };

  return { inspecciones, isLoading, company, guardar, borrar, abrirActa, refrescar };
}