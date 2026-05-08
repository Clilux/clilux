import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      email, name, mes,
      diasTrabajados, horasNormalesMes, horasExtraMes,
      horasExtraAnio, pctExtra, jornadasExcesivas, estadoExtra
    } = await req.json();

    if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });

    const alertaExtra = estadoExtra === 'exceso'
      ? '⚠️ <strong>ATENCIÓN:</strong> Has superado el límite legal de 80 horas extra anuales (RD-ley 8/2019).'
      : estadoExtra === 'aviso'
      ? '⚠️ Estás alcanzando el 75% del límite de 80 horas extra anuales. Próximo al límite legal.'
      : '✅ Estás dentro de los límites legales de horas extraordinarias.';

    const colorEstado = estadoExtra === 'exceso' ? '#dc2626' : estadoExtra === 'aviso' ? '#d97706' : '#16a34a';
    const bgEstado = estadoExtra === 'exceso' ? '#fef2f2' : estadoExtra === 'aviso' ? '#fffbeb' : '#f0fdf4';

    const jornadasMsg = jornadasExcesivas > 0
      ? `<p style="color:#dc2626;margin:8px 0;">⚠️ Este mes tuviste <strong>${jornadasExcesivas} jornada${jornadasExcesivas > 1 ? 's' : ''}</strong> con más de 9 horas (límite legal diario).</p>`
      : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#1e40af;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;">📋 Resumen mensual de jornada</h1>
      <p style="color:#93c5fd;margin:6px 0 0 0;font-size:14px;">Control horario · RD-ley 8/2019</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin-top:0;">Hola <strong>${name}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;">A continuación te enviamos el resumen de tu registro de jornada correspondiente a <strong>${mes}</strong>:</p>

      <!-- Stats -->
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;">
        <tr style="background:#eff6ff;">
          <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Días trabajados</td>
          <td style="padding:14px 16px;font-size:18px;font-weight:bold;color:#1e40af;text-align:right;">${diasTrabajados}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Horas normales</td>
          <td style="padding:14px 16px;font-size:18px;font-weight:bold;color:#1e40af;text-align:right;">${horasNormalesMes}</td>
        </tr>
        <tr style="background:#fff7ed;">
          <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Horas extra este mes</td>
          <td style="padding:14px 16px;font-size:18px;font-weight:bold;color:#ea580c;text-align:right;">${horasExtraMes}</td>
        </tr>
        <tr style="background:#fefce8;">
          <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Horas extra acumuladas (año)</td>
          <td style="padding:14px 16px;font-size:18px;font-weight:bold;color:#ca8a04;text-align:right;">${horasExtraAnio} <span style="font-size:13px;font-weight:normal;color:#9ca3af;">/ 80h límite</span></td>
        </tr>
      </table>

      <!-- Barra de progreso -->
      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px;">
          <span>Consumo límite anual de horas extra</span>
          <span><strong>${pctExtra}%</strong></span>
        </div>
        <div style="background:#e5e7eb;border-radius:99px;height:10px;overflow:hidden;">
          <div style="height:10px;border-radius:99px;background:${colorEstado};width:${pctExtra}%;"></div>
        </div>
      </div>

      <!-- Estado legal -->
      <div style="background:${bgEstado};border-left:4px solid ${colorEstado};padding:14px 16px;border-radius:0 8px 8px 0;margin:20px 0;font-size:13px;color:#374151;">
        ${alertaExtra}
      </div>

      ${jornadasMsg}

      <!-- Nota legal -->
      <div style="background:#f1f5f9;border-radius:8px;padding:14px 16px;margin-top:20px;">
        <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">
          Este resumen se genera en cumplimiento del <strong>Real Decreto-ley 8/2019</strong> sobre control de registro horario. 
          Las horas extraordinarias están limitadas a <strong>80 horas anuales</strong>. La empresa conserva los registros durante 4 años 
          según lo establecido en el art. 34.9 del Estatuto de los Trabajadores.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">Este email es informativo y se envía automáticamente. No responder.</p>
    </div>
  </div>
</body>
</html>`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `📋 Resumen jornada ${mes} — Control horario RD-ley 8/2019`,
      body: html,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});