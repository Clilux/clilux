import { base44 } from '@/api/base44Client';
import { getSessionToken } from '@/lib/passwordHash';
import { buildPresupuestoPDF } from '@/lib/presupuesto-pdf';

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Envía un presupuesto por email al cliente con el PDF adjunto.
 * El PDF se genera en el navegador (con el logo y la marca de agua de la empresa),
 * se sube y la función backend lo adjunta al correo.
 */
export async function enviarPresupuesto({ presupuesto, client, empresa, sessionTechEmail, to }) {
  const destinatario = (to || client?.email || '').trim();
  if (!EMAIL_VALIDO.test(destinatario)) {
    throw new Error('Indica un email válido para enviar el presupuesto');
  }

  const doc = await buildPresupuestoPDF({ presupuesto, client, empresa });
  const blob = doc.output('blob');
  const nombre = `Presupuesto_${(presupuesto?.numero || 'borrador').replace(/\s+/g, '_')}.pdf`;
  const file = new File([blob], nombre, { type: 'application/pdf' });

  const subida = await base44.integrations.Core.UploadPublicFile({ file });
  const file_url = subida?.file_url;
  if (!file_url) throw new Error('No se pudo preparar el PDF');

  let res;
  try {
    res = await base44.functions.invoke('enviarPresupuesto', {
      presupuesto_id: presupuesto.id,
      file_url,
      to: destinatario,
      technician_email: sessionTechEmail || '',
      session_token: getSessionToken(),
    });
  } catch (e) {
    throw new Error(e?.response?.data?.error || e?.message || 'No se pudo enviar el presupuesto');
  }

  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}