import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BuildingReport({ building, client, equipment = [], revisions = [] }) {
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);

    let settings = null;
    try {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      settings = all[0] || null;
    } catch (e) {}

    const companyName = settings?.company_name || 'Empresa de Mantenimiento';
    const logoUrl = settings?.logo_url || '';

    const statusLabels = {
      operational: 'Operativo',
      maintenance_needed: 'Requiere mantenimiento',
      out_of_service: 'Fuera de servicio',
      inactive: 'Inactivo',
    };

    const revisionTypeLabels = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual',
    };

    const totalCooling = equipment.reduce((sum, e) => sum + (parseFloat(e.cooling_power_kw) || 0), 0);
    const totalHeating = equipment.reduce((sum, e) => sum + (parseFloat(e.heating_power_kw) || 0), 0);
    const operational = equipment.filter(e => e.status === 'operational').length;
    const needsMaintenance = equipment.filter(e => e.status === 'maintenance_needed').length;
    const outOfService = equipment.filter(e => e.status === 'out_of_service').length;
    const inactive = equipment.filter(e => e.status === 'inactive').length;

    const completedRevisions = revisions.filter(r => r.status === 'completed');
    const pendingRevisions = revisions.filter(r => r.status === 'pending');
    const overdueRevisions = pendingRevisions.filter(r => new Date(r.scheduled_date) < new Date());

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Edificio - ${building.name}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
  .company { font-size: 20px; font-weight: bold; color: #1e293b; }
  .report-title { font-size: 14px; color: #64748b; margin-top: 4px; }
  .logo { max-height: 60px; max-width: 160px; }
  h2 { color: #1e293b; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; }
  .info-label { font-size: 11px; color: #64748b; }
  .info-value { font-weight: 600; color: #1e293b; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .stat { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
  .stat-number { font-size: 22px; font-weight: bold; }
  .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .green { color: #059669; } .amber { color: #d97706; } .red { color: #dc2626; } .blue { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #94a3b8; font-size: 11px; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div>
    ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" /><br/>` : ''}
    <div class="company">${companyName}</div>
    <div class="report-title">Informe de Edificio · ${format(new Date(), "dd/MM/yyyy", { locale: es })}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:bold;color:#1e293b">${building.name}</div>
    ${client ? `<div style="color:#64748b">${client.name}</div>` : ''}
    <div style="color:#94a3b8;font-size:12px">${building.status === 'inactive' ? '⚠ INACTIVO' : 'Activo'}</div>
  </div>
</div>

${client ? `
<h2>Datos del Cliente</h2>
<div class="info-grid">
  <div class="info-item"><div class="info-label">Razón Social</div><div class="info-value">${client.name}</div></div>
  <div class="info-item"><div class="info-label">CIF</div><div class="info-value">${client.cif || '-'}</div></div>
  ${client.phone ? `<div class="info-item"><div class="info-label">Teléfono</div><div class="info-value">${client.phone}</div></div>` : ''}
  ${client.email ? `<div class="info-item"><div class="info-label">Email</div><div class="info-value">${client.email}</div></div>` : ''}
  ${client.contact_person ? `<div class="info-item"><div class="info-label">Contacto</div><div class="info-value">${client.contact_person}</div></div>` : ''}
</div>
` : ''}

<h2>Datos del Edificio</h2>
<div class="info-grid">
  <div class="info-item"><div class="info-label">Nombre</div><div class="info-value">${building.name}</div></div>
  <div class="info-item"><div class="info-label">Dirección</div><div class="info-value">${building.address || '-'}</div></div>
  ${building.city ? `<div class="info-item"><div class="info-label">Ciudad</div><div class="info-value">${building.postal_code || ''} ${building.city}, ${building.province || ''}</div></div>` : ''}
  ${building.floors ? `<div class="info-item"><div class="info-label">Plantas</div><div class="info-value">${building.floors}</div></div>` : ''}
  ${building.surface_m2 ? `<div class="info-item"><div class="info-label">Superficie</div><div class="info-value">${building.surface_m2} m²</div></div>` : ''}
  ${building.contact_person ? `<div class="info-item"><div class="info-label">Contacto edificio</div><div class="info-value">${building.contact_person}</div></div>` : ''}
  ${totalCooling > 0 ? `<div class="info-item"><div class="info-label">Potencia Frigorífica Total</div><div class="info-value blue">${totalCooling.toFixed(1)} kW</div></div>` : ''}
  ${totalHeating > 0 ? `<div class="info-item"><div class="info-label">Potencia Calorífica Total</div><div class="info-value red">${totalHeating.toFixed(1)} kW</div></div>` : ''}
</div>

<h2>Resumen de Equipos</h2>
<div class="stats">
  <div class="stat"><div class="stat-number green">${operational}</div><div class="stat-label">Operativos</div></div>
  <div class="stat"><div class="stat-number amber">${needsMaintenance}</div><div class="stat-label">Requieren mantenimiento</div></div>
  <div class="stat"><div class="stat-number red">${outOfService}</div><div class="stat-label">Fuera de servicio</div></div>
  <div class="stat"><div class="stat-number" style="color:#94a3b8">${inactive}</div><div class="stat-label">Inactivos</div></div>
</div>

${equipment.length > 0 ? `
<table>
  <thead>
    <tr><th>Marca / Modelo</th><th>Tipo</th><th>Ubicación</th><th>Pot. Frig. (kW)</th><th>Pot. Cal. (kW)</th><th>Refrigerante</th><th>Estado</th></tr>
  </thead>
  <tbody>
    ${equipment.map(eq => `
    <tr>
      <td><strong>${eq.brand} ${eq.model}</strong>${eq.serial_number ? `<br/><span style="color:#94a3b8;font-size:11px">S/N: ${eq.serial_number}</span>` : ''}</td>
      <td>${eq.equipment_type || '-'}</td>
      <td>${eq.location || '-'}</td>
      <td>${eq.cooling_power_kw || '-'}</td>
      <td>${eq.heating_power_kw || '-'}</td>
      <td>${eq.refrigerant_type || '-'}${eq.refrigerant_charge_kg ? ` (${eq.refrigerant_charge_kg} kg)` : ''}</td>
      <td><span class="badge ${eq.status === 'operational' ? 'badge-green' : eq.status === 'maintenance_needed' ? 'badge-amber' : eq.status === 'out_of_service' ? 'badge-red' : 'badge-gray'}">${statusLabels[eq.status] || eq.status}</span></td>
    </tr>`).join('')}
  </tbody>
</table>
` : '<p style="color:#94a3b8">No hay equipos registrados.</p>'}

<h2>Revisiones</h2>
<div class="stats">
  <div class="stat"><div class="stat-number green">${completedRevisions.length}</div><div class="stat-label">Completadas</div></div>
  <div class="stat"><div class="stat-number blue">${pendingRevisions.length - overdueRevisions.length}</div><div class="stat-label">Pendientes</div></div>
  <div class="stat"><div class="stat-number red">${overdueRevisions.length}</div><div class="stat-label">Vencidas</div></div>
  <div class="stat"><div class="stat-number">${revisions.length}</div><div class="stat-label">Total</div></div>
</div>

${revisions.length > 0 ? `
<table>
  <thead>
    <tr><th>Equipo</th><th>Tipo</th><th>Fecha Programada</th><th>Fecha Realización</th><th>Estado</th></tr>
  </thead>
  <tbody>
    ${revisions.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).slice(0, 50).map(r => {
      const eq = equipment.find(e => e.id === r.equipment_id);
      const isOverdue = r.status === 'pending' && new Date(r.scheduled_date) < new Date();
      return `<tr>
        <td>${eq ? `${eq.brand} ${eq.model}` : '-'}</td>
        <td>${revisionTypeLabels[r.revision_type] || r.revision_type}</td>
        <td style="${isOverdue ? 'color:#dc2626;font-weight:600' : ''}">${r.scheduled_date ? format(new Date(r.scheduled_date), 'dd/MM/yyyy') : '-'}</td>
        <td>${r.completed_date ? format(new Date(r.completed_date), 'dd/MM/yyyy') : '-'}</td>
        <td><span class="badge ${r.status === 'completed' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-gray'}">${r.status === 'completed' ? 'Completada' : isOverdue ? 'VENCIDA' : 'Pendiente'}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
` : '<p style="color:#94a3b8">No hay revisiones registradas.</p>'}

<div class="footer">
  Informe generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })} · ${companyName}
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_${building.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={generateReport} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
      Informe Edificio
    </Button>
  );
}