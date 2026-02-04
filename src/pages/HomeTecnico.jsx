import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, Building2, Thermometer, ClipboardCheck, 
  Plus, Settings, ChevronRight, AlertTriangle,
  Calendar, LogOut, AlertCircle, UserCog, Clock, FileText, ScanLine
} from 'lucide-react';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HomeTecnico() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list('-revision_date', 50),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date'),
  });

  const pendingIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');
  
  const today = new Date();
  const next30Days = addDays(today, 30);
  const upcomingRevisions = equipment
    .filter(eq => eq.next_revision_date)
    .filter(eq => {
      const revDate = parseISO(eq.next_revision_date);
      return isAfter(revDate, today) && isBefore(revDate, next30Days);
    })
    .sort((a, b) => new Date(a.next_revision_date) - new Date(b.next_revision_date));

  const handleLogout = () => {
    window.location.href = createPageUrl('MenuInicio');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Decorative spheres */}
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/3 right-1/4 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Thermometer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Clilux M</h1>
                <p className="text-sm text-slate-400">Portal Empresa</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('TechnicianManagement')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <UserCog className="h-5 w-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('Settings')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-sm text-slate-300">{user?.full_name || user?.email || 'Técnico'}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                  <Users className="h-7 w-7 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">{clients.length}</p>
                <p className="text-sm text-slate-400">Clientes</p>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <Building2 className="h-7 w-7 text-emerald-400" />
                </div>
                <p className="text-4xl font-bold text-white">{buildings.length}</p>
                <p className="text-sm text-slate-400">Edificios</p>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                  <Thermometer className="h-7 w-7 text-purple-400" />
                </div>
                <p className="text-4xl font-bold text-white">{equipment.length}</p>
                <p className="text-sm text-slate-400">Equipos</p>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                  <ClipboardCheck className="h-7 w-7 text-amber-400" />
                </div>
                <p className="text-4xl font-bold text-white">{revisions.length}</p>
                <p className="text-sm text-slate-400">Revisiones</p>
              </div>
            </Card>
          </div>

          {/* Alertas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 bg-blue-500/10 border-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Próximas Revisiones</h3>
                  <p className="text-xs text-blue-300">{upcomingRevisions.length} en los próximos 30 días</p>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {upcomingRevisions.slice(0, 5).map(eq => {
                  const bld = buildings.find(b => b.id === eq.building_id);
                  return (
                    <Link 
                      key={eq.id}
                      to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{eq.brand} {eq.model}</p>
                          <p className="text-xs text-slate-400">{bld?.name}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {format(parseISO(eq.next_revision_date), "dd MMM", { locale: es })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {upcomingRevisions.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No hay revisiones programadas</p>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-red-500/10 border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Incidencias Pendientes</h3>
                  <p className="text-xs text-red-300">{pendingIncidents.length} sin resolver</p>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingIncidents.slice(0, 5).map(incident => {
                  const client = clients.find(c => c.id === incident.client_id);
                  return (
                    <Link 
                      key={incident.id}
                      to={createPageUrl(`IncidentDetail?id=${incident.id}`)}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{incident.title}</p>
                          <p className="text-xs text-slate-400">{client?.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          incident.priority === 'urgent' ? 'bg-red-500/30 text-red-300' :
                          incident.priority === 'high' ? 'bg-orange-500/30 text-orange-300' :
                          'bg-amber-500/30 text-amber-300'
                        }`}>
                          {incident.priority === 'urgent' ? 'Urgente' :
                           incident.priority === 'high' ? 'Alta' :
                           incident.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {pendingIncidents.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No hay incidencias pendientes</p>
                )}
              </div>
              {pendingIncidents.length > 0 && (
                <Link to={createPageUrl('Incidents')} className="block mt-3">
                  <Button variant="ghost" size="sm" className="w-full text-red-300 hover:text-red-200">
                    Ver todas las incidencias
                  </Button>
                </Link>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Link to={createPageUrl('ScanEquipment')}>
              <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border-blue-400/40 hover:from-blue-500/30 hover:to-purple-500/30 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ScanLine className="h-6 w-6 text-blue-300" />
                  </div>
                  <span className="font-medium text-white text-sm">Escanear</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('ClientForm')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Nuevo Cliente</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('EquipmentForm')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Thermometer className="h-6 w-6 text-cyan-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Nuevo Equipo</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Clients')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-slate-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Clientes</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('RevisionForm')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Nueva Revisión</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Incidents')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Incidencias</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Calendar')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Calendario</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Revisions')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="h-6 w-6 text-amber-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Historial</span>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Reports')}>
              <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-indigo-400" />
                  </div>
                  <span className="font-medium text-white text-sm">Informes</span>
                </div>
              </Card>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Clientes Recientes</h2>
                <Link to={createPageUrl('Clients')}>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              {loadingClients ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-white/10" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 4).map(client => (
                    <Link 
                      key={client.id}
                      to={createPageUrl(`ClientDetail?id=${client.id}`)}
                      className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {client.name[0]}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{client.name}</h3>
                          <p className="text-sm text-slate-400">{client.city}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Últimas Revisiones</h2>
                <Link to={createPageUrl('Revisions')}>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {revisions.slice(0, 4).map(revision => {
                  const eq = equipment.find(e => e.id === revision.equipment_id);
                  const bld = buildings.find(b => b.id === revision.building_id);
                  return (
                    <Link 
                      key={revision.id}
                      to={createPageUrl(`RevisionDetail?id=${revision.id}`)}
                      className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">
                            {format(new Date(revision.revision_date), "dd MMM yyyy", { locale: es })}
                          </h3>
                          <p className="text-sm text-slate-400">{eq?.brand} {eq?.model} - {bld?.name}</p>
                        </div>
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
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}