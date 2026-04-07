import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CALENDAR_ID = 'primary';
const SOURCE_TAG = 'clilux_sync'; // tag to identify events created by this app

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // 1. Fetch all pending revisions + related data
    const [revisions, equipmentList, clientList, buildingList] = await Promise.all([
      base44.entities.ScheduledRevision.filter({ status: 'pending' }),
      base44.entities.Equipment.list(),
      base44.entities.Client.list(),
      base44.entities.Building.list(),
    ]);

    const equipmentMap = Object.fromEntries(equipmentList.map(e => [e.id, e]));
    const clientMap = Object.fromEntries(clientList.map(c => [c.id, c]));
    const buildingMap = Object.fromEntries(buildingList.map(b => [b.id, b]));

    // Set of current valid revision IDs
    const validRevisionIds = new Set(revisions.map(r => r.id));

    const revisionTypeLabels = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual',
      unified: 'Unificada',
    };

    // 2. Fetch all existing Google Calendar events created by this app
    let existingEvents = [];
    let pageToken = null;
    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`);
      url.searchParams.set('privateExtendedProperty', `source=${SOURCE_TAG}`);
      url.searchParams.set('maxResults', '2500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.items) existingEvents = existingEvents.concat(data.items);
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    // Map existing events by revision_id stored in extendedProperties
    const existingByRevisionId = {};
    for (const ev of existingEvents) {
      const revId = ev.extendedProperties?.private?.revision_id;
      if (revId) existingByRevisionId[revId] = ev;
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    // 3. Delete Google Calendar events whose revision no longer exists or is not pending
    for (const [revId, ev] of Object.entries(existingByRevisionId)) {
      if (!validRevisionIds.has(revId)) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${ev.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (delRes.ok || delRes.status === 204 || delRes.status === 410) {
          deleted++;
        } else {
          failed++;
        }
      }
    }

    // 4. Create or update events for current pending revisions
    for (const rev of revisions) {
      const eq = equipmentMap[rev.equipment_id];
      const client = clientMap[rev.client_id];
      const building = buildingMap[rev.building_id];

      const title = rev.is_unified_revision
        ? `Revisión Unificada${building ? ` - ${building.name}` : ''}`
        : `Revisión ${revisionTypeLabels[rev.revision_type] || rev.revision_type}${eq ? ` - ${eq.brand} ${eq.model}` : ''}`;

      const description = [
        client ? `Cliente: ${client.name}` : '',
        building ? `Edificio: ${building.name}` : '',
        eq?.location ? `Ubicación: ${eq.location}` : '',
        eq?.reference_name ? `Equipo: ${eq.reference_name}` : '',
      ].filter(Boolean).join('\n');

      const event = {
        summary: title,
        description,
        start: { date: rev.scheduled_date },
        end: { date: rev.scheduled_date },
        extendedProperties: {
          private: {
            source: SOURCE_TAG,
            revision_id: rev.id,
          },
        },
      };

      const existingEvent = existingByRevisionId[rev.id];

      if (existingEvent) {
        // Update existing event
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${existingEvent.id}`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          }
        );
        if (res.ok) updated++; else failed++;
      } else {
        // Create new event
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          }
        );
        if (res.ok) created++; else failed++;
      }
    }

    return Response.json({ success: true, created, updated, deleted, failed, total: revisions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});