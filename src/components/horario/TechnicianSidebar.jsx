import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Home, Clock, Calendar, HardHat, User, Wrench } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TechnicianSidebar({ isSessionTech, isAdmin, isLoading, onLogout, techEmail }) {
  const showNav = isSessionTech || isAdmin;

  const NAV_LINKS = [
    { to: 'HomeTecnico',    label: 'Inicio',          icon: Home,     sessionOnly: false },
    { to: 'ControlHorario', label: 'Control Horario', icon: Clock,    sessionOnly: true },
    { to: 'Calendar',       label: 'Agenda',           icon: Calendar, sessionOnly: true },
    { to: 'ControlObras',   label: 'Obras',            icon: HardHat,  sessionOnly: true },
  ];

  const visibleLinks = NAV_LINKS.filter(l => !l.sessionOnly || isSessionTech);

  return (
    <>
    {/* Barra inferior móvil */}
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-blue-700 border-t border-blue-800 flex items-center justify-around px-1 py-2 shadow-lg">
      <Link to={createPageUrl('HomeTecnico')}>
        <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
          <Home className="h-6 w-6" />
          <span className="text-[10px]">Inicio</span>
        </button>
      </Link>
      {showNav && isSessionTech && (
        <>
          <Link to="/ControlHorario">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
              <Clock className="h-6 w-6" />
              <span className="text-[10px]">Horario</span>
            </button>
          </Link>
          <Link to="/Calendar">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
              <Calendar className="h-6 w-6" />
              <span className="text-[10px]">Agenda</span>
            </button>
          </Link>
          <Link to="/ControlObras">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
              <HardHat className="h-6 w-6" />
              <span className="text-[10px]">Obras</span>
            </button>
          </Link>
          {techEmail && (
            <Link to={`/TechnicianProfile?email=${techEmail}`}>
              <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0">
                <User className="h-6 w-6" />
                <span className="text-[10px]">Perfil</span>
              </button>
            </Link>
          )}
        </>
      )}
      {isAdmin && (
        <Link to={createPageUrl('AdminPanel')}>
          <button className="flex flex-col items-center gap-1 text-amber-300 hover:text-amber-200 px-2 py-1 shrink-0">
            <Shield className="h-6 w-6" />
            <span className="text-[10px]">Admin</span>
          </button>
        </Link>
      )}
      <button onClick={onLogout} className="flex flex-col items-center gap-1 text-red-300 hover:text-red-200 px-2 py-1 shrink-0">
        <LogOut className="h-6 w-6" />
        <span className="text-[10px]">Salir</span>
      </button>
    </div>

    {/* Sidebar desktop */}
    <div className="hidden md:flex w-56 bg-blue-600 flex-col shadow-lg">
      {/* Logo */}
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-2 text-white font-bold text-xl">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-base">C</span>
          </div>
          Clilux
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1.5">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to === 'HomeTecnico' ? createPageUrl(to) : `/${to}`}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-12 text-base font-medium">
              <Icon className="h-5 w-5 mr-3 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          </Link>
        ))}

        {techEmail && isSessionTech && (
          <Link to={`/TechnicianProfile?email=${techEmail}`}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-12 text-base font-medium">
              <User className="h-5 w-5 mr-3" />
              <span>Mi Perfil</span>
            </Button>
          </Link>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-blue-700 space-y-2">
        {isAdmin && (
          <Link to={createPageUrl('AdminPanel')}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-amber-300 hover:bg-blue-700 h-10 text-sm">
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
            className="w-full justify-start text-white hover:bg-blue-700 h-10 text-sm"
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
          className="w-full justify-start text-white hover:bg-red-600/20 h-10 text-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
    </>
  );
}