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

    // MAC is REQUIRED — identifies the specific WebServer in the account
    if (!device.mac) {
      return Response.json({
        error: 'La MAC del WebServer es obligatoria. Edita el dispositivo y añade la MAC (formato AA:BB:CC:DD:EE:FF).'
      }, { status: 400 });
    }

    const token = await loginAirzone(device.airzone_email, device.airzone_password);
    const mac = device.mac.trim();

    // -------- GET STATUS --------
    if (action === 'get_status') {
      // Step 1: Find installation by MAC
      const installation = await findInstallationByMac(token, mac);
      if (!installation) {
        return Response.json({
          error: `No se encontró instalación con MAC ${mac}. Verifica que la MAC del WebServer sea correcta.`
        }, { status: 404 });
      }
      const instId = installation.installation_id;
      const encodedMac = encodeURIComponent(mac);
      const encodedInstId = encodeURIComponent(instId);

      // Step 2: Get WebServer status WITH devices (devices=1 returns the Aidoo device list)
      const wsRes = await az('GET', `/devices/ws/${encodedMac}/status?installation_id=${encodedInstId}&devices=1`, token);
      if (!wsRes.ok) {
        return Response.json({
          error: `No se pudo obtener el estado del WS. HTTP ${wsRes.status}`
        }, { status: 400 });
      }

      const wsData = wsRes.data || {};
      const isConnected = wsData.status?.isConnected ?? false;
      const wsType = wsData.ws_type;
      // Devices are in wsData.devices array when devices=1
      const devicesInWs = wsData.devices || [];
      console.log(`[AZ] WS devices count: ${devicesInWs.length}, raw: ${JSON.stringify(devicesInWs).substring(0, 400)}`);

      const zones = [];

      // Filter out non-climate devices (az_outputs only returns isConnected, no climate data)
      const SKIP_TYPES = ['az_outputs'];
      const climateDevices = devicesInWs.filter(d => !SKIP_TYPES.includes(d.device_type));
      console.log(`[AZ] Climate devices: ${climateDevices.length} (filtered from ${devicesInWs.length})`);

      if (climateDevices.length > 0) {
        // Step 3: Get status for each device sequentially to avoid rate limiting
        for (const dev of climateDevices) {
          const devId = dev.device_id || dev.id || dev._id;
          if (!devId) continue;
          const encodedDevId = encodeURIComponent(devId);
          // Small delay between requests to avoid 429
          await new Promise(r => setTimeout(r, 150));

          const devStatusRes = await az('GET', `/devices/${encodedDevId}/status?installation_id=${encodedInstId}`, token);
          const devStatus = devStatusRes.data || {};

          // Extract celsius values from objects like { celsius: 25.8, fah: 78 }
          const getCelsius = (v) => {
            if (v == null) return null;
            if (typeof v === 'object') return v.celsius ?? null;
            return v;
          };

          // Skip devices with no useful climate data (e.g. only isConnected)
          const hasClimateData = devStatus.local_temp != null || devStatus.mode != null || devStatus.power != null;
          if (!hasClimateData) {
            console.log(`[AZ] Skipping device ${devId} - no climate data`);
            continue;
          }

          // Airzone Web API modes: 0=Stop, 1=Frío, 2=Seco, 3=Calor, 4=Ventilación, 5=Auto
          const modeSetpointMap = {
            0: devStatus.setpoint_air_stop,
            1: devStatus.setpoint_air_cool,
            2: devStatus.setpoint_air_dry,
            3: devStatus.setpoint_air_heat,
            4: devStatus.setpoint_air_vent,
            5: devStatus.setpoint_air_auto,
          };
          let setpoint = null;
          if (devStatus.mode != null && modeSetpointMap[devStatus.mode] != null) {
            setpoint = getCelsius(modeSetpointMap[devStatus.mode]);
          }
          if (setpoint == null) setpoint = getCelsius(devStatus.setpoint_air ?? devStatus.setpoint);

          // Range for current mode
          const modeRangeMap = {
            0: { min: devStatus.range_sp_stop_air_min, max: devStatus.range_sp_stop_air_max },
            1: { min: devStatus.range_sp_cool_air_min, max: devStatus.range_sp_cool_air_max },
            2: { min: devStatus.range_sp_dry_air_min, max: devStatus.range_sp_dry_air_max },
            3: { min: devStatus.range_sp_hot_air_min, max: devStatus.range_sp_hot_air_max },
            4: { min: devStatus.range_sp_vent_air_min, max: devStatus.range_sp_vent_air_max },
            5: { min: devStatus.range_air_min, max: devStatus.range_air_max },
          };
          const modeRange = modeRangeMap[devStatus.mode] || {};
          const tempMin = getCelsius(modeRange.min) ?? 15;
          const tempMax = getCelsius(modeRange.max) ?? 30;

          zones.push({
            device_id: devId,
            az_device_id: devId,
            installation_id: instId,
            name: dev.name || devStatus.name || installation.name,
            ws_type: wsType,
            isConnected,
            on: devStatus.power ?? devStatus.on ?? null,
            mode: devStatus.mode ?? null,
            local_temp: getCelsius(devStatus.local_temp),
            setpoint_air: setpoint,
            temp_min: tempMin,
            temp_max: tempMax,
            step: getCelsius(devStatus.step) ?? 0.5,
            speed: devStatus.speed_conf ?? devStatus.speed ?? null,
            humidity: typeof devStatus.humidity === 'number' ? devStatus.humidity : null,
            mode_available: devStatus.mode_available || [],
            speed_values: devStatus.speed_values || [],
          });
        }
      } else {
        // Aidoo with no sub-devices: the WS itself is the climate device
        // Try getting device status directly via the ws_id as device_id
        const devStatusRes = await az('GET', `/devices/${encodedMac}/status?installation_id=${encodedInstId}`, token);

        zones.push({
          ws_id: mac,
          az_device_id: mac,
          installation_id: instId,
          name: installation.name,
          ws_type: wsType,
          isConnected,
          on: null,
          mode: null,
          local_temp: null,
          setpoint_air: null,
          speed: null,
          humidity: null,
          _ws_raw: wsData,
          _dev_raw: devStatusRes.data,
          _no_devices: true
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
      // Also wraps everything in a "param" key for zone devices
      const wrappedCommand = {};
      for (const [k, v] of Object.entries(command)) {
        if (k.startsWith('setpoint_') && typeof v === 'number') {
          wrappedCommand[k] = { celsius: v };
        } else {
          wrappedCommand[k] = v;
        }
      }

      const body = { installation_id, param: wrappedCommand };
      console.log(`[AZ] PATCH body: ${JSON.stringify(body)}`);
      const result = await az('PATCH', `/devices/${encodedDevId}`, token, body);
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