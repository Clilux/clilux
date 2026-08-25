import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifyPassword, isHashed, hashPassword, issueSessionToken, rateLimitStatus, registerFailure, registerSuccess } from '../../shared/auth.ts';

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const rlKey = `tech:${email.trim().toLowerCase()}:${ip}`;
    const rl = rateLimitStatus(rlKey);
    if (rl.locked) {
      return Response.json({ error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s` }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const allTechs = await base44.asServiceRole.entities.Technician.list();

    const tech = allTechs.find(t =>
      (t.email || '').trim().toLowerCase() === email.trim().toLowerCase() &&
      t.status === 'active'
    );

    if (!tech) {
      registerFailure(rlKey);
      return Response.json({ success: false, error: 'Email o contraseña incorrectos, o técnico inactivo' });
    }

    const ok = await verifyPassword(String(password), String(tech.portal_password || ''));
    if (!ok) {
      registerFailure(rlKey);
      return Response.json({ success: false, error: 'Email o contraseña incorrectos, o técnico inactivo' });
    }
    registerSuccess(rlKey);

    // Migrar contraseña legacy en texto plano a hash
    if (!isHashed(String(tech.portal_password || ''))) {
      try {
        const hashed = await hashPassword(String(password));
        await base44.asServiceRole.entities.Technician.update(tech.id, { portal_password: hashed });
      } catch { /* no bloquear el login por fallo de migración */ }
    }

    const session_token = await issueSessionToken({ email: tech.email, id: tech.id, kind: 'technician' });

    return Response.json({
      success: true,
      email: tech.email,
      name: tech.name,
      id: tech.id,
      company_id: tech.company_id || '',
      company_name: tech.company_name || '',
      session_token,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});