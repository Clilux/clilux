import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Devuelve datos de la empresa usando service role (no requiere sesión Base44 del usuario).
 * Valida que el técnico exista y esté activo antes de devolver datos.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { technician_email, entity } = body;

  if (!technician_email) {
    return Response.json({ error: 'technician_email requerido' }, { status: 400 });
  }

  // Validar técnico usando service role (no depende de sesión del usuario)
  const techs = await base44.asServiceRole.entities.Technician.filter({ email: technician_email });
  const tech = techs[0];
  if (!tech || tech.status === 'inactive') {
    return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
  }

  // ── Operaciones de lectura ────────────────────────────────────
  if (entity === 'clients') {
    const data = await base44.asServiceRole.entities.Client.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'buildings') {
    const data = await base44.asServiceRole.entities.Building.list();
    return Response.json({ data });
  }
  if (entity === 'equipment') {
    const data = await base44.asServiceRole.entities.Equipment.list();
    return Response.json({ data });
  }
  if (entity === 'incidents') {
    const data = await base44.asServiceRole.entities.Incident.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'revisions') {
    const data = await base44.asServiceRole.entities.ScheduledRevision.list();
    return Response.json({ data });
  }
  if (entity === 'settings') {
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    return Response.json({ data: settings[0] || null });
  }

  // ── Ausencias pendientes del técnico ────────────────────────
  if (entity === 'ausencias_pendientes') {
    const data = await base44.asServiceRole.entities.Ausencia.filter({ technician_email, estado: 'pendiente' });
    return Response.json({ data });
  }

  // ── Fichaje: leer registro de hoy ────────────────────────────
  if (entity === 'registro_horario_get') {
    const { fecha } = body;
    if (!fecha) return Response.json({ error: 'fecha requerida' }, { status: 400 });
    const results = await base44.asServiceRole.entities.RegistroHorario.filter({ technician_email, fecha });
    return Response.json({ data: results[0] || null });
  }

  // ── Fichaje: crear registro ──────────────────────────────────
  if (entity === 'registro_horario_create') {
    const { record } = body;
    if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
    const data = await base44.asServiceRole.entities.RegistroHorario.create(record);
    return Response.json({ data });
  }

  // ── Fichaje: actualizar registro ─────────────────────────────
  if (entity === 'registro_horario_update') {
    const { record_id, updates } = body;
    if (!record_id || !updates) return Response.json({ error: 'record_id y updates requeridos' }, { status: 400 });
    const data = await base44.asServiceRole.entities.RegistroHorario.update(record_id, updates);
    return Response.json({ data });
  }

  return Response.json({ error: 'entity no válida' }, { status: 400 });
});