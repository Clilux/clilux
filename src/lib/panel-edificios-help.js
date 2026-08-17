// Textos de ayuda contextual del Panel de Edificios.
// Se muestran al mantener pulsado un elemento (LongPressHelp).
export const PANEL_EDIFICIOS_HELP = {
  status: {
    ok: {
      title: 'Operativo',
      body: 'Sin incidencias abiertas ni revisiones pendientes. Si el edificio no tiene plan de mantenimiento configurado, se indicará debajo.',
    },
    maintenance: {
      title: 'Requiere mantenimiento',
      body: 'Hay equipos que necesitan revisión o revisiones pendientes/vencidas, pero no hay incidencias abiertas.',
    },
    warning: {
      title: 'Atención',
      body: 'Existe al menos una incidencia abierta no urgente que requiere seguimiento.',
    },
    critical: {
      title: 'Crítico',
      body: 'Hay incidencias urgentes abiertas que requieren intervención inmediata.',
    },
  },
  metricAlertas: {
    title: 'Alertas',
    body: 'Incidencias abiertas (pendientes o en curso) en este edificio.',
  },
  metricEquipos: {
    title: 'A revisar',
    body: 'Equipos del edificio que requieren revisión: fuera de servicio, con incidencia abierta o revisión vencida.',
  },
  metricRevisiones: {
    title: 'Revisiones',
    body: 'Revisiones programadas o vencidas en los próximos 30 días.',
  },
  sinPlan: {
    title: 'Sin plan de mantenimiento',
    body: 'Ningún equipo de este edificio tiene configurado un plan de mantenimiento recurrente. Configúralo desde el detalle del equipo para activar el seguimiento de revisiones automáticas.',
  },
  kpiEdificios: {
    title: 'Edificios',
    body: 'Número total de edificios instalados en el sistema.',
  },
  kpiAlertas: {
    title: 'Alertas activas',
    body: 'Incidencias abiertas (pendientes o en curso) en todos los edificios.',
  },
  kpiEquipos: {
    title: 'Equipos a revisar',
    body: 'Equipos que requieren revisión: fuera de servicio, con incidencia abierta o revisión vencida.',
  },
  kpiRevisiones: {
    title: 'Revisiones 30 días',
    body: 'Revisiones programadas en los próximos 30 días, incluidas las vencidas.',
  },
  filtros: {
    all: { title: 'Todos', body: 'Muestra todos los edificios sin filtrar.' },
    critical: { title: 'Críticos', body: 'Solo edificios con incidencias urgentes abiertas.' },
    warning: { title: 'Atención', body: 'Solo edificios con incidencias abiertas no urgentes.' },
    maintenance: { title: 'Mantenimiento', body: 'Solo edificios con equipos a revisar o revisiones pendientes, sin incidencias abiertas.' },
    ok: { title: 'Operativos', body: 'Solo edificios sin incidencias ni revisiones pendientes.' },
  },
};