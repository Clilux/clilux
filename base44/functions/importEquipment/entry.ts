import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mapeo: cabecera del Excel → campo de la entidad Equipment
const FIELD_MAP = {
  'Nombre de referencia':          'reference_name',
  'ID Cliente':                    'client_id',
  'ID Edificio':                   'building_id',
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

const NUMERIC_FIELDS = ['cooling_power_kw', 'heating_power_kw', 'refrigerant_charge_kg', 'balsa_litros'];
const REQUIRED_FIELDS = ['equipment_type', 'brand', 'model'];
const VALID_STATUSES = ['operational', 'maintenance_needed', 'out_of_service'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url requerido' }, { status: 400 });

    // Extraer datos del Excel usando la integración Core
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: Object.fromEntries(
                Object.values(FIELD_MAP).map(f => [f, { type: 'string' }])
              )
            }
          }
        }
      }
    });

    if (extracted.status !== 'success') {
      return Response.json({ error: `Error extrayendo datos: ${extracted.details}` }, { status: 400 });
    }

    // La integración devuelve el objeto extraído. Lo parseamos manualmente del excel
    // porque la plantilla tiene filas de cabecera/instrucciones.
    // Usamos fetch para leer el excel crudo con SheetJS en Deno.
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

    const headers = rawRows[0];
    const dataRows = rawRows.slice(3); // saltar cabecera, obligatorio, ejemplo

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 4; // número de fila real en el excel

      // Saltar filas completamente vacías
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) {
        skipped++;
        continue;
      }

      // Mapear cabeceras → campos
      const record = {};
      headers.forEach((header, idx) => {
        const fieldName = FIELD_MAP[header];
        if (fieldName) {
          const val = String(row[idx] ?? '').trim();
          if (val && val !== '(déjalo vacío, se asigna al importar)') {
            record[fieldName] = val;
          }
        }
      });

      // Validar campos obligatorios
      const missing = REQUIRED_FIELDS.filter(f => !record[f]);
      if (missing.length > 0) {
        errors.push({ row: rowNum, reason: `Faltan campos obligatorios: ${missing.join(', ')}` });
        continue;
      }

      // Convertir numéricos
      NUMERIC_FIELDS.forEach(f => {
        if (record[f] !== undefined) {
          const n = parseFloat(record[f]);
          record[f] = isNaN(n) ? undefined : n;
          if (record[f] === undefined) delete record[f];
        }
      });

      // Validar y normalizar status
      if (record.status) {
        const statusLower = record.status.toLowerCase().replace(/ /g, '_');
        record.status = VALID_STATUSES.includes(statusLower) ? statusLower : 'operational';
      } else {
        record.status = 'operational';
      }

      // Añadir registration_date si no existe
      if (!record.registration_date) {
        record.registration_date = new Date().toISOString().split('T')[0];
      }

      // Crear el equipo
      await base44.asServiceRole.entities.Equipment.create(record);
      created++;
    }

    return Response.json({ created, skipped, errors });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});