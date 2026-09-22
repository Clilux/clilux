// Modo de la aplicación: 'servicios' (módulo técnico actual) o 'erp' (gestión comercial)

const KEY = 'clilux_modo';

export const MODOS = {
  servicios: { id: 'servicios', label: 'Servicios', ruta: '/HomeTecnico' },
  erp: { id: 'erp', label: 'ERP', ruta: '/Erp' },
};

export function getModo() {
  const m = localStorage.getItem(KEY);
  return m === 'erp' ? 'erp' : 'servicios';
}

export function setModo(modo) {
  localStorage.setItem(KEY, modo === 'erp' ? 'erp' : 'servicios');
}