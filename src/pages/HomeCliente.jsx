import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Thermometer, ClipboardCheck,
  LogOut, AlertCircle, Plus } from
'lucide-react';

export default function HomeCliente() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);

  // Cargar clientId desde sessionStorage al montar
  useEffect(() => {
    const savedClientId = sessionStorage.getItem('client_id');
    if (savedClientId) {
      setClientId(savedClientId);
    } else {
      // Si no hay sesión de cliente, redirigir al login principal
      navigate(createPageUrl('MenuInicio'));
    }
  }, []);

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

  const handleLogout = () => {
    sessionStorage.removeItem('client_id');
    localStorage.removeItem('clilux_email');
    localStorage.removeItem('clilux_password');
    navigate(createPageUrl('MenuInicio'));
  };

  if (!clientId) return null;

  // Client view (read-only)
  return (
    <div className="bg-stone-500 min-h-screen from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="fixed top-10 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="bg-slate-700 rounded-full fixed bottom-20 left-10 w-96 h-96 blur-3xl" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-slate-500 px-6 py-4 rounded-md backdrop-blur-sm border-b border-white/10">
          <div className="bg-gray-500 mx-auto rounded-[14px] max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-lime-600 rounded-full w-12 h-12 from-emerald-500 to-blue-600 flex items-center justify-center">
                <Thermometer className="text-cyan-200 lucide lucide-thermometer h-6 w-6" />
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold text-left">Clilux</h1>
                <p className="text-sm text-slate-400">Portal del Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-lg">{clientData?.client?.name || 'Cliente'}</span>
              <Button onClick={handleLogout} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
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
                  <Card className="bg-slate-200 text-card-foreground p-5 rounded-xl border shadow backdrop-blur-sm border-white/20 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer">
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
                  <Card className="bg-slate-200 text-card-foreground p-5 rounded-xl border shadow backdrop-blur-sm border-white/20 relative overflow-hidden hover:bg-white/15 transition-all cursor-pointer">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/30 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="bg-amber-400 mb-3 rounded-full w-12 h-12 flex items-center justify-center">
                        <AlertCircle className="bg-amber-400 text-slate-950 lucide lucide-circle-alert h-6 w-6" />
                      </div>
                      <p className="text-3xl font-bold text-white">{clientData.incidents?.filter((i) => i.status !== 'closed').length || 0}</p>
                      <p className="text-sm text-slate-400">Incidencias</p>
                    </div>
                  </Card>
                </Link>
                <Link to={createPageUrl('ClientReportIncident')}>
                  <Card className="bg-red-200 text-card-foreground p-5 rounded-xl border shadow backdrop-blur-sm border-red-500/30 relative overflow-hidden hover:bg-red-500/30 transition-all cursor-pointer">
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-500/30 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="bg-red-700 mb-3 rounded-full w-12 h-12 flex items-center justify-center">
                        <Plus className="text-red-950 lucide lucide-plus h-6 w-6" />
                      </div>
                      <p className="text-xl font-bold text-white">Reportar</p>
                      <p className="text-sm text-red-300">Nueva Incidencia</p>
                    </div>
                  </Card>
                </Link>
              </div>

              {/* Quick Summary - Clickable cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to={createPageUrl('ClientBuildings')}>
                  <Card className="bg-slate-200 text-card-foreground p-6 rounded-xl border shadow backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                      <Building2 className="h-8 w-8 text-blue-400" />
                      <h2 className="text-lg font-semibold text-white">Mis Edificios</h2>
                    </div>
                    <p className="text-3xl font-bold text-white mb-2">{clientData.buildings.length}</p>
                    <p className="text-sm text-slate-400">Edificios registrados</p>
                  </Card>
                </Link>

                <Link to={createPageUrl('ClientRevisions')}>
                  <Card className="bg-slate-200 text-card-foreground p-6 rounded-xl border shadow backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                      <ClipboardCheck className="h-8 w-8 text-purple-400" />
                      <h2 className="text-lg font-semibold text-white">Revisiones</h2>
                    </div>
                    <p className="text-3xl font-bold text-white mb-2">{clientData.revisions.length}</p>
                    <p className="text-sm text-slate-400">Revisiones completadas</p>
                  </Card>
                </Link>
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