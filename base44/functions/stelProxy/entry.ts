import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STEL_BASE = 'https://app.stelorder.com/app';

async function getApiKey(base44Client) {
  // Priority 1: environment secret
  const envKey = Deno.env.get('STEL_API_KEY');
  if (envKey) return envKey;
  // Priority 2: stored in AppSettings
  try {
    const settings = await base44Client.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const key = settings?.[0]?.integrations?.stel_order?.api_key;
    if (key) return key;
  } catch (_) { /* ignore */ }
  throw new Error('STEL API Key not configured.');
}

async function stelGet(path, params = {}, apiKey) {
  const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  const url = `${STEL_BASE}${path}${qs}`;
  console.log('[stelProxy] GET', url);
  const res = await fetch(url, { headers: { 'APIKEY': apiKey } });
  const text = await res.text();
  console.log('[stelProxy] Response status:', res.status, '| body preview:', text.substring(0, 200));
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function stelPost(path, body, apiKey) {
  const url = `${STEL_BASE}${path}`;
  console.log('[stelProxy] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'APIKEY': apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function stelPut(path, body, apiKey) {
  const url = `${STEL_BASE}${path}`;
  console.log('[stelProxy] PUT', url);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'APIKEY': apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`STEL API error ${res.status}: ${text}`);
  return JSON.parse(text);
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
    console.log('[stelProxy] ===== REQUEST START =====');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('[stelProxy] User:', user?.email, '| role:', user?.role);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const bodyText = await req.text();
    console.log('[stelProxy] Body:', bodyText.substring(0, 300));
    const { action, payload = {} } = JSON.parse(bodyText);
    console.log('[stelProxy] Action:', action);

    const apiKey = await getApiKey(base44);
    console.log('[stelProxy] API key length:', apiKey?.length, '| starts with:', apiKey?.substring(0, 6));

    // --- TEST CONNECTION ---
    if (action === 'testConnection') {
      const data = await stelGet('/clients', {}, apiKey);
      return Response.json({ ok: true, message: 'Conexión correcta con STEL Order' });
    }

    // --- CLIENTS ---
    if (action === 'searchClients') {
      const { query = '' } = payload;
      const params = {};
      if (query) params['legal-name'] = query;
      const data = await stelGet('/clients', params, apiKey);
      const list = Array.isArray(data) ? data : (data.clients || []);
      return Response.json({ clients: list.map(mapClient) });
    }

    if (action === 'listClients') {
      const { search = '' } = payload;
      const params = {};
      if (search) params['legal-name'] = search;
      const data = await stelGet('/clients', params, apiKey);
      const list = Array.isArray(data) ? data : (data.clients || data.data || []);
      return Response.json({ clients: list.map(mapClient) });
    }

    if (action === 'getClient') {
      const { clientId } = payload;
      const c = await stelGet(`/clients/${clientId}`, {}, apiKey);
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
      const created = await stelPost('/clients', body, apiKey);
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
      const updated = await stelPut(`/clients/${clientId}`, body, apiKey);
      return Response.json({ client: mapClient(updated) });
    }

    // --- DEBUG RAW ---
    if (action === 'debugRaw') {
      const { path, params = {} } = payload;
      const data = await stelGet(path, params, apiKey);
      return Response.json({ raw: Array.isArray(data) ? data.slice(0, 2) : data });
    }

    // --- PRODUCTS / SERVICES ---
    if (action === 'searchProducts') {
      const { query = '' } = payload;
      // Fetch both products and services in parallel
      const [prodData, svcData] = await Promise.all([
        stelGet('/products', {}, apiKey).catch(() => []),
        stelGet('/services', {}, apiKey).catch(() => []),
      ]);
      let products = Array.isArray(prodData) ? prodData : (prodData.products || prodData.data || []);
      let services = Array.isArray(svcData) ? svcData : (svcData.services || svcData.data || []);

      // Tag each item with its type
      products = products.map(p => ({ ...p, _type: 'product' }));
      services = services.map(s => ({ ...s, _type: 'service' }));

      let list = [...products, ...services];

      // Filter locally by query
      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(p => {
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const ref = (p.reference || p['full-reference'] || '').toLowerCase();
          return name.includes(q) || desc.includes(q) || ref.includes(q);
        });
      }

      return Response.json({
        products: list.slice(0, 50).map(p => {
          const taxPath = p['primary-tax-path'] || '';
          const taxIdMatch = taxPath.match(/\/taxLines\/(\d+)/);
          return {
            id: p.id,
            type: p._type,
            name: p.name || '',
            description: p.description || '',
            price: p['sales-price'] ?? 0,
            taxId: p['primary-tax-id'] || (taxIdMatch ? parseInt(taxIdMatch[1]) : null),
            taxPercentage: p['primary-tax-percentage'] ?? null,
            reference: p['full-reference'] || p.reference || '',
          };
        })
      });
    }

    // --- TAXES ---
    if (action === 'getTaxes') {
      // /taxes endpoint doesn't exist in STEL; return default 21% from products info
      return Response.json({ taxes: [{ id: null, name: 'IVA 21%', percentage: 21 }] });
    }

    // --- ALBARANES ---
    if (action === 'getDocumentStates') {
      const data = await stelGet('/documentStates', {}, apiKey);
      const list = Array.isArray(data) ? data : (data.documentStates || data.data || []);
      return Response.json({ states: list.map(s => ({ id: s.id, name: s.name || s.description || `Estado ${s.id}`, color: s.color || null })) });
    }

    if (action === 'createAlbaran') {
      const { clientId, fecha, titulo, lineas, notas, documentStateId } = payload;

      // STEL requires ISO 8601 with timezone: 2026-05-06T00:00:00+0000
      const fechaISO = fecha && fecha.includes('T') ? fecha : `${fecha}T00:00:00+0000`;

      const lines = lineas.map(l => ({
        'line-type': 'ITEM',
        'item-id': l.productId,
        description: l.concepto || undefined,
        quantity: l.cantidad,
        price: l.precio,
        ...(l.taxId ? { 'primary-tax-id': l.taxId } : {}),
      }));

      const body = {
        'account-id': clientId,
        date: fechaISO,
        notes: notas || '',
        lines,
      };

      // Send title as both 'subject' and 'name' — STEL uses 'subject' for delivery notes
      if (titulo && titulo.trim()) {
        body.subject = titulo.trim();
        body.name = titulo.trim();
        body.title = titulo.trim();
      }
      // Only include document-state-id if provided
      if (documentStateId) body['document-state-id'] = documentStateId;

      console.log('[stelProxy] createAlbaran body:', JSON.stringify(body));
      const albaran = await stelPost('/workDeliveryNotes', body, apiKey);
      return Response.json({ albaran });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[stelProxy] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});