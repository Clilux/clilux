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
  Calendar, LogOut
} from 'lucide-react';
import StatCard from '../components/cards/StatCard';
import ClientCard from '../components/cards/ClientCard';
import RevisionCard from '../components/cards/RevisionCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Determinar rol basado en si el usuario tiene un cliente vinculado
        const clients = await base44.entities.Client.filter({ user_email: currentUser.email });
        setUserRole(clients.length > 0 ? 'client' : 'technician');
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: userRole === 'technician',
  });

  const { data: clientData, isLoading: loadingClientData } = useQuery({
    queryKey: ['client-data', user?.email],
    queryFn: async () => {
      const clientList = await base44.entities.Client.filter({ user_email: user.email });
      if (clientList.length > 0) {
        const client = clientList[0];
        const buildings = await base44.entities.Building.filter({ client_id: client.id });
        const equipment = await base44.entities.Equipment.filter({ client_id: client.id });
        const revisions = await base44.entities.Revision.filter({ client_id: client.id }, '-revision_date', 5);
        return { client, buildings, equipment, revisions };
      }
      return null;
    },
    enabled: userRole === 'client' && !!user,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
    enabled: userRole === 'technician',
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
    enabled: userRole === 'technician',
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list('-revision_date', 10),
    enabled: userRole === 'technician',
  });

  const pendingEquipment = equipment.filter(e => e.status === 'maintenance_needed' || e.status === 'out_of_service');

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Vista para clientes
  if (userRole === 'client') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Clilux M</h1>
              <p className="text-sm text-slate-500">Portal del Cliente</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{user.full_name || user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {loadingClientData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : clientData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                  title="Edificios" 
                  value={clientData.buildings.length} 
                  icon={Building2}
                  color="blue"
                />
                <StatCard 
                  title="Equipos" 
                  value={clientData.equipment.length} 
                  icon={Thermometer}
                  color="emerald"
                />
                <StatCard 
                  title="Revisiones" 
                  value={clientData.revisions.length} 
                  icon={ClipboardCheck}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-white border-0 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Mis Edificios</h2>
                    <Link to={createPageUrl('Buildings')}>
                      <Button variant="ghost" size="sm">
                        Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {clientData.buildings.slice(0, 3).map(building => (
                      <Link 
                        key={building.id} 
                        to={createPageUrl(`BuildingDetail?id=${building.id}`)}
                        className="block p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                      >
                        <h3 className="font-medium text-slate-800">{building.name}</h3>
                        <p className="text-sm text-slate-500">{building.address}, {building.city}</p>
                      </Link>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 bg-white border-0 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Últimas Revisiones</h2>
                  </div>
                  <div className="space-y-3">
                    {clientData.revisions.slice(0, 3).map(revision => {
                      const eq = clientData.equipment.find(e => e.id === revision.equipment_id);
                      return (
                        <Link 
                          key={revision.id} 
                          to={createPageUrl(`RevisionDetail?id=${revision.id}`)}
                          className="block p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-800">
                              {format(new Date(revision.revision_date), "dd MMM yyyy", { locale: es })}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              revision.general_status === 'good' ? 'bg-emerald-100 text-emerald-700' :
                              revision.general_status === 'acceptable' ? 'bg-blue-100 text-blue-700' :
                              revision.general_status === 'needs_repair' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {revision.general_status === 'good' ? 'Bueno' :
                               revision.general_status === 'acceptable' ? 'Aceptable' :
                               revision.general_status === 'needs_repair' ? 'Necesita reparación' : 'Crítico'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{eq?.brand} {eq?.model}</p>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <Card className="p-6 bg-white border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Estado de Equipos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientData.equipment.map(eq => (
                    <Link 
                      key={eq.id}
                      to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}
                      className="p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-slate-800">{eq.brand} {eq.model}</h3>
                        <span className={`w-3 h-3 rounded-full ${
                          eq.status === 'operational' ? 'bg-emerald-500' :
                          eq.status === 'maintenance_needed' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <p className="text-sm text-slate-500">{eq.location}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-500">No tienes datos asociados a tu cuenta.</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Vista para técnicos
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Clilux M</h1>
            <p className="text-sm text-slate-500">Panel de Técnico</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Settings')}>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-slate-500" />
              </Button>
            </Link>
            <span className="text-sm text-slate-600">{user.full_name || user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5 text-slate-500" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Clientes" 
            value={clients.length} 
            icon={Users}
            color="blue"
          />
          <StatCard 
            title="Edificios" 
            value={buildings.length} 
            icon={Building2}
            color="emerald"
          />
          <StatCard 
            title="Equipos" 
            value={equipment.length} 
            icon={Thermometer}
            color="purple"
          />
          <StatCard 
            title="Revisiones" 
            value={revisions.length} 
            icon={ClipboardCheck}
            color="amber"
          />
        </div>

        {/* Alertas */}
        {pendingEquipment.length > 0 && (
          <Card className="p-5 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-medium text-amber-800">
                  {pendingEquipment.length} equipo{pendingEquipment.length > 1 ? 's' : ''} requiere{pendingEquipment.length === 1 ? '' : 'n'} atención
                </h3>
                <p className="text-sm text-amber-700">
                  Hay equipos que necesitan mantenimiento o están fuera de servicio
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to={createPageUrl('ClientForm')}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-slate-700">Nuevo Cliente</span>
              </div>
            </Card>
          </Link>
          <Link to={createPageUrl('Clients')}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
                <span className="font-medium text-slate-700">Ver Clientes</span>
              </div>
            </Card>
          </Link>
          <Link to={createPageUrl('RevisionForm')}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-medium text-slate-700">Nueva Revisión</span>
              </div>
            </Card>
          </Link>
          <Link to={createPageUrl('Revisions')}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-medium text-slate-700">Historial</span>
              </div>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Clientes Recientes</h2>
              <Link to={createPageUrl('Clients')}>
                <Button variant="ghost" size="sm">
                  Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            {loadingClients ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {clients.slice(0, 4).map(client => {
                  const clientBuildings = buildings.filter(b => b.client_id === client.id);
                  return (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      buildingCount={clientBuildings.length}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Últimas Revisiones</h2>
              <Link to={createPageUrl('Revisions')}>
                <Button variant="ghost" size="sm">
                  Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {revisions.slice(0, 4).map(revision => {
                const eq = equipment.find(e => e.id === revision.equipment_id);
                const bld = buildings.find(b => b.id === revision.building_id);
                return (
                  <RevisionCard 
                    key={revision.id} 
                    revision={revision}
                    equipmentName={eq ? `${eq.brand} ${eq.model}` : ''}
                    buildingName={bld?.name}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}