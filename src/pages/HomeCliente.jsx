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
  LogOut, AlertCircle, Plus, FileText } from
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
    <div className="bg-white min-h-screen relative overflow-hidden">
      
      <div className="relative z-10">
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center">
                <Thermometer className="text-white h-6 w-6" />
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
                  <Card className="bg-white p-5 rounded-xl border shadow hover:shadow-md transition-all cursor-pointer">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                        <Thermometer className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="text-3xl font-bold text-slate-800">{clientData.equipment.length}</p>
                      <p className="text-sm text-slate-500">Mis Equipos</p>
                    </div>
                  </Card>
                </Link>
                <Link to={createPageUrl('ClientIncidents')}>
                  <Card className="bg-white p-5 rounded-xl border shadow hover:shadow-md transition-all cursor-pointer">
                    <div className="relative">
                      <div className="bg-amber-100 mb-3 rounded-full w-12 h-12 flex items-center justify-center">
                        <AlertCircle className="text-amber-600 h-6 w-6" />
                      </div>
                      <p className="text-3xl font-bold text-slate-800">{clientData.incidents?.filter((i) => i.status !== 'closed').length || 0}</p>
                      <p className="text-sm text-slate-500">Incidencias</p>
                    </div>
                  </Card>
                </Link>
                <Link to={createPageUrl('ClientReportIncident')}>
                  <Card className="bg-white p-5 rounded-xl border border-red-200 shadow hover:shadow-md transition-all cursor-pointer">
                    <div className="relative">
                      <div className="bg-red-100 mb-3 rounded-full w-12 h-12 flex items-center justify-center">
                        <Plus className="text-red-600 h-6 w-6" />
                      </div>
                      <p className="text-xl font-bold text-slate-800">Reportar</p>
                      <p className="text-sm text-red-500">Nueva Incidencia</p>
                    </div>
                  </Card>
                </Link>
              </div>

              {/* Quick Summary - Clickable cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to={createPageUrl('ClientBuildings')}>
                  <Card className="bg-white p-6 rounded-xl border shadow hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <h2 className="text-lg font-semibold text-slate-800">Mis Edificios</h2>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 mb-2">{clientData.buildings.length}</p>
                    <p className="text-sm text-slate-500">Edificios registrados</p>
                  </Card>
                </Link>

                <Link to={createPageUrl('ClientRevisions')}>
                  <Card className="bg-white p-6 rounded-xl border shadow hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                      <ClipboardCheck className="h-8 w-8 text-purple-600" />
                      <h2 className="text-lg font-semibold text-slate-800">Revisiones</h2>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 mb-2">{clientData.revisions.length}</p>
                    <p className="text-sm text-slate-500">Revisiones completadas</p>
                  </Card>
                </Link>
              </div>
            </> :

          <Card className="p-8 text-center bg-white border">
              <p className="text-slate-400">No se encontraron datos para este cliente.</p>
            </Card>
          }
        </div>
      </div>
    </div>);

}