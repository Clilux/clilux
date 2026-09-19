/**
 * Reglas de compartición de registros (obras, mantenimientos e incidencias).
 *
 * Por defecto todo registro está compartido con TODOS los usuarios.
 * Si el registro tiene `shared_with` con IDs de trabajadores, solo esos
 * trabajadores (y los gerentes/administración) lo ven.
 */

export function estaCompartido(record, { techId = null, isAdmin = false } = {}) {
  if (!record) return false;
  const shared = Array.isArray(record.shared_with) ? record.shared_with.filter(Boolean) : [];
  if (shared.length === 0) return true; // compartido con todos (por defecto)
  if (isAdmin) return true; // gerentes/administración ven todo
  if (!techId) return true; // sin ficha de técnico no se filtra
  return shared.includes(techId);
}

export function filtrarCompartidos(records = [], opts = {}) {
  return (records || []).filter((r) => estaCompartido(r, opts));
}

/** Etiqueta corta del estado de compartición de un registro. */
export function etiquetaComparticion(record) {
  const shared = Array.isArray(record?.shared_with) ? record.shared_with.filter(Boolean) : [];
  return shared.length === 0 ? 'Todos' : `${shared.length}`;
}