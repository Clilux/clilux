import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Loxone HTTP API helper - supports both legacy Basic Auth and token-based auth
// Falls back gracefully between auth methods

async function loxoneFetch(base, usuario, password, path, method = 'GET') {
  const auth = btoa(`${usuario}:${password}`);
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json, text/plain, */*',
  };

  const url = `${base}${path}`;
  console.log(`[LX] ${method} ${url}`);

  const res = await fetch(url, { method, headers, signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  console.log(`[LX] Response ${res.status}: ${text.substring(0, 400)}`);

  return { ok: res.ok, status: res.status, text, headers: Object.fromEntries(res.headers.entries()) };
}

async function loxoneJson(base, usuario, password, path) {
  const r = await loxoneFetch(base, usuario, password, path);
  if (!r.ok) throw new Error(`HTTP ${r.status} - ${r.text.substring(0, 200)}`);
  try {
    return JSON.parse(r.text);
  } catch {
    throw new Error(`Respuesta no válida del Miniserver: ${r.text.substring(0, 200)}`);
  }
}

// Try multiple connection test endpoints (different firmware versions)
async function testLoxoneConnection(base, usuario, password) {
  const endpoints = [
    '/jdev/cfg/apiKey',
    '/data/LoxAPP3.json',
    '/jdev/sps/LoxAPPversion3',
    '/api/v1/currentuser',
    '/',
  ];

  for (const ep of endpoints) {
    try {
      const auth = btoa(`${usuario}:${password}`);
      const res = await fetch(`${base}${ep}`, {
        headers: { 'Authorization': `Basic ${auth}` },
        signal: AbortSignal.timeout(8000),
      });
      console.log(`[LX] Test ${ep} → ${res.status}`);
      if (res.status === 200 || res.status === 401) {
        // 401 means the server is reachable but credentials wrong
        if (res.status === 401) throw new Error('Credenciales incorrectas (401 Unauthorized)');
        return { ok: true, endpoint: ep, status: res.status };
      }
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Credenciales')) throw e;
      console.log(`[LX] ${ep} failed: ${e.message}`);
    }
  }
  throw new Error('No se pudo conectar al Miniserver. Verifica IP, puerto y que el Miniserver esté encendido y accesible desde Internet.');
}

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

    const proto = device.miniserver_ip?.startsWith('http') ? '' : 'http://';
    const base = `${proto}${device.miniserver_ip}:${device.puerto || '80'}`;
    const { usuario, password } = device;

    // -------- TEST CONNECTION --------
    if (action === 'test_connection') {
      console.log(`[LX] Testing connection to ${base}`);
      const result = await testLoxoneConnection(base, usuario, password);
      return Response.json({ ok: true, ...result });
    }

    // -------- GET STRUCTURE --------
    if (action === 'get_structure') {
      const data = await loxoneJson(base, usuario, password, '/data/LoxAPP3.json');
      const controls = [];
      for (const [uuid, ctrl] of Object.entries(data.controls || {})) {
        controls.push({
          uuid,
          name: ctrl.name,
          type: ctrl.type,
          room: data.rooms?.[ctrl.room]?.name || null,
          cat: data.cats?.[ctrl.cat]?.name || null,
          states: ctrl.states || {},
          subControls: ctrl.subControls ? Object.keys(ctrl.subControls).length : 0,
        });
      }
      console.log(`[LX] Found ${controls.length} controls`);
      return Response.json({ controls, rooms: Object.values(data.rooms || {}).map(r => r.name) });
    }

    // -------- GET STATUS --------
    if (action === 'get_status') {
      const { uuid } = params;
      const r = await loxoneFetch(base, usuario, password, `/jdev/sps/io/${encodeURIComponent(uuid)}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      return Response.json({ status: r.status, data: parsed });
    }

    // -------- SEND COMMAND --------
    if (action === 'send_command') {
      const { uuid, command } = params;
      // Loxone command URL: /dev/sps/io/<uuid>/<command>
      const r = await loxoneFetch(base, usuario, password, `/dev/sps/io/${encodeURIComponent(uuid)}/${encodeURIComponent(command)}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      if (!r.ok) return Response.json({ error: `Comando fallido (${r.status})` }, { status: 400 });
      return Response.json({ ok: true, status: r.status, data: parsed });
    }

    // -------- CREATE VIRTUAL INPUT (para fichaje horario) --------
    if (action === 'create_virtual_input') {
      // Loxone Virtual Input: POST a value to a virtual input by name or UUID
      // Uses: /dev/sps/io/<name>/pulse  or set a value
      const { name, value = 1 } = params;
      const encodedName = encodeURIComponent(name);
      // Try pulse first (simulates a button press for clock-in/out)
      const r = await loxoneFetch(base, usuario, password, `/dev/sps/io/${encodedName}/${value}`);
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch {}
      if (!r.ok) return Response.json({ error: `No se pudo activar la entrada virtual (${r.status}): ${r.text.substring(0, 200)}` }, { status: 400 });
      return Response.json({ ok: true, status: r.status, data: parsed });
    }

    // -------- GET VIRTUAL INPUTS LIST --------
    if (action === 'get_virtual_inputs') {
      const data = await loxoneJson(base, usuario, password, '/data/LoxAPP3.json');
      const virtualInputs = [];
      for (const [uuid, ctrl] of Object.entries(data.controls || {})) {
        if (ctrl.type === 'Pushbutton' || ctrl.type === 'Switch' || ctrl.type === 'TimedSwitch' || ctrl.type === 'VirtualInput') {
          virtualInputs.push({ uuid, name: ctrl.name, type: ctrl.type });
        }
      }
      return Response.json({ virtualInputs });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    console.log(`[LX] FATAL: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});