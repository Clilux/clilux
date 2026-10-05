import { addMonths, addYears } from 'date-fns';

// Etiquetas de los tipos de revisión
export const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual',
  unified: 'Unificada',
};

// Convierte true/false a Sí/No
export function formatFieldValue(value) {
  if (value === true || value === 'true') return 'Sí';
  if (value === false || value === 'false') return 'No';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// Calcula la fecha de la siguiente revisión según su tipo
export function nextRevisionDate(currentDate, revisionType) {
  const d = new Date(currentDate);
  switch (revisionType) {
    case 'monthly': return addMonths(d, 1).toISOString().split('T')[0];
    case 'quarterly': return addMonths(d, 3).toISOString().split('T')[0];
    case 'biannual': return addMonths(d, 6).toISOString().split('T')[0];
    case 'annual': return addYears(d, 1).toISOString().split('T')[0];
    default: return null;
  }
}

// Campos de mantenimiento configurados en un equipo para un tipo de revisión
export function maintenanceFields(equipment, revisionType) {
  return equipment?.maintenance_config?.[`${revisionType}_fields`] || [];
}

// Columnas de la tabla: unión de los campos de todos los equipos de la visita
export function buildColumns(rows) {
  const columns = [];
  const seen = new Set();
  rows.forEach(({ equipment, revision }) => {
    maintenanceFields(equipment, revision.revision_type).forEach((field) => {
      if (!field?.field_key || seen.has(field.field_key)) return;
      seen.add(field.field_key);
      columns.push({
        key: field.field_key,
        label: field.field_label || field.field_key,
        type: field.field_type || 'text',
        options: field.options || [],
      });
    });
  });
  return columns;
}

// Claves de campo configuradas para una fila concreta
export function rowFieldKeys(equipment, revisionType) {
  return new Set(maintenanceFields(equipment, revisionType).map((f) => f.field_key));
}