import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AIRZONE_BASE = 'https://m.airzonecloud.com/api/v1';

async function airzoneLogin(email, password) {
  const res = await fetch(`${AIRZONE_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Login failed');
  return data; // { token, refreshToken, ... }
}

async function getInstallations(token) {
  const res = await fetch(`${AIRZONE_BASE}/installations?items=10&page=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error fetching installations');
  return data.installations || [];
}

async function getInstallationDetails(token, installationId) {
  const res = await fetch(`${AIRZONE_BASE}/installations/${installationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error fetching installation details');
  return data;
}

async function getWebservers(token, installationId) {
  const res = await fetch(`${AIRZONE_BASE}/installations/${installationId}/webservers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error fetching webservers');
  return data.webservers || [];
}

async function getDevices(token, installationId, wsId) {
  const res = await fetch(`${AIRZONE_BASE}/installations/${installationId}/webservers/${wsId}/devices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error fetching devices');
  return data.devices || [];
}

async function sendDeviceCommand(token, installationId, wsId, deviceId, params) {
  const res = await fetch(`${AIRZONE_BASE}/installations/${installationId}/webservers/${wsId}/devices/${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error sending command');
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, device_id, params } = body;

    // Load device credentials from DB
    const devices = await base44.asServiceRole.entities.AirzoneDevice.filter({ id: device_id });
    const device = devices[0];
    if (!device) return Response.json({ error: 'Dispositivo no encontrado' }, { status: 404 });

    // Login to Airzone
    const authData = await airzoneLogin(device.airzone_email, device.airzone_password);
    const token = authData.token;

    if (action === 'get_status') {
      // Get installations
      const installations = await getInstallations(token);

      // Filter by MAC if set
      let installation = installations[0];
      if (device.mac) {
        installation = installations.find(i => i.ws_ids?.some(mac => mac.toLowerCase() === device.mac.toLowerCase())) || installations[0];
      }
      if (!installation) return Response.json({ error: 'No se encontró instalación' }, { status: 404 });

      const installationId = installation.installation_id;

      // Get webservers
      const webservers = await getWebservers(token, installationId);

      // Get devices for each webserver
      const allZones = [];
      for (const ws of webservers) {
        const wsDevices = await getDevices(token, installationId, ws.ws_id || ws.id);
        for (const d of wsDevices) {
          allZones.push({
            ...d,
            ws_id: ws.ws_id || ws.id,
            installation_id: installationId
          });
        }
      }

      return Response.json({
        installation: { id: installationId, name: installation.name },
        zones: allZones
      });
    }

    if (action === 'send_command') {
      const { installation_id, ws_id, device_zone_id } = params;
      const result = await sendDeviceCommand(token, installation_id, ws_id, device_zone_id, params.command);
      return Response.json({ result });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});