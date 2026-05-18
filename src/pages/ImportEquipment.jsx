import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, CheckCircle2, AlertCircle, Loader2, ArrowLeft, FileSpreadsheet, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

// ── Tipos de equipo disponibles ──────────────────────────────
const EQUIPMENT_TYPES = [
  'Enfriadora / Chiller',
  'Bomba de calor aire-agua',
  'Bomba de calor agua-agua',
  'Torre de refrigeración',
  'Enfriamiento Adibático / evaporativo',
  'Climatizadora / UTA',
  'Fan-coil',
  'Split / Multi-split',
  'VRF / VRV exterior',
  'VRF / VRV interior',
  'Recuperador de calor',
  'Condensadora',
  'Caldera de gas',
  'Caldera de gasoil',
  'Aerotermia',
  'Geotermia',
  'Grupo de presión hidráulico',
  'Depósito acumulador ACS',
  'Intercambiador de calor',
  'Centralita / BMS',
  'Otro',
];

const VALID_STATUSES = ['operational', 'maintenance_needed', 'out_of_service'];

// ── Campos plantilla equipos ─────────────────────────────────
const EQUIPMENT_FIELDS = [
  { key: 'reference_name',        label: 'Nombre de referencia',          example: 'Climatizador Planta 1',   required: true },
  { key: 'equipment_type',        label: 'Tipo de equipo',                example: EQUIPMENT_TYPES[0],        required: true },
  { key: 'brand',                 label: 'Marca',                         example: 'Daikin',                  required: true },
  { key: 'model',                 label: 'Modelo',                        example: 'EWAD-AJYNN',              required: true },
  { key: 'serial_number',         label: 'Número de serie',               example: 'SN-123456',               required: false },
  { key: 'location',              label: 'Ubicación',                     example: 'Cubierta edificio A',     required: false },
  { key: 'installation_date',     label: 'Fecha instalación (AAAA-MM-DD)',example: '2020-06-15',              required: false },
  { key: 'cooling_power_kw',      label: 'Potencia frigorífica (kW)',     example: '120',                     required: false },
  { key: 'heating_power_kw',      label: 'Potencia calorífica (kW)',      example: '130',                     required: false },
  { key: 'refrigerant_type',      label: 'Tipo de refrigerante',          example: 'R410A',                   required: false },
  { key: 'refrigerant_charge_kg', label: 'Carga refrigerante (kg)',       example: '12.5',                    required: false },
  { key: 'balsa_litros',          label: 'Volumen balsa (litros)',         example: '500',                     required: false },
  { key: 'status',                label: 'Estado',                        example: 'operational',             required: false },
  { key: 'notes',                 label: 'Observaciones',                 example: 'Revisión pendiente',      required: false },
  { key: 'warranty_end',          label: 'Fin garantía (AAAA-MM-DD)',     example: '2025-06-15',              required: false },
];

// ── Campos plantilla clientes ────────────────────────────────
const CLIENT_FIELDS = [
  { key: 'name',           label: 'Nombre / Razón social', example: 'Empresa S.L.',         required: true },
  { key: 'cif',            label: 'CIF / NIF',             example: 'B12345678',            required: true },
  { key: 'address',        label: 'Dirección',             example: 'Calle Mayor 1',        required: false },
  { key: 'city',           label: 'Ciudad',                example: 'Madrid',               required: false },
  { key: 'postal_code',    label: 'Código postal',         example: '28001',                required: false },
  { key: 'province',       label: 'Provincia',             example: 'Madrid',               required: false },
  { key: 'phone',          label: 'Teléfono',              example: '600 000 000',          required: false },
  { key: 'email',          label: 'Email',                 example: 'info@empresa.com',     required: false },
  { key: 'contact_person', label: 'Persona de contacto',  example: 'Juan García',          required: false },
  { key: 'notes',          label: 'Observaciones',         example: 'Cliente preferente',   required: false },
];

