import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Importa un volcado de datos de empresa (clientes, edificios, equipos,
 * incidencias y revisiones) recreándolos en la empresa del gerente que solicita
 * la importación. Acepta tanto el JSON exportado como filas procedentes de Excel:
 * los registros sin id se enlazan por nombre (cliente, edificio, equipo).
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

    const idMap: any = { client: {}, building: {}, equipment: {} };
    const nameMap: any = { client: {}, building: {}, equipment: {} };
    const counts: any = { clients: 0, buildings: 0, equipment: 0, incidents: 0, revisions: 0 };
    const failed: string[] = [];

    const key = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

    // Resuelve una referencia a un registro padre: primero por id exportado
    // (JSON), después por nombre (Excel, que no incluye ids).
    const ref = (kind: string, value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const raw = String(value).trim();
      return idMap[kind][raw] || nameMap[kind][key(raw)] || null;
    };

    // Crea un registro sin abortar la importación si una fila viene incompleta.
    const safeCreate = async (api: any, label: string, data: any) => {
      try {
        const created = await api.create(data);
        counts[label] = (counts[label] || 0) + 1;
        return created;
      } catch (e: any) {
        if (failed.length < 5) failed.push(`${label}: ${e?.message || String(e)}`);
        return null;
      }
    };

    // 1. Clientes
    for (const c of (dump.clients || [])) {
      const rec = strip(c);
      const created = await safeCreate(base44.asServiceRole.entities.Client, 'clients', {
        ...rec,
        company_id: companyId,
        created_by_name: rec.created_by_name || creatorName,
      });
      if (!created) continue;
      if (c.id) idMap.client[c.id] = created.id;
      if (rec.name) nameMap.client[key(rec.name)] = created.id;
    }

    // 2. Edificios
    for (const b of (dump.buildings || [])) {
      const rec = strip(b);
      const created = await safeCreate(base44.asServiceRole.entities.Building, 'buildings', {
        ...rec,
        client_id: ref('client', b.client_id),
      });
      if (!created) continue;
      if (b.id) idMap.building[b.id] = created.id;
      if (rec.name) nameMap.building[key(rec.name)] = created.id;
    }

    // 3. Equipos (primero los que no tienen padre en el set, luego los hijos)
    const eqList = dump.equipment || [];
    const eqIdSet = new Set(eqList.map(e => e.id));
    const noParent = eqList.filter(e => !e.parent_equipment_id || !eqIdSet.has(e.parent_equipment_id));
    const withParent = eqList.filter(e => e.parent_equipment_id && eqIdSet.has(e.parent_equipment_id));
    for (const e of [...noParent, ...withParent]) {
      const rec = strip(e);
      const created = await safeCreate(base44.asServiceRole.entities.Equipment, 'equipment', {
        ...rec,
        client_id: ref('client', e.client_id),
        building_id: ref('building', e.building_id),
        parent_equipment_id: ref('equipment', e.parent_equipment_id),
      });
      if (!created) continue;
      if (e.id) idMap.equipment[e.id] = created.id;
      if (rec.reference_name) nameMap.equipment[key(rec.reference_name)] = created.id;
    }

    // 4. Incidencias
    for (const i of (dump.incidents || [])) {
      const rec = strip(i);
      await safeCreate(base44.asServiceRole.entities.Incident, 'incidents', {
        ...rec,
        client_id: ref('client', i.client_id),
        building_id: ref('building', i.building_id),
        equipment_id: ref('equipment', i.equipment_id),
      });
    }

    // 5. Revisiones
    for (const r of (dump.revisions || [])) {
      const rec = strip(r);
      await safeCreate(base44.asServiceRole.entities.ScheduledRevision, 'revisions', {
        ...rec,
        client_id: ref('client', r.client_id),
        building_id: ref('building', r.building_id),
        equipment_id: ref('equipment', r.equipment_id),
      });
    }

    return Response.json({ ok: true, counts, failed });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});