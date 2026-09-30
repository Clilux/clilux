import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Solicitud de ausencia/vacaciones enviada por un trabajador desde su propio portal.
 * Vía directa y ligera (no pasa por el proxy de empresa, que carga todos los datos):
 *  - valida el token de sesión del trabajador
 *  - sella la identidad del trabajador en la solicitud (estado "pendiente")
 *  - crea la notificación para los gerentes de la empresa
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { tipo, fecha_inicio, fecha_fin, motivo } = body;

    if (!tipo || !fecha_inicio || !fecha_fin) {
      return Response.json({ error: 'tipo, fecha_inicio y fecha_fin requeridos' }, { status: 400 });
    }

    const session = body.session_token ? await verifySessionToken(body.session_token) : null;
    if (!session || !session.email) {
      return Response.json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' }, { status: 401 });
    }
    const emailNorm = String(session.email).trim().toLowerCase();

    const techs = await base44.asServiceRole.entities.Technician.filter({ email: session.email });
    let tech = techs.find(t => (t.email || '').trim().toLowerCase() === emailNorm);
    if (!tech) {
      const all = await base44.asServiceRole.entities.Technician.list();
      tech = all.find(t => (t.email || '').trim().toLowerCase() === emailNorm);
    }
    if (!tech || tech.status === 'inactive') {
      return Response.json({ error: 'Trabajador no encontrado o inactivo' }, { status: 403 });
    }

    const inicio = new Date(`${fecha_inicio}T00:00:00Z`);
    const fin = new Date(`${fecha_fin}T00:00:00Z`);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return Response.json({ error: 'Fechas no válidas' }, { status: 400 });
    }
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
    if (dias < 1) {
      return Response.json({ error: 'La fecha de fin debe ser posterior a la de inicio' }, { status: 400 });
    }

    const data = await base44.asServiceRole.entities.Ausencia.create({
      technician_email: tech.email,
      technician_name: tech.name || tech.email,
      technician_id: tech.id,
      company_id: tech.company_id || '',
      tipo,
      fecha_inicio,
      fecha_fin,
      dias_totales: dias,
      estado: 'pendiente',
      ...(motivo ? { motivo } : {}),
    });

    // Notificar a los gerentes de la empresa (enlace directo a la pestaña de aprobación)
    if (tech.company_id) {
      const companyTechs = await base44.asServiceRole.entities.Technician.filter({ company_id: tech.company_id });
      const gerentes = companyTechs.filter(t => t.is_admin && t.status !== 'inactive');
      const fechas = `${fecha_inicio} → ${fecha_fin}`;
      for (const g of gerentes) {
        const destino = (g.email || '').trim().toLowerCase();
        if (!destino) continue;
        await base44.asServiceRole.entities.Notificacion.create({
          recipient_email: destino,
          recipient_type: 'gerente',
          company_id: tech.company_id,
          tipo: 'vacacion_solicitud',
          titulo: `Nueva solicitud de ${tech.name || 'un trabajador'}`,
          mensaje: `${tech.name || ''} solicita ${tipo} (${dias}d) ${fechas}.`.trim(),
          link: '/ControlHorario?tab=vacaciones',
          leida: false,
          datos: {
            company_id: tech.company_id,
            worker_email: tech.email,
            worker_name: tech.name,
            tipo_aus: tipo,
            fecha_inicio,
            fecha_fin,
            dias,
          },
        });
      }
    }

    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}