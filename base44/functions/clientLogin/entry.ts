import { createClient } from 'npm:@base44/sdk@0.8.25';
import { verifyPassword, isHashed, hashPassword, issueSessionToken, rateLimitStatus, registerFailure, registerSuccess } from '../../shared/auth.ts';

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const rlKey = `client:${email.trim().toLowerCase()}:${ip}`;
    const rl = rateLimitStatus(rlKey);
    if (rl.locked) {
      return Response.json({ error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s` }, { status: 429 });
    }

    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID'), serviceToken: Deno.env.get('BASE44_SERVICE_TOKEN') });

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const appSettings = settings[0];

    if (!appSettings) {
      return Response.json({ success: false, error: 'Configuración no encontrada' });
    }

    const clientUsers = appSettings.client_users || [];
    const idx = clientUsers.findIndex(u =>
      (u.email || '').toLowerCase() === email.trim().toLowerCase()
    );

    if (idx < 0) {
      registerFailure(rlKey);
      return Response.json({ success: false, error: 'Email o contraseña incorrectos' });
    }

    const clientUser = clientUsers[idx];
    const ok = await verifyPassword(String(password), String(clientUser.password || ''));
    if (!ok) {
      registerFailure(rlKey);
      return Response.json({ success: false, error: 'Email o contraseña incorrectos' });
    }
    registerSuccess(rlKey);

    // Migrar contraseña legacy en texto plano a hash
    if (!isHashed(String(clientUser.password || ''))) {
      try {
        const hashed = await hashPassword(String(password));
        const updatedUsers = [...clientUsers];
        updatedUsers[idx] = { ...clientUser, password: hashed };
        await base44.asServiceRole.entities.AppSettings.update(appSettings.id, { client_users: updatedUsers });
      } catch { /* no bloquear el login por fallo de migración */ }
    }

    const session_token = await issueSessionToken({ email: clientUser.email, id: clientUser.client_id, kind: 'client' });

    return Response.json({ success: true, client_id: clientUser.client_id, session_token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});