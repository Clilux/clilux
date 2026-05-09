import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Building2, Thermometer, ClipboardCheck,
  Settings, ChevronRight, AlertTriangle,
  Calendar, LogOut, AlertCircle, Clock, FileText, ScanLine,
  Sparkles, Bot, FileCheck, Tag, Zap, Home, Wrench, Wind, Shield, Plug
} from 'lucide-react';
import { useCurrentTechnician } from '@/hooks/useCurrentTechnician';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { playFuturisticSound } from '@/lib/futuristicSound';
import FichajeRapido from '@/components/horario/FichajeRapido';

// ── Tab config ──────────────────────────────────────────────
const TABS = [
  { id: 'inicio',        label: 'Inicio',        icon: Home },
  { id: 'calendario',    label: 'Calendario',    icon: Calendar },
  { id: 'funciones',     label: 'Funciones',     icon: Sparkles },
  { id: 'automatizacion',label: 'Automatización',icon: Zap },
];

// ── Quick actions (sin Nuevo Cliente, Incidencias, Climatización, Loxone) ──
const FUNCIONES = [
  { id: '1',  label: 'Escanear',         page: 'ScanEquipmentTech',    icon: ScanLine,  color: 'from-blue-500/30 to-purple-500/30',  iconCls: 'text-blue-300' },
  { id: '3',  label: 'Formulario Equipos',page: 'EquipmentForm',        icon: FileCheck, color: 'from-cyan-500/30 to-teal-500/30',    iconCls: 'text-cyan-300' },
  { id: '8',  label: 'Documentación',    page: 'Documentacion',         icon: FileText,  color: 'from-indigo-500/30 to-blue-500/30',  iconCls: 'text-indigo-300' },
  { id: '10', label: 'Asistencia Virtual',page: 'AIConsulta',           icon: Bot,       color: 'from-purple-500/30 to-pink-500/30',  iconCls: 'text-purple-300' },
  { id: '11', label: 'Búsquedas PVP',    page: 'VetaCatalogo',          icon: Tag,       color: 'from-amber-500/30 to-orange-500/30', iconCls: 'text-amber-300' },
  { id: '12', label: 'Contrato',         page: 'ContratoMantenimiento', icon: FileText,  color: 'from-green-500/30 to-teal-500/30',   iconCls: 'text-green-300' },
  { id: '13', label: 'Control Horario',  page: 'ControlHorario',        icon: Clock,     color: 'from-blue-500/30 to-cyan-500/30',    iconCls: 'text-blue-300' },
  { id: '14', label: 'Mis Ausencias',    page: 'GestionAusencias',      icon: Calendar,  color: 'from-purple-500/30 to-violet-500/30',iconCls: 'text-purple-300' },
];

const AUTOMATIZACION = [
  { id: 'clim', label: 'Climatización Airzone', page: 'ControlClimatizacion', icon: Wind,        color: 'from-cyan-500/30 to-blue-500/30',   iconCls: 'text-cyan-300',  desc: 'Control Airzone Cloud' },
  { id: 'lox',  label: 'Control Loxone',        page: 'ControlLoxone',        icon: Zap,         color: 'from-green-500/30 to-emerald-500/30',iconCls: 'text-green-300', desc: 'Miniservers Loxone' },
];

// ── Mini Calendar (inline month view) ───────────────────────
function MiniCalendar({ revisions, clients, buildings, equipment }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // Mon-start

  const revsByDay = {};
  revisions.forEach(r => {
    if (!r.scheduled_date) return;
    const d = parseISO(r.scheduled_date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const k = d.getDate();
      if (!revsByDay[k]) revsByDay[k] = [];
      revsByDay[k].push(r);
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthName = new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">‹</button>
        <span className="text-slate-800 font-semibold capitalize">{monthName}</span>
        <button onClick={nextMonth} className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">›</button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['L','M','X','J','V','S','D'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayRevs = revsByDay[day] || [];
          const hasPending = dayRevs.some(r => r.status === 'pending');
          const hasDone   = dayRevs.some(r => r.status === 'completed');
          return (
            <Link key={day} to={createPageUrl('Calendar')} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${isToday ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {day}
              </div>
              {dayRevs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasPending && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                  {hasDone    && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Upcoming list */}
      <div className="mt-4 border-t border-slate-200 pt-3 space-y-2 max-h-48 overflow-y-auto">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Próximas revisiones</p>
        {revisions
          .filter(r => r.status === 'pending' && isAfter(parseISO(r.scheduled_date), new Date()))
          .sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
          .slice(0, 8)
          .map(rev => {
            const client = clients.find(c => c.id === rev.client_id);
            const equip  = equipment.find(e => e.id === rev.equipment_id);
            return (
              <Link key={rev.id} to={`${createPageUrl('Calendar')}?revision=${rev.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-center">
                  <p className="text-blue-600 text-xs font-bold leading-none">
                    {format(parseISO(rev.scheduled_date), 'dd')}<br/>
                    <span className="uppercase">{format(parseISO(rev.scheduled_date), 'MMM', { locale: es })}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-800 text-xs font-medium truncate">{equip?.reference_name || 'Equipo'}</p>
                  <p className="text-slate-500 text-xs truncate">{client?.name}</p>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function HomeTecnico() {
  const [activeTab, setActiveTab] = useState('inicio');
  const navigate = useNavigate();

  // Detectar si el técnico está logado por sesión propia (no Base44)
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  // Base44 user (admin que se logó con Base44)
  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech, // Solo si no hay sesión de técnico propio
    retry: false,
  });

  const isAdmin = !isSessionTech && base44User?.role === 'admin';

  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    },
  });

  const stelEnabled = appSettings?.integrations?.stel_order?.enabled === true;

  // Registro del técnico actual (por sesión propia o por Base44)
  const { data: myTechRecord = null } = useQuery({
    queryKey: ['my-tech-record', sessionTechEmail || base44User?.email],
    queryFn: async () => {
      const email = sessionTechEmail || base44User?.email;
      if (!email) return null;
      const techs = await base44.entities.Technician.filter({ email });
      return techs[0] || null;
    },
    enabled: !!(sessionTechEmail || base44User?.email),
  });

  // Para compatibilidad con FichajeRapido que usa currentUser
  const currentUser = isSessionTech
    ? { email: sessionTechEmail, full_name: myTechRecord?.name || sessionTechEmail }
    : base44User;

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

  const pendingIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'in_progress');
  const today = new Date();
  const next30Days = addDays(today, 30);
  const upcomingRevisions = scheduledRevisions
    .filter(sr => sr.status === 'pending')
    .filter(sr => { const d = parseISO(sr.scheduled_date); return isAfter(d, today) && isBefore(d, next30Days); })
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const handleLogout = async () => {
    sessionStorage.setItem('just_logged_out', '1');
    // Limpiar sesión de técnico propio
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    sessionStorage.removeItem('technician_email');
    // Limpiar sesión de cliente
    localStorage.removeItem('clilux_email');
    localStorage.removeItem('clilux_password');
    sessionStorage.removeItem('client_id');
    if (isSessionTech) {
      // Técnico propio: redirigir sin logout de Base44
      navigate(createPageUrl('MenuInicio'));
    } else {
      base44.auth.logout(createPageUrl('MenuInicio'));
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="bg-white px-4 py-3 border-b border-slate-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                <Thermometer className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-slate-800 font-semibold text-lg">Clilux</span>
                {(myTechRecord?.name || currentUser?.full_name) && (
                  <p className="text-xs text-slate-500 leading-none mt-0.5">
                    {myTechRecord?.name || currentUser?.full_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link to={createPageUrl('AdminPanel')}>
                  <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 h-9 w-9" title="Panel Admin">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              {isSessionTech ? (
                <Link to={createPageUrl('Clients')}>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 h-9 w-9" title="Clientes">
                    <Users className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to={createPageUrl('Settings')}>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 h-9 w-9">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 h-9 w-9">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all
                    ${active ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 pb-10 bg-slate-50">

          {/* ── INICIO ── */}
          {activeTab === 'inicio' && (
            <div className="space-y-5">
              {/* Fichaje rápido */}
              <FichajeRapido currentUser={currentUser} techRecord={myTechRecord} />

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Clientes',   value: clients.length,   icon: Users,         color: 'bg-blue-500/10 border-blue-200',    iconBg: 'bg-blue-100',    iconCls: 'text-blue-500',    page: 'Clients',   loading: loadingClients },
                  { label: 'Edificios',  value: buildings.length, icon: Building2,     color: 'bg-emerald-500/10 border-emerald-200', iconBg: 'bg-emerald-100', iconCls: 'text-emerald-600', page: 'Buildings' },
                  { label: 'Equipos',    value: equipment.length, icon: Wrench,        color: 'bg-purple-500/10 border-purple-200',  iconBg: 'bg-purple-100',  iconCls: 'text-purple-500',  page: 'Equipment' },
                  { label: 'Incidencias',value: pendingIncidents.length, icon: AlertTriangle, color: pendingIncidents.length > 0 ? 'bg-red-500/10 border-red-200' : 'bg-slate-100 border-slate-200', iconBg: pendingIncidents.length > 0 ? 'bg-red-100' : 'bg-slate-100', iconCls: pendingIncidents.length > 0 ? 'text-red-500' : 'text-slate-400', page: 'Incidents' },
                ].map(({ label, value, icon: Icon, color, iconBg, iconCls, page, loading }) => (
                  <Link key={label} to={createPageUrl(page)} onClick={playFuturisticSound}>
                    <Card className={`${color} border p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer shadow-sm`}>
                      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-3`}>
                        <Icon className={`h-7 w-7 ${iconCls}`} />
                      </div>
                      {loading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-3xl font-bold text-slate-800">{value}</p>}
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Próximas revisiones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-slate-800 font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Próximas revisiones (30 días)
                  </h2>
                  <Link to={createPageUrl('Calendar')}>
                    <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-800 text-xs">
                      Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {upcomingRevisions.length === 0 ? (
                  <Card className="bg-slate-50 border-slate-200 p-4 text-center">
                    <p className="text-slate-400 text-sm">No hay revisiones próximas</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {upcomingRevisions.slice(0, 6).map(rev => {
                      const client = clients.find(c => c.id === rev.client_id);
                      const building = buildings.find(b => b.id === rev.building_id);
                      const equip = equipment.find(e => e.id === rev.equipment_id);
                      return (
                        <Link key={rev.id} to={`${createPageUrl('Calendar')}?revision=${rev.id}`}>
                          <Card className="bg-white border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                  <ClipboardCheck className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-slate-800 text-sm font-medium">{equip?.reference_name || equip?.brand || 'Equipo'}</p>
                                  <p className="text-slate-500 text-xs">{client?.name} · {building?.name}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-blue-600 text-sm font-medium">{format(parseISO(rev.scheduled_date), 'dd MMM', { locale: es })}</p>
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

              {/* Incidencias pendientes */}
              {pendingIncidents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-slate-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Incidencias pendientes
                    </h2>
                    <Link to={createPageUrl('Incidents')}>
                      <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-800 text-xs">
                        Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {pendingIncidents.slice(0, 3).map(inc => {
                      const client = clients.find(c => c.id === inc.client_id);
                      return (
                        <Link key={inc.id} to={createPageUrl('IncidentDetail') + `?id=${inc.id}`}>
                          <Card className="bg-red-50 border-red-200 p-3 hover:bg-red-100 transition-colors cursor-pointer shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                <div>
                                  <p className="text-slate-800 text-sm font-medium">{inc.title}</p>
                                  <p className="text-slate-500 text-xs">{client?.name}</p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${inc.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : inc.priority === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
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

              {/* Clientes recientes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-slate-800 font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Clientes recientes
                  </h2>
                  <Link to={createPageUrl('Clients')}>
                    <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-800 text-xs">
                      Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {loadingClients ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                <div className="space-y-2">
                  {clients.slice(0, 5).map(client => (
                    <Link key={client.id} to={createPageUrl('ClientDetail') + `?id=${client.id}`} onClick={playFuturisticSound}>
                      <Card className="bg-white border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {client.photo_url
                                ? <img src={client.photo_url} alt={client.name} className="w-9 h-9 object-cover" />
                                : <Users className="h-4 w-4 text-emerald-600" />}
                            </div>
                            <div>
                              <p className="text-slate-800 text-sm font-medium">{client.name}</p>
                              <p className="text-slate-500 text-xs">{client.city || client.email || ''}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CALENDARIO ── */}
          {activeTab === 'calendario' && (
            <div className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Calendario de revisiones
                </h2>
                <Link to={createPageUrl('Calendar')}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm gap-2">
                    Abrir calendario completo <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <MiniCalendar
                revisions={scheduledRevisions}
                clients={clients}
                buildings={buildings}
                equipment={equipment}
              />
            </div>
          )}

          {/* ── FUNCIONES ── */}
          {activeTab === 'funciones' && (
            <div>
              <h2 className="text-slate-800 font-semibold text-lg mb-5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Funciones
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {FUNCIONES.map(({ id, label, page, icon: Icon, color, iconCls }) => (
                  <Link key={id} to={createPageUrl(page)} onClick={playFuturisticSound}>
                    <Card className={`bg-gradient-to-br ${color} border border-slate-200 p-5 hover:scale-[1.03] active:scale-[0.98] transition-transform cursor-pointer flex flex-col items-center justify-center gap-4 shadow-sm aspect-square`}>
                      <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                        <Icon className={`h-9 w-9 ${iconCls}`} />
                      </div>
                      <p className="text-slate-800 text-sm text-center font-semibold leading-tight">{label}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── AUTOMATIZACIÓN ── */}
          {activeTab === 'automatizacion' && (
            <div>
              <h2 className="text-slate-800 font-semibold text-lg mb-5 flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Automatización
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {AUTOMATIZACION.map(({ id, label, page, icon: Icon, color, iconCls, desc }) => (
                  <Link key={id} to={createPageUrl(page)} onClick={playFuturisticSound}>
                    <Card className={`bg-gradient-to-br ${color} border border-slate-200 p-6 hover:scale-105 transition-transform cursor-pointer flex items-center gap-5 shadow-sm`}>
                      <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
                        <Icon className={`h-9 w-9 ${iconCls}`} />
                      </div>
                      <div>
                        <p className="text-slate-800 text-lg font-semibold">{label}</p>
                        <p className="text-slate-600 text-sm mt-0.5">{desc}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
                    </Card>
                  </Link>
                ))}

                {/* STEL Order — solo si está habilitado */}
                {stelEnabled && (
                  <Link to="/StelClientes" onClick={playFuturisticSound}>
                    <Card className="bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-slate-200 p-6 hover:scale-105 transition-transform cursor-pointer flex items-center gap-5 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
                        <Plug className="h-9 w-9 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-slate-800 text-lg font-semibold">STEL Order</p>
                        <p className="text-slate-600 text-sm mt-0.5">Clientes y albaranes ERP</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
                    </Card>
                  </Link>
                )}

                {/* Si no hay integraciones activas y STEL está desactivado */}
                {!stelEnabled && AUTOMATIZACION.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400">
                    <Plug className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay integraciones activas.</p>
                    <p className="text-xs mt-1">Actívalas en Configuración → Integraciones</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}