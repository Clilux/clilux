import { createClient } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID'), serviceToken: Deno.env.get('BASE44_SERVICE_TOKEN') });

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const appSettings = settings[0];

    if (!appSettings) {
      return Response.json({ success: false, error: 'Configuración no encontrada' });
    }

    const clientUsers = appSettings.client_users || [];
    const clientUser = clientUsers.find(u =>
      (u.email || '').toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
    );

    if (clientUser) {
      return Response.json({ success: true, client_id: clientUser.client_id });
    } else {
      return Response.json({ success: false, error: 'Email o contraseña incorrectos' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});