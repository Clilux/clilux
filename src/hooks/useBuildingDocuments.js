import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Sesión propia del portal (técnico/gerente) frente a usuario Base44 */
export const sesionPortal = () => (
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('technician_email') : null
);

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/**
 * Documentación de un edificio: listado, subida, apertura y borrado.
 * Funciona igual con sesión de portal (vía getCompanyData) y con usuario Base44.
 */
export function useBuildingDocuments(buildingId, client) {
  const queryClient = useQueryClient();
  const email = sesionPortal();
  const isSession = !!email;

  const { data: documentos = [] } = useQuery({
    queryKey: ['building-documents', buildingId, isSession],
    queryFn: async () => {
      if (isSession) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: email, entity: 'building_documents', building_id: buildingId,
        });
        return res.data?.data || [];
      }
      const res = await base44.entities.BuildingDocument.filter(
        { building_id: buildingId }, { sort: '-created_date', limit: 200 },
      );
      return res.items;
    },
    enabled: !!buildingId,
  });

  const { data: company } = useQuery({
    queryKey: ['company-doc', client?.company_id, isSession],
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

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['building-documents', buildingId] });

  const guardarDocumento = async (file, record) => {
    const base = { ...record };
    if (isSession) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: email,
        entity: 'building_document_upload',
        building_id: buildingId,
        filename: file.name,
        content_type: file.type || 'application/pdf',
        file_base64: await fileToBase64(file),
        record: base,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.data;
    }
    const me = await base44.auth.me().catch(() => null);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    return base44.entities.BuildingDocument.create({
      ...base,
      building_id: buildingId,
      file_uri,
      nombre_original: file.name,
      generated_by_name: base.generated_by_name || me?.full_name || '',
    });
  };

  const abrir = async (documento) => {
    if (isSession) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: email, entity: 'building_document_url', record_id: documento.id,
      });
      const url = res.data?.data;
      if (url) window.open(url, '_blank');
      return;
    }
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: documento.file_uri, expires_in: 600,
    });
    window.open(signed_url, '_blank');
  };

  const eliminar = async (documento) => {
    if (isSession) {
      await base44.functions.invoke('getCompanyData', {
        technician_email: email, entity: 'building_document_delete', record_id: documento.id,
      });
    } else {
      await base44.entities.BuildingDocument.delete(documento.id);
    }
    refrescar();
  };

  return { documentos, company, refrescar, guardarDocumento, abrir, eliminar };
}