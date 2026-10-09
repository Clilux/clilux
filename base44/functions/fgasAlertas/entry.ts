import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Alertas preventivas F-Gas.
 * Recorre los equipos con próxima fecha de control de fugas y avisa por email
 * a los gerentes de cada empresa cuando vence en los próximos 15 días (o ya venció).
 * Se ejecuta desde el workflow programado (sin sesión).
 */

const DIAS_AVISO = 15;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_AVISO);

    // ── Equipos con fecha de control programada ──────────────────
    const equipos = await base44.asServiceRole.entities.Equipment.filter(
      { next_leak_check_date: { $exists: true } },
      { limit: 1000 },
    );
    const clientes = await base44.asServiceRole.entities.Client.list();
    const edificios = await base44.asServiceRole.entities.Building.list();
    const tecnicos = await base44.asServiceRole.entities.Technician.list();

    const clientePorId = {};
    clientes.forEach((c) => { clientePorId[c.id] = c; });
    const edificioPorId = {};
    edificios.forEach((b) => { edificioPorId[b.id] = b; });

    const vencen = equipos.filter((e) => {
      const f = new Date(e.next_leak_check_date);
      if (isNaN(f.getTime())) return false;
      return f <= limite;
    });

    if (vencen.length === 0) {
      return Response.json({ ok: true, enviados: 0, motivo: 'Sin revisiones próximas' });
    }

    // ── Agrupar por empresa ──────────────────────────────────────
    const porEmpresa = {};
    vencen.forEach((e) => {
      const cliente = clientePorId[e.client_id] || {};
      const companyId = cliente.company_id || 'sin_empresa';
      if (!porEmpresa[companyId]) porEmpresa[companyId] = [];
      const edificio = edificioPorId[e.building_id] || {};
      const f = new Date(e.next_leak_check_date);
      const dias = Math.round((f - hoy) / 86400000);
      const cuando = dias < 0 ? `VENCIDO (${Math.abs(dias)} días)` : dias === 0 ? 'vence hoy' : `vence en ${dias} días`;
      porEmpresa[companyId].push(
        `• ${cliente.name || 'Cliente'} · ${edificio.name || 'Edificio'} · ${e.reference_name || `${e.brand || ''} ${e.model || ''}`.trim() || 'Equipo'}`
        + ` — ${String(e.next_leak_check_date).slice(0, 10)} (${cuando})`,
      );
    });

    // ── Destinatarios: gerentes de cada empresa + admins de plataforma ──
    const gerentes = tecnicos.filter((t) => t.is_admin && t.status !== 'inactive' && t.email);
    const admins = (await base44.asServiceRole.entities.User.list()).filter((u) => u.role === 'admin' && u.email);
    const emailsAdmin = new Set(admins.map((u) => (u.email || '').toLowerCase()));

    const destinatarios = [];
    const yaAvisado = new Set();
    gerentes.forEach((g) => {
      const companyId = g.company_id || 'sin_empresa';
      const lista = porEmpresa[companyId];
      if (!lista || lista.length === 0) return;
      const key = (g.email || '').toLowerCase();
      if (yaAvisado.has(key)) return;
      yaAvisado.add(key);
      destinatarios.push({ email: g.email, empresa: g.company_name || 'tu empresa', items: lista });
    });
    // Admins de plataforma: reciben el resumen global de las empresas sin gerente
    const emailsGerente = new Set(gerentes.map((g) => (g.email || '').toLowerCase()));
    const adminSinEmpresa = [...emailsAdmin].filter((e) => !emailsGerente.has(e));
    if (adminSinEmpresa.length > 0) {
      const todas = Object.values(porEmpresa).flat();
      adminSinEmpresa.forEach((email) => {
        destinatarios.push({ email, empresa: 'la plataforma', items: todas });
      });
    }

    // ── Enviar ───────────────────────────────────────────────────
    const fechaTxt = hoy.toISOString().slice(0, 10);
    let enviados = 0;
    for (const dest of destinatarios) {
      const res = await base44.asServiceRole.integrations.Core.SendEmail({
        to: dest.email,
        template_name: 'AlertaFGAS',
        variables: {
          empresa: dest.empresa,
          total: String(dest.items.length),
          detalle: dest.items.join('\n'),
          fecha: fechaTxt,
        },
      });
      if (res) enviados += 1;
    }

    return Response.json({ ok: true, equipos: vencen.length, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}