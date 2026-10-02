// Modo de la aplicación: 'servicios' (módulo técnico), 'erp' (gestión comercial)
// o 'automatizacion' (bloque aislado de Loxone, Airzone y SCADA).

const KEY = 'clilux_modo';

export const MODOS = {
  servicios: { id: 'servicios', label: 'Servicios', ruta: '/HomeTecnico' },
  erp: { id: 'erp', label: 'ERP', ruta: '/Erp' },
  automatizacion: { id: 'automatizacion', label: 'Automatización', ruta: '/Automatizacion' },
};

export function getModo() {
  const m = localStorage.getItem(KEY);
  return MODOS[m] ? m : 'servicios';
}

export function setModo(modo) {
  localStorage.setItem(KEY, MODOS[modo] ? modo : 'servicios');
}