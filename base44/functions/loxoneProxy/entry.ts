import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const base = `http://${device.miniserver_ip}:${device.puerto || '80'}`;
    const auth = btoa(`${device.usuario}:${device.password}`);
    const headers = { 'Authorization': `Basic ${auth}` };

    // -------- GET STRUCTURE (controls list) --------
    if (action === 'get_structure') {
      console.log(`[LX] Fetching structure from ${base}`);
      const res = await fetch(`${base}/data/LoxAPP3.json`, { headers });
      if (!res.ok) {
        console.log(`[LX] Structure fetch failed: ${res.status}`);
        return Response.json({ error: `No se pudo conectar al Miniserver (${res.status})` }, { status: 400 });
      }
      const data = await res.json();
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

    // -------- GET STATUS of a control --------
    if (action === 'get_status') {
      const { uuid } = params;
      console.log(`[LX] Getting status for UUID: ${uuid}`);
      const res = await fetch(`${base}/jdev/sps/io/${encodeURIComponent(uuid)}`, { headers });
      const text = await res.text();
      console.log(`[LX] Status response: ${text.substring(0, 300)}`);
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      return Response.json({ status: res.status, data: parsed });
    }

    // -------- SEND COMMAND --------
    if (action === 'send_command') {
      const { uuid, command } = params;
      const encoded = encodeURIComponent(uuid);
      const url = `${base}/dev/sps/io/${encoded}/${encodeURIComponent(command)}`;
      console.log(`[LX] Sending command: GET ${url}`);
      const res = await fetch(url, { method: 'GET', headers });
      const text = await res.text();
      console.log(`[LX] Command response (${res.status}): ${text.substring(0, 300)}`);
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      if (!res.ok && res.status !== 200) {
        return Response.json({ error: `Comando fallido (${res.status})` }, { status: 400 });
      }
      return Response.json({ ok: true, status: res.status, data: parsed });
    }

    // -------- TEST CONNECTION --------
    if (action === 'test_connection') {
      console.log(`[LX] Testing connection to ${base}`);
      const res = await fetch(`${base}/jdev/cfg/apiKey`, { headers });
      const text = await res.text();
      console.log(`[LX] Test response (${res.status}): ${text.substring(0, 300)}`);
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      if (!res.ok) return Response.json({ ok: false, error: `HTTP ${res.status}` }, { status: 400 });
      return Response.json({ ok: true, data: parsed });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    console.log(`[LX] FATAL: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});