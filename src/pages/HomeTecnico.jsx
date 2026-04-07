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
        <div className="bg-[#222230] px-4 py-3 backdrop-blur-sm border-b border-white/10">
          <div className="bg-[#1a1919] text-slate-50 mx-auto rounded max-w-7xl flex items-center justify-between gap-2">
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

        



































































































































































































































        
      </div>
    </div>);

}