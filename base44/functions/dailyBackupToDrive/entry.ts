import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Backup completo a Google Drive.
 * - Llamada por el workflow programado (sin sesión): copia GLOBAL de todas las entidades.
 * - Llamada por un gerente (con session_token + technician_email): copia de SU empresa.
 * Incluye todas las entidades: trabajadores, clientes, edificios, equipos, incidencias,
 * revisiones, registros horarios, ausencias, obras, albaranes (trabajo/obra),
 * documentos de trabajadores y registros LD / F-Gas / Instalador.
 * Requiere el conector de Google Drive autorizado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { technician_email } = body;

    let companyId: string | null = null;
    let scopeLabel = 'global';

    // ── Si viene sesión de gerente, acotar a su empresa ────────────
    if (technician_email) {
      const session = body.session_token ? await verifySessionToken(body.session_token) : null;
      let isPlatformAdmin = false;
      if (!session) {
        try { const me = await base44.auth.me(); if (me && me.role === 'admin') isPlatformAdmin = true; } catch { /* */ }
      }
      if (!session && !isPlatformAdmin) {
        return Response.json({ error: 'No autenticado' }, { status: 401 });
      }
      if (session && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
        return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
      }
      const techs = await base44.asServiceRole.entities.Technician.filter({ email: technician_email });
      const tech = techs[0];
      if (!tech || tech.status === 'inactive') {
        return Response.json({ error: 'Técnico no encontrado o inactivo' }, { status: 403 });
      }
      if (!tech.is_admin) {
        return Response.json({ error: 'Solo el gerente puede generar el backup' }, { status: 403 });
      }
      companyId = tech.company_id;
      scopeLabel = (tech.company_name || tech.company_id || 'empresa').replace(/[^\w\-]+/g, '_');
    }

    // ── Recolección de datos ──────────────────────────────────────
    const eq = (arr) => companyId ? arr.filter(x => x.company_id === companyId) : arr;
    const byClient = (arr, clientIds) => companyId ? arr.filter(x => clientIds.has(x.client_id)) : arr;

    const [clients, buildings, equipment, revisions, incidents, technicians,
           registrosHorarios, ausencias, obras, albaranesTrabajo, albaranesObra,
           workerDocs, registrosLD, registrosFGas, registrosInst,
           companies, settings] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-created_date'),
      base44.asServiceRole.entities.Building.list(),
      base44.asServiceRole.entities.Equipment.list(),
      base44.asServiceRole.entities.ScheduledRevision.list(),
      base44.asServiceRole.entities.Incident.list('-created_date'),
      base44.asServiceRole.entities.Technician.list(),
      base44.asServiceRole.entities.RegistroHorario.list(),
      base44.asServiceRole.entities.Ausencia.list(),
      base44.asServiceRole.entities.Obra.list(),
      base44.asServiceRole.entities.AlbaranTrabajo.list(),
      base44.asServiceRole.entities.AlbaranObra.list(),
      base44.asServiceRole.entities.WorkerDocument.list(),
      base44.asServiceRole.entities.RegistroLD.list(),
      base44.asServiceRole.entities.RegistroFGas.list(),
      base44.asServiceRole.entities.RegistroInstalador.list(),
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' }),
    ]);

    let payload: any;
    if (companyId) {
      const companyClients = clients.filter(c => c.company_id === companyId);
      const clientIds = new Set(companyClients.map(c => c.id));
      payload = {
        exported_at: new Date().toISOString(),
        scope: 'company',
        company_id: companyId,
        clients: companyClients,
        buildings: byClient(buildings, clientIds),
        equipment: byClient(equipment, clientIds),
        incidents: byClient(incidents, clientIds),
        revisions: byClient(revisions, clientIds),
        technicians: eq(technicians),
        registros_horarios: eq(registrosHorarios),
        ausencias: eq(ausencias),
        obras: eq(obras),
        albaranes_trabajo: eq(albaranesTrabajo),
        albaranes_obra: eq(albaranesObra),
        worker_documents: eq(workerDocs),
        registros_ld: byClient(registrosLD, clientIds),
        registros_fgas: byClient(registrosFGas, clientIds),
        registros_instalador: byClient(registrosInst, clientIds),
        settings: settings[0] || null,
      };
    } else {
      payload = {
        exported_at: new Date().toISOString(),
        scope: 'global',
        clients, buildings, equipment, revisions, incidents, technicians,
        registros_horarios: registrosHorarios, ausencias, obras,
        albaranes_trabajo: albaranesTrabajo, albaranes_obra: albaranesObra,
        worker_documents: workerDocs,
        registros_ld: registrosLD, registros_fgas: registrosFGas, registros_instalador: registrosInst,
        companies, settings: settings[0] || null,
      };
    }

    const jsonContent = JSON.stringify(payload, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `backup_${scopeLabel}_${date}.json`;

    // ── Subida a Google Drive ─────────────────────────────────────
    let accessToken: string;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    } catch (e) {
      return Response.json({
        error: 'Google Drive no está conectado. Autoriza el conector desde Integraciones.',
        connector_required: true,
      }, { status: 400 });
    }

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify({ name: fileName, mimeType: 'application/json' })], { type: 'application/json' }));
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return Response.json({ error: `Drive upload failed: ${err}` }, { status: 500 });
    }

    const driveFile = await uploadRes.json();
    return Response.json({
      success: true,
      file_id: driveFile.id,
      file_name: fileName,
      scope: scopeLabel,
      message: `Backup subido a Google Drive: ${fileName}`,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});