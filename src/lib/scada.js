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

// Tamaños: clases literales (Tailwind no admite clases dinámicas).
export const TAMANOS = [
  { box: 'w-9 h-9', icon: 'h-4 w-4', text: 'text-[10px]' },
  { box: 'w-12 h-12', icon: 'h-6 w-6', text: 'text-xs' },
  { box: 'w-16 h-16', icon: 'h-8 w-8', text: 'text-sm' },
  { box: 'w-24 h-24', icon: 'h-12 w-12', text: 'text-base' },
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