// ── Helpers ──────────────────────────────────────────────────
function buildWorkbook(fields, sheetName, typesInfo = null) {
  const wb = XLSX.utils.book_new();
  const headers  = fields.map(f => f.label);
  const required = fields.map(f => f.required ? 'OBLIGATORIO' : 'Opcional');
  const examples = fields.map(f => f.example);
  const wsData   = [headers, required, examples];
  for (let i = 0; i < 20; i++) wsData.push(fields.map(() => ''));
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = fields.map(() => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Hoja tipos si aplica
  if (typesInfo) {
    const wsTypes = XLSX.utils.aoa_to_sheet([
      ['Tipos de equipo válidos'],
      ['(copia exactamente uno de estos valores en la columna "Tipo de equipo")'],
      [''],
      ...typesInfo.map(t => [t]),
    ]);
    wsTypes['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsTypes, 'Tipos de equipo');
  }

  // Instrucciones
  const instrData = [
    ['INSTRUCCIONES'],
    [''],
    ['1. Rellena los datos en la primera hoja a partir de la fila 4.'],
    ['2. Las filas 1 (cabecera), 2 (obligatorio/opcional) y 3 (ejemplo) son informativas.'],
    ['3. Los campos OBLIGATORIO deben estar rellenos.'],
    ['4. Las fechas deben tener formato AAAA-MM-DD (ej: 2024-03-15)'],
    ['5. Los campos numéricos deben ser números sin unidades.'],
    typesInfo ? ['6. El tipo de equipo debe ser exactamente uno de los listados en la hoja "Tipos de equipo".'] : [''],
    typesInfo ? ['7. El Estado acepta solo: operational, maintenance_needed, out_of_service'] : [''],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');
  return wb;
}

function downloadEquipmentTemplate() {
  const wb = buildWorkbook(EQUIPMENT_FIELDS, 'Equipos', EQUIPMENT_TYPES);
  XLSX.writeFile(wb, 'plantilla_importacion_equipos.xlsx');
}

function downloadClientTemplate() {
  const wb = buildWorkbook(CLIENT_FIELDS, 'Clientes');
  XLSX.writeFile(wb, 'plantilla_importacion_clientes.xlsx');
}

async function exportEquipmentsToExcel(equipments, clients, buildings) {
  const rows = equipments.map(eq => ({
    'Nombre de referencia':    eq.reference_name || '',
    'Cliente':                 clients.find(c => c.id === eq.client_id)?.name || eq.client_id || '',
    'Edificio':                buildings.find(b => b.id === eq.building_id)?.name || eq.building_id || '',
    'Tipo de equipo':          eq.equipment_type || '',
    'Marca':                   eq.brand || '',
    'Modelo':                  eq.model || '',
    'Número de serie':         eq.serial_number || '',
    'Ubicación':               eq.location || '',
    'Fecha instalación':       eq.installation_date || '',
    'Potencia frigorífica (kW)': eq.cooling_power_kw ?? '',
    'Potencia calorífica (kW)':  eq.heating_power_kw ?? '',
    'Tipo de refrigerante':    eq.refrigerant_type || '',
    'Carga refrigerante (kg)': eq.refrigerant_charge_kg ?? '',
    'Volumen balsa (litros)':  eq.balsa_litros ?? '',
    'Estado':                  eq.status || '',
    'Observaciones':           eq.notes || '',
    'Fin garantía':            eq.warranty_end || '',
    'Fecha registro':          eq.registration_date || '',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 28 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
  XLSX.writeFile(wb, `equipos_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportClientsToExcel(clients) {
  const rows = clients.map(c => ({
    'Nombre / Razón social': c.name || '',
    'CIF / NIF':             c.cif || '',
    'Dirección':             c.address || '',
    'Ciudad':                c.city || '',
    'Código postal':         c.postal_code || '',
    'Provincia':             c.province || '',
    'Teléfono':              c.phone || '',
    'Email':                 c.email || '',
    'Persona de contacto':   c.contact_person || '',
    'Observaciones':         c.notes || '',
    'Estado':                c.status || '',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 28 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `clientes_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ── Componente panel import/export ───────────────────────────
function ImportPanel({ title, templateFn, onImport, loading, results, entityType }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleImport = async () => {
    if (!file) return;
    await onImport(file);
    setFile(null);
  };

  return (
    <div className="space-y-4">
      {/* Descargar plantilla */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 mb-1">Descarga la plantilla Excel</h2>
            <p className="text-sm text-slate-500 mb-3">
              Rellena a partir de la fila 4. Las 3 primeras filas son informativas.
              {entityType === 'equipment' && ' Consulta la hoja "Tipos de equipo" para los valores válidos.'}
            </p>
            <Button onClick={templateFn} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />Descargar plantilla
            </Button>
          </div>
        </div>
      </Card>

      {/* Subir y importar */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 mb-1">Sube el Excel relleno</h2>
            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors mb-3">
              <FileSpreadsheet className="h-6 w-6 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500">{file ? file.name : 'Haz clic para seleccionar un archivo .xlsx'}</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Importando...' : `Importar ${title}`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Resultados */}
      {results && (
        <Card className="p-5">
          {results.error ? (
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al importar</p>
                <p className="text-sm">{results.error}</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-emerald-600 mb-3">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Importación completada</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-700">{results.created}</p>
                  <p className="text-xs text-slate-500">Creados</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
                  <p className="text-xs text-slate-500">Omitidos</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{results.errors?.length || 0}</p>
                  <p className="text-xs text-slate-500">Con error</p>
                </div>
              </div>
              {results.errors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Filas con error:</p>
                  {results.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">· Fila {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function ImportEquipment() {
  const [loadingEquip, setLoadingEquip]   = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [resultsEquip, setResultsEquip]   = useState(null);
  const [resultsClient, setResultsClient] = useState(null);
  const [exportingEquip, setExportingEquip]   = useState(false);
  const [exportingClient, setExportingClient] = useState(false);

  const { data: clients = [] }   = useQuery({ queryKey: ['clients-import'],   queryFn: () => base44.entities.Client.list() });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings-import'], queryFn: () => base44.entities.Building.list() });
  const { data: equipment = [] } = useQuery({ queryKey: ['equipment-import'], queryFn: () => base44.entities.Equipment.list() });

  const handleImportEquipment = async (file) => {
    setLoadingEquip(true);
    setResultsEquip(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('importEquipment', { file_url });
      setResultsEquip(res.data);
    } catch (err) {
      setResultsEquip({ error: err.message || 'Error al importar' });
    } finally {
      setLoadingEquip(false);
    }
  };

  const handleImportClients = async (file) => {
    setLoadingClient(true);
    setResultsClient(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawRows.length < 4) throw new Error('El archivo no contiene filas de datos (a partir de fila 4).');

      const headers = rawRows[0];
      const FIELD_MAP = Object.fromEntries(CLIENT_FIELDS.map(f => [f.label, f.key]));
      const REQUIRED  = CLIENT_FIELDS.filter(f => f.required).map(f => f.key);
      const dataRows  = rawRows.slice(3);

      let created = 0, skipped = 0;
      const errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row    = dataRows[i];
        const rowNum = i + 4;
        if (row.every(c => c === '' || c == null)) { skipped++; continue; }

        const record = {};
        headers.forEach((h, idx) => {
          const field = FIELD_MAP[h];
          if (field) {
            const val = String(row[idx] ?? '').trim();
            if (val) record[field] = val;
          }
        });

        const missing = REQUIRED.filter(f => !record[f]);
        if (missing.length > 0) { errors.push({ row: rowNum, reason: `Faltan: ${missing.join(', ')}` }); continue; }

        await base44.entities.Client.create(record);
        created++;
      }
      setResultsClient({ created, skipped, errors });
    } catch (err) {
      setResultsClient({ error: err.message || 'Error al importar' });
    } finally {
      setLoadingClient(false);
    }
  };

  const handleExportEquipment = async () => {
    setExportingEquip(true);
    try { await exportEquipmentsToExcel(equipment, clients, buildings); }
    finally { setExportingEquip(false); }
  };

  const handleExportClients = async () => {
    setExportingClient(true);
    try { await exportClientsToExcel(clients); }
    finally { setExportingClient(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/HomeTecnico">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Importar / Exportar</h1>
          <p className="text-sm text-slate-500">Importa o exporta datos masivamente en formato Excel</p>
        </div>
      </div>

      {/* Exportar rápido */}
      <Card className="p-5 mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-600" />
          Exportar datos actuales
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportEquipment} disabled={exportingEquip} variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            {exportingEquip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar {equipment.length} equipos
          </Button>
          <Button onClick={handleExportClients} disabled={exportingClient} variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-100">
            {exportingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Exportar {clients.length} clientes
          </Button>
        </div>
      </Card>

      {/* Tabs importación */}
      <Tabs defaultValue="equipos">
        <TabsList className="mb-4">
          <TabsTrigger value="equipos" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />Importar Equipos
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />Importar Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipos">
          <ImportPanel
            title="equipos"
            entityType="equipment"
            templateFn={downloadEquipmentTemplate}
            onImport={handleImportEquipment}
            loading={loadingEquip}
            results={resultsEquip}
          />
        </TabsContent>

        <TabsContent value="clientes">
          <ImportPanel
            title="clientes"
            entityType="clients"
            templateFn={downloadClientTemplate}
            onImport={handleImportClients}
            loading={loadingClient}
            results={resultsClient}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}