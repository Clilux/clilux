import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

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

    // Verificar identidad del llamante: token de sesión (técnico/cliente) o admin Base44
    const session = body.session_token ? await verifySessionToken(body.session_token) : null;
    let isAdmin = false;
    if (!session) {
      try { const me = await base44.auth.me(); if (me && me.role === 'admin') isAdmin = true; } catch { /* no autenticado */ }
    }
    if (!session && !isAdmin) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }
    const callerEmail = session ? (session.email || '').toLowerCase() : null;
    // Un usuario de sesión solo puede operar sobre sus propias notificaciones
    const canAccess = (email: string) => !session || isAdmin || callerEmail === (email || '').toLowerCase();

    // ── Listar notificaciones del destinatario ─────────────────────
    if (action === 'list') {
      if (!emailNorm) return Response.json({ data: [] });
      if (!canAccess(emailNorm)) return Response.json({ error: 'No autorizado' }, { status: 403 });
      const all = await base44.asServiceRole.entities.Notificacion.list('-created_date', 200);
      const data = all.filter(n => (n.recipient_email || '').trim().toLowerCase() === emailNorm);
      return Response.json({ data });
    }

    // ── Marcar como leída (una o todas) ────────────────────────────
    if (action === 'marcar') {
      if (!emailNorm) return Response.json({ error: 'email requerido' }, { status: 400 });
      if (!canAccess(emailNorm)) return Response.json({ error: 'No autorizado' }, { status: 403 });
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
      } else if (tipo === 'amonestacion_fichaje_tardio') {
        const { worker_email, worker_name, company_id, fecha, observaciones } = datos;
        const titulo = `Amonestación: fichaje tardío del ${fecha}`;
        const mensaje = `Hola ${worker_name || ''},\n\n` +
          `Se ha detectado que no registraste tu jornada del día ${fecha} en el momento correspondiente. ` +
          `Según el Art. 34 del Estatuto de los Trabajadores (RD-ley 8/2019), el registro de jornada ` +
          `debe realizarse diariamente en el momento de su prestación.\n\n` +
          `Se ha procedido a registrar tu jornada de oficio por el administrador.` +
          (observaciones ? `\n\nObservaciones: ${observaciones}` : '') +
          `\n\nTe recordamos la obligación de fichar la entrada y la salida cada día. ` +
          `Un nuevo incumplimiento podría dar lugar a medidas disciplinarias adicionales.\n\n` +
          `Saludos,\nDepartamento de Administración`;
        await crear(worker_email, 'trabajador', titulo, mensaje, '/ControlHorario', company_id);
        // Enviar también por email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: worker_email,
            subject: titulo,
            body: mensaje,
          });
        } catch (e) { /* no bloquear la notificación interna */ }
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'action no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});