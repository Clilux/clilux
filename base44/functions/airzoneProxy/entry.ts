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
  console.log(`[AZ] ${method} ${path} -> ${res.status}: ${text.substring(0, 1200)}`);
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, data: parsed };
}

async function loginAirzone(email, password) {
  const res = await az('POST', '/auth/login', null, { email, password });
  if (!res.ok) throw new Error(res.data?.msg || 'Login fallido');
  return res.data.token;
}

// Find installation by MAC — iterate all pages checking ws_ids array
async function findInstallationByMac(token, mac) {
  const macLower = mac.toLowerCase().trim();
  let page = 1;
  while (true) {
    const res = await az('GET', `/installations?items=10&page=${page}`, token);
    const data = res.data || {};
    const list = data.installations || [];
    const found = list.find(i => i.ws_ids?.some(w => w.toLowerCase().trim() === macLower));
    if (found) return found;
    if (list.length < 10) break;
    const total = data.total || 0;
    if (page * 10 >= total) break;
    page++;
  }
  return null;
}

// Extract celsius from Airzone value object or plain number
const getCelsius = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') return v.celsius ?? null;
  return v;
};

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

    if (!device.mac) {
      return Response.json({
        error: 'La MAC del WebServer es obligatoria. Edita el dispositivo y añade la MAC (formato AA:BB:CC:DD:EE:FF).'
      }, { status: 400 });
    }

    const token = await loginAirzone(device.airzone_email, device.airzone_password);
    const mac = device.mac.trim();

    // -------- RAW DEBUG — dumps everything for a given installation --------
    if (action === 'raw_debug') {
      const installation = await findInstallationByMac(token, mac);
      if (!installation) return Response.json({ error: `No se encontró instalación con MAC ${mac}` }, { status: 404 });
      const instId = installation.installation_id;
      const encodedInstId = encodeURIComponent(instId);
      const encodedMac = encodeURIComponent(mac);

      // Try all known device-listing endpoints
      const [wsStatus, devList, wsDevices] = await Promise.all([
        az('GET', `/devices/ws/${encodedMac}/status?installation_id=${encodedInstId}`, token),
        az('GET', `/devices?installation_id=${encodedInstId}`, token),
        az('GET', `/devices/ws/${encodedMac}/status?installation_id=${encodedInstId}&devices=1`, token),
      ]);

      return Response.json({
        installation: { id: instId, name: installation.name, ws_ids: installation.ws_ids },
        ws_status: wsStatus.data,
        device_list: devList.data,
        ws_with_devices: wsDevices.data,
      });
    }

    // -------- GET STATUS --------
    if (action === 'get_status') {
      const installation = await findInstallationByMac(token, mac);
      if (!installation) {
        return Response.json({
          error: `No se encontró instalación con MAC ${mac}. Verifica que la MAC del WebServer sea correcta.`
        }, { status: 404 });
      }
      const instId = installation.installation_id;
      const encodedInstId = encodeURIComponent(instId);
      // The installation may have multiple WebServers (ws_ids). Query ALL of them for sub-devices.
      const allWsIds = installation.ws_ids || [mac];

      let deviceList = [];
      let isConnected = false;
      let wsType = null;

      for (const wsId of allWsIds) {
        await new Promise(r => setTimeout(r, 100));
        const encodedWsId = encodeURIComponent(wsId);
        const wsRes = await az('GET', `/devices/ws/${encodedWsId}/status?installation_id=${encodedInstId}&devices=1`, token);
        if (!wsRes.ok) continue;
        const wsData = wsRes.data || {};
        // Use the primary WS (the one matching our configured MAC) for connectivity status
        if (wsId.toLowerCase() === mac.toLowerCase()) {
          isConnected = wsData.status?.isConnected ?? wsData.isConnected ?? false;
          wsType = wsData.ws_type;
        } else if (!isConnected) {
          isConnected = wsData.status?.isConnected ?? wsData.isConnected ?? false;
        }
        if (!wsType) wsType = wsData.ws_type;
        const wsDev = wsData.devices || [];
        console.log(`[AZ] WS ${wsId} sub-devices: ${wsDev.length}`);
        deviceList.push(...wsDev);
      }

      console.log(`[AZ] Total candidate devices from all WS: ${deviceList.length}`);

      console.log(`[AZ] Total candidate devices: ${deviceList.length}`);

      const zones = [];
      const SKIP_TYPES = ['az_outputs', 'az_system'];

      for (const dev of deviceList) {
        const devId = dev.device_id || dev._id || dev.id;
        const devType = dev.device_type || dev.type;

        if (!devId) continue;
        if (SKIP_TYPES.includes(devType)) {
          console.log(`[AZ] Skipping ${devId} type=${devType}`);
          continue;
        }

        // Small delay to avoid 429
        await new Promise(r => setTimeout(r, 150));

        const devStatusRes = await az('GET', `/devices/${encodeURIComponent(devId)}/status?installation_id=${encodedInstId}`, token);
        if (!devStatusRes.ok) {
          console.log(`[AZ] status failed for ${devId}: ${devStatusRes.status}`);
          continue;
        }
        const s = devStatusRes.data || {};

        // Skip if no climate data
        if (s.local_temp == null && s.mode == null && s.power == null) {
          console.log(`[AZ] No climate data for ${devId}`);
          continue;
        }

        // Resolve current setpoint based on mode
        const modeSetpointMap = {
          0: s.setpoint_air_stop,
          1: s.setpoint_air_cool,
          2: s.setpoint_air_dry,
          3: s.setpoint_air_heat,
          4: s.setpoint_air_vent,
          5: s.setpoint_air_auto,
        };
        let setpoint = null;
        if (s.mode != null && modeSetpointMap[s.mode] != null) {
          setpoint = getCelsius(modeSetpointMap[s.mode]);
        }
        if (setpoint == null) setpoint = getCelsius(s.setpoint_air ?? s.setpoint);

        // Resolve temp range for current mode
        const modeRangeMap = {
          0: { min: s.range_sp_stop_air_min, max: s.range_sp_stop_air_max },
          1: { min: s.range_sp_cool_air_min, max: s.range_sp_cool_air_max },
          2: { min: s.range_sp_dry_air_min, max: s.range_sp_dry_air_max },
          3: { min: s.range_sp_hot_air_min, max: s.range_sp_hot_air_max },
          4: { min: s.range_sp_vent_air_min, max: s.range_sp_vent_air_max },
          5: { min: s.range_air_min, max: s.range_air_max },
        };
        const modeRange = modeRangeMap[s.mode] || {};
        const tempMin = getCelsius(modeRange.min) ?? 15;
        const tempMax = getCelsius(modeRange.max) ?? 30;

        zones.push({
          device_id: devId,
          az_device_id: devId,
          installation_id: instId,
          name: dev.name || s.name || installation.name,
          ws_type: wsType,
          isConnected,
          on: s.power ?? s.on ?? null,
          mode: s.mode ?? null,
          local_temp: getCelsius(s.local_temp),
          setpoint_air: setpoint,
          temp_min: tempMin,
          temp_max: tempMax,
          step: getCelsius(s.step) ?? 0.5,
          speed: s.speed_conf ?? s.speed ?? null,
          humidity: typeof s.humidity === 'number' ? s.humidity : null,
          mode_available: s.mode_available || [],
          speed_values: s.speed_values || [],
        });
      }

      return Response.json({
        installation: { id: instId, name: installation.name },
        mac,
        isConnected,
        zones
      });
    }

    // -------- SEND COMMAND --------
    if (action === 'send_command') {
      const { az_device_id, installation_id, command } = params;
      const encodedDevId = encodeURIComponent(az_device_id);

      // Airzone API requires setpoint values as {celsius: X} objects, not plain numbers
      // Wrap everything in a "param" key
      const wrappedCommand = {};
      for (const [k, v] of Object.entries(command)) {
        if (k.startsWith('setpoint_') && typeof v === 'number') {
          wrappedCommand[k] = { celsius: v };
        } else {
          wrappedCommand[k] = v;
        }
      }

      const reqBody = { installation_id, param: wrappedCommand };
      console.log(`[AZ] PATCH body: ${JSON.stringify(reqBody)}`);
      const result = await az('PATCH', `/devices/${encodedDevId}`, token, reqBody);
      if (!result.ok) return Response.json({ error: result.data?.msg || `Comando fallido (${result.status})` }, { status: 400 });
      return Response.json({ result: result.data });
    }

    // -------- LIST ALL INSTALLATIONS --------
    if (action === 'list_installations') {
      const all = [];
      let page = 1;
      while (true) {
        const res = await az('GET', `/installations?items=10&page=${page}`, token);
        const data = res.data || {};
        const list = data.installations || [];
        all.push(...list.map(i => ({ name: i.name, installation_id: i.installation_id, ws_ids: i.ws_ids })));
        if (list.length < 10 || all.length >= (data.total || 0)) break;
        page++;
      }
      return Response.json({ total: all.length, installations: all });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    console.log(`[AZ] FATAL: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});