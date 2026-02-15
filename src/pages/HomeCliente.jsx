import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Thermometer, ClipboardCheck,
  LogOut, AlertCircle, Plus } from
'lucide-react';
import { format } from 'date-fns';

export default function HomeCliente() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [clientId, setClientId] = useState(null);
  const [loginError, setLoginError] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    }
  });

  const { data: clientData, isLoading: loadingClientData } = useQuery({
    queryKey: ['client-data', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      try {
        const clientList = await base44.entities.Client.filter({ id: clientId });
        if (clientList.length > 0) {
          const client = clientList[0];
          const [buildings, equipment, revisions, incidents] = await Promise.all([
          base44.entities.Building.filter({ client_id: client.id }),
          base44.entities.Equipment.filter({ client_id: client.id }),
          base44.entities.ScheduledRevision.filter({ client_id: client.id, status: 'completed' }),
          base44.entities.Incident.filter({ client_id: client.id })]
          );
          return { client, buildings, equipment, revisions, incidents };
        }
      } catch (error) {
        console.error('Error loading client data:', error);
      }
      return null;
    },
    enabled: !!clientId,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const clientUsers = settings?.client_users || [];
    const user = clientUsers.find((u) => u.email === credentials.email && u.password === credentials.password);

    if (user) {
      setClientId(user.client_id);
      // Guardar en sessionStorage para otras páginas del portal cliente
      sessionStorage.setItem('client_id', user.client_id);
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setClientId(null);
    setCredentials({ email: '', password: '' });
    sessionStorage.removeItem('client_id');
  };

  // Login screen
  if (!clientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="fixed top-10 right-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Portal del Cliente</h1>
            <p className="text-slate-400 mt-2">Accede con tus credenciales</p>
          </div>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  placeholder="tu@email.com"
                  required />

              </div>
              <div>
                <Label className="text-white">Contraseña</Label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  placeholder="••••••••"
                  required />

              </div>
              {loginError &&
              <p className="text-red-400 text-sm">{loginError}</p>
              }
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                Acceder
              </Button>
            </form>
          </Card>

          <div className="mt-6 text-center">
            <Link to={createPageUrl('MenuInicio')}>
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>);

  }

  // Client view (read-only)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="fixed top-10 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-slate-300 px-6 py-4 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Thermometer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Clilux </h1>
                <p className="text-sm text-slate-400">Portal del Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">{clientData?.client?.name || 'Cliente'}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {loadingClientData ?
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 bg-white/10" />)}
            </div> :
          clientData ?
          <>
              {/* Stats - Clickable cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link to={createPageUrl('ClientEquipment')}>
                  <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/30 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                        <Thermometer className="h-6 w-6 text-emerald-400" />
                      </div>
                      <p className="text-3xl font-bold text-white">{clientData.equipment.length}</p>
                      <p className="text-sm text-slate-400">Mis Equipos</p>
                    </div>
                  </Card>
                </Link>
                <Link to={createPageUrl('ClientIncidents')}>
                  <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/30 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                        <AlertCircle className="h-6 w-6 text-amber-400" />
                      </div>
                      <p className="text-3xl font-bold text-white">{clientData.incidents?.filter((i) => i.status !== 'closed').length || 0}</p>
                      <p className="text-sm text-slate-400">Incidencias</p>
                    </div>
                  </Card>
                </Link>
                <Link to={createPageUrl('ClientReportIncident')}>
                  <Card className="p-5 bg-red-500/20 backdrop-blur-sm border-red-500/30 relative overflow-hidden hover:bg-red-500/30 transition-all cursor-pointer">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-500/30 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-xl font-bold text-white">Reportar</p>
                      <p className="text-sm text-red-300">Nueva Incidencia</p>
                    </div>
                  </Card>
                </Link>
              </div>

              {/* Quick Summary - read-only */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Building2 className="h-8 w-8 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">Mis Edificios</h2>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{clientData.buildings.length}</p>
                  <p className="text-sm text-slate-400">Edificios registrados</p>
                </Card>

                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <ClipboardCheck className="h-8 w-8 text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">Revisiones</h2>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{clientData.revisions.length}</p>
                  <p className="text-sm text-slate-400">Revisiones completadas</p>
                </Card>
              </div>
            </> :

          <Card className="p-8 text-center bg-white/10 border-white/20">
              <p className="text-slate-400">No se encontraron datos para este cliente.</p>
            </Card>
          }
        </div>
      </div>
    </div>);

}