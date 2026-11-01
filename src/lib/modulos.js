/**
 * Sistema de módulos contratados por empresa.
 *
 * La app base (mantenimiento) siempre está activa. Los módulos extra
 * (automatización, erp) y los bloques de normativa (RITE, legionela,
 * F-Gas, equipos a presión) se activan en el perfil de cada empresa.
 *
 * Por defecto, si la empresa no tiene el campo `modulos` (o un bloque),
 * se asume TODO activo: así Clilux y las empresas ya dadas de alta
 * siguen viendo exactamente lo que ven hoy. Las nuevas empresas que se
 * vendan/cedan arrancarán con solo lo que contraten.
 */

export const MODULOS_DEFAULT = {
  base: true,
  automatizacion: true,
  erp: true,
  normativa: {
    rite: true,
    legionela: true,
    fgas: true,
    equipos_presion: true,
  },
};

// Estado "todo apagado salvo base" — para nuevas empresas que aún no han
// elegido módulos en el onboarding.
export const MODULOS_SOLO_BASE = {
  base: true,
  automatizacion: false,
  erp: false,
  normativa: { rite: false, legionela: false, fgas: false, equipos_presion: false },
};

export const MODULOS_INFO = [
  {
    key: 'base',
    label: 'Mantenimiento',
    descripcion: 'Clientes, edificios, equipos, incidencias, revisiones y partes.',
    siempreActivo: true,
  },
  {
    key: 'automatizacion',
    label: 'Automatización',
    descripcion: 'Integraciones Loxone, Airzone y paneles SCADA.',
  },
  {
    key: 'erp',
    label: 'ERP',
    descripcion: 'Presupuestos, albaranes, pedidos, compras, artículos y proveedores.',
  },
  {
    key: 'normativa.rite',
    label: 'RITE',
    descripcion: 'Cumplimiento del Reglamento de Instalaciones Térmicas (RD 1027/2007).',
    normativa: true,
  },
  {
    key: 'normativa.legionela',
    label: 'Legionela',
    descripcion: 'Limpieza y desinfección (RD 865/2003 y RD 487/2022).',
    normativa: true,
  },
  {
    key: 'normativa.fgas',
    label: 'F-Gas',
    descripcion: 'Libro de registro de gases fluorados (Reg. UE 2024/573).',
    normativa: true,
  },
  {
    key: 'normativa.equipos_presion',
    label: 'Equipos a Presión (REP)',
    descripcion: 'Inspecciones REP (RD 809/2021).',
    normativa: true,
  },
];

function get(clientModulos, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), clientModulos);
}

/**
 * Resuelve el estado de todos los módulos de una empresa.
 * Si no hay empresa (admin de plataforma o sin empresa), todo activo.
 */
export function getModulos(company) {
  if (!company || !company.modulos) return MODULOS_DEFAULT;
  const m = company.modulos;
  return {
    base: m.base !== false,
    automatizacion: m.automatizacion ?? true,
    erp: m.erp ?? true,
    normativa: {
      rite: m.normativa?.rite ?? true,
      legionela: m.normativa?.legionela ?? true,
      fgas: m.normativa?.fgas ?? true,
      equipos_presion: m.normativa?.equipos_presion ?? true,
    },
  };
}

/** ¿Está activo un módulo de primer nivel (base, automatizacion, erp)? */
export function isModuloActivo(company, key) {
  return !!getModulos(company)[key];
}

/** ¿Está activo un bloque normativo (rite, legionela, fgas, equipos_presion)? */
export function isNormativaActiva(company, key) {
  return !!getModulos(company).normativa[key];
}

/** ¿Está activo un módulo por ruta punteada (ej. 'normativa.rite', 'erp')? */
export function isActivo(company, dottedKey) {
  const m = getModulos(company);
  if (dottedKey.startsWith('normativa.')) {
    return !!m.normativa[dottedKey.split('.')[1]];
  }
  return !!m[dottedKey];
}

/**
 * Lista de módulos activos en formato plano — útil para menús y guards.
 */
export function modulosActivos(company) {
  const m = getModulos(company);
  return {
    base: m.base,
    automatizacion: m.automatizacion,
    erp: m.erp,
    rite: m.normativa.rite,
    legionela: m.normativa.legionela,
    fgas: m.normativa.fgas,
    equipos_presion: m.normativa.equipos_presion,
  };
}