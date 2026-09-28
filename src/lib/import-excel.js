import * as XLSX from 'xlsx';

/**
 * Importación de datos de empresa desde Excel.
 * Cada hoja del libro corresponde a una categoría (Clientes, Edificios,
 * Equipos, Incidencias, Revisiones) y cada fila a un registro.
 * Las columnas se reconocen por el nombre del campo del sistema (el mismo
 * que usa la exportación JSON): name, cif, address, reference_name, etc.
 * Las relaciones (cliente, edificio, equipo) se indican por su NOMBRE.
 */

const norm = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '');

export const SHEET_ENTITIES = [
  { key: 'clients', label: 'Clientes', synonyms: ['clients', 'client', 'clientes', 'cliente'] },
  { key: 'buildings', label: 'Edificios', synonyms: ['buildings', 'building', 'edificios', 'edificio'] },
  { key: 'equipment', label: 'Equipos', synonyms: ['equipment', 'equipments', 'equipos', 'equipo', 'maquinas', 'maquina'] },
  { key: 'incidents', label: 'Incidencias', synonyms: ['incidents', 'incident', 'incidencias', 'incidencia'] },
  { key: 'revisions', label: 'Revisiones', synonyms: ['revisions', 'revision', 'revisiones', 'mantenimientos', 'mantenimiento'] },
];

export const ENTITY_FIELDS = {
  clients: ['name', 'cif', 'address', 'city', 'postal_code', 'province', 'phone', 'email', 'contact_person', 'notes', 'assigned_technician', 'assigned_technician_name', 'status'],
  buildings: ['name', 'address', 'city', 'postal_code', 'province', 'contact_person', 'contact_phone', 'floors', 'surface_m2', 'notes', 'status', 'latitude', 'longitude'],
  equipment: ['reference_name', 'equipment_type', 'brand', 'model', 'serial_number', 'location', 'installation_date', 'registration_date', 'cooling_power_kw', 'heating_power_kw', 'refrigerant_type', 'refrigerant_charge_kg', 'warranty_end', 'first_revision_date', 'status', 'notes', 'nfc_tag_id'],
  incidents: ['title', 'description', 'priority', 'status', 'label', 'technician_notes', 'resolution_notes', 'resolution_date', 'reported_by_name'],
  revisions: ['scheduled_date', 'revision_type', 'status', 'notes', 'technician_name', 'completed_date'],
};

// Columnas de relación: el valor puede ser el nombre del registro padre
// (Excel) o su id (JSON exportado). El backend resuelve ambos.
const LINK_ALIASES = {
  cliente: 'client_id',
  client: 'client_id',
  clientname: 'client_id',
  nombrecliente: 'client_id',
  clientenombre: 'client_id',
  edificio: 'building_id',
  building: 'building_id',
  buildingname: 'building_id',
  nombreedificio: 'building_id',
  edificionombre: 'building_id',
  equipo: 'equipment_id',
  equipment: 'equipment_id',
  equipmentname: 'equipment_id',
  nombreequipo: 'equipment_id',
  equiponombre: 'equipment_id',
  unidadexterior: 'parent_equipment_id',
  equipopadre: 'parent_equipment_id',
  parentequipment: 'parent_equipment_id',
};

const LINK_FIELDS = {
  clients: [],
  buildings: ['cliente', 'client', 'clientname', 'nombrecliente', 'clientenombre'],
  equipment: ['cliente', 'client', 'clientname', 'nombrecliente', 'clientenombre', 'edificio', 'building', 'buildingname', 'nombreedificio', 'edificionombre', 'unidadexterior', 'equipopadre', 'parentequipment'],
  incidents: ['cliente', 'client', 'clientname', 'nombrecliente', 'clientenombre', 'edificio', 'building', 'buildingname', 'nombreedificio', 'edificionombre', 'equipo', 'equipment', 'equipmentname', 'nombreequipo', 'equiponombre'],
  revisions: ['cliente', 'client', 'clientname', 'nombrecliente', 'clientenombre', 'edificio', 'building', 'buildingname', 'nombreedificio', 'edificionombre', 'equipo', 'equipment', 'equipmentname', 'nombreequipo', 'equiponombre'],
};

// Campo obligatorio de cada categoría: sin él la fila no se importa.
const IDENTITY_FIELD = {
  clients: 'name',
  buildings: 'name',
  equipment: 'reference_name',
  incidents: 'title',
  revisions: 'scheduled_date',
};

const EXTRA_TEMPLATE_COLUMNS = {
  clients: [],
  buildings: ['Cliente'],
  equipment: ['Cliente', 'Edificio', 'Unidad exterior'],
  incidents: ['Cliente', 'Edificio', 'Equipo'],
  revisions: ['Cliente', 'Edificio', 'Equipo'],
};

const pad = (n) => String(n).padStart(2, '0');

function cellValue(v) {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? undefined : t;
  }
  return v;
}

export function parseExcelToDump(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const dump = {};
  const ignoredSheets = [];
  const skippedRows = {};

  for (const sheetName of wb.SheetNames) {
    const entity = SHEET_ENTITIES.find((e) => e.synonyms.includes(norm(sheetName)));
    if (!entity) {
      ignoredSheets.push(sheetName);
      continue;
    }
    const fields = ENTITY_FIELDS[entity.key];
    const links = LINK_FIELDS[entity.key];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null, raw: true });
    const records = [];
    let skipped = 0;

    for (const row of rows) {
      const rec = {};
      for (const [header, raw] of Object.entries(row)) {
        const value = cellValue(raw);
        if (value === undefined) continue;
        const h = norm(header);
        if (links.includes(h)) {
          rec[LINK_ALIASES[h]] = value;
          continue;
        }
        const field = fields.find((f) => norm(f) === h);
        if (field) rec[field] = value;
      }
      if (!rec[IDENTITY_FIELD[entity.key]]) {
        skipped++;
        continue;
      }
      records.push(rec);
    }

    if (records.length) dump[entity.key] = [...(dump[entity.key] || []), ...records];
    if (skipped) skippedRows[entity.label] = skipped;
  }

  return { dump, ignoredSheets, skippedRows };
}

export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();
  for (const entity of SHEET_ENTITIES) {
    const headers = [...ENTITY_FIELDS[entity.key], ...EXTRA_TEMPLATE_COLUMNS[entity.key]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers]), entity.label);
  }
  XLSX.writeFile(wb, 'plantilla_importacion_datos.xlsx');
}