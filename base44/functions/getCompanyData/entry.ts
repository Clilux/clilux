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

  // Permisos del técnico (con defaults si no están definidos)
  const permisos = {
    ver_clientes: true, editar_clientes: false,
    ver_edificios: true,
    ver_equipos: true, editar_equipos: false,
    ver_incidencias: true, editar_incidencias: true,
    ver_revisiones: true, editar_revisiones: true,
    ver_horario: true, ver_ausencias: true,
    ver_documentacion: true, ver_contratos: false, ver_scada: false,
    ...(tech.permisos || {}),
  };

  // Helper para denegar acceso
  const deny = (perm) => Response.json({ error: `Sin permiso: ${perm}`, no_permission: true }, { status: 403 });

  // ── Carga masiva (evita múltiples llamadas simultáneas) ──────
  if (entity === 'all') {
    const fetches = await Promise.all([
      permisos.ver_clientes   ? base44.asServiceRole.entities.Client.list('-created_date')          : Promise.resolve([]),
      permisos.ver_edificios  ? base44.asServiceRole.entities.Building.list()                        : Promise.resolve([]),
      permisos.ver_equipos    ? base44.asServiceRole.entities.Equipment.list()                       : Promise.resolve([]),
      permisos.ver_incidencias? base44.asServiceRole.entities.Incident.list('-created_date')         : Promise.resolve([]),
      permisos.ver_revisiones ? base44.asServiceRole.entities.ScheduledRevision.list()               : Promise.resolve([]),
      base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' }),
    ]);
    return Response.json({
      clients:   fetches[0],
      buildings: fetches[1],
      equipment: fetches[2],
      incidents: fetches[3],
      revisions: fetches[4],
      settings:  fetches[5][0] || null,
    });
  }

  // ── Operaciones de lectura individuales ───────────────────────
  if (entity === 'clients') {
    if (!permisos.ver_clientes) return deny('ver_clientes');
    const data = await base44.asServiceRole.entities.Client.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'buildings') {
    if (!permisos.ver_edificios) return deny('ver_edificios');
    const data = await base44.asServiceRole.entities.Building.list();
    return Response.json({ data });
  }
  if (entity === 'equipment') {
    if (!permisos.ver_equipos) return deny('ver_equipos');
    const data = await base44.asServiceRole.entities.Equipment.list();
    return Response.json({ data });
  }
  if (entity === 'incidents') {
    if (!permisos.ver_incidencias) return deny('ver_incidencias');
    const data = await base44.asServiceRole.entities.Incident.list('-created_date');
    return Response.json({ data });
  }
  if (entity === 'revisions') {
    if (!permisos.ver_revisiones) return deny('ver_revisiones');
    const data = await base44.asServiceRole.entities.ScheduledRevision.list();
    return Response.json({ data });
  }
  if (entity === 'contratos') {
    if (!permisos.ver_contratos) return deny('ver_contratos');
    const data = await base44.asServiceRole.entities.Contrato.list();
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

  // ── Fichaje: leer registros del mes ─────────────────────────
  if (entity === 'registro_horario_mes') {
    const { mes } = body; // formato 'yyyy-MM'
    if (!mes) return Response.json({ error: 'mes requerido' }, { status: 400 });
    const all = await base44.asServiceRole.entities.RegistroHorario.filter({ technician_email });
    const data = all.filter(r => r.fecha?.startsWith(mes));
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