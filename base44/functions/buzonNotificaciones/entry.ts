import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ESTADO_INC = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;
    const emailNorm = (body.email || '').trim().toLowerCase();

    // ── Listar notificaciones del destinatario ─────────────────────
    if (action === 'list') {
      if (!emailNorm) return Response.json({ data: [] });
      const all = await base44.asServiceRole.entities.Notificacion.list('-created_date', 200);
      const data = all.filter(n => (n.recipient_email || '').trim().toLowerCase() === emailNorm);
      return Response.json({ data });
    }

    // ── Marcar como leída (una o todas) ────────────────────────────
    if (action === 'marcar') {
      if (!emailNorm) return Response.json({ error: 'email requerido' }, { status: 400 });
      if (body.todas) {
        await base44.asServiceRole.entities.Notificacion.updateMany(
          { recipient_email: emailNorm },
          { $set: { leida: true } }
        );
        return Response.json({ success: true });
      }
      if (body.id) {
        const items = await base44.asServiceRole.entities.Notificacion.filter({ id: body.id });
        const n = items[0];
        if (n && (n.recipient_email || '').trim().toLowerCase() === emailNorm) {
          await base44.asServiceRole.entities.Notificacion.update(body.id, { leida: true });
        }
        return Response.json({ success: true });
      }
      return Response.json({ error: 'id o todas requerido' }, { status: 400 });
    }

    // ── Crear notificaciones según el evento ───────────────────────
    if (action === 'notificar') {
      const { tipo, datos = {} } = body;

      const crear = async (recipient_email, recipient_type, titulo, mensaje, link, company_id) => {
        const e = (recipient_email || '').trim().toLowerCase();
        if (!e) return;
        await base44.asServiceRole.entities.Notificacion.create({
          recipient_email: e,
          recipient_type,
          company_id: company_id || datos.company_id || '',
          tipo,
          titulo,
          mensaje,
          link: link || '',
          leida: false,
          datos,
        });
      };

      const gerentesDe = async (companyId) => {
        if (!companyId) return [];
        const techs = await base44.asServiceRole.entities.Technician.filter({ company_id: companyId });
        return techs.filter(t => t.is_admin && t.status !== 'inactive');
      };

      if (tipo === 'vacacion_solicitud') {
        const gerentes = await gerentesDe(datos.company_id);
        const fechas = datos.fecha_inicio && datos.fecha_fin ? `${datos.fecha_inicio} → ${datos.fecha_fin}` : '';
        for (const g of gerentes) {
          await crear(g.email, 'gerente',
            `Nueva solicitud de ${datos.worker_name || 'un trabajador'}`,
            `${datos.worker_name || ''} solicita ${datos.tipo_aus || 'vacaciones'} (${datos.dias}d) ${fechas}.`.trim(),
            '/ControlHorario', datos.company_id);
        }
      } else if (tipo === 'vacacion_resuelta') {
        const estadoTxt = datos.estado === 'aprobada' ? 'aprobada' : 'rechazada';
        await crear(datos.worker_email, 'trabajador',
          `Tu solicitud ha sido ${estadoTxt}`,
          `${datos.tipo_aus || 'Vacaciones'} (${datos.fecha_inicio || ''} → ${datos.fecha_fin || ''}) ${estadoTxt}.`,
          '/GestionAusencias', datos.company_id);
      } else if (tipo === 'incidencia_nueva') {
        let companyId = datos.company_id;
        let clientName = datos.client_name;
        if ((!companyId || !clientName) && datos.client_id) {
          const c = (await base44.asServiceRole.entities.Client.filter({ id: datos.client_id }))[0];
          if (c) { companyId = companyId || c.company_id; clientName = clientName || c.name; }
        }
        const gerentes = await gerentesDe(companyId);
        for (const g of gerentes) {
          await crear(g.email, 'gerente',
            `Nueva incidencia de ${clientName || 'cliente'}`,
            datos.title || 'Incidencia reportada',
            '/Incidents', companyId);
        }
      } else if (tipo === 'incidencia_estado') {
        let companyId = datos.company_id;
        if (!companyId && datos.client_id) {
          const c = (await base44.asServiceRole.entities.Client.filter({ id: datos.client_id }))[0];
          if (c) companyId = c.company_id;
        }
        const estadoTxt = ESTADO_INC[datos.newStatus] || datos.newStatus;
        await crear(datos.client_email, 'cliente',
          `Incidencia actualizada: ${estadoTxt}`,
          `${datos.title || 'Incidencia'} — nuevo estado: ${estadoTxt}.`,
          '/ClientIncidents', companyId);
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'action no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});