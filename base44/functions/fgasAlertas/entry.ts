import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { gwpDe, periodicidadMeses } from '../../shared/fgas.ts';

/**
 * Alertas preventivas F-Gas.
 * 1) Equipos cuyo control de fugas vence en los próximos 15 días (o ya venció):
 *    aviso por email + notificación en el buzón interno.
 * 2) Equipos con datos F-Gas incompletos (sin carga, sin tCO₂eq o sin próxima
 *    fecha de control): aviso en el buzón para completarlos antes de emitir el
 *    libro de registro.
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

    const clientes = await base44.asServiceRole.entities.Client.list();
    const edificios = await base44.asServiceRole.entities.Building.list();
    const tecnicos = await base44.asServiceRole.entities.Technician.list();
    const equipos = await base44.asServiceRole.entities.Equipment.list('-created_date', 1000);

    const clientePorId = {};
    clientes.forEach((c) => { clientePorId[c.id] = c; });
    const edificioPorId = {};
    edificios.forEach((b) => { edificioPorId[b.id] = b; });

    const nombreEquipo = (e) => e.reference_name || `${e.brand || ''} ${e.model || ''}`.trim() || 'Equipo';

    // ── 1. Controles de fugas que vencen ─────────────────────────
    const vencen = equipos.filter((e) => {
      if (!e.next_leak_check_date || e.status === 'sin_contrato') return false;
      const f = new Date(e.next_leak_check_date);
      if (isNaN(f.getTime())) return false;
      return f <= limite;
    });

    // ── 2. Datos F-Gas incompletos ───────────────────────────────
    // Solo los equipos que realmente llevan gas fluorado: marca del equipo, o
    // refrigerante reconocido con carga registrada (agua/aire/sin carga quedan fuera).
    const llevaFGas = (e: any) => {
      if (e.has_fluorinated_gas === true) return true;
      const refrig = e.refrigerant_type || e.technical_data?.tipo_refrigerante;
      if (gwpDe(refrig) === undefined) return false;
      const carga = Number(e.refrigerant_charge_kg ?? e.technical_data?.carga_refrigerante) || 0;
      return carga > 0;
    };

    const incompletos = equipos
      .filter((e) => e.status !== 'sin_contrato' && llevaFGas(e))
      .map((e) => {
        const faltan = [];
        if (!Number(e.refrigerant_charge_kg)) faltan.push('carga (kg)');
        if (!Number(e.co2_equivalent_tons)) faltan.push('tCO₂eq');
        // Solo si el equipo supera el umbral legal de control de fugas.
        const obliga = periodicidadMeses(e.co2_equivalent_tons, e.has_leak_detection_system, e.is_hermetically_sealed);
        if (!e.next_leak_check_date && obliga) faltan.push('próximo control');
        return faltan.length ? { equipo: e, faltan } : null;
      })
      .filter(Boolean);

    if (vencen.length === 0 && incompletos.length === 0) {
      return Response.json({ ok: true, enviados: 0, motivo: 'Sin revisiones próximas ni datos pendientes' });
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
        `• ${cliente.name || 'Cliente'} · ${edificio.name || 'Edificio'} · ${nombreEquipo(e)}`
        + ` — ${String(e.next_leak_check_date).slice(0, 10)} (${cuando})`,
      );
    });

    const incompletosPorEmpresa = {};
    incompletos.forEach(({ equipo, faltan }) => {
      const cliente = clientePorId[equipo.client_id] || {};
      const companyId = cliente.company_id || 'sin_empresa';
      if (!incompletosPorEmpresa[companyId]) incompletosPorEmpresa[companyId] = [];
      const edificio = edificioPorId[equipo.building_id] || {};
      incompletosPorEmpresa[companyId].push({
        equipo,
        edificio,
        cliente,
        faltan,
        texto: `• ${cliente.name || 'Cliente'} · ${edificio.name || 'Edificio'} · ${nombreEquipo(equipo)} — falta ${faltan.join(', ')}`,
      });
    });

    // ── Destinatarios: gerentes de cada empresa + admins de plataforma ──
    const gerentes = tecnicos.filter((t) => t.is_admin && t.status !== 'inactive' && t.email);
    const admins = (await base44.asServiceRole.entities.User.list()).filter((u) => u.role === 'admin' && u.email);
    const emailsAdmin = new Set(admins.map((u) => (u.email || '').toLowerCase()));

    const destinatarios = [];
    const yaAvisado = new Set();
    const destinatariosIncompletos = [];

    gerentes.forEach((g) => {
      const companyId = g.company_id || 'sin_empresa';
      const key = (g.email || '').toLowerCase();
      const lista = porEmpresa[companyId];
      const pendientes = incompletosPorEmpresa[companyId];
      if (lista && lista.length > 0 && !yaAvisado.has(key)) {
        yaAvisado.add(key);
        destinatarios.push({ email: g.email, empresa: g.company_name || 'tu empresa', items: lista });
      }
      if (pendientes && pendientes.length > 0) {
        destinatariosIncompletos.push({ email: g.email, companyId, pendientes });
      }
    });

    // Admins de plataforma: reciben el resumen global de las empresas sin gerente
    const emailsGerente = new Set(gerentes.map((g) => (g.email || '').toLowerCase()));
    const adminSinEmpresa = [...emailsAdmin].filter((e) => !emailsGerente.has(e));
    if (adminSinEmpresa.length > 0) {
      const todas = Object.values(porEmpresa).flat();
      if (todas.length > 0) {
        adminSinEmpresa.forEach((email) => {
          destinatarios.push({ email, empresa: 'la plataforma', items: todas });
        });
      }
      const todosIncompletos = Object.values(incompletosPorEmpresa).flat();
      if (todosIncompletos.length > 0) {
        adminSinEmpresa.forEach((email) => {
          destinatariosIncompletos.push({ email, companyId: 'sin_empresa', pendientes: todosIncompletos });
        });
      }
    }

    // ── Buzón interno: controles próximos ────────────────────────
    let avisosBuzon = 0;
    for (const dest of destinatarios) {
      const titulo = `${dest.items.length} control${dest.items.length > 1 ? 'es' : ''} de fugas F-Gas pendiente${dest.items.length > 1 ? 's' : ''}`;
      await base44.asServiceRole.entities.Notificacion.create({
        recipient_email: dest.email,
        recipient_type: 'gerente',
        tipo: 'fgas_aviso',
        titulo,
        mensaje: dest.items.join('\n'),
        link: '/LibroRegistroFGas',
        leida: false,
        archived: false,
        datos: { total: dest.items.length },
      });
      avisosBuzon += 1;
    }

    // ── Buzón interno: datos F-Gas incompletos ───────────────────
    const agrupadosPorEdificio = (pendientes) => {
      const mapa = new Map();
      pendientes.forEach((p) => {
        const id = p.equipo.building_id || 'sin_edificio';
        if (!mapa.has(id)) mapa.set(id, { edificio: p.edificio, items: [] });
        mapa.get(id).items.push(p);
      });
      return [...mapa.values()];
    };

    for (const dest of destinatariosIncompletos) {
      const total = dest.pendientes.length;
      const grupos = agrupadosPorEdificio(dest.pendientes);
      for (const grupo of grupos) {
        const nombreEdificio = grupo.edificio?.name || 'Edificio sin asignar';
        await base44.asServiceRole.entities.Notificacion.create({
          recipient_email: dest.email,
          recipient_type: 'gerente',
          company_id: dest.companyId === 'sin_empresa' ? '' : dest.companyId,
          tipo: 'fgas_datos_incompletos',
          titulo: `Completa los datos F-Gas · ${nombreEdificio}`,
          mensaje: `${grupo.items.length} equipo(s) con información F-Gas pendiente. Sin estos datos el libro de registro no refleja la instalación real:\n`
            + grupo.items.map((p) => p.texto.replace(/^• /, '• ')).join('\n'),
          link: grupo.edificio?.id ? `/BuildingDetail?id=${grupo.edificio.id}` : '/Equipment',
          leida: false,
          archived: false,
          datos: { total, edificio: nombreEdificio },
        });
        avisosBuzon += 1;
      }
    }

    // ── Email (solo cuando hay controles próximos) ───────────────
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

    return Response.json({
      ok: true,
      equipos: vencen.length,
      incompletos: incompletos.length,
      enviados,
      avisosBuzon,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}