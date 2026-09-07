import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet, FileText, FileJson, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export const ENTITY_OPTIONS = [
  { key: 'workers', label: 'Trabajadores' },
  { key: 'clients', label: 'Clientes' },
  { key: 'buildings', label: 'Edificios' },
  { key: 'equipment', label: 'Equipos' },
  { key: 'incidents', label: 'Incidencias' },
  { key: 'revisions', label: 'Revisiones' },
  { key: 'registros_horarios', label: 'Registros horarios' },
  { key: 'ausencias', label: 'Vacaciones/Ausencias' },
  { key: 'obras', label: 'Obras' },
  { key: 'albaranes_trabajo', label: 'Albaranes trabajo' },
  { key: 'albaranes_obra', label: 'Albaranes obra' },
  { key: 'worker_documents', label: 'Documentos trabajadores' },
  { key: 'registros_ld', label: 'Registros LD' },
  { key: 'registros_fgas', label: 'Registros F-Gas' },
  { key: 'registros_instalador', label: 'Registros instalador' },
];

const SHEET_TO_KEY = {
  'Trabajadores': 'workers', 'Clientes': 'clients', 'Edificios': 'buildings',
  'Equipos': 'equipment', 'Incidencias': 'incidents', 'Revisiones': 'revisions',
  'Registros horarios': 'registros_horarios', 'Vacaciones/Ausencias': 'ausencias',
  'Obras': 'obras', 'Albaranes trabajo': 'albaranes_trabajo',
  'Albaranes obra': 'albaranes_obra', 'Documentos trabajadores': 'worker_documents',
  'Registros LD': 'registros_ld', 'Registros F-Gas': 'registros_fgas',
  'Registros instalador': 'registros_instalador',
};

export default function ExportDatosGerente({ sessionTechEmail, companyName }) {
  const [exporting, setExporting] = useState(false);
  const [formato, setFormato] = useState('xlsx');
  const [selected, setSelected] = useState(new Set(ENTITY_OPTIONS.map(e => e.key)));

  const toggleEntity = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ENTITY_OPTIONS.map(e => e.key)));
  const selectNone = () => setSelected(new Set());

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
    const workers = all.technicians || techsRes.data?.data || [];
    const clients = all.clients || [];
    const buildings = all.buildings || [];
    const equipment = all.equipment || [];
    const incidents = all.incidents || [];
    const revisions = all.revisions || [];
    const registrosHorarios = all.registros_horarios || [];
    const ausencias = all.ausencias || [];
    const obras = all.obras || [];
    const albaranesTrabajo = all.albaranes_trabajo || [];
    const albaranesObra = all.albaranes_obra || [];
    const workerDocs = all.worker_documents || [];
    const registrosLD = all.registros_ld || [];
    const registrosFGas = all.registros_fgas || [];
    const registrosInst = all.registros_instalador || [];

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
      'Registros horarios': registrosHorarios.map(h => ({
        'Trabajador': h.technician_name || '', 'Fecha': h.fecha || '',
        'Entrada': h.hora_entrada || '', 'Salida': h.hora_salida || '',
        'Horas': h.horas_efectivas ?? h.horas_trabajadas ?? '',
        'Extra': h.horas_extra ?? '', 'Tipo': h.tipo_jornada || '',
        'Finalizada': h.finalizada ? 'Sí' : 'No',
      })),
      'Vacaciones/Ausencias': ausencias.map(a => ({
        'Trabajador': a.technician_name || '', 'Tipo': a.tipo || '',
        'Inicio': a.fecha_inicio || '', 'Fin': a.fecha_fin || '',
        'Días': a.dias_totales ?? '', 'Estado': a.estado || '',
        'Motivo': a.motivo || '',
      })),
      'Obras': obras.map(o => ({
        'Cliente': clientName(o.client_id, clients), 'Nombre': o.nombre || '',
        'Estado': o.estado || '', 'Inicio': o.fecha_inicio || '',
        'Fin previsto': o.fecha_fin_prevista || '', 'Responsable': o.responsable_nombre || '',
        'Presupuesto': o.presupuesto_inicial ?? '', 'Coste MO': o.costo_trabajadores ?? '',
        'Coste mat.': o.costo_materiales ?? '',
      })),
      'Albaranes trabajo': albaranesTrabajo.map(a => ({
        'Nº': a.numero || '', 'Fecha': a.fecha || '', 'Título': a.titulo || '',
        'Cliente': a.client_name || '', 'Técnico': a.tecnico_nombre || '',
        'Estado': a.estado || '', 'Total': a.total ?? '',
      })),
      'Albaranes obra': albaranesObra.map(a => ({
        'Nº': a.numero || '', 'Fecha': a.fecha || '', 'Obra': a.obra_nombre || '',
        'Cliente': a.client_name || '', 'Técnico': a.tecnico_nombre || '',
        'Horas': a.horas_trabajadas ?? '', 'Estado': a.estado || '',
      })),
      'Documentos trabajadores': workerDocs.map(d => ({
        'Trabajador': d.technician_name || '', 'Título': d.title || '',
        'Tipo': d.document_type || '', 'Fecha': d.fecha || '',
      })),
      'Registros LD': registrosLD.map(r => ({
        'Cliente': clientName(r.client_id, clients), 'Fecha': r.fecha || '',
        'Tipo tratamiento': r.tipo_tratamiento || '', 'Protocolo': r.protocolo_id || '',
        'Circuito': r.nombre_circuito || '', 'pH inicial': r.ph_inicial ?? '',
        'Cloro inicial': r.cloro_libre_inicial ?? '', 'pH final': r.ph_final ?? '',
        'Cloro final': r.cloro_libre_final ?? '', 'Responsable': r.responsable_tecnico_nombre || '',
      })),
      'Registros F-Gas': registrosFGas.map(r => ({
        'Cliente': clientName(r.client_id, clients), 'Fecha': r.fecha_intervencion || '',
        'Tipo': r.tipo_intervencion || '', 'Refrigerante': r.refrigerante_tipo || '',
        'Carga total (kg)': r.carga_total_kg ?? '', 'Gas añadido (kg)': r.gas_anyadido_kg ?? '',
        'Gas recuperado (kg)': r.gas_recuperado_kg ?? '', 'Técnico': r.tecnico_nombre || '',
        'Próxima revisión': r.proxima_revision_fecha || '',
      })),
      'Registros instalador': registrosInst.map(r => ({
        'Cliente': clientName(r.client_id, clients), 'Fecha': r.fecha_intervencion || '',
        'Tipo': r.tipo_intervencion || '', 'Técnico': r.tecnico_nombre || '',
        'Refrigerante': r.refrigerante_tipo || '', 'Gas cargado (kg)': r.gas_cargado_kg ?? '',
        'Gas recuperado (kg)': r.gas_recuperado_kg ?? '', 'Control fugas': r.control_fugas_resultado || '',
      })),
    };

    const rawAll = {
      clients, buildings, equipment, incidents, revisions,
      registros_horarios: registrosHorarios, ausencias, obras,
      albaranes_trabajo: albaranesTrabajo, albaranes_obra: albaranesObra,
      worker_documents: workerDocs, registros_ld: registrosLD,
      registros_fgas: registrosFGas, registros_instalador: registrosInst,
    };

    // Filtrar por selección del usuario
    const filteredSheets = {};
    for (const [sheetName, rows] of Object.entries(sheets)) {
      const entityKey = SHEET_TO_KEY[sheetName];
      if (entityKey && selected.has(entityKey)) {
        filteredSheets[sheetName] = rows;
      }
    }
    const filteredRaw = {};
    for (const [key, val] of Object.entries(rawAll)) {
      if (selected.has(key)) {
        filteredRaw[key] = val;
      }
    }

    return { sheets: filteredSheets, raw: filteredRaw };
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
    if (selected.size === 0) {
      toast.error('Selecciona al menos una categoría');
      return;
    }
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
        for (const [name, rows] of Object.entries(sheets)) {
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
    <div className="space-y-3">
      {/* Selección de entidades */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-600">Categorías a exportar</p>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[11px] text-blue-600 hover:underline">Todas</button>
            <span className="text-slate-300">·</span>
            <button onClick={selectNone} className="text-[11px] text-slate-500 hover:underline">Ninguna</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {ENTITY_OPTIONS.map(opt => {
            const checked = selected.has(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleEntity(opt.key)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition border ${
                  checked
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {checked
                  ? <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  : <Square className="h-3.5 w-3.5 flex-shrink-0" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formato */}
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
        {selected.size} categoría(s) seleccionada(s) · {formato === 'json'
          ? 'Copia con todos los campos. Úsala para importar datos.'
          : 'Hojas por entidad para abrir en Excel.'}
      </p>
      <Button onClick={handleExport} disabled={exporting || selected.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {exporting ? 'Exportando...' : `Exportar ${selected.size} categoría(s) a ${formato.toUpperCase()}`}
      </Button>
    </div>
  );
}