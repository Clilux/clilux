import {
  Home, ClipboardList, HardHat, Building2, AlertTriangle, Calendar,
  Clock, Users, CalendarDays, BookOpen, Building, User, Wrench
} from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Estructura del menú lateral agrupado:
 *  Inicio · Servicios · Laboral · Clientes · Mi empresa · Perfil
 */
export function construirMenu({ isSessionTech, isPlatformAdmin, isGerente, isAdmin, techEmail }) {
  const campo = !!(isSessionTech || isPlatformAdmin || isGerente || isAdmin);
  const gestion = !!(isGerente || isPlatformAdmin || isAdmin);

  const servicios = [
    { label: 'Partes de trabajo', to: '/PartesTrabajo', icon: ClipboardList },
    campo && { label: 'Obras', to: '/ControlObras', icon: HardHat },
    campo && { label: 'Mantenimiento', to: '/PanelEdificios', icon: Building2 },
    { label: 'Incidencias', to: '/Incidents', icon: AlertTriangle },
    campo && { label: 'Agenda', to: '/Calendar', icon: Calendar },
  ].filter(Boolean);

  const laboral = [
    campo && { label: 'Fichajes', to: '/ControlHorario', icon: Clock },
    gestion && { label: 'Trabajadores', to: '/AdminPanel', icon: Users },
    { label: 'Vacaciones', to: gestion ? '/GestionAusencias' : '/MisVacaciones', icon: CalendarDays },
  ].filter(Boolean);

  const clientes = [
    { label: 'Clientes', to: '/Clients', icon: Users },
  ];

  const empresa = [
    gestion && { label: 'Datos de la empresa', to: '/Settings', icon: Building },
    campo && { label: 'Libro F-GAS', to: '/LibroRegistroFGas', icon: BookOpen },
  ].filter(Boolean);

  const grupos = [
    { id: 'servicios', label: 'Servicios', icon: Wrench, items: servicios },
    { id: 'laboral', label: 'Laboral', icon: Clock, items: laboral },
    { id: 'clientes', label: 'Clientes', icon: Users, items: clientes },
    { id: 'empresa', label: 'Mi empresa', icon: Building, items: empresa },
  ].filter((g) => g.items.length > 0);

  return {
    inicio: { label: 'Inicio', to: createPageUrl('HomeTecnico'), icon: Home },
    grupos,
    perfil: techEmail
      ? { label: 'Perfil', to: `/TechnicianProfile?email=${encodeURIComponent(techEmail)}`, icon: User }
      : null,
  };
}