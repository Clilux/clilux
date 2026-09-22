import { base44 } from '@/api/base44Client';
import { getSessionToken } from '@/lib/passwordHash';
import { buildPresupuestoPDF } from '@/lib/presupuesto-pdf';

/**
 * Envía un presupuesto por email al cliente con el PDF adjunto.
 * El PDF se genera en el navegador, se sube y la función backend lo adjunta al correo.
 */
export async function enviarPresupuesto({ presupuesto, client, empresa, sessionTechEmail }) {
  const doc = buildPresupuestoPDF({ presupuesto, client, empresa });
  const blob = doc.output('blob');
  const nombre = `Presupuesto_${(presupuesto?.numero || 'borrador').replace(/\s+/g, '_')}.pdf`;
  const file = new File([blob], nombre, { type: 'application/pdf' });

  const subida = await base44.integrations.Core.UploadPublicFile({ file });
  const file_url = subida?.file_url;
  if (!file_url) throw new Error('No se pudo preparar el PDF');

  const res = await base44.functions.invoke('enviarPresupuesto', {
    presupuesto_id: presupuesto.id,
    file_url,
    technician_email: sessionTechEmail || '',
    session_token: getSessionToken(),
  });

  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}