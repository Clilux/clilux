import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Home, Clock, Calendar, HardHat, User, Wrench, Building2, ChevronDown } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CompanyMenuDialog from '@/components/company/CompanyMenuDialog';
import BuzonBell from '@/components/buzon/BuzonBell';

export default function TechnicianSidebar({ isSessionTech, isAdmin, isPlatformAdmin, isLoading, onLogout, techEmail, company, isGerente, sessionTechEmail }) {
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const showNav = isSessionTech || isAdmin;

  const NAV_LINKS = [
    { to: 'HomeTecnico',    label: 'Inicio',          icon: Home,     sessionOnly: false },
    { to: 'ControlHorario', label: 'Control Horario', icon: Clock,    sessionOnly: true },
    { to: 'Calendar',       label: 'Agenda',           icon: Calendar, sessionOnly: true },
    { to: 'ControlObras',   label: 'Obras',            icon: HardHat,  sessionOnly: true },
  ];

  const visibleLinks = NAV_LINKS.filter(l => !l.sessionOnly || isSessionTech || isPlatformAdmin);

  return (
    <>
    {/* Barra inferior móvil */}
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-blue-700 border-t border-blue-800 flex items-center justify-around px-1 py-2 shadow-lg overflow-x-auto no-scrollbar" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
      {isPlatformAdmin && (
        <Link to={createPageUrl('AdminPanel')}>
          <button className="flex flex-col items-center gap-1 text-amber-300 hover:text-amber-200 px-2 py-1 shrink-0">
            <Shield className="h-6 w-6" />
            <span className="text-[10px]">Admin</span>
          </button>
        </Link>
      )}
      {techEmail && (
        <BuzonBell email={techEmail}
          className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-2 py-1 shrink-0"
          iconClassName="h-6 w-6" label="Buzón" />
      )}
      <button onClick={onLogout} className="flex flex-col items-center gap-1 text-red-300 hover:text-red-200 px-2 py-1 shrink-0">
        <LogOut className="h-6 w-6" />
        <span className="text-[10px]">Salir</span>
      </button>
    </div>

    {/* Sidebar desktop */}
    <div className="hidden lg:flex w-56 bg-blue-600 flex-col shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Empresa arriba a la izquierda */}
      <div className="p-3 border-b border-blue-700">
        {isPlatformAdmin ? (
          <div className="w-full flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-base leading-tight truncate">Administrador de la App</p>
              <p className="text-blue-200 text-[11px]">Plataforma Clilux</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => company && setCompanyMenuOpen(true)}
            className={`w-full flex items-center gap-2.5 text-left ${company ? 'hover:bg-blue-700 rounded-lg p-1.5 -m-1 transition-colors' : 'cursor-default'}`}
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-base leading-tight truncate">
                {company?.name || 'Clilux'}
              </p>
              {company && (
                <p className="text-blue-200 text-[11px] flex items-center gap-0.5">
                  {isGerente ? 'Gerente' : 'Trabajador'}
                  <ChevronDown className="h-3 w-3" />
                </p>
              )}
            </div>
          </button>
        )}
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

        {techEmail && (isSessionTech || isPlatformAdmin) && (
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
        {isPlatformAdmin && (
          <Link to={createPageUrl('AdminPanel')}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-amber-300 hover:bg-blue-700 h-10 text-sm">
              <Shield className="h-4 w-4 mr-2" />
              Administración
            </Button>
          </Link>
        )}

        {isPlatformAdmin && (
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

        {techEmail && (
          <BuzonBell email={techEmail}
            className="w-full flex items-center justify-center gap-2 h-10 text-white hover:bg-blue-700 rounded-md text-sm font-medium"
            iconClassName="h-4 w-4" label="Buzón" />
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

    {/* Menú de empresa (datos / edición gerente) */}
    <CompanyMenuDialog
      company={company}
      isGerente={isGerente}
      sessionTechEmail={sessionTechEmail}
      open={companyMenuOpen}
      onOpenChange={setCompanyMenuOpen}
    />
    </>
  );
}