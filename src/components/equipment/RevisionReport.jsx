import React from 'react';
import { Button } from "@/components/ui/button";
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Convierte valores booleanos/true/false a texto legible en español
const formatValue = (value) => {
  if (value === true || value === 'true') return 'Sí';
  if (value === false || value === 'false') return 'No';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

export default function RevisionReport({ revision, equipment, client, building, appSettings, fields = [] }) {
  const handleDownload = () => {
    const doc = buildHtml();
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const equipName = equipment?.reference_name || `${equipment?.brand || ''}_${equipment?.model || ''}`;
    const dateStr = revision.completed_date ? revision.completed_date.replace(/-/g, '') : 'sin_fecha';
    a.download = `informe_revision_${equipName}_${dateStr}.html`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const doc = buildHtml();
    const w = window.open('', '_blank');
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  const revisionTypeLabels = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    biannual: 'Semestral',
    annual: 'Anual',
    unified: 'Unificada',
  };

  const companyName = appSettings?.company_name || '';
  const companyAddress = appSettings?.company_address || '';
  const companyPhone = appSettings?.company_phone || '';
  const companyEmail = appSettings?.company_email || '';
  const logoUrl = appSettings?.logo_url || '';

  const buildHtml = () => {
    const revData = revision.revision_data || {};
    // Crear mapa key → label desde fields config
    const fieldLabelMap = {};
    fields.forEach(f => { if (f.field_key) fieldLabelMap[f.field_key] = f.field_label; });

    const dataRows = Object.entries(revData)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, val]) => {
        const label = fieldLabelMap[key] || key;
        return `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;color:#555;width:50%">${label}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;font-weight:500;color:#222">${formatValue(val)}</td>
        </tr>
      `;
      }).join('');

    const completedDate = revision.completed_date
      ? format(new Date(revision.completed_date), "d 'de' MMMM 'de' yyyy", { locale: es })
      : '—';

    const scheduledDate = revision.scheduled_date
      ? format(new Date(revision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })
      : '—';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe de Revisión</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: #fff; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; border-bottom: 2px solid #2563eb; padding-bottom: 16px; }
    .company-info h1 { margin: 0 0 4px; font-size: 20px; color: #1e3a8a; }
    .company-info p { margin: 2px 0; font-size: 12px; color: #555; }
    .logo img { max-height: 60px; max-width: 160px; }
    .title-section { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; margin-bottom: 22px; border-radius: 0 8px 8px 0; }
    .title-section h2 { margin: 0 0 4px; font-size: 18px; color: #1e40af; }
    .title-section .badge { display: inline-block; background: #2563eb; color: #fff; border-radius: 12px; padding: 2px 12px; font-size: 12px; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
    .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .info-block h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    .info-block p { margin: 3px 0; font-size: 13px; color: #334155; }
    .info-block .main { font-weight: 600; font-size: 14px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #fff; }
    table th { background: #1e40af; color: #fff; padding: 9px 12px; text-align: left; font-size: 13px; }
    table td { font-size: 13px; vertical-align: top; }
    table tr:last-child td { border-bottom: none; }
    .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    .notes-box h4 { margin: 0 0 6px; font-size: 13px; color: #64748b; text-transform: uppercase; }
    .notes-box p { margin: 0; font-size: 13px; color: #334155; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    .sign-area { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign-box { border-top: 1px solid #334155; padding-top: 6px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="company-info">
      ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo"/></div>` : ''}
      ${companyName ? `<h1>${companyName}</h1>` : ''}
      ${companyAddress ? `<p>${companyAddress}</p>` : ''}
      ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
      ${companyEmail ? `<p>${companyEmail}</p>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Informe generado el</div>
      <div style="font-size:13px;color:#334155">${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</div>
    </div>
  </div>

  <div class="title-section">
    <h2>Informe de Revisión de Mantenimiento</h2>
    <span class="badge">${revisionTypeLabels[revision.revision_type] || revision.revision_type}</span>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h4>Equipo</h4>
      <p class="main">${equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`}</p>
      <p>${equipment?.brand || ''} ${equipment?.model || ''}</p>
      ${equipment?.serial_number ? `<p>S/N: ${equipment.serial_number}</p>` : ''}
      ${equipment?.location ? `<p>Ubicación: ${equipment.location}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>Cliente / Edificio</h4>
      ${client ? `<p class="main">${client.name}</p>` : ''}
      ${building ? `<p>${building.name}</p>` : ''}
      ${building?.address ? `<p>${building.address}</p>` : ''}
      ${client?.cif ? `<p>CIF: ${client.cif}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>Fechas</h4>
      <p><strong>Programada:</strong> ${scheduledDate}</p>
      <p><strong>Realizada:</strong> ${completedDate}</p>
    </div>
    <div class="info-block">
      <h4>Técnico</h4>
      <p class="main">${revision.technician_name || '—'}</p>
    </div>
  </div>

  ${dataRows ? `
  <table>
    <thead><tr><th colspan="2">Datos Registrados</th></tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
  ` : ''}

  ${revision.notes ? `
  <div class="notes-box">
    <h4>Observaciones</h4>
    <p>${revision.notes}</p>
  </div>
  ` : ''}

  <div class="sign-area">
    <div class="sign-box">Firma del técnico: ${revision.technician_name || ''}</div>
    <div class="sign-box">Firma del cliente / responsable</div>
  </div>

  <div class="footer">
    <span>${companyName || 'Informe de revisión'}</span>
    <span>Revisión ${revisionTypeLabels[revision.revision_type] || ''} · ${completedDate}</span>
  </div>
</div>
</body>
</html>`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Genera un informe completo de esta revisión con todos los datos registrados, listo para imprimir o descargar.
      </p>
      <div className="flex gap-3">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <FileDown className="h-4 w-4 mr-2" />
          Imprimir / Guardar PDF
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          Descargar HTML
        </Button>
      </div>
    </div>
  );
}