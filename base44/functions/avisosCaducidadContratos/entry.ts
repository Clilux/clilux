import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Revisa los contratos próximos a caducar (no auto-renovables) y avisa a los
 * gerentes de la empresa mediante una notificación en el buzón.
 * Lo invoca un workflow programado (diario). Solo admin (el workflow corre como creador).
 */
const DIAS_AVISO = 30;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Solo administrador' }, { status: 403 });

    const hoyMid = new Date();
    hoyMid.setHours(0, 0, 0, 0);

    const contratos = await base44.asServiceRole.entities.Contrato.list('-created_date', 500);
    const pendientes = contratos.filter(
      (c) => c.fecha_fin && !c.avisado_caducidad && c.renovacion_automatica !== 'si'
    );

    if (!pendientes.length) return Response.json({ revisados: contratos.length, avisados: 0 });

    // Resolver empresa de cada contrato (vía cliente si falta company_id)
    const clientIds = [...new Set(pendientes.map((c) => c.cliente_id).filter(Boolean))];
    const clients = clientIds.length
      ? await base44.asServiceRole.entities.Client.filter({ id: { $in: clientIds } })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Cache de gerentes por empresa
    const gerentesCache = new Map();
    const gerentesDe = async (companyId) => {
      if (!companyId) return [];
      if (gerentesCache.has(companyId)) return gerentesCache.get(companyId);
      const techs = await base44.asServiceRole.entities.Technician.filter({ company_id: companyId });
      const lista = techs.filter((t) => t.is_admin && t.status !== 'inactive');
      gerentesCache.set(companyId, lista);
      return lista;
    };

    let avisados = 0;
    for (const c of pendientes) {
      const fin = new Date(c.fecha_fin + 'T00:00:00');
      const dias = Math.floor((fin.getTime() - hoyMid.getTime()) / 86400000);
      if (dias > DIAS_AVISO) continue; // aún no toca avisar

      const client = c.cliente_id ? clientMap.get(c.cliente_id) : null;
      const companyId = c.company_id || client?.company_id || '';
      const gerentes = await gerentesDe(companyId);

      const estadoTxt = dias < 0 ? 'ha vencido' : dias === 0 ? 'vence hoy' : `vence en ${dias} día${dias !== 1 ? 's' : ''}`;
      const titulo = `Contrato ${c.numero_contrato || ''} ${estadoTxt}`.trim();
      const mensaje =
        `El contrato ${c.numero_contrato || ''} de ${c.cliente_nombre || 'cliente'} ${estadoTxt} ` +
        `(fecha de fin: ${c.fecha_fin}). Revisa su renovación en la carpeta de contratos.`;

      for (const g of gerentes) {
        const email = (g.email || '').trim().toLowerCase();
        if (!email) continue;
        await base44.asServiceRole.entities.Notificacion.create({
          recipient_email: email,
          recipient_type: 'gerente',
          company_id: companyId,
          tipo: 'contrato_caducidad',
          titulo,
          mensaje,
          link: '/CarpetaContratos',
          leida: false,
          datos: {
            contrato_id: c.id,
            numero_contrato: c.numero_contrato,
            fecha_fin: c.fecha_fin,
            dias,
            company_id: companyId,
          },
        });
      }
      await base44.asServiceRole.entities.Contrato.update(c.id, { avisado_caducidad: true });
      avisados++;
    }

    return Response.json({ revisados: contratos.length, avisados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}