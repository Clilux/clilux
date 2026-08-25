import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Solo un administrador de la plataforma puede exportar la base de datos completa
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (me.role !== 'admin') return Response.json({ error: 'Requiere administrador' }, { status: 403 });

    // Fetch all data
    const [clients, buildings, equipment, revisions, incidents, technicians] = await Promise.all([
        base44.asServiceRole.entities.Client.list(),
        base44.asServiceRole.entities.Building.list(),
        base44.asServiceRole.entities.Equipment.list(),
        base44.asServiceRole.entities.ScheduledRevision.list(),
        base44.asServiceRole.entities.Incident.list(),
        base44.asServiceRole.entities.Technician.list(),
    ]);

    const backup = {
        exported_at: new Date().toISOString(),
        clients,
        buildings,
        equipment,
        revisions,
        incidents,
        technicians,
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `backup_${date}.json`;

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Upload to Google Drive
    const metadata = {
        name: fileName,
        mimeType: 'application/json',
    };

    const formData = new FormData();
    formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append(
        'file',
        new Blob([jsonContent], { type: 'application/json' })
    );

    const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
        }
    );

    if (!uploadRes.ok) {
        const err = await uploadRes.text();
        return Response.json({ error: `Drive upload failed: ${err}` }, { status: 500 });
    }

    const driveFile = await uploadRes.json();

    return Response.json({
        success: true,
        file_id: driveFile.id,
        file_name: fileName,
        message: `Backup subido correctamente a Google Drive: ${fileName}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});