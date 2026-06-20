import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────────────────────
// Loxone Webhook Receiver
//
// Loxone actúa como cliente HTTP y envía señales a esta URL.
// Configuración en Loxone Config:
//   1. Añade un bloque "Virtual HTTP Request"
//   2. URL: https://<tu-app>.base44.app/api/functions/loxoneWebhook
//   3. Método: GET o POST
//   4. Parámetros de ejemplo (GET):
//      ?secret=TU_SECRETO&device=<nombre>&signal=averia&value=1&room=Sala
//   5. El "secret" debe coincidir con LOXONE_WEBHOOK_SECRET en los secretos de la app.
//
// Señales estándar soportadas (campo "signal"):
//   averia       → Crea una Incidencia con prioridad urgent
//   alerta       → Crea una Incidencia con prioridad high
//   estado       → Registra un cambio de estado (no crea incidencia)
//   temperatura  → Registra lectura de temperatura
//   fichaje      → Dispara registro horario del técnico
//   custom       → Evento libre (se guarda en RegistroHorario.notas o log)
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // ── Extraer parámetros (soporta GET query params y POST body JSON)
    let params = {};
    if (req.method === 'POST') {
      try { params = await req.json(); } catch { params = {}; }
    }
    // Query params tienen prioridad (Loxone normalmente usa GET con params en URL)
    for (const [k, v] of url.searchParams.entries()) {
      params[k] = v;
    }

    // ── Validar secreto
    const expectedSecret = Deno.env.get('LOXONE_WEBHOOK_SECRET');
    const receivedSecret = params.secret;
    if (!expectedSecret) {
      console.log('[LX-WH] WARNING: LOXONE_WEBHOOK_SECRET no configurado, rechazando petición');
      return Response.json({ error: 'Webhook no configurado (falta secreto)' }, { status: 503 });
    }
    if (receivedSecret !== expectedSecret) {
      console.log(`[LX-WH] Secreto inválido: "${receivedSecret}"`);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const signal = (params.signal || 'custom').toLowerCase();
    const device = params.device || 'Loxone';
    const value = params.value || '';
    const room = params.room || '';
    const description = params.description || params.msg || '';
    const timestamp = new Date().toISOString();

    console.log(`[LX-WH] Señal recibida: signal=${signal} device=${device} value=${value} room=${room}`);

    // ── Buscar LoxoneDevice por nombre para obtener client_id si está asociado
    const allDevices = await base44.asServiceRole.entities.LoxoneDevice.list();
    const loxDevice = allDevices.find(d =>
      d.nombre_referencia?.toLowerCase() === device.toLowerCase() ||
      d.location?.toLowerCase() === device.toLowerCase()
    );

    const clientId = loxDevice?.client_id || null;

    // ── Procesar según tipo de señal
    if (signal === 'averia' || signal === 'alerta') {
      const priority = signal === 'averia' ? 'urgent' : 'high';
      const title = `[Loxone] ${signal === 'averia' ? 'Avería detectada' : 'Alerta'} — ${device}${room ? ` (${room})` : ''}`;
      const desc = description || `Señal automática de Loxone. Dispositivo: ${device}. Valor: ${value}. Hora: ${timestamp}`;

      await base44.asServiceRole.entities.Incident.create({
        client_id: clientId || 'loxone_auto',
        title,
        description: desc,
        priority,
        status: 'pending',
        reported_by: 'loxone_webhook',
        reported_by_name: `Loxone — ${device}`,
      });

      console.log(`[LX-WH] Incidencia creada: ${title}`);
      return Response.json({ ok: true, action: 'incident_created', signal, device, priority });
    }

    if (signal === 'temperatura') {
      // Registrar en notas de un RegistroHorario o simplemente logar
      const nota = `[Loxone] Temperatura ${device}${room ? ` (${room})` : ''}: ${value}°C — ${timestamp}`;
      console.log(`[LX-WH] ${nota}`);
      return Response.json({ ok: true, action: 'logged', signal, value });
    }

    if (signal === 'estado') {
      const nota = `[Loxone] Cambio de estado — ${device}${room ? ` (${room})` : ''}: ${value} — ${timestamp}`;
      console.log(`[LX-WH] ${nota}`);
      return Response.json({ ok: true, action: 'logged', signal, device, value });
    }

    // ── Señal custom / desconocida → logar y devolver OK
    console.log(`[LX-WH] Señal custom: ${JSON.stringify(params)}`);
    return Response.json({ ok: true, action: 'received', signal, device, value, timestamp });

  } catch (error) {
    console.log(`[LX-WH] ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});