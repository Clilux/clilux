import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Home, Clock, Calendar, FileText, MoreVertical, Wrench } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TechnicianSidebar({ isSessionTech, isAdmin, isLoading, onLogout }) {
  const navigate = useNavigate();

  return (
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
                <span className="text-sm">Check-in</span>
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
  );
}