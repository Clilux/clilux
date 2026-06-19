import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────────────────────
// Loxone HTTP API Proxy
//
// IMPORTANT: The Deno backend cannot reach private IPs (192.168.x.x, 10.x.x.x).
// The Miniserver must be reachable from the internet via:
//   1. Public IP + port forwarding
//   2. Loxone Cloud DNS:  https://<serial>.dns.loxonecloud.com
//   3. Any other public hostname/IP
//
// Auth: Basic Auth (usuario:password) – works on all Loxone firmware versions.
// ─────────────────────────────────────────────────────────────

function buildBase(device) {
  let ip = (device.miniserver_ip || '').trim();
  const puerto = device.puerto || '80';

  // Already a full URL with protocol — use as-is (no port appended)
  if (ip.startsWith('http://') || ip.startsWith('https://')) {
    return ip.replace(/\/$/, '');
  }

  // Loxone Cloud DNS (connect.loxonecloud.com or dns.loxonecloud.com) — force HTTPS, no port
  if (ip.includes('loxonecloud.com')) {
    return `https://${ip}`.replace(/\/$/, '');
  }

  // Plain IP/hostname — use http + port
  return `http://${ip}:${puerto}`;
}

async function lxFetch(base, usuario, password, path, method = 'GET', timeoutMs = 12000) {
  const auth = btoa(`${usuario}:${password}`);
  const url = `${base}${path}`;
  console.log(`[LX] ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  console.log(`[LX] ${res.status}: ${text.substring(0, 300)}`);
  return { ok: res.ok, status: res.status, text };
}

async function lxJson(base, usuario, password, path) {
  const r = await lxFetch(base, usuario, password, path);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.text.substring(0, 300)}`);
  try {
    return JSON.parse(r.text);
  } catch {
    throw new Error(`Respuesta inválida del Miniserver: ${r.text.substring(0, 200)}`);
  }
}

async function testConnection(base, usuario, password) {
  // Try the most reliable endpoint first
  const endpoints = [
    '/jdev/cfg/apiKey',
    '/data/LoxAPP3.json',
    '/jdev/sps/LoxAPPversion3',
    '/',
  ];

  let lastErr = 'Sin respuesta';
  for (const ep of endpoints) {
    try {
      const r = await lxFetch(base, usuario, password, ep, 'GET', 8000);
      if (r.status === 401) throw new Error('Credenciales incorrectas — el Miniserver responde pero rechaza usuario/contraseña (401)');
      if (r.status === 200) return { ok: true, endpoint: ep };
      lastErr = `HTTP ${r.status}`;
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Credenciales')) throw e;
      lastErr = e.message;
      console.log(`[LX] ${ep} → ${e.message}`);
    }
  }

  // If the address looks private, give a helpful message
  const rawIp = base.replace(/https?:\/\//, '').split(':')[0];
  const isPrivate = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(rawIp) || rawIp === 'localhost' || rawIp === '127.0.0.1';
  if (isPrivate) {
    throw new Error(
      `IP privada detectada (${rawIp}). El servidor no puede alcanzar redes locales. ` +
      `Usa la dirección Cloud DNS de Loxone (ej: https://0A1B2C3D.dns.loxonecloud.com) ` +
      `o una IP pública con reenvío de puerto. Último error: ${lastErr}`
    );
  }

  throw new Error(`No se pudo conectar al Miniserver en ${base}. Verifica que esté accesible desde Internet. Último error: ${lastErr}`);
}

// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, device_id, params } = body;

    const allDevices = await base44.asServiceRole.entities.LoxoneDevice.list();
    const device = allDevices.find(d => d.id === device_id);
    if (!device) return Response.json({ error: 'Dispositivo no encontrado' }, { status: 404 });

    const base = buildBase(device);
    const { usuario, password } = device;

    // ── TEST CONNECTION ──────────────────────────────────────
    if (action === 'test_connection') {
      const result = await testConnection(base, usuario, password);
      return Response.json({ ok: true, base, ...result });
    }

    // ── GET STRUCTURE ────────────────────────────────────────
    if (action === 'get_structure') {
      const data = await lxJson(base, usuario, password, '/data/LoxAPP3.json');
      const controls = [];
      for (const [uuid, ctrl] of Object.entries(data.controls || {})) {
        controls.push({
          uuid,
          name: ctrl.name,
          type: ctrl.type,
          room: data.rooms?.[ctrl.room]?.name || null,
          cat: data.cats?.[ctrl.cat]?.name || null,
          states: ctrl.states || {},
        });
      }
      const rooms = Object.values(data.rooms || {}).map(r => r.name);
      console.log(`[LX] Structure: ${controls.length} controls, ${rooms.length} rooms`);
      return Response.json({ controls, rooms });
    }

    // ── GET STATUS ───────────────────────────────────────────
    if (action === 'get_status') {
      const { uuid } = params;
      const r = await lxFetch(base, usuario, password, `/jdev/sps/io/${encodeURIComponent(uuid)}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      return Response.json({ status: r.status, data: parsed });
    }

    // ── SEND COMMAND ─────────────────────────────────────────
    if (action === 'send_command') {
      const { uuid, command } = params;
      const r = await lxFetch(base, usuario, password, `/dev/sps/io/${encodeURIComponent(uuid)}/${encodeURIComponent(command)}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      if (!r.ok) return Response.json({ error: `Comando fallido (${r.status})` }, { status: 400 });
      return Response.json({ ok: true, status: r.status, data: parsed });
    }

    // ── TRIGGER VIRTUAL INPUT (fichaje horario) ──────────────
    if (action === 'trigger_virtual_input') {
      const { uuid, value = 'Pulse' } = params;
      const r = await lxFetch(base, usuario, password, `/dev/sps/io/${encodeURIComponent(uuid)}/${encodeURIComponent(value)}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      if (!r.ok) return Response.json({ error: `Error activando entrada virtual (${r.status})` }, { status: 400 });
      return Response.json({ ok: true, status: r.status, data: parsed });
    }

    // ── GET VIRTUAL INPUTS LIST ──────────────────────────────
    if (action === 'get_virtual_inputs') {
      const data = await lxJson(base, usuario, password, '/data/LoxAPP3.json');
      const VIRTUAL_TYPES = ['Pushbutton', 'Switch', 'TimedSwitch', 'VirtualInput', 'VirtualInputSwitch'];
      const virtualInputs = [];
      for (const [uuid, ctrl] of Object.entries(data.controls || {})) {
        if (VIRTUAL_TYPES.includes(ctrl.type)) {
          virtualInputs.push({ uuid, name: ctrl.name, type: ctrl.type });
        }
      }
      return Response.json({ virtualInputs });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    console.log(`[LX] ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});