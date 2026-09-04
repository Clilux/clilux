import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Importa un volcado JSON de datos de empresa (clientes, edificios, equipos,
 * incidencias y revisiones) recreándolos en la empresa del gerente que solicita
 * la importación. Permite migrar/copiar datos a otra empresa: el gerente de
 * destino inicia sesión en su empresa y sube el archivo exportado.
 * Los IDs antiguos se remapean a los nuevos respetando las dependencias
 * (cliente → edificio → equipo → incidencia/revisión).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { technician_email, dump } = body;

    if (!dump || typeof dump !== 'object') {
      return Response.json({ error: 'dump (JSON de datos) requerido' }, { status: 400 });
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

    // ── Resolver técnico y verificar que es gerente ────────────────
    const techs = await base44.asServiceRole.entities.Technician.filter({ email: technician_email });
    const tech = techs[0];
    if (!tech || tech.status === 'inactive') {
      return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
    }
    if (!tech.is_admin) {
      return Response.json({ error: 'Solo el gerente puede importar datos' }, { status: 403 });
    }

    const companyId = tech.company_id;
    const creatorName = tech.name;
    const strip = (r) => {
      if (!r) return {};
      const { id, created_date, updated_date, created_by_id, ...rest } = r;
      return rest;
    };

    const idMap = { client: {}, building: {}, equipment: {} };
    const counts = { clients: 0, buildings: 0, equipment: 0, incidents: 0, revisions: 0 };

    // 1. Clientes
    for (const c of (dump.clients || [])) {
      const rec = strip(c);
      const created = await base44.asServiceRole.entities.Client.create({
        ...rec,
        company_id: companyId,
        created_by_name: rec.created_by_name || creatorName,
      });
      idMap.client[c.id] = created.id;
      counts.clients++;
    }

    // 2. Edificios
    for (const b of (dump.buildings || [])) {
      const rec = strip(b);
      const created = await base44.asServiceRole.entities.Building.create({
        ...rec,
        client_id: idMap.client[b.client_id] || null,
      });
      idMap.building[b.id] = created.id;
      counts.buildings++;
    }

    // 3. Equipos (primero los que no tienen padre en el set, luego los hijos)
    const eqList = dump.equipment || [];
    const eqIdSet = new Set(eqList.map(e => e.id));
    const noParent = eqList.filter(e => !e.parent_equipment_id || !eqIdSet.has(e.parent_equipment_id));
    const withParent = eqList.filter(e => e.parent_equipment_id && eqIdSet.has(e.parent_equipment_id));
    for (const e of [...noParent, ...withParent]) {
      const rec = strip(e);
      const created = await base44.asServiceRole.entities.Equipment.create({
        ...rec,
        client_id: idMap.client[e.client_id] || null,
        building_id: idMap.building[e.building_id] || null,
        parent_equipment_id: idMap.equipment[e.parent_equipment_id] || null,
      });
      idMap.equipment[e.id] = created.id;
      counts.equipment++;
    }

    // 4. Incidencias
    for (const i of (dump.incidents || [])) {
      const rec = strip(i);
      await base44.asServiceRole.entities.Incident.create({
        ...rec,
        client_id: idMap.client[i.client_id] || null,
        building_id: idMap.building[i.building_id] || null,
        equipment_id: idMap.equipment[i.equipment_id] || null,
      });
      counts.incidents++;
    }

    // 5. Revisiones
    for (const r of (dump.revisions || [])) {
      const rec = strip(r);
      await base44.asServiceRole.entities.ScheduledRevision.create({
        ...rec,
        client_id: idMap.client[r.client_id] || null,
        building_id: idMap.building[r.building_id] || null,
        equipment_id: idMap.equipment[r.equipment_id] || null,
      });
      counts.revisions++;
    }

    return Response.json({ ok: true, counts });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});