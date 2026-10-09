import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Elimina un cliente y todo su árbol de mantenimiento:
 * edificios, equipos, revisiones programadas, incidencias, registros F-Gas,
 * paneles SCADA, documentos del cliente y obras.
 *
 * Los documentos comerciales (presupuestos, albaranes, pedidos y compras)
 * se conservan porque guardan el nombre del cliente desnormalizado.
 *
 * Autorización: sesión de técnico firmada (solo el gerente de la empresa
 * propietaria del cliente) o administrador de plataforma.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { technician_email, client_id } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id requerido' }, { status: 400 });
    }

    const session = body.session_token ? await verifySessionToken(body.session_token) : null;
    let isPlatformAdmin = false;
    if (!session) {
      try {
        const me = await base44.auth.me();
        if (me && me.role === 'admin') isPlatformAdmin = true;
      } catch { /* sin sesión Base44 */ }
    }

    if (!session && !isPlatformAdmin) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (session && technician_email && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
      return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;

    if (session) {
      const techs = await svc.Technician.filter({ email: session.email });
      const tech = techs[0];
      if (!tech?.is_admin || !tech?.company_id) {
        return Response.json({ error: 'Solo el gerente de la empresa puede eliminar clientes' }, { status: 403 });
      }
      const clients = await svc.Client.filter({ id: client_id });
      const client = clients[0];
      if (!client) {
        return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
      if (client.company_id && client.company_id !== tech.company_id) {
        return Response.json({ error: 'El cliente pertenece a otra empresa' }, { status: 403 });
      }
    }

    await svc.ScheduledRevision.deleteMany({ client_id });
    await svc.Incident.deleteMany({ client_id });
    await svc.Equipment.deleteMany({ client_id });
    await svc.Building.deleteMany({ client_id });
    await svc.RegistroFGas.deleteMany({ client_id });
    await svc.Scada.deleteMany({ client_id });
    await svc.ClientDocument.deleteMany({ client_id });
    await svc.Obra.deleteMany({ client_id });
    await svc.Client.delete(client_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Error al eliminar el cliente' }, { status: 500 });
  }
});