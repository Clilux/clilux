import {
  ScanLine, Nfc, FileCheck, FileText, Bot, Clock, Calendar,
  FileSpreadsheet, HardHat, LayoutDashboard, Wrench, Users, Building2,
  AlertTriangle, Monitor, ClipboardList, Wind, Zap,
} from 'lucide-react';

// Funciones del portal del trabajador.
// categoria: 'campo' = trabajo de campo | 'administracion' = gestión/administración
export const FUNCIONES = [
  { id: '1',  label: 'Escanear',            page: 'ScanEquipmentTech',     icon: ScanLine,        color: 'from-blue-500/30 to-purple-500/30',   iconCls: 'text-blue-300',    categoria: 'campo' },
  { id: '2',  label: 'Leer NFC',            page: 'NfcReader',             icon: Nfc,             color: 'from-teal-500/30 to-cyan-500/30',     iconCls: 'text-teal-300',    categoria: 'campo' },
  { id: '3',  label: 'Formulario Equipos',  page: 'EquipmentForm',         icon: FileCheck,       color: 'from-cyan-500/30 to-teal-500/30',     iconCls: 'text-cyan-300',    categoria: 'campo' },
  { id: '8',  label: 'Documentación',       page: 'Documentacion',         icon: FileText,        color: 'from-indigo-500/30 to-blue-500/30',   iconCls: 'text-indigo-300',  categoria: 'campo' },
  { id: '10', label: 'Asistencia Virtual',  page: 'AIConsulta',            icon: Bot,             color: 'from-purple-500/30 to-pink-500/30',   iconCls: 'text-purple-300',  categoria: 'campo' },
  { id: '12', label: 'Contrato',            page: 'ContratoMantenimiento', icon: FileText,        color: 'from-green-500/30 to-teal-500/30',    iconCls: 'text-green-300',   categoria: 'campo' },
  { id: '13', label: 'Control Horario',     page: 'ControlHorario',        icon: Clock,           color: 'from-blue-500/30 to-cyan-500/30',     iconCls: 'text-blue-300',    categoria: 'campo' },
  { id: '14', label: 'Mis Ausencias',       page: 'GestionAusencias',      icon: Calendar,        color: 'from-purple-500/30 to-violet-500/30', iconCls: 'text-purple-300',  categoria: 'campo' },
  { id: '16', label: 'Control de Obras',    page: 'ControlObras',          icon: HardHat,         color: 'from-orange-500/30 to-amber-500/30',  iconCls: 'text-orange-300',  categoria: 'campo' },
  { id: '17', label: 'Panel Edificios',     page: 'PanelEdificios',        icon: LayoutDashboard, color: 'from-blue-500/30 to-indigo-500/30',   iconCls: 'text-blue-300',    categoria: 'campo' },
  { id: '18', label: 'Equipos',             page: 'Equipment',             icon: Wrench,          color: 'from-slate-500/30 to-gray-500/30',    iconCls: 'text-slate-300',   categoria: 'campo' },
  { id: '19', label: 'Clientes',            page: 'Clients',               icon: Users,           color: 'from-emerald-500/30 to-teal-500/30',  iconCls: 'text-emerald-300', categoria: 'campo' },
  { id: '20', label: 'Edificios',           page: 'Buildings',             icon: Building2,       color: 'from-cyan-500/30 to-blue-500/30',     iconCls: 'text-cyan-300',    categoria: 'campo' },
  { id: '21', label: 'Incidencias',         page: 'Incidents',             icon: AlertTriangle,   color: 'from-red-500/30 to-rose-500/30',      iconCls: 'text-red-300',     categoria: 'campo' },
  { id: '23', label: 'Gestión de Trabajo',  page: 'GestionTrabajo',        icon: ClipboardList,   color: 'from-indigo-500/30 to-blue-500/30',   iconCls: 'text-indigo-300',  categoria: 'campo' },
  { id: '15', label: 'Importar / Exportar', page: 'ImportEquipment',       icon: FileSpreadsheet, color: 'from-emerald-500/30 to-teal-500/30',  iconCls: 'text-emerald-300', categoria: 'administracion', gerenteOnly: true },
  { id: '22', label: 'Kiosko Fichaje',      page: 'KioskoFichaje',         icon: Monitor,         color: 'from-cyan-500/30 to-teal-500/30',     iconCls: 'text-cyan-300',    categoria: 'administracion' },
];

export const AUTOMATIZACION = [
  { id: 'clim', label: 'Climatización Airzone', page: 'ControlClimatizacion', icon: Wind, color: 'from-cyan-500/30 to-blue-500/30',  iconCls: 'text-cyan-300', desc: 'Control Airzone Cloud' },
  { id: 'lox',  label: 'Control Loxone',        page: 'ControlLoxone',        icon: Zap,  color: 'from-green-500/30 to-emerald-500/30', iconCls: 'text-green-300', desc: 'Miniservers Loxone' },
];