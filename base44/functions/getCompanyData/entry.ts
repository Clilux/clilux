import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Devuelve datos de la empresa (clientes, edificios, equipos, incidencias, revisiones)
 * usando service role para que funcione aunque el técnico no tenga sesión Base44.
 * Requiere que el técnico esté registrado (se valida por email).
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { technician_email, entity } = body;

  if (!technician_email) {
    return Response.json({ error: 'technician_email requerido' }, { status: 400 });
  }

  // Validar que el técnico existe y está activo
  const techs = await base44.asServiceRole.entities.Technician.filter({ email: technician_email });
  const tech = techs[0];
  if (!tech || tech.status === 'inactive') {
    return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
  }

  let data = [];

  if (entity === 'clients' || !entity) {
    data = await base44.asServiceRole.entities.Client.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'buildings') {
    data = await base44.asServiceRole.entities.Building.list();
    return Response.json({ data });
  }
  if (entity === 'equipment') {
    data = await base44.asServiceRole.entities.Equipment.list();
    return Response.json({ data });
  }
  if (entity === 'incidents') {
    data = await base44.asServiceRole.entities.Incident.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'revisions') {
    data = await base44.asServiceRole.entities.ScheduledRevision.list();
    return Response.json({ data });
  }
  if (entity === 'settings') {
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    return Response.json({ data: settings[0] || null });
  }

  return Response.json({ error: 'entity no válida' }, { status: 400 });
});