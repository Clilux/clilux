import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const statusLabels = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, incidentId, oldStatus, newStatus, technicianEmail } = body;

    // Get the incident
    const incidents = await base44.asServiceRole.entities.Incident.filter({ id: incidentId });
    const incident = incidents[0];
    if (!incident) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Get the client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: incident.client_id });
    const client = clients[0];

    const appSettings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const settings = appSettings[0];
    const companyName = settings?.company_name || 'Mantenimiento';

    if (type === 'status_changed' && client?.email) {
      // Notify client about status change
      const oldLabel = statusLabels[oldStatus] || oldStatus;
      const newLabel = statusLabels[newStatus] || newStatus;

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: companyName,
        to: client.email,
        subject: `Actualización de su incidencia: ${incident.title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Actualización de incidencia</h2>
            <p>Estimado/a <strong>${client.name}</strong>,</p>
            <p>Le informamos que el estado de su incidencia ha cambiado:</p>
            <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px 0;"><strong>Incidencia:</strong> ${incident.title}</p>
              <p style="margin: 0 0 8px 0;"><strong>Estado anterior:</strong> ${oldLabel}</p>
              <p style="margin: 0;"><strong>Nuevo estado:</strong> ${newLabel}</p>
            </div>
            ${incident.resolution_notes ? `<p><strong>Nota de resolución:</strong> ${incident.resolution_notes}</p>` : ''}
            <p style="color: #64748b; font-size: 0.875rem; margin-top: 24px;">Este es un mensaje automático de ${companyName}.</p>
          </div>
        `,
      });

      return Response.json({ success: true, type: 'status_changed', sent_to: client.email });
    }

    if (type === 'technician_assigned' && technicianEmail) {
      // Notify technician about assignment
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: companyName,
        to: technicianEmail,
        subject: `Nueva incidencia asignada: ${incident.title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Nueva incidencia asignada</h2>
            <p>Se le ha asignado una nueva incidencia:</p>
            <div style="background: #f1f5f9; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px 0;"><strong>Título:</strong> ${incident.title}</p>
              <p style="margin: 0 0 8px 0;"><strong>Descripción:</strong> ${incident.description}</p>
              <p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> ${incident.priority}</p>
              <p style="margin: 0;"><strong>Cliente:</strong> ${client?.name || 'N/A'}</p>
            </div>
            <p style="color: #64748b; font-size: 0.875rem; margin-top: 24px;">Este es un mensaje automático de ${companyName}.</p>
          </div>
        `,
      });

      return Response.json({ success: true, type: 'technician_assigned', sent_to: technicianEmail });
    }

    if (type === 'client_comment' && technicianEmail) {
      // Notify technician that client added a comment
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: companyName,
        to: technicianEmail,
        subject: `Nuevo comentario del cliente en: ${incident.title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Nuevo comentario de cliente</h2>
            <p>El cliente <strong>${client?.name || 'N/A'}</strong> ha añadido un comentario a la incidencia:</p>
            <div style="background: #f1f5f9; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px 0;"><strong>Incidencia:</strong> ${incident.title}</p>
              <p style="margin: 0;"><strong>Comentario:</strong> ${body.comment}</p>
            </div>
            <p style="color: #64748b; font-size: 0.875rem; margin-top: 24px;">Este es un mensaje automático de ${companyName}.</p>
          </div>
        `,
      });

      return Response.json({ success: true, type: 'client_comment', sent_to: technicianEmail });
    }

    return Response.json({ success: false, message: 'No notification sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});