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
  Calendar, LogOut, AlertCircle, UserCog, Clock, FileText, ScanLine, GripVertical, Sparkles, Database, Receipt, FileCheck, Bot } from
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
{ id: '10', label: 'Asistencia Virtual', page: 'AIConsulta', icon: 'Bot', bgColor: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-300', borderColor: 'border-purple-400/40', order: 7 }];


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
    localStorage.removeItem('clilux_email');
    localStorage.removeItem('clilux_password');
    sessionStorage.removeItem('client_id');
    await base44.auth.logout();
    navigate(createPageUrl('MenuInicio'));
  };

  return (
    <div className="bg-slate-50 min-h-screen from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Decorative spheres */}
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/3 right-1/4 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="bg-slate-200 mx-auto rounded max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Thermometer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Clilux M</h1>
                <p className="text-sm text-slate-400">Portal Empresa • v1.0.1</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Facturacion')}>
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all">
                  <span className="text-white font-semibold">Administración</span>
                </div>
              </Link>
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
              <Button onClick={handleLogout} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to={createPageUrl('Clients')}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all cursor-pointer">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                    <Users className="h-7 w-7 text-blue-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">{clients.length}</p>
                  <p className="text-sm text-slate-400">Clientes</p>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Buildings')}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all cursor-pointer">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                    <Building2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">{buildings.length}</p>
                  <p className="text-sm text-slate-400">Edificios</p>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Equipment')}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all cursor-pointer">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                    <Thermometer className="h-7 w-7 text-purple-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">{equipment.length}</p>
                  <p className="text-sm text-slate-400">Equipos</p>
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('Calendar')}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 relative overflow-hidden group hover:bg-white/15 transition-all cursor-pointer">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/30 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                    <ClipboardCheck className="h-7 w-7 text-amber-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">{scheduledRevisions.filter((sr) => sr.status === 'pending').length}</p>
                  <p className="text-sm text-slate-400">Revisiones Programadas</p>
                </div>
              </Card>
            </Link>
          </div>

          {/* Alertas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-sky-100 text-card-foreground p-5 rounded-[32px] border shadow border-blue-500/30">
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
                {upcomingRevisions.slice(0, 5).map((sr) => {
                  const eq = equipment.find((e) => e.id === sr.equipment_id);
                  const bld = buildings.find((b) => b.id === sr.building_id);
                  return (
                    <Link
                      key={sr.id}
                      to={createPageUrl(`EquipmentDetail?id=${sr.equipment_id}`)}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{eq?.brand} {eq?.model}</p>
                          <p className="text-xs text-slate-400">{bld?.name}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {format(parseISO(sr.scheduled_date), "dd MMM", { locale: es })}
                        </span>
                      </div>
                    </Link>);

                })}
                {upcomingRevisions.length === 0 &&
                <p className="text-sm text-slate-400 text-center py-4">No hay revisiones programadas</p>
                }
              </div>
            </Card>

            <Card className="bg-orange-100 text-card-foreground p-5 rounded-[32px] border shadow border-red-500/30">
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
                {pendingIncidents.slice(0, 5).map((incident) => {
                  const client = clients.find((c) => c.id === incident.client_id);
                  return (
                    <Link
                      key={incident.id}
                      to={createPageUrl(`IncidentDetail?id=${incident.id}`)}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{incident.title}</p>
                          <p className="text-xs text-slate-400">{client?.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                        incident.priority === 'urgent' ? 'bg-red-500/30 text-red-300' :
                        incident.priority === 'high' ? 'bg-orange-500/30 text-orange-300' :
                        'bg-amber-500/30 text-amber-300'}`
                        }>
                          {incident.priority === 'urgent' ? 'Urgente' :
                          incident.priority === 'high' ? 'Alta' :
                          incident.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                    </Link>);

                })}
                {pendingIncidents.length === 0 &&
                <p className="text-sm text-slate-400 text-center py-4">No hay incidencias pendientes</p>
                }
              </div>
              {pendingIncidents.length > 0 &&
              <Link to={createPageUrl('Incidents')} className="block mt-3">
                  <Button variant="ghost" size="sm" className="w-full text-red-300 hover:text-red-200">
                    Ver todas las incidencias
                  </Button>
                </Link>
              }
            </Card>
          </div>

          {/* Quick Actions */}
          {user?.role === 'admin' &&
          <div className="mb-2 text-center">
              <p className="text-xs text-slate-400">Arrastra para reordenar (solo admin)</p>
            </div>
          }
          
          <DragDropContext onDragEnd={(result) => {
            if (!result.destination || user?.role !== 'admin') return;

            const items = Array.from(quickActions);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);

            const updatedItems = items.map((item, index) => ({
              ...item,
              order: index + 1
            }));

            setQuickActions(updatedItems);
            saveActionsMutation.mutate(updatedItems);
          }}>
            <Droppable droppableId="quick-actions" direction="horizontal" isDropDisabled={user?.role !== 'admin'}>
              {(provided) =>
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">

                  {quickActions.map((action, index) => {
                  const iconMap = {
                    'ScanLine': ScanLine,
                    'Plus': Plus,
                    'Thermometer': Thermometer,
                    'Users': Users,
                    'ClipboardCheck': ClipboardCheck,
                    'AlertCircle': AlertCircle,
                    'Calendar': Calendar,
                    'FileText': FileText,
                    'Sparkles': Sparkles,
                    'Database': Database,
                    'Bot': Bot,
                    'Receipt': Receipt,
                    'FileCheck': FileCheck,
                    'FileText': FileText
                  };
                  const IconComponent = iconMap[action.icon] || ScanLine;

                  return (
                    <Draggable key={action.id} draggableId={action.id} index={index} isDragDisabled={user?.role !== 'admin'}>
                        {(provided, snapshot) =>
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'z-50' : ''}>

                            <Link to={createPageUrl(action.page)}>
                              <Card className={`p-4 backdrop-blur-sm hover:bg-white/15 transition-all cursor-pointer group ${action.bgColor} ${action.borderColor || 'border-white/20'} ${
                          snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`
                          }>
                                <div className="flex flex-col items-center gap-3 text-center">
                                  {user?.role === 'admin' &&
                              <div {...provided.dragHandleProps} className="absolute top-1 right-1 cursor-grab active:cursor-grabbing">
                                      <GripVertical className="h-4 w-4 text-white/20 group-hover:text-white/40" />
                                    </div>
                              }
                                  <div className={`w-12 h-12 rounded-full ${action.bgColor === 'bg-white/10' ? 'bg-blue-500/20' : 'bg-blue-500/30'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <IconComponent className={`h-6 w-6 ${action.iconColor}`} />
                                  </div>
                                  <span className="font-medium text-white text-sm">{action.label}</span>
                                </div>
                              </Card>
                            </Link>
                          </div>
                      }
                      </Draggable>);

                })}
                  {provided.placeholder}
                </div>
              }
            </Droppable>
          </DragDropContext>


        </div>
      </div>
    </div>);

}