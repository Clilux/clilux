import { createClient } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

    const allTechs = await base44.asServiceRole.entities.Technician.list();

    const tech = allTechs.find(t =>
      (t.email || '').trim().toLowerCase() === email.trim().toLowerCase() &&
      (t.portal_password || '').trim() === password.trim() &&
      t.status === 'active'
    );

    if (tech) {
      return Response.json({ success: true, email: tech.email, name: tech.name, id: tech.id, company_id: tech.company_id || '' });
    } else {
      return Response.json({ success: false, error: 'Email o contraseña incorrectos, o técnico inactivo' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});