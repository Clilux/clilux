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

      if (devicesInWs.length > 0) {
        // Step 3: Get status for each device (Aidoo climate data)
        for (const dev of devicesInWs) {
          const devId = dev.device_id || dev.id || dev._id;
          if (!devId) continue;
          const encodedDevId = encodeURIComponent(devId);

          const devStatusRes = await az('GET', `/devices/${encodedDevId}/status?installation_id=${encodedInstId}`, token);
          const devStatus = devStatusRes.data || {};

          // Extract celsius values from objects like { celsius: 25.8, fah: 78 }
          const getCelsius = (v) => (v && typeof v === 'object') ? v.celsius : v;

          // Setpoint: use the current mode-specific setpoint
          let setpoint = null;
          const modeSetpointMap = {
            1: devStatus.setpoint_air_cool,
            2: devStatus.setpoint_air_heat,
            3: devStatus.setpoint_air_vent,
            4: devStatus.setpoint_air_dry,
            5: devStatus.setpoint_air_auto,
          };
          if (devStatus.mode != null && modeSetpointMap[devStatus.mode]) {
            setpoint = getCelsius(modeSetpointMap[devStatus.mode]);
          }
          if (setpoint == null) setpoint = getCelsius(devStatus.setpoint_air ?? devStatus.setpoint);

          zones.push({
            device_id: devId,
            az_device_id: devId,
            installation_id: instId,
            name: dev.name || installation.name,
            ws_type: wsType,
            isConnected,
            on: devStatus.power ?? devStatus.on ?? null,
            mode: devStatus.mode ?? null,
            local_temp: getCelsius(devStatus.local_temp),
            setpoint_air: setpoint,
            speed: devStatus.speed_conf ?? devStatus.speed ?? null,
            humidity: getCelsius(devStatus.humidity),
            mode_available: devStatus.mode_available || [],
            speed_values: devStatus.speed_values || [],
            _raw: devStatus
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
      const result = await az('PATCH', `/devices/${encodedDevId}`, token, {
        installation_id,
        ...command
      });
      if (!result.ok) return Response.json({ error: result.data?.msg || 'Comando fallido' }, { status: 400 });
      return Response.json({ result: result.data });
    }

    // -------- LIST ALL INSTALLATIONS (diagnóstico) --------
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