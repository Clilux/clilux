import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Devuelve datos de la empresa usando service role (no requiere sesión Base44 del usuario).
 * Valida que el técnico exista y esté activo antes de devolver datos.
 * TODO el dato de clientes/edificios/equipos/incidencias/revisiones se filtra
 * por la empresa (company_id) del técnico que hace la petición.
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

    // ── Aislamiento por empresa ──────────────────────────────────
    // IDs de clientes que pertenecen a la empresa del técnico.
    let _companyClientIds = null;
    const getCompanyClientIds = async () => {
      if (_companyClientIds === null) {
        const cs = await base44.asServiceRole.entities.Client.filter({ company_id: tech.company_id });
        _companyClientIds = new Set(cs.map(c => c.id));
      }
      return _companyClientIds;
    };
    const assertCompanyClient = async (clientId) => {
      if (!clientId) return false;
      const ids = await getCompanyClientIds();
      return ids.has(clientId);
    };

    // Helper para denegar acceso
    const deny = (perm) => Response.json({ error: `Sin permiso: ${perm}`, no_permission: true }, { status: 403 });

    // ── Carga masiva (evita múltiples llamadas simultáneas) ──────
    if (entity === 'all') {
      const companyClients = permisos.ver_clientes
        ? await base44.asServiceRole.entities.Client.filter({ company_id: tech.company_id })
        : [];
      const clientIds = new Set(companyClients.map(c => c.id));

      const fetches = await Promise.all([
        Promise.resolve(companyClients),
        permisos.ver_edificios  ? base44.asServiceRole.entities.Building.list()                        : Promise.resolve([]),
        permisos.ver_equipos    ? base44.asServiceRole.entities.Equipment.list()                       : Promise.resolve([]),
        permisos.ver_incidencias? base44.asServiceRole.entities.Incident.list('-created_date')         : Promise.resolve([]),
        permisos.ver_revisiones ? base44.asServiceRole.entities.ScheduledRevision.list()               : Promise.resolve([]),
        base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' }),
      ]);
      const companyRec = tech.company_id
        ? (await base44.asServiceRole.entities.Company.filter({ company_id: tech.company_id }))[0] || null
        : null;
      return Response.json({
        clients:   fetches[0],
        buildings: fetches[1].filter(b => clientIds.has(b.client_id)),
        equipment: fetches[2].filter(e => clientIds.has(e.client_id)),
        incidents: fetches[3].filter(i => clientIds.has(i.client_id)),
        revisions: fetches[4].filter(r => clientIds.has(r.client_id)),
        settings:  fetches[5][0] || null,
        company:  companyRec,
      });
    }

    // ── Operaciones de lectura individuales ───────────────────────
    if (entity === 'clients') {
      if (!permisos.ver_clientes) return deny('ver_clientes');
      const data = await base44.asServiceRole.entities.Client.filter({ company_id: tech.company_id });
      return Response.json({ data });
    }
    // ── Crear cliente en la empresa (admin de empresa) ────────────
    if (entity === 'client_create') {
      if (!tech.is_admin) return deny('admin');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.Client.create({
        ...record,
        company_id: tech.company_id,
        status: record.status || 'active',
      });
      // invalidar caché de clientes de empresa
      _companyClientIds = null;
      return Response.json({ data });
    }

    if (entity === 'buildings') {
      if (!permisos.ver_edificios) return deny('ver_edificios');
      const clientIds = await getCompanyClientIds();
      const all = await base44.asServiceRole.entities.Building.list();
      return Response.json({ data: all.filter(b => clientIds.has(b.client_id)) });
    }
    if (entity === 'equipment') {
      if (!permisos.ver_equipos) return deny('ver_equipos');
      const clientIds = await getCompanyClientIds();
      const all = await base44.asServiceRole.entities.Equipment.list();
      return Response.json({ data: all.filter(e => clientIds.has(e.client_id)) });
    }
    if (entity === 'incidents') {
      if (!permisos.ver_incidencias) return deny('ver_incidencias');
      const clientIds = await getCompanyClientIds();
      const all = await base44.asServiceRole.entities.Incident.list('-created_date');
      return Response.json({ data: all.filter(i => clientIds.has(i.client_id)) });
    }
    if (entity === 'revisions') {
      if (!permisos.ver_revisiones) return deny('ver_revisiones');
      const clientIds = await getCompanyClientIds();
      const all = await base44.asServiceRole.entities.ScheduledRevision.list();
      return Response.json({ data: all.filter(r => clientIds.has(r.client_id)) });
    }
    if (entity === 'contratos') {
      if (!permisos.ver_contratos) return deny('ver_contratos');
      const clientIds = await getCompanyClientIds();
      const all = await base44.asServiceRole.entities.Contrato.list();
      return Response.json({ data: all.filter(c => clientIds.has(c.cliente_id)) });
    }
    if (entity === 'settings') {
      const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
      return Response.json({ data: settings[0] || null });
    }

    // ── Datos de la empresa del técnico ─────────────────────────
    if (entity === 'company') {
      if (!tech.company_id) return Response.json({ data: null });
      const rec = (await base44.asServiceRole.entities.Company.filter({ company_id: tech.company_id }))[0] || null;
      return Response.json({ data: rec });
    }

    // ── Actualizar / crear datos de la empresa (solo admin) ─────
    if (entity === 'company_update') {
      if (!tech.is_admin) return deny('admin');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const existing = tech.company_id
        ? (await base44.asServiceRole.entities.Company.filter({ company_id: tech.company_id }))[0]
        : null;
      const payload = {
        ...record,
        company_id: tech.company_id,
        status: record.status || 'active',
      };
      let data;
      if (existing) {
        data = await base44.asServiceRole.entities.Company.update(existing.id, payload);
      } else {
        data = await base44.asServiceRole.entities.Company.create(payload);
      }
      // Sincronizar el nombre de empresa en los técnicos de la empresa
      if (record.name) {
        const companyTechs = await base44.asServiceRole.entities.Technician.filter({ company_id: tech.company_id });
        for (const ct of companyTechs) {
          if (ct.company_name !== record.name) {
            await base44.asServiceRole.entities.Technician.update(ct.id, { company_name: record.name });
          }
        }
      }
      return Response.json({ data });
    }

    // ── Actualizar mi propio perfil (auto-servicio del gerente/técnico) ─
    if (entity === 'me_update') {
      const { updates } = body;
      if (!updates) return Response.json({ error: 'updates requerido' }, { status: 400 });
      // No permitir cambiar company_id, is_admin, email desde el proxy de auto-servicio
      const safe = { ...updates };
      delete safe.company_id;
      delete safe.company_name;
      delete safe.is_admin;
      delete safe.email;
      delete safe.user_email;
      const data = await base44.asServiceRole.entities.Technician.update(tech.id, safe);
      return Response.json({ data });
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
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0];
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.Equipment.update(equipment_id, updates);
      return Response.json({ data });
    }

    // ── Crear equipo ─────────────────────────────────────────────
    if (entity === 'equipment_create') {
      if (!permisos.editar_equipos) return deny('editar_equipos');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      if (!(await assertCompanyClient(record.client_id))) {
        return Response.json({ error: 'El cliente no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.Equipment.create(record);
      return Response.json({ data });
    }

    // ── Bulk create revisiones ───────────────────────────────────
    if (entity === 'revisions_bulk_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { records } = body;
      if (!records?.length) return Response.json({ error: 'records requerido' }, { status: 400 });
      const clientIds = await getCompanyClientIds();
      for (const r of records) {
        if (!clientIds.has(r.client_id)) return Response.json({ error: 'Una revisión no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.ScheduledRevision.bulkCreate(records);
      return Response.json({ data });
    }

    // ── Eliminar revisiones pendientes de un equipo ──────────────
    if (entity === 'revisions_delete_pending') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0];
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
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
      if (!(await assertCompanyClient(rev.client_id))) {
        return Response.json({ error: 'La revisión no pertenece a tu empresa' }, { status: 403 });
      }
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
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0];
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.ScheduledRevision.filter({ equipment_id });
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: crear revisión ────────────────────
    if (entity === 'revision_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      if (!(await assertCompanyClient(record.client_id))) {
        return Response.json({ error: 'El cliente no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.ScheduledRevision.create(record);
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: actualizar revisión ───────────────
    if (entity === 'revision_update') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { revision_id, updates } = body;
      if (!revision_id || !updates) return Response.json({ error: 'revision_id y updates requeridos' }, { status: 400 });
      const revList = await base44.asServiceRole.entities.ScheduledRevision.filter({ id: revision_id });
      const rev = revList[0];
      if (!rev || !(await assertCompanyClient(rev.client_id))) {
        return Response.json({ error: 'La revisión no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.ScheduledRevision.update(revision_id, updates);
      return Response.json({ data });
    }

    // ── Plan de mantenimiento: eliminar revisión ─────────────────
    if (entity === 'revision_delete') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { revision_id } = body;
      if (!revision_id) return Response.json({ error: 'revision_id requerido' }, { status: 400 });
      const revList = await base44.asServiceRole.entities.ScheduledRevision.filter({ id: revision_id });
      const rev = revList[0];
      if (!rev || !(await assertCompanyClient(rev.client_id))) {
        return Response.json({ error: 'La revisión no pertenece a tu empresa' }, { status: 403 });
      }
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
      if (!bld || !(await assertCompanyClient(bld.client_id))) {
        return Response.json({ error: 'El edificio no pertenece a tu empresa' }, { status: 403 });
      }
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
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
      const [clientList, buildingList, revisionsList] = await Promise.all([
        base44.asServiceRole.entities.Client.filter({ id: eq.client_id }),
        base44.asServiceRole.entities.Building.filter({ id: eq.building_id }),
        permisos.ver_revisiones ? base44.asServiceRole.entities.ScheduledRevision.filter({ equipment_id }) : Promise.resolve([]),
      ]);
      return Response.json({ data: { equipment: eq, client: clientList[0] || null, building: buildingList[0] || null, revisions: revisionsList } });
    }

    // ── Detalle de incidencia (para técnicos de sesión propia) ──
    if (entity === 'incident_detail') {
      if (!permisos.ver_incidencias) return deny('ver_incidencias');
      const { incident_id } = body;
      if (!incident_id) return Response.json({ error: 'incident_id requerido' }, { status: 400 });
      const incList = await base44.asServiceRole.entities.Incident.filter({ id: incident_id });
      const inc = incList[0] || null;
      if (!inc || !(await assertCompanyClient(inc.client_id))) {
        return Response.json({ error: 'La incidencia no pertenece a tu empresa' }, { status: 403 });
      }
      const [clientList, buildingList, equipmentList] = await Promise.all([
        inc.client_id ? base44.asServiceRole.entities.Client.filter({ id: inc.client_id }) : Promise.resolve([]),
        inc.building_id ? base44.asServiceRole.entities.Building.filter({ id: inc.building_id }) : Promise.resolve([]),
        inc.equipment_id ? base44.asServiceRole.entities.Equipment.filter({ id: inc.equipment_id }) : Promise.resolve([]),
      ]);
      return Response.json({ data: { incident: inc, client: clientList[0] || null, building: buildingList[0] || null, equipment: equipmentList[0] || null } });
    }

    // ── Actualizar incidencia (para técnicos de sesión propia) ──
    if (entity === 'incident_update') {
      if (!permisos.editar_incidencias) return deny('editar_incidencias');
      const { incident_id, updates } = body;
      if (!incident_id || !updates) return Response.json({ error: 'incident_id y updates requeridos' }, { status: 400 });
      const incList = await base44.asServiceRole.entities.Incident.filter({ id: incident_id });
      const inc = incList[0];
      if (!inc || !(await assertCompanyClient(inc.client_id))) {
        return Response.json({ error: 'La incidencia no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.Incident.update(incident_id, updates);
      return Response.json({ data });
    }

    // ── Eliminar incidencia (para técnicos de sesión propia) ─────
    if (entity === 'incident_delete') {
      if (!permisos.editar_incidencias) return deny('editar_incidencias');
      const { incident_id } = body;
      if (!incident_id) return Response.json({ error: 'incident_id requerido' }, { status: 400 });
      const incList = await base44.asServiceRole.entities.Incident.filter({ id: incident_id });
      const inc = incList[0];
      if (!inc || !(await assertCompanyClient(inc.client_id))) {
        return Response.json({ error: 'La incidencia no pertenece a tu empresa' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Incident.delete(incident_id);
      return Response.json({ success: true });
    }

    // ── Incidencias por equipo ───────────────────────────────────
    if (entity === 'incidents_by_equipment') {
      if (!permisos.ver_incidencias) return deny('ver_incidencias');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0];
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.Incident.filter({ equipment_id }, '-created_date');
      return Response.json({ data });
    }

    // ── Registros L+D: leer por equipo ──────────────────────────
    if (entity === 'ld_registros') {
      if (!permisos.ver_equipos) return deny('ver_equipos');
      const { equipment_id } = body;
      if (!equipment_id) return Response.json({ error: 'equipment_id requerido' }, { status: 400 });
      const eqList = await base44.asServiceRole.entities.Equipment.filter({ id: equipment_id });
      const eq = eqList[0];
      if (!eq || !(await assertCompanyClient(eq.client_id))) {
        return Response.json({ error: 'El equipo no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.RegistroLD.filter({ equipment_id });
      return Response.json({ data });
    }

    // ── Registros L+D: crear ─────────────────────────────────────
    if (entity === 'ld_create') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      if (!(await assertCompanyClient(record.client_id))) {
        return Response.json({ error: 'El cliente no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.RegistroLD.create(record);
      return Response.json({ data });
    }

    // ── Registros L+D: actualizar ────────────────────────────────
    if (entity === 'ld_update') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record_id, updates } = body;
      if (!record_id || !updates) return Response.json({ error: 'record_id y updates requeridos' }, { status: 400 });
      const recList = await base44.asServiceRole.entities.RegistroLD.filter({ id: record_id });
      const rec = recList[0];
      if (!rec || !(await assertCompanyClient(rec.client_id))) {
        return Response.json({ error: 'El registro no pertenece a tu empresa' }, { status: 403 });
      }
      const data = await base44.asServiceRole.entities.RegistroLD.update(record_id, updates);
      return Response.json({ data });
    }

    // ── Registros L+D: eliminar ──────────────────────────────────
    if (entity === 'ld_delete') {
      if (!permisos.editar_revisiones) return deny('editar_revisiones');
      const { record_id } = body;
      if (!record_id) return Response.json({ error: 'record_id requerido' }, { status: 400 });
      const recList = await base44.asServiceRole.entities.RegistroLD.filter({ id: record_id });
      const rec = recList[0];
      if (!rec || !(await assertCompanyClient(rec.client_id))) {
        return Response.json({ error: 'El registro no pertenece a tu empresa' }, { status: 403 });
      }
      await base44.asServiceRole.entities.RegistroLD.delete(record_id);
      return Response.json({ success: true });
    }

    // ── Técnicos de la empresa (solo admin de empresa) ────────────
    if (entity === 'technicians') {
      if (!tech.is_admin) return deny('admin');
      const data = await base44.asServiceRole.entities.Technician.filter({ company_id: tech.company_id });
      return Response.json({ data });
    }

    // ── Crear técnico en la empresa (solo admin de empresa) ───────
    if (entity === 'technician_create') {
      if (!tech.is_admin) return deny('admin');
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      const data = await base44.asServiceRole.entities.Technician.create({
        ...record,
        company_id: tech.company_id,
        company_name: tech.company_name,
        status: record.status || 'active',
      });
      return Response.json({ data });
    }

    // ── Actualizar técnico de la empresa (solo admin de empresa) ─
    if (entity === 'technician_update') {
      if (!tech.is_admin) return deny('admin');
      const { technician_id, updates } = body;
      if (!technician_id || !updates) return Response.json({ error: 'technician_id y updates requeridos' }, { status: 400 });
      const target = (await base44.asServiceRole.entities.Technician.filter({ id: technician_id }))[0];
      if (!target || target.company_id !== tech.company_id) {
        return Response.json({ error: 'El técnico no pertenece a tu empresa' }, { status: 403 });
      }
      // No permitir cambiar company_id desde el proxy de empresa
      const safe = { ...updates };
      delete safe.company_id;
      const data = await base44.asServiceRole.entities.Technician.update(technician_id, safe);
      return Response.json({ data });
    }

    // ── Eliminar técnico de la empresa (solo admin de empresa) ───
    if (entity === 'technician_delete') {
      if (!tech.is_admin) return deny('admin');
      const { technician_id } = body;
      if (!technician_id) return Response.json({ error: 'technician_id requerido' }, { status: 400 });
      const target = (await base44.asServiceRole.entities.Technician.filter({ id: technician_id }))[0];
      if (!target || target.company_id !== tech.company_id) {
        return Response.json({ error: 'El técnico no pertenece a tu empresa' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Technician.delete(technician_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'entity no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});