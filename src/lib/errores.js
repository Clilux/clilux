/**
 * Traduce errores del proxy/API a mensajes para el usuario.
 * Cuando el fallo es de permisos (403 / no_permission) devuelve un aviso
 * claro indicando que debe solicitar acceso al administrador.
 */
export function mensajeDeError(error, fallback = 'No se pudo completar la operación') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (data?.no_permission || status === 403) {
    return 'No tienes autorización para esta funcionalidad. Contacta con el administrador para solicitar acceso.';
  }
  return fallback;
}