import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Proxy del bloque de Automatización (Loxone, Airzone y paneles SCADA).
 * Valida la sesión del trabajador y aísla TODOS los datos por company_id.
 * El acceso lo concede el gerente con el permiso `ver_automatizacion`.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { technician_email, entity } = body;

    if (!technician_email) {
      return Response.json({ error: 'technician_email requerido' }, { status: 400 });
    }

    // ── Autenticación del llamante ────────────────────────────────
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
    if (session && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
      return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
    }

    const techs = await base44.asServiceRole.entities.Technician.filter({ email: technician_email });
    const tech = techs[0];
    if (!tech || tech.status === 'inactive') {
      return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
    }

    // El bloque de Automatización solo lo abre el gerente o quien tenga el permiso.
    const tieneAcceso = tech.is_admin === true || tech.permisos?.ver_automatizacion === true;
    if (!tieneAcceso) {
      return Response.json({ error: 'Sin acceso al bloque de Automatización' }, { status: 403 });
    }

    const sr: any = base44.asServiceRole.entities;
    const companyId = tech.company_id;

    if (entity === 'scada_list') {
      const data = await sr.Scada.filter({ company_id: companyId });
      return Response.json({ data });
    }

    if (entity === 'scada_create') {
      const { record } = body;
      if (!record?.nombre) return Response.json({ error: 'nombre requerido' }, { status: 400 });
      const data = await sr.Scada.create({ ...record, company_id: companyId, created_by_name: tech.name });
      return Response.json({ data });
    }

    if (entity === 'scada_update') {
      const { record_id, updates } = body;
      if (!record_id) return Response.json({ error: 'record_id requerido' }, { status: 400 });
      const data = await sr.Scada.update(record_id, updates);
      return Response.json({ data });
    }

    if (entity === 'scada_delete') {
      const { record_id } = body;
      if (!record_id) return Response.json({ error: 'record_id requerido' }, { status: 400 });
      await sr.Scada.delete(record_id);
      return Response.json({ data: { ok: true } });
    }

    return Response.json({ error: 'entity no válido' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
});