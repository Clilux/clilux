import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Thermometer, Wrench, Building2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MenuInicio() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
      {/* Decorative spheres */}
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Thermometer className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Clilux M</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestión de Climatización</p>
        </div>

        {/* Selection cards */}
        <div className="space-y-4">
          <Link to={createPageUrl('HomeTecnico')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Empresa</h2>
                  <p className="text-sm text-slate-400">Acceso para empresas y técnicos</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl('HomeCliente')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Cliente</h2>
                  <p className="text-sm text-slate-400">Portal de cliente para ver equipos e incidencias</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          © 2024 Clilux - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}