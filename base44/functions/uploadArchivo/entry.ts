import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Sube un archivo al almacenamiento de la app usando service role.
 * Los técnicos con sesión propia (sin usuario Base44) no pueden invocar la
 * integración de subida desde el navegador, así que envían el archivo en
 * base64 y esta función lo sube tras validar su token de sesión firmado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { technician_email, filename, file_base64, content_type } = body;

    if (!filename || !file_base64) {
      return Response.json({ error: 'filename y file_base64 requeridos' }, { status: 400 });
    }

    // ── Autenticación: token de sesión firmado o admin de plataforma ──
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
    if (session && technician_email && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
      return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
    }

    // ── Reconstruir el archivo desde base64 y subirlo ──────────────
    const bin = atob(file_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], filename, { type: content_type || 'application/octet-stream' });

    const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ file_url: up.file_url });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});