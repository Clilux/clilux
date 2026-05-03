import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STEL_BASE = 'https://app.stelorder.com/app';

async function stelGet(path, params = {}) {
  const APIKEY = Deno.env.get('STEL_API_KEY');
  const qs = new URLSearchParams({ APIKEY, ...params }).toString();
  const res = await fetch(`${STEL_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function stelPost(path, body) {
  const APIKEY = Deno.env.get('STEL_API_KEY');
  const res = await fetch(`${STEL_BASE}${path}?APIKEY=${APIKEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function stelPut(path, body) {
  const APIKEY = Deno.env.get('STEL_API_KEY');
  const res = await fetch(`${STEL_BASE}${path}?APIKEY=${APIKEY}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function mapClient(c) {
  return {
    id: c.id,
    name: c['legal-name'] || c.name || '',
    tradeName: c['trade-name'] || '',
    fiscalId: c['fiscal-id'] || '',
    email: c.email || '',
    phone: c.phone || '',
    phone2: c.phone2 || '',
    address: c.address || '',
    city: c.city || '',
    postalCode: c['postal-code'] || '',
    province: c.province || '',
    country: c.country || '',
    notes: c.notes || '',
    reference: c.reference || '',
    web: c.web || '',
    path: c.path || '',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, payload = {} } = await req.json();

    // --- CLIENTS ---
    if (action === 'searchClients') {
      const { query = '', limit = 20, offset = 0 } = payload;
      const params = { limit, offset };
      if (query) params['legal-name'] = query;
      const data = await stelGet('/clients', params);
      const list = Array.isArray(data) ? data : (data.clients || []);
      return Response.json({ clients: list.map(mapClient) });
    }

    if (action === 'listClients') {
      const { limit = 50, offset = 0, search = '' } = payload;
      const params = { limit, offset };
      if (search) params['legal-name'] = search;
      const data = await stelGet('/clients', params);
      const list = Array.isArray(data) ? data : [];
      return Response.json({ clients: list.map(mapClient) });
    }

    if (action === 'getClient') {
      const { clientId } = payload;
      const c = await stelGet(`/clients/${clientId}`);
      return Response.json({ client: mapClient(c) });
    }

    if (action === 'createClient') {
      const { client } = payload;
      const body = {
        'legal-name': client.name,
        'trade-name': client.tradeName || '',
        'fiscal-id': client.fiscalId || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        'postal-code': client.postalCode || '',
        province: client.province || '',
        country: client.country || '',
        notes: client.notes || '',
        web: client.web || '',
      };
      const created = await stelPost('/clients', body);
      return Response.json({ client: mapClient(created) });
    }

    if (action === 'updateClient') {
      const { clientId, client } = payload;
      const body = {
        'legal-name': client.name,
        'trade-name': client.tradeName || '',
        'fiscal-id': client.fiscalId || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        'postal-code': client.postalCode || '',
        province: client.province || '',
        country: client.country || '',
        notes: client.notes || '',
        web: client.web || '',
      };
      const updated = await stelPut(`/clients/${clientId}`, body);
      return Response.json({ client: mapClient(updated) });
    }

    // --- TAXES ---
    if (action === 'getTaxes') {
      const data = await stelGet('/taxes', { limit: 100 });
      const list = Array.isArray(data) ? data : [];
      return Response.json({
        taxes: list.map(t => ({ id: t.id, name: t.name, percentage: t.percentage })),
      });
    }

    // --- ALBARANES ---
    if (action === 'createAlbaran') {
      const { clientId, fecha, lineas, notas, technicianName } = payload;
      const taxes = await stelGet('/taxes', { limit: 100 });
      const taxList = Array.isArray(taxes) ? taxes : [];
      const defaultTax = taxList.find(t => t.percentage === 21) || taxList[0];

      const lines = lineas.map(l => ({
        name: l.concepto,
        quantity: l.cantidad,
        price: l.precio,
        'tax-id': l.taxId || defaultTax?.id || null,
      }));

      const body = {
        'account-id': clientId,
        date: fecha,
        notes: notas || '',
        lines,
      };

      const albaran = await stelPost('/deliveryNotes', body);
      return Response.json({ albaran });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});