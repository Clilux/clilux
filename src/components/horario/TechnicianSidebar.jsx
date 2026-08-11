import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Shield, LogOut, Home, Clock, Calendar, FileText, Wrench, User, HardHat,
  ScanLine, Nfc, Users, Building2, AlertTriangle, LayoutDashboard, Monitor
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TechnicianSidebar({ isSessionTech, isAdmin, isLoading, onLogout, techEmail }) {
  const navigate = useNavigate();

  // Mostrar opciones de navegación para cualquier usuario autenticado
  // (sesión de técnico propia O admin de Base44)
  const showNav = isSessionTech || isAdmin;

  const NAV_LINKS = [
    { to: 'HomeTecnico',          label: 'Inicio',            icon: Home,            sessionOnly: false },
    { to: 'PanelEdificios',       label: 'Panel Edificios',   icon: LayoutDashboard, sessionOnly: true },
    { to: 'ScanEquipmentTech',   label: 'Escanear',           icon: ScanLine,        sessionOnly: true },
    { to: 'NfcReader',            label: 'Leer NFC',           icon: Nfc,             sessionOnly: true },
    { to: 'Equipment',            label: 'Equipos',            icon: Wrench,          sessionOnly: false },
    { to: 'Clients',              label: 'Clientes',           icon: Users,          sessionOnly: false },
    { to: 'Buildings',            label: 'Edificios',          icon: Building2,      sessionOnly: false },
    { to: 'Incidents',            label: 'Incidencias',        icon: AlertTriangle,  sessionOnly: false },
    { to: 'ControlHorario',       label: 'Control Horario',    icon: Clock,          sessionOnly: true },
    { to: 'Calendar',             label: 'Agenda',             icon: Calendar,       sessionOnly: true },
    { to: 'Documentacion',        label: 'Documentos',         icon: FileText,       sessionOnly: true },
    { to: 'ControlObras',         label: 'Obras',              icon: HardHat,        sessionOnly: true },
    { to: 'KioskoFichaje',        label: 'Kiosko Fichaje',     icon: Monitor,        sessionOnly: false },
  ];

  const visibleLinks = NAV_LINKS.filter(l => !l.sessionOnly || isSessionTech);

  return (
    <>
    {/* Barra inferior móvil */}
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-blue-700 border-t border-blue-800 flex items-center justify-around px-1 py-2 shadow-lg overflow-x-auto">
      <Link to={createPageUrl('HomeTecnico')}>
        <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
          <Home className="h-5 w-5" />
          <span className="text-[10px]">Inicio</span>
        </button>
      </Link>
      {showNav && isSessionTech && (
        <Link to="/ScanEquipmentTech">
          <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
            <ScanLine className="h-5 w-5" />
            <span className="text-[10px]">Escanear</span>
          </button>
        </Link>
      )}
      {showNav && (
        <>
          <Link to="/ControlHorario">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
              <Clock className="h-5 w-5" />
              <span className="text-[10px]">Horario</span>
            </button>
          </Link>
          <Link to="/Calendar">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px]">Agenda</span>
            </button>
          </Link>
          <Link to="/KioskoFichaje">
            <button className="flex flex-col items-center gap-1 text-cyan-200 hover:text-cyan-100 px-2 py-1 shrink-0">
              <Monitor className="h-5 w-5" />
              <span className="text-[10px]">Kiosko</span>
            </button>
          </Link>
          {techEmail && (
            <Link to={`/TechnicianProfile?email=${techEmail}`}>
              <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
                <User className="h-5 w-5" />
                <span className="text-[10px]">Perfil</span>
              </button>
            </Link>
          )}
        </>
      )}
      {isAdmin && (
        <Link to={createPageUrl('AdminPanel')}>
          <button className="flex flex-col items-center gap-1 text-amber-300 hover:text-amber-200 px-2 py-1 shrink-0">
            <Shield className="h-5 w-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        </Link>
      )}
      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-1 text-red-300 hover:text-red-200 px-2 py-1 shrink-0"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px]">Salir</span>
      </button>
    </div>

    {/* Sidebar desktop */}
    <div className="hidden md:flex w-52 bg-blue-600 flex-col shadow-lg">
      {/* Logo */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-sm">C</span>
          </div>
          Clilux
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to === 'HomeTecnico' ? createPageUrl(to) : `/${to}`}>
            <Button variant="ghost" size="sm" className={`w-full justify-start text-white hover:bg-blue-700 h-9 ${to === 'KioskoFichaje' ? 'text-cyan-200' : ''}`}>
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-sm truncate">{label}</span>
            </Button>
          </Link>
        ))}

        {techEmail && isSessionTech && (
          <Link to={`/TechnicianProfile?email=${techEmail}`}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
              <User className="h-4 w-4 mr-2" />
              <span className="text-sm">Mi Perfil</span>
            </Button>
          </Link>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-blue-700 space-y-2">
        {isAdmin && (
          <Link to={createPageUrl('AdminPanel')}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-amber-300 hover:bg-blue-700 h-9 text-xs">
              <Shield className="h-4 w-4 mr-2" />
              Administración
            </Button>
          </Link>
        )}

        {isAdmin && isSessionTech && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { window.location.href = createPageUrl('MenuInicio') + '?mode=technician'; }}
            className="w-full justify-start text-white hover:bg-blue-700 h-9 text-xs"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Cambiar a Técnico
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          disabled={isLoading}
          className="w-full justify-start text-white hover:bg-red-600/20 h-9 text-xs"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
    </>
  );
}