import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIELD_MAP = {
  'Nombre de referencia':          'reference_name',
  'Tipo de equipo':                'equipment_type',
  'Marca':                         'brand',
  'Modelo':                        'model',
  'Número de serie':               'serial_number',
  'Ubicación':                     'location',
  'Fecha instalación (AAAA-MM-DD)':'installation_date',
  'Potencia frigorífica (kW)':     'cooling_power_kw',
  'Potencia calorífica (kW)':      'heating_power_kw',
  'Tipo de refrigerante':          'refrigerant_type',
  'Carga refrigerante (kg)':       'refrigerant_charge_kg',
  'Volumen balsa (litros)':        'balsa_litros',
  'Estado':                        'status',
  'Observaciones':                 'notes',
  'Fin garantía (AAAA-MM-DD)':     'warranty_end',
};

const NUMERIC_FIELDS  = ['cooling_power_kw', 'heating_power_kw', 'refrigerant_charge_kg', 'balsa_litros'];
const REQUIRED_FIELDS = ['equipment_type', 'brand', 'model'];
const VALID_STATUSES  = ['operational', 'maintenance_needed', 'out_of_service'];

// Tipos válidos para normalización
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url requerido' }, { status: 400 });

    // Leer el excel con SheetJS
    const xlsxMod = await import('npm:xlsx@0.18.5');
    const XLSX = xlsxMod.default ?? xlsxMod;

    const fileRes = await fetch(file_url);
    const arrayBuffer = await fileRes.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Fila 0 = cabeceras, fila 1 = obligatorio/opcional, fila 2 = ejemplos, fila 3+ = datos
    if (rawRows.length < 4) {
      return Response.json({ error: 'El archivo no contiene filas de datos (a partir de fila 4).' }, { status: 400 });
    }

    const headers  = rawRows[0];
    const dataRows = rawRows.slice(3);

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row    = dataRows[i];
      const rowNum = i + 4;

      // Saltar filas vacías
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) {
        skipped++;
        continue;
      }

      // Mapear campos
      const record = {};
      headers.forEach((header, idx) => {
        const fieldName = FIELD_MAP[header];
        if (fieldName) {
          const val = String(row[idx] ?? '').trim();
          if (val) record[fieldName] = val;
        }
      });

      // Validar obligatorios
      const missing = REQUIRED_FIELDS.filter(f => !record[f]);
      if (missing.length > 0) {
        errors.push({ row: rowNum, reason: `Faltan campos obligatorios: ${missing.join(', ')}` });
        continue;
      }

      // Convertir numéricos
      NUMERIC_FIELDS.forEach(f => {
        if (record[f] !== undefined) {
          const n = parseFloat(record[f]);
          if (isNaN(n)) delete record[f];
          else record[f] = n;
        }
      });

      // Normalizar status
      if (record.status) {
        const s = record.status.toLowerCase().replace(/ /g, '_');
        record.status = VALID_STATUSES.includes(s) ? s : 'operational';
      } else {
        record.status = 'operational';
      }

      // Normalizar tipo de equipo: buscar coincidencia case-insensitive
      if (record.equipment_type) {
        const inputType = record.equipment_type.toLowerCase().trim();
        const matched = EQUIPMENT_TYPES.find(t => t.toLowerCase() === inputType);
        if (!matched) {
          // Aceptar igualmente, pero lo dejamos como está
          // El campo es libre, solo validamos que no esté vacío
        }
      }

      // registration_date obligatorio en entidad
      if (!record.registration_date) {
        record.registration_date = new Date().toISOString().split('T')[0];
      }

      // client_id y building_id son requeridos en la entidad,
      // usamos un placeholder vacío que el usuario deberá actualizar desde la app
      // Los creamos sin ellos usando asServiceRole que puede omitir validaciones opcionales
      // Pero como son required en el schema, ponemos cadena vacía y actualizamos luego.
      // SOLUCIÓN: los marcamos como pending sin client/building
      if (!record.client_id)   record.client_id   = 'pendiente';
      if (!record.building_id) record.building_id = 'pendiente';

      await base44.asServiceRole.entities.Equipment.create(record);
      created++;
    }

    return Response.json({ created, skipped, errors });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});