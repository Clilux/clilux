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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Thermometer, ClipboardCheck, 
  ChevronRight, LogOut, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HomeCliente() {
  const [selectedClientId, setSelectedClientId] = useState(null);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: clientData, isLoading: loadingClientData } = useQuery({
    queryKey: ['client-data', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const clientList = await base44.entities.Client.filter({ id: selectedClientId });
      if (clientList.length > 0) {
        const client = clientList[0];
        const buildings = await base44.entities.Building.filter({ client_id: client.id });
        const equipment = await base44.entities.Equipment.filter({ client_id: client.id });
        const revisions = await base44.entities.Revision.filter({ client_id: client.id }, '-revision_date', 5);
        const incidents = await base44.entities.Incident.filter({ client_id: client.id }, '-created_date', 5);
        return { client, buildings, equipment, revisions, incidents };
      }
      return null;
    },
    enabled: !!selectedClientId,
  });

  const handleLogout = () => {
    window.location.href = createPageUrl('Login');
  };

  // Pantalla de selección de cliente
  if (!selectedClientId) {
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
            <p className="text-slate-400 mt-2">Selecciona tu empresa para continuar</p>
          </div>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <Label className="text-white mb-2 block">Seleccionar Cliente</Label>
            {loadingClients ? (
              <Skeleton className="h-10 bg-white/10" />
            ) : (
              <Select onValueChange={(value) => setSelectedClientId(value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecciona tu empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Card>

          <div className="mt-6 text-center">
            <Link to={createPageUrl('Login')}>
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Vista del cliente
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="fixed top-10 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Thermometer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Clilux M</h1>
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
          {loadingClientData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-white/10" />)}
            </div>
          ) : clientData ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/30 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                      <Building2 className="h-6 w-6 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{clientData.buildings.length}</p>
                    <p className="text-sm text-slate-400">Edificios</p>
                  </div>
                </Card>
                <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/30 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                      <Thermometer className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{clientData.equipment.length}</p>
                    <p className="text-sm text-slate-400">Equipos</p>
                  </div>
                </Card>
                <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/30 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                      <ClipboardCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{clientData.revisions.length}</p>
                    <p className="text-sm text-slate-400">Revisiones</p>
                  </div>
                </Card>
                <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/30 rounded-full blur-xl" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                      <AlertCircle className="h-6 w-6 text-amber-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{clientData.incidents?.filter(i => i.status !== 'closed').length || 0}</p>
                    <p className="text-sm text-slate-400">Incidencias</p>
                  </div>
                </Card>
              </div>

              {/* Report incident */}
              <Link to={createPageUrl(`IncidentForm?client_id=${selectedClientId}`)}>
                <Card className="p-5 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-500/30 flex items-center justify-center">
                      <AlertCircle className="h-7 w-7 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Reportar Incidencia</h3>
                      <p className="text-sm text-red-300">¿Tienes un problema con algún equipo? Notifícanos</p>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Buildings and revisions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Mis Edificios</h2>
                  </div>
                  <div className="space-y-3">
                    {clientData.buildings.map(building => (
                      <Link 
                        key={building.id} 
                        to={createPageUrl(`BuildingDetail?id=${building.id}`)}
                        className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <h3 className="font-medium text-white">{building.name}</h3>
                        <p className="text-sm text-slate-400">{building.address}, {building.city}</p>
                      </Link>
                    ))}
                    {clientData.buildings.length === 0 && (
                      <p className="text-slate-400 text-center py-4">No hay edificios registrados</p>
                    )}
                  </div>
                </Card>

                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                  <h2 className="text-lg font-semibold text-white mb-4">Últimas Revisiones</h2>
                  <div className="space-y-3">
                    {clientData.revisions.map(revision => {
                      const eq = clientData.equipment.find(e => e.id === revision.equipment_id);
                      return (
                        <Link 
                          key={revision.id} 
                          to={createPageUrl(`RevisionDetail?id=${revision.id}`)}
                          className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white">
                              {format(new Date(revision.revision_date), "dd MMM yyyy", { locale: es })}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              revision.general_status === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
                              revision.general_status === 'acceptable' ? 'bg-blue-500/20 text-blue-400' :
                              revision.general_status === 'needs_repair' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {revision.general_status === 'good' ? 'Bueno' :
                               revision.general_status === 'acceptable' ? 'Aceptable' :
                               revision.general_status === 'needs_repair' ? 'Reparación' : 'Crítico'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{eq?.brand} {eq?.model}</p>
                        </Link>
                      );
                    })}
                    {clientData.revisions.length === 0 && (
                      <p className="text-slate-400 text-center py-4">No hay revisiones registradas</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Equipment */}
              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
                <h2 className="text-lg font-semibold text-white mb-4">Estado de Equipos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientData.equipment.map(eq => (
                    <Link 
                      key={eq.id}
                      to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{eq.brand} {eq.model}</h3>
                        <span className={`w-3 h-3 rounded-full ${
                          eq.status === 'operational' ? 'bg-emerald-500' :
                          eq.status === 'maintenance_needed' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <p className="text-sm text-slate-400">{eq.location}</p>
                    </Link>
                  ))}
                  {clientData.equipment.length === 0 && (
                    <p className="text-slate-400 col-span-full text-center py-4">No hay equipos registrados</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center bg-white/10 border-white/20">
              <p className="text-slate-400">No se encontraron datos para este cliente.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}