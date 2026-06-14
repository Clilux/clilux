import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Devuelve datos de la empresa usando service role (no requiere sesión Base44 del usuario).
 * Valida que el técnico exista y esté activo antes de devolver datos.
 */
Deno.serve(async (req) => {
  try {
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

    // ── Actualizar equipo ────────────────────────────────────────
    if (entity === 'equipment_update') {
      if (!permisos.editar_equipos) return deny('editar_equipos');
      const { equipment_id, updates } = body;
      if (!equipment_id || !updates) return Response.json({ error: 'equipment_id y updates requeridos' }, { status: 400 });
      const data = await base44.asServiceRole.entities.Equipment.update(equipment_id, updates);
      return Response.json({ data });
    }

    // ── Crear equipo ─────────────────────────────────────────────
    if (entity === 'equipment_create') {
      if (!permisos.editar_equipos) return deny('editar_equipos');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.Equipment.create(record);
      return Response.json({ data });
    }

    // ── Bulk create revisiones ───────────────────────────────────
    if (entity === 'revisions_bulk_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { records } = body;
      if (!records?.length) return Response.json({ error: 'records requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.ScheduledRevision.bulkCreate(records);
      return Response.json({ data });
    }

    // ── Eliminar revisiones pendientes de un equipo ──────────────
    if (entity === 'revisions_delete_pending') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.ScheduledRevision.filter({ equipment_id, status: 'pending' });
      for (const rev of existing) {
        await base44.asServiceRole.entities.ScheduledRevision.delete(rev.id);
      }
      return Response.json({ success: true });
    }

    // ── Detalle de revisión ──────────────────────────────────────
    if (entity === 'revision_detail') {
      if (!permisos.ver_revisiones) return deny('ver_revisiones');
      const { revision_id } = body;
      if (!revision_id) return Response.json({ error: 'revision_id requerido' }, { status: 400 });
      const revList = await base44.asServiceRole.entities.ScheduledRevision.filter({ id: revision_id });
      const rev = revList[0] || null;
      if (!rev) return Response.json({ data: null });
      const [eqList, cliList, bldList] = await Promise.all([
        rev.equipment_id ? base44.asServiceRole.entities.Equipment.filter({ id: rev.equipment_id }) : Promise.resolve([]),
        rev.client_id ? base44.asServiceRole.entities.Client.filter({ id: rev.client_id }) : Promise.resolve([]),
        rev.building_id ? base44.asServiceRole.entities.Building.filter({ id: rev.building_id }) : Promise.resolve([]),
      ]);
      return Response.json({ data: { revision: rev, equipment: eqList[0] || null, client: cliList[0] || null, building: bldList[0] || null } });
    }

    // ── Plan de mantenimiento: revisiones por equipo ────────────
    if (entity === 'equipment_revisions') {
      if (!permisos.ver_revisiones) return deny('ver_revisiones');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.ScheduledRevision.filter({ equipment_id });
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: crear revisión ────────────────────
    if (entity === 'revision_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.ScheduledRevision.create(record);
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: actualizar revisión ───────────────
    if (entity === 'revision_update') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { revision_id, updates } = body;
      if (!revision_id || !updates) return Response.json({ error: 'revision_id y updates requeridos' }, { status: 400 });
      const data = await base44.asServiceRole.entities.ScheduledRevision.update(revision_id, updates);
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: eliminar revisión ─────────────────
    if (entity === 'revision_delete') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { revision_id } = body;
      if (!revision_id) return Response.json({ error: 'revision_id requerido' }, { status: 400 });
      await base44.asServiceRole.entities.ScheduledRevision.delete(revision_id);
      return Response.json({ success: true });
    }

    // ── Detalle de edificio (para técnicos de sesión propia) ────
    if (entity === 'building_detail') {
      if (!permisos.ver_edificios) return deny('ver_edificios');
      const { building_id } = body;
      if (!building_id) return Response.json({ error: 'building_id requerido' }, { status: 400 });
      const [buildings, equipmentList, revisionsList] = await Promise.all([
        base44.asServiceRole.entities.Building.filter({ id: building_id }),
        permisos.ver_equipos ? base44.asServiceRole.entities.Equipment.filter({ building_id }) : Promise.resolve([]),
        permisos.ver_revisiones ? base44.asServiceRole.entities.ScheduledRevision.filter({ building_id }) : Promise.resolve([]),
      ]);
      const bld = buildings[0] || null;
      const clientList = bld?.client_id ? await base44.asServiceRole.entities.Client.filter({ id: bld.client_id }) : [];
      return Response.json({ data: { building: bld, client: clientList[0] || null, equipment: equipmentList, revisions: revisionsList } });
    }

    // ── Detalle de equipo (para técnicos de sesión propia) ──────
    if (entity === 'equipment_detail') {
      if (!permisos.ver_equipos) return deny('ver_equipos');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0] || null;
      const [clientList, buildingList, revisionsList] = eq ? await Promise.all([
        base44.asServiceRole.entities.Client.filter({ id: eq.client_id }),
        base44.asServiceRole.entities.Building.filter({ id: eq.building_id }),
        permisos.ver_revisiones ? base44.asServiceRole.entities.ScheduledRevision.filter({ equipment_id }) : Promise.resolve([]),
      ]) : [[], [], []];
      return Response.json({ data: { equipment: eq, client: clientList[0] || null, building: buildingList[0] || null, revisions: revisionsList } });
    }

    // ── Detalle de incidencia (para técnicos de sesión propia) ──
    if (entity === 'incident_detail') {
      if (!permisos.ver_incidencias) return deny('ver_incidencias');
      const { incident_id } = body;
      if (!incident_id) return Response.json({ error: 'incident_id requerido' }, { status: 400 });
      const incList = await base44.asServiceRole.entities.Incident.filter({ id: incident_id });
      const inc = incList[0] || null;
      const [clientList, buildingList, equipmentList] = inc ? await Promise.all([
        inc.client_id ? base44.asServiceRole.entities.Client.filter({ id: inc.client_id }) : Promise.resolve([]),
        inc.building_id ? base44.asServiceRole.entities.Building.filter({ id: inc.building_id }) : Promise.resolve([]),
        inc.equipment_id ? base44.asServiceRole.entities.Equipment.filter({ id: inc.equipment_id }) : Promise.resolve([]),
      ]) : [[], [], []];
      return Response.json({ data: { incident: inc, client: clientList[0] || null, building: buildingList[0] || null, equipment: equipmentList[0] || null } });
    }

    // ── Incidencias por equipo ───────────────────────────────────
    if (entity === 'incidents_by_equipment') {
      if (!permisos.ver_incidencias) return deny('ver_incidencias');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.Incident.filter({ equipment_id }, '-created_date');
      return Response.json({ data });
    }

    // ── Registros L+D: leer por equipo ──────────────────────────
    if (entity === 'ld_registros') {
      if (!permisos.ver_equipos) return deny('ver_equipos');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.RegistroLD.filter({ equipment_id });
      return Response.json({ data });
    }

    // ── Registros L+D: crear ─────────────────────────────────────
    if (entity === 'ld_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.RegistroLD.create(record);
      return Response.json({ data });
    }

    // ── Registros L+D: actualizar ────────────────────────────────
    if (entity === 'ld_update') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record_id, updates } = body;
      if (!record_id || !updates) return Response.json({ error: 'record_id y updates requeridos' }, { status: 400 });
      const data = await base44.asServiceRole.entities.RegistroLD.update(record_id, updates);
      return Response.json({ data });
    }

    // ── Registros L+D: eliminar ──────────────────────────────────
    if (entity === 'ld_delete') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record_id } = body;
      if (!record_id) return Response.json({ error: 'record_id requerido' }, { status: 400 });
      await base44.asServiceRole.entities.RegistroLD.delete(record_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'entity no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});