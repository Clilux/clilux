import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 });
    }

    const { full_name, contact_email, company_name, company_cif, company_address, technician_email, password } = body || {};

    if (!full_name || !contact_email || !company_name || !company_cif) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const cif = String(company_cif).toUpperCase().trim();

    // Comprobar duplicado por CIF con permisos de servicio (usuario anónimo)
    const existing = await base44.asServiceRole.entities.AdminRequest.filter({ company_cif: cif });
    if (existing && existing.length > 0) {
      return Response.json({ error: 'Ya existe una solicitud con ese CIF.' }, { status: 409 });
    }

    // Crear la solicitud con permisos de servicio
    const created = await base44.asServiceRole.entities.AdminRequest.create({
      full_name,
      contact_email,
      company_name,
      company_cif: cif,
      company_address: company_address || null,
      technician_email: technician_email || null,
      password,
      status: 'pending',
    });

    // Notificar al administrador de la aplicación (psantos@clilux.com)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'psantos@clilux.com',
        subject: `Nueva solicitud de acceso — ${company_name}`,
        body:
          'Hay una nueva solicitud de acceso a Clilux pendiente de autorización.\n\n' +
          `Solicitante: ${full_name}\n` +
          `Email: ${contact_email}\n` +
          `Empresa: ${company_name}\n` +
          `CIF: ${cif}\n` +
          (company_address ? `Dirección: ${company_address}\n` : '') +
          (technician_email ? `Email técnico vinculado: ${technician_email}\n` : '') +
          '\nEntra en la app → Panel de Administración → Solicitudes pendientes para aprobar o rechazar. ' +
          'Al aprobar, se enviará automáticamente el correo de bienvenida al nuevo usuario.\n\nEquipo Clilux',
      });
    } catch (e) {
      console.warn('No se pudo notificar al administrador:', e?.message || e);
    }

    return Response.json({ ok: true, id: created?.id || null });
  } catch (error) {
    return Response.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}