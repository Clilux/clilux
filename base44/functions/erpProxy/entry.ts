import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Proxy del módulo ERP (presupuestos, pedidos, compras y proveedores) para
 * trabajadores con sesión propia (no autenticados en Base44).
 * Valida el token de sesión y aísla TODOS los datos por company_id.
 */

const TIPOS: Record<string, string> = {
  presupuesto: 'Presupuesto',
  pedido: 'Pedido',
  compra: 'Compra',
  proveedor: 'Proveedor',
  articulo: 'CatalogoProducto',
  familia: 'FamiliaProducto',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { technician_email, entity, tipo } = body;

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

    const sr: any = base44.asServiceRole.entities;
    const companyId = tech.company_id;
    const creatorName = tech.name;

    const companyClientIds = async (): Promise<Set<string>> => {
      const clients = await sr.Client.filter({ company_id: companyId });
      return new Set(clients.map((c: any) => c.id));
    };

    // ── Carga completa del módulo ─────────────────────────────────
    if (entity === 'erp_list') {
      const [proveedores, pedidos, compras, presupuestos, articulos, familias, clientIds] = await Promise.all([
        sr.Proveedor.filter({ company_id: companyId }),
        sr.Pedido.filter({ company_id: companyId }),
        sr.Compra.filter({ company_id: companyId }),
        sr.Presupuesto.list('-created_date'),
        sr.CatalogoProducto.filter({ company_id: companyId }),
        sr.FamiliaProducto.filter({ company_id: companyId }),
        companyClientIds(),
      ]);
      return Response.json({
        data: {
          proveedores,
          pedidos,
          compras,
          presupuestos: presupuestos.filter((p: any) => clientIds.has(p.client_id)),
          articulos,
          familias,
        },
      });
    }

    const entityName = TIPOS[tipo];
    if (!entityName) return Response.json({ error: 'tipo no válido' }, { status: 400 });

    // ── Crear ─────────────────────────────────────────────────────
    if (entity === 'erp_create') {
      const { record } = body;
      if (!record) return Response.json({ error: 'record requerido' }, { status: 400 });
      if (tipo === 'presupuesto' && !(await companyClientIds()).has(record.client_id)) {
        return Response.json({ error: 'El cliente no pertenece a tu empresa' }, { status: 403 });
      }
      if (tipo === 'proveedor' || tipo === 'articulo' || tipo === 'familia') {
        const data = await sr[entityName].create({ ...record, company_id: companyId, created_by_name: creatorName });
        return Response.json({ data });
      }
      const data = await sr[entityName].create({ ...record, company_id: companyId, created_by_name: creatorName });
      return Response.json({ data });
    }

    // ── Actualizar ────────────────────────────────────────────────
    if (entity === 'erp_update') {
      const { record_id, updates } = body;
      if (!record_id || !updates) return Response.json({ error: 'record_id y updates requeridos' }, { status: 400 });
      const existing = (await sr[entityName].filter({ id: record_id }))[0];
      if (!existing) return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
      const mine = tipo === 'presupuesto'
        ? (await companyClientIds()).has(existing.client_id)
        : existing.company_id === companyId;
      if (!mine) return Response.json({ error: 'El registro no pertenece a tu empresa' }, { status: 403 });
      const safe = { ...updates };
      delete safe.company_id;
      const data = await sr[entityName].update(record_id, safe);
      return Response.json({ data });
    }

    // ── Eliminar ──────────────────────────────────────────────────
    if (entity === 'erp_delete') {
      const { record_id } = body;
      if (!record_id) return Response.json({ error: 'record_id requerido' }, { status: 400 });
      const existing = (await sr[entityName].filter({ id: record_id }))[0];
      if (!existing) return Response.json({ error: 'Registro no encontrado' }, { status: 404 });
      const mine = tipo === 'presupuesto'
        ? (await companyClientIds()).has(existing.client_id)
        : existing.company_id === companyId;
      if (!mine) return Response.json({ error: 'El registro no pertenece a tu empresa' }, { status: 403 });
      await sr[entityName].delete(record_id);
      return Response.json({ data: true });
    }

    return Response.json({ error: 'entity no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});