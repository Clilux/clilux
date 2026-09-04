import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

/**
 * Exportación completa de los datos de la empresa (solo gerente).
 * Entidades: Trabajadores (con credenciales y PIN), Clientes, Edificios,
 * Equipos, Incidencias y Revisiones.
 * Formatos:
 *  - Excel (multi-hoja)
 *  - CSV (un archivo por entidad, descargados en secuencia)
 *  - JSON (copia completa con todos los campos, para recuperar/migrar a otra empresa)
 * Los datos se obtienen por el canal seguro getCompanyData, filtrados por empresa.
 */
export default function ExportDatosGerente({ sessionTechEmail, companyName }) {
  const [exporting, setExporting] = useState(false);
  const [formato, setFormato] = useState('xlsx'); // 'xlsx' | 'csv' | 'json'

  const invoke = (entity, extra = {}) =>
    base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity, ...extra });

  const clientName = (id, clients) => clients.find(c => c.id === id)?.name || '';
  const buildingName = (id, buildings) => buildings.find(b => b.id === id)?.name || '';
  const equipmentName = (id, equipment) => equipment.find(e => e.id === id)?.reference_name || '';

  const gather = async () => {
    const [allRes, techsRes] = await Promise.all([
      invoke('all'),
      invoke('technicians'),
    ]);
    const all = allRes.data || {};
    const workers = techsRes.data?.data || [];
    const clients = all.clients || [];
    const buildings = all.buildings || [];
    const equipment = all.equipment || [];
    const incidents = all.incidents || [];
    const revisions = all.revisions || [];

    const sheets = {
      'Trabajadores': workers.map(w => ({
        'Nombre': w.name || '', 'Email': w.email || '',
        'Email portal': w.portal_email || w.email || '',
        'Contraseña': w.portal_password || '', 'PIN kiosko': w.pin || '',
        'Tipo': w.worker_type === 'administracion' ? 'Administración' : 'Técnico',
        'Rol': w.is_admin ? 'Gerente' : 'Trabajador',
        'Estado': w.status === 'active' ? 'Activo' : 'Inactivo',
        'Teléfono': w.phone || '', 'Horas jornada': w.horas_jornada_diaria ?? '',
        'Cert. F-Gas': w.fgas_cert_num || '', 'Cert. RITE': w.rite_cert_num || '',
      })),
      'Clientes': clients.map(c => ({
        'Nombre': c.name || '', 'CIF': c.cif || '', 'Email': c.email || '',
        'Teléfono': c.phone || '', 'Contacto': c.contact_person || '',
        'Dirección': c.address || '', 'Ciudad': c.city || '',
        'Provincia': c.province || '', 'Estado': c.status || '',
      })),
      'Edificios': buildings.map(b => ({
        'Cliente': clientName(b.client_id, clients), 'Nombre': b.name || '',
        'Dirección': b.address || '', 'Ciudad': b.city || '',
        'Provincia': b.province || '', 'Contacto': b.contact_person || '',
        'Teléfono': b.contact_phone || '', 'Estado': b.status || '',
      })),
      'Equipos': equipment.map(e => ({
        'Cliente': clientName(e.client_id, clients), 'Edificio': buildingName(e.building_id, buildings),
        'Referencia': e.reference_name || '', 'Tipo': e.equipment_type || '',
        'Marca': e.brand || '', 'Modelo': e.model || '', 'Nº serie': e.serial_number || '',
        'Ubicación': e.location || '', 'Refrigerante': e.refrigerant_type || '',
        'Carga (kg)': e.refrigerant_charge_kg ?? '', 'Potencia frig. (kW)': e.cooling_power_kw ?? '',
        'Estado': e.status || '', 'Notas': e.notes || '',
      })),
      'Incidencias': incidents.map(i => ({
        'Cliente': clientName(i.client_id, clients), 'Edificio': buildingName(i.building_id, buildings),
        'Equipo': equipmentName(i.equipment_id, equipment), 'Título': i.title || '',
        'Descripción': i.description || '', 'Prioridad': i.priority || '',
        'Estado': i.status || '', 'Creada por': i.created_by_name || '',
        'Fecha': i.created_date ? format(new Date(i.created_date), 'dd/MM/yyyy HH:mm') : '',
      })),
      'Revisiones': revisions.map(r => ({
        'Cliente': clientName(r.client_id, clients), 'Edificio': buildingName(r.building_id, buildings),
        'Equipo': equipmentName(r.equipment_id, equipment),
        'Fecha programada': r.scheduled_date || '', 'Tipo': r.revision_type || '',
        'Estado': r.status || '', 'Técnico': r.technician_name || '',
        'Completada': r.completed_date || '',
      })),
    };
    return { sheets, raw: { clients, buildings, equipment, incidents, revisions } };
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { sheets, raw } = await gather();
      const fileBase = (companyName || 'empresa').replace(/[^\w\-]+/g, '_');
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      if (formato === 'json') {
        const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `copia_${fileBase}_${dateStr}.json`);
        toast.success('Copia JSON descargada');
      } else if (formato === 'xlsx') {
        const wb = XLSX.utils.book_new();
        Object.entries(sheets).forEach(([name, rows]) => {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
        });
        XLSX.writeFile(wb, `datos_${fileBase}_${dateStr}.xlsx`);
        toast.success('Excel exportado');
      } else {
        const entries = Object.entries(sheets);
        for (const [name, rows] of entries) {
          const ws = XLSX.utils.json_to_sheet(rows);
          const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';', RS: '\n' });
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          downloadBlob(blob, `${fileBase}_${name}_${dateStr}.csv`);
          await new Promise(r => setTimeout(r, 400));
        }
        toast.success('CSV exportados');
      }
    } catch (err) {
      toast.error('Error al exportar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setExporting(false);
    }
  };

  const formats = [
    { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { id: 'csv', label: 'CSV', icon: FileText },
    { id: 'json', label: 'JSON', icon: FileJson },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {formats.map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormato(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${formato === f.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              <Icon className="h-3.5 w-3.5" /> {f.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">
        {formato === 'json'
          ? 'Copia completa con todos los campos. Úsala para recuperar datos o migrarlos a otra empresa (botón Importar).'
          : 'Hojas por entidad. Para abrir en Excel o importar parcialmente.'}
      </p>
      <Button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {exporting ? 'Exportando...' : `Exportar a ${formato.toUpperCase()}`}
      </Button>
    </div>
  );
}