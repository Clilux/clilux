import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Envía un presupuesto al cliente por email con el PDF adjunto y lo marca como enviado.
 * Valida la sesión del trabajador (o un administrador de plataforma) y el aislamiento por empresa.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { presupuesto_id, file_url, technician_email } = body;

    if (!presupuesto_id || !file_url) {
      return Response.json({ error: 'presupuesto_id y file_url requeridos' }, { status: 400 });
    }

    // ── Autenticación del llamante ────────────────────────────────
    const session = body.session_token ? await verifySessionToken(body.session_token) : null;
    let isPlatformAdmin = false;
    if (!session) {
      try {
        const me = await base44.auth.me();
        if (me && me.role === 'admin') isPlatformAdmin = true;
      } catch { /* no autenticado vía Base44 */ }
    }
    if (!session && !isPlatformAdmin) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (session && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
      return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
    }

    const sr: any = base44.asServiceRole.entities;

    let companyId: string | null = null;
    if (session) {
      const techs = await sr.Technician.filter({ email: technician_email });
      const tech = techs[0];
      if (!tech || tech.status === 'inactive') {
        return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
      }
      companyId = tech.company_id;
    }

    const presupuesto = (await sr.Presupuesto.filter({ id: presupuesto_id }))[0];
    if (!presupuesto) return Response.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    const client = (await sr.Client.filter({ id: presupuesto.client_id }))[0];
    if (!client) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    if (companyId && client.company_id !== companyId) {
      return Response.json({ error: 'El presupuesto no pertenece a tu empresa' }, { status: 403 });
    }
    if (!client.email) {
      return Response.json({ error: 'El cliente no tiene email configurado' }, { status: 400 });
    }

    const total = `${(Number(presupuesto.total) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const fecha = presupuesto.fecha ? new Date(presupuesto.fecha).toLocaleDateString('es-ES') : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:24px 28px;">
      <h1 style="color:white;margin:0;font-size:20px;">Presupuesto ${presupuesto.numero || ''}</h1>
      <p style="color:#c7d2fe;margin:6px 0 0 0;font-size:14px;">${presupuesto.titulo || 'Oferta de servicios'}</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#374151;font-size:15px;margin-top:0;">Hola <strong>${client.name || ''}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;">Te adjuntamos el presupuesto ${presupuesto.numero || ''}${fecha ? ` de fecha ${fecha}` : ''}.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#eef2ff;border-radius:8px;">
        <tr>
          <td style="padding:16px;font-size:13px;color:#6b7280;">Importe total (IVA incluido)</td>
          <td style="padding:16px;font-size:20px;font-weight:bold;color:#4f46e5;text-align:right;">${total}</td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">Puedes responder a este correo para cualquier consulta o aclaración.</p>
    </div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">Documento enviado desde Clilux</p>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: client.email,
      subject: `Presupuesto ${presupuesto.numero || ''} — ${presupuesto.titulo || 'Oferta'}`,
      body: html,
      attachments: [{ filename: `Presupuesto_${(presupuesto.numero || 'borrador').replace(/\s+/g, '_')}.pdf`, file_url }],
    });

    const actualizado = await sr.Presupuesto.update(presupuesto_id, {
      status: 'enviado',
      fecha_envio: new Date().toISOString(),
      enviado_a: client.email,
    });

    return Response.json({ ok: true, to: client.email, presupuesto: actualizado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}