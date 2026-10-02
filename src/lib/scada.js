/**
 * Bloques disponibles para construir un panel SCADA: iconos, colores y tamaños.
 * Los valores se guardan en el propio panel, así que los nombres de los iconos
 * deben existir siempre en el mapa ICONOS.
 */
import {
  Zap, Wind, Thermometer, Lightbulb, Blinds, Power, Droplets,
  Gauge, Cpu, Bell, Fan, Snowflake, Flame, Sun, AlertTriangle, Circle,
} from 'lucide-react';

export const ICONOS = {
  zap: Zap,
  wind: Wind,
  thermometer: Thermometer,
  lightbulb: Lightbulb,
  blinds: Blinds,
  power: Power,
  droplets: Droplets,
  gauge: Gauge,
  cpu: Cpu,
  bell: Bell,
  fan: Fan,
  snowflake: Snowflake,
  flame: Flame,
  sun: Sun,
  alert: AlertTriangle,
  punto: Circle,
};

export const ICONOS_LISTA = Object.keys(ICONOS);

export const COLORES = [
  '#1565C0', '#00897B', '#2E7D32', '#F57F17',
  '#C62828', '#6A1B9A', '#455A64', '#FFFFFF',
];

export const TIPOS_ELEMENTO = [
  { value: 'dispositivo', label: 'Dispositivo' },
  { value: 'estado', label: 'Estado / Sensor' },
  { value: 'etiqueta', label: 'Etiqueta de texto' },
  { value: 'enlace', label: 'Acceso directo' },
];

// Tamaños proporcionales al ancho del panel: se expresan en unidades de
// contenedor (cqw) con un mínimo y un máximo en píxeles, así el mismo panel se
// ve igual en un móvil, en una tablet y en un monitor grande.
// El lienzo (ScadaCanvas) declara container-type: inline-size.
export const TAMANOS = [
  { box: 'clamp(20px, 3.2cqw, 44px)', icon: 'clamp(11px, 1.8cqw, 24px)', text: 'clamp(8px, 1.1cqw, 14px)' },
  { box: 'clamp(26px, 4.6cqw, 66px)', icon: 'clamp(14px, 2.5cqw, 34px)', text: 'clamp(9px, 1.35cqw, 17px)' },
  { box: 'clamp(34px, 6.4cqw, 96px)', icon: 'clamp(18px, 3.5cqw, 50px)', text: 'clamp(10px, 1.6cqw, 20px)' },
  { box: 'clamp(44px, 9cqw, 140px)', icon: 'clamp(23px, 4.9cqw, 72px)', text: 'clamp(11px, 1.9cqw, 24px)' },
];

export function tamanoDe(n) {
  return TAMANOS[Math.min(Math.max(Number(n) || 0, 0), TAMANOS.length - 1)];
}

export function nuevoElemento(extra = {}) {
  return {
    id: `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    tipo: 'dispositivo',
    etiqueta: 'Nuevo elemento',
    icono: 'zap',
    color: '#1565C0',
    x: 50,
    y: 50,
    tamano: 1,
    pagina: '',
    ref_tipo: '',
    ref_id: '',
    ...extra,
  };
}