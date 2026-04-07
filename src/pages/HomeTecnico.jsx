import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Building2, Thermometer, ClipboardCheck,
  Plus, Settings, ChevronRight, AlertTriangle,
  Calendar, LogOut, AlertCircle, UserCog, Clock, FileText, ScanLine, GripVertical, Sparkles, Database, Bot, FileCheck, Tag } from
'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';


const defaultQuickActions = [
{ id: '1', label: 'Escanear', page: 'ScanEquipmentTech', icon: 'ScanLine', bgColor: 'from-blue-500/20 to-purple-500/20', iconColor: 'text-blue-300', borderColor: 'border-blue-400/40', order: 1 },
{ id: '2', label: 'Nuevo Cliente', page: 'ClientForm', icon: 'Plus', bgColor: 'bg-white/10', iconColor: 'text-blue-400', borderColor: 'border-white/20', order: 2 },
{ id: '3', label: 'Formulario Equipos', page: 'EquipmentForm', icon: 'FileCheck', bgColor: 'bg-white/10', iconColor: 'text-cyan-400', borderColor: 'border-white/20', order: 3 },
{ id: '6', label: 'Incidencias', page: 'Incidents', icon: 'AlertCircle', bgColor: 'bg-white/10', iconColor: 'text-red-400', borderColor: 'border-white/20', order: 4 },
{ id: '7', label: 'Calendario', page: 'Calendar', icon: 'Calendar', bgColor: 'bg-white/10', iconColor: 'text-purple-400', borderColor: 'border-white/20', order: 5 },
{ id: '8', label: 'Documentación', page: 'Documentacion', icon: 'FileText', bgColor: 'bg-white/10', iconColor: 'text-indigo-400', borderColor: 'border-white/20', order: 6 },
{ id: '10', label: 'Asistencia Virtual', page: 'AIConsulta', icon: 'Bot', bgColor: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-300', borderColor: 'border-purple-400/40', order: 7 },
{ id: '11', label: 'Búsquedas PVP', page: 'VetaCatalogo', icon: 'Tag', bgColor: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-300', borderColor: 'border-amber-400/40', order: 8 }];


export default function HomeTecnico() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [quickActions, setQuickActions] = useState(defaultQuickActions);

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

  const { data: quickActionsConfig } = useQuery({
    queryKey: ['home-tecnico-quick-actions'],
    queryFn: async () => {
      const configs = await base44.entities.AppSettings.filter({ setting_key: 'home_tecnico_actions' });
      if (configs.length > 0 && configs[0].menu_items) {
        setQuickActions(configs[0].menu_items);
        return configs[0];
      }
      return null;
    }
  });

  const saveActionsMutation = useMutation({
    mutationFn: async (items) => {
      if (quickActionsConfig) {
        return base44.entities.AppSettings.update(quickActionsConfig.id, { menu_items: items });
      } else {
        return base44.entities.AppSettings.create({
          setting_key: 'home_tecnico_actions',
          menu_items: items
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-tecnico-quick-actions'] });
      toast.success('Orden guardado');
    }
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date')
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list()
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list()
  });

  const { data: scheduledRevisions = [] } = useQuery({
    queryKey: ['scheduledRevisions'],
    queryFn: () => base44.entities.ScheduledRevision.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date')
  });

  const pendingIncidents = incidents.filter((i) => i.status === 'pending' || i.status === 'in_progress');

  const today = new Date();
  const next30Days = addDays(today, 30);
  const upcomingRevisions = scheduledRevisions.
  filter((sr) => sr.status === 'pending').
  filter((sr) => {
    const revDate = parseISO(sr.scheduled_date);
    return isAfter(revDate, today) && isBefore(revDate, next30Days);
  }).
  sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const handleLogout = async () => {
    sessionStorage.setItem('just_logged_out', '1');
    localStorage.removeItem('clilux_email');
    localStorage.removeItem('clilux_password');
    sessionStorage.removeItem('client_id');
    base44.auth.logout(createPageUrl('MenuInicio'));
  };

  return (
    <div className="bg-slate-50 min-h-screen from-slate-900 via-slate-800 to-slate-900 relative overflow-x-hidden">
      {/* Decorative spheres */}
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/3 right-1/4 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-[#141415] px-4 py-3 backdrop-blur-sm border-b border-white/10">
          <div className="bg-[#100f0f] text-slate-50 mx-auto rounded max-w-7xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-slate-50 text-xl font-medium leading-tight">Clilux </h1>
                <p className="text-gray-300 text-xs truncate">Portal Empresa • </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to={createPageUrl('Settings')}>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-9 w-9">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="ghost" size="icon" className="text-slate-400 hover:text-white h-9 w-9">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-[#2f3733] mx-auto pb-28 p-4 max-w-7xl space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to={createPageUrl('Clients')}>
              <Card className="bg-slate-800/50 border-white/10 p-4 hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    {loadingClients ? <Skeleton className="h-7 w-12 bg-white/10" /> : <p className="text-2xl font-bold text-white">{clients.length}</p>}
                    <p className="text-xs text-slate-400">Clientes</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Buildings')}>
              <Card className="bg-slate-800/50 border-white/10 p-4 hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{buildings.length}</p>
                    <p className="text-xs text-slate-400">Edificios</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Equipment')}>
              <Card className="bg-slate-800/50 border-white/10 p-4 hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Thermometer className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{equipment.length}</p>
                    <p className="text-xs text-slate-400">Equipos</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Incidents')}>
              <Card className={`border-white/10 p-4 hover:bg-slate-700/50 transition-colors cursor-pointer ${pendingIncidents.length > 0 ? 'bg-red-900/30' : 'bg-slate-800/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingIncidents.length > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'}`}>
                    <AlertTriangle className={`h-5 w-5 ${pendingIncidents.length > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${pendingIncidents.length > 0 ? 'text-red-300' : 'text-white'}`}>{pendingIncidents.length}</p>
                    <p className="text-xs text-slate-400">Incidencias</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                Acciones rápidas
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveActionsMutation.mutate(quickActions)}
                className="text-slate-400 hover:text-white text-xs"
              >
                {saveActionsMutation.isPending ? 'Guardando...' : 'Guardar orden'}
              </Button>
            </div>
            <DragDropContext onDragEnd={(result) => {
              if (!result.destination) return;
              const items = Array.from(quickActions);
              const [reorderedItem] = items.splice(result.source.index, 1);
              items.splice(result.destination.index, 0, reorderedItem);
              setQuickActions(items);
            }}>
              <Droppable droppableId="quickActions" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex gap-3 overflow-x-auto pb-2"
                  >
                    {quickActions.map((action, index) => {
                      const iconMap = { ScanLine, Plus, FileCheck, AlertCircle, Calendar, FileText, Database, Bot, Tag, UserCog };
                      const IconComp = iconMap[action.icon] || Plus;
                      return (
                        <Draggable key={action.id} draggableId={action.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="shrink-0"
                            >
                              <Link to={createPageUrl(action.page)}>
                                <Card className={`bg-gradient-to-br ${action.bgColor} border ${action.borderColor} p-3 hover:scale-105 transition-transform cursor-pointer w-24 ${snapshot.isDragging ? 'opacity-70 rotate-2' : ''}`}>
                                  <div className="flex flex-col items-center gap-2">
                                    <div {...provided.dragHandleProps} className="self-end opacity-30 hover:opacity-60 cursor-grab">
                                      <GripVertical className="h-3 w-3 text-white" />
                                    </div>
                                    <IconComp className={`h-6 w-6 ${action.iconColor}`} />
                                    <p className="text-white text-xs text-center font-medium leading-tight">{action.label}</p>
                                  </div>
                                </Card>
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Upcoming Revisions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Próximas revisiones (30 días)
              </h2>
              <Link to={createPageUrl('Calendar')}>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-xs">
                  Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {upcomingRevisions.length === 0 ? (
              <Card className="bg-slate-800/30 border-white/10 p-4 text-center">
                <p className="text-slate-400 text-sm">No hay revisiones próximas</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingRevisions.slice(0, 5).map((rev) => {
                  const client = clients.find(c => c.id === rev.client_id);
                  const building = buildings.find(b => b.id === rev.building_id);
                  const equip = equipment.find(e => e.id === rev.equipment_id);
                  return (
                    <Link key={rev.id} to={`${createPageUrl('Calendar')}?revision=${rev.id}`}>
                      <Card className="bg-slate-800/40 border-white/10 p-3 hover:bg-slate-700/40 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                              <ClipboardCheck className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{equip?.reference_name || equip?.brand || 'Equipo'}</p>
                              <p className="text-slate-400 text-xs">{client?.name} • {building?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-300 text-sm font-medium">{format(parseISO(rev.scheduled_date), 'dd MMM', { locale: es })}</p>
                            <p className="text-slate-400 text-xs capitalize">{rev.revision_type}</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Incidents */}
          {pendingIncidents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  Incidencias pendientes
                </h2>
                <Link to={createPageUrl('Incidents')}>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-xs">
                    Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {pendingIncidents.slice(0, 3).map((inc) => {
                  const client = clients.find(c => c.id === inc.client_id);
                  return (
                    <Link key={inc.id} to={createPageUrl('IncidentDetail') + `?id=${inc.id}`}>
                      <Card className="bg-red-900/20 border-red-500/20 p-3 hover:bg-red-900/30 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                            <div>
                              <p className="text-white text-sm font-medium">{inc.title}</p>
                              <p className="text-slate-400 text-xs">{client?.name}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${inc.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : inc.priority === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                            {inc.priority}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Clients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Clientes recientes
              </h2>
              <Link to={createPageUrl('Clients')}>
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-xs">
                  Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {loadingClients ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-white/10 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 5).map((client) => (
                  <Link key={client.id} to={createPageUrl('ClientDetail') + `?id=${client.id}`}>
                    <Card className="bg-slate-800/40 border-white/10 p-3 hover:bg-slate-700/40 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {client.photo_url ? (
                            <img src={client.photo_url} alt={client.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Users className="h-4 w-4 text-emerald-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-white text-sm font-medium">{client.name}</p>
                            <p className="text-slate-400 text-xs">{client.city || client.email || ''}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        


































































































































































































































        
      </div>
    </div>);

}