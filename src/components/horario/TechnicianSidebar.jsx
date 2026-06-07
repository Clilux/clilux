import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Home, Clock, Calendar, FileText, MoreVertical, Wrench, User, HardHat } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TechnicianSidebar({ isSessionTech, isAdmin, isLoading, onLogout, techEmail }) {
  const navigate = useNavigate();

  return (
    <>
    {/* Barra inferior móvil */}
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-blue-700 border-t border-blue-800 flex items-center justify-around px-2 py-2 shadow-lg">
      <Link to={createPageUrl('HomeTecnico')}>
        <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-3 py-1">
          <Home className="h-5 w-5" />
          <span className="text-[10px]">Inicio</span>
        </button>
      </Link>
      {isSessionTech && (
        <>
          <Link to="/ControlHorario">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-3 py-1">
              <Clock className="h-5 w-5" />
              <span className="text-[10px]">Horario</span>
            </button>
          </Link>
          <Link to="/Calendar">
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-3 py-1">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px]">Agenda</span>
            </button>
          </Link>
          {techEmail && (
            <Link to={`/TechnicianProfile?email=${techEmail}`}>
              <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white px-3 py-1">
                <User className="h-5 w-5" />
                <span className="text-[10px]">Mi Perfil</span>
              </button>
            </Link>
          )}
        </>
      )}
      {isAdmin && (
        <Link to={createPageUrl('AdminPanel')}>
          <button className="flex flex-col items-center gap-1 text-amber-300 hover:text-amber-200 px-3 py-1">
            <Shield className="h-5 w-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        </Link>
      )}
      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-1 text-red-300 hover:text-red-200 px-3 py-1"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px]">Salir</span>
      </button>
    </div>

    {/* Sidebar desktop */}
    <div className="hidden md:flex w-48 bg-blue-600 flex-col shadow-lg">
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
      <nav className="flex-1 p-4 space-y-1">
        <Link to={createPageUrl('HomeTecnico')}>
          <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
            <Home className="h-4 w-4 mr-2" />
            <span className="text-sm">Home</span>
          </Button>
        </Link>

        {isSessionTech && (
          <>
            <Link to="/ControlHorario">
              <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm">Control Horario</span>
              </Button>
            </Link>
            <Link to="/Calendar">
              <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm">Agenda</span>
              </Button>
            </Link>
            <Link to="/Documentacion">
              <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
                <FileText className="h-4 w-4 mr-2" />
                <span className="text-sm">Documentos</span>
              </Button>
            </Link>
            <Link to="/ControlObras">
              <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
                <HardHat className="h-4 w-4 mr-2" />
                <span className="text-sm">Obras</span>
              </Button>
            </Link>
            {techEmail && (
              <Link to={`/TechnicianProfile?email=${techEmail}`}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-white hover:bg-blue-700 h-9">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">Mi Perfil</span>
                </Button>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-blue-700 space-y-2">
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

      {/* Footer - More */}
      <div className="p-4 border-t border-blue-700">
        <Button variant="ghost" size="sm" className="w-full justify-center text-blue-100 hover:bg-blue-700 h-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
    </>
  );
}