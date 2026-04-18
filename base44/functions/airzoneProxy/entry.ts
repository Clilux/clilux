import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AIRZONE_BASE = 'https://m.airzonecloud.com/api/v1';

async function az(method, path, token, body) {
  const url = `${AIRZONE_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  console.log(`[AZ] ${method} ${path} -> ${res.status}: ${text.substring(0, 800)}`);
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, data: parsed };
}

async function loginAirzone(email, password) {
  const res = await az('POST', '/auth/login', null, { email, password });
  if (!res.ok) throw new Error(res.data?.msg || 'Login failed');
  return res.data.token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, device_id, params } = body;

    const allDevices = await base44.asServiceRole.entities.AirzoneDevice.list();
    const device = allDevices.find(d => d.id === device_id);
    if (!device) return Response.json({ error: 'Dispositivo no encontrado' }, { status: 404 });

    const token = await loginAirzone(device.airzone_email, device.airzone_password);

    if (action === 'explore_endpoints') {
      const wsId = device.mac || params?.ws_id;
      const encodedWs = encodeURIComponent(wsId);
      const results = {};

      // Try all known endpoints for Aidoo climate data
      const paths = [
        `/devices/ws/${encodedWs}/config`,
        `/devices/ws/${encodedWs}/device`,
        `/devices/ws/${encodedWs}/devices`,
        `/devices/ws/${encodedWs}/zones`,
        `/devices/ws/${encodedWs}/climate`,
        `/devices/ws/${encodedWs}/state`,
        `/devices/ws/${encodedWs}/airquality`,
      ];

      for (const p of paths) {
        const r = await az('GET', p, token);
        results[p] = { status: r.status, data: r.data };
      }

      return Response.json({ results });
    }

    if (action === 'get_status') {
      // 1. Get installations
      const instRes = await az('GET', '/installations?items=10&page=1', token);
      const installations = instRes.data?.installations || [];
      if (installations.length === 0) return Response.json({ error: 'No installations found' }, { status: 404 });

      let installation = installations[0];
      if (device.mac) {
        const byMac = installations.find(i =>
          i.ws_ids?.some(mac => mac.toLowerCase() === device.mac.toLowerCase())
        );
        if (byMac) installation = byMac;
      }

      const instId = installation.installation_id;
      const wsIds = installation.ws_ids || [];

      const allZones = [];
      for (const wsId of wsIds) {
        const encodedWs = encodeURIComponent(wsId);

        // Get WebServer status (connectivity + basic info)
        const statusRes = await az('GET', `/devices/ws/${encodedWs}/status`, token);
        const wsStatus = statusRes.data || {};

        // Get device config (climate state for Aidoo)
        const configRes = await az('GET', `/devices/ws/${encodedWs}/config`, token);
        const wsConfig = configRes.data || {};

        // For Aidoo: climate data is in config response under various fields
        // Build zone object combining status + config data
        const zone = {
          ws_id: wsId,
          installation_id: instId,
          name: installation.name,
          isConnected: wsStatus.status?.isConnected ?? false,
          ws_type: wsStatus.ws_type,
          // Climate data from config
          local_temp: wsConfig.local_temp ?? wsConfig.roomTemp ?? wsConfig.temp,
          setpoint: wsConfig.setpoint ?? wsConfig.setpoint_air,
          mode: wsConfig.mode,
          power: wsConfig.power ?? wsConfig.on,
          speed: wsConfig.speed,
          humidity: wsConfig.humidity,
          // Pass raw config for debugging
          _config: wsConfig
        };

        allZones.push(zone);
      }

      return Response.json({
        installation: { id: instId, name: installation.name },
        zones: allZones
      });
    }

    if (action === 'get_installations') {
      const instRes = await az('GET', '/installations?items=10&page=1', token);
      return Response.json({ installations: instRes.data?.installations || [] });
    }

    if (action === 'send_command') {
      // PUT /devices/ws/{wsId}/config for Aidoo
      const { ws_id, command } = params;
      const encodedWs = encodeURIComponent(ws_id);
      const result = await az('PUT', `/devices/ws/${encodedWs}/config`, token, command);
      if (!result.ok) return Response.json({ error: result.data?.msg || 'Command failed' }, { status: 400 });
      return Response.json({ result: result.data });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    console.log(`[AZ] FATAL: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});