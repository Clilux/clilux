import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Fetch all data needed
    const [revisions, equipmentList, clientList, buildingList] = await Promise.all([
      base44.entities.ScheduledRevision.filter({ status: 'pending' }),
      base44.entities.Equipment.list(),
      base44.entities.Client.list(),
      base44.entities.Building.list(),
    ]);

    const equipmentMap = Object.fromEntries(equipmentList.map(e => [e.id, e]));
    const clientMap = Object.fromEntries(clientList.map(c => [c.id, c]));
    const buildingMap = Object.fromEntries(buildingList.map(b => [b.id, b]));

    const revisionTypeLabels = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual'
    };

    let created = 0;
    let failed = 0;

    for (const rev of revisions) {
      const eq = equipmentMap[rev.equipment_id];
      const client = clientMap[rev.client_id];
      const building = buildingMap[rev.building_id];

      const title = `Revisión ${revisionTypeLabels[rev.revision_type] || rev.revision_type}${eq ? ` - ${eq.brand} ${eq.model}` : ''}`;
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
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (res.ok) {
        created++;
      } else {
        failed++;
      }
    }

    return Response.json({ success: true, created, failed, total: revisions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});