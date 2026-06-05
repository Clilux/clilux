import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import NavHeader from '../components/navigation/NavHeader';
import { Clock, Calendar, User, Building2, Shield, ChevronRight, Save, Loader2, LogOut } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function TechnicianProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionEmailFallback = sessionStorage.getItem('technician_email');
  const techEmail = urlParams.get('email') || sessionEmailFallback;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState(null);

  const sessionTechEmailNav = sessionStorage.getItem('technician_email');
  const isSessionTechNav = !!sessionTechEmailNav;

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('technician_name');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    navigate(createPageUrl('MenuInicio'));
  }; // null = no cargado aún

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const sessionTechEmailQuery = sessionStorage.getItem('technician_email');
  const { data: technicians = [], isLoading: loadingTechs } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: true, // siempre cargar — técnicos de sesión no tienen currentUser
  });

  const tech = technicians.find(t => t.user_email === techEmail || t.email === techEmail);

  // Inicializar contactForm cuando se carga tech
  React.useEffect(() => {
    if (tech && contactForm === null) {
      setContactForm({ name: tech.name || '', phone: tech.phone || '', email: tech.email || '' });
    }
  }, [tech]);

  const saveContactMutation = useMutation({
    mutationFn: () => base44.entities.Technician.update(tech.id, { name: contactForm.name, phone: contactForm.phone, email: contactForm.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['technicians'] }); toast.success('Datos guardados'); },
    onError: () => toast.error('Error al guardar'),
  });

  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: registros = [] } = useQuery({
    queryKey: ['registros-tech', techEmail],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 100);
      return all.filter(r => r.technician_email === techEmail);
    },
    enabled: !!techEmail,
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['ausencias-tech', techEmail],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 50);
      return all.filter(a => a.technician_email === techEmail);
    },
    enabled: !!techEmail,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  // Accesible para admins y para el propio técnico viendo su perfil
  if (!currentUser && !isSessionTech) return null;
  if (currentUser && currentUser.role !== 'admin' && !isSessionTech) return null;
  // Mientras carga, no mostrar "no encontrado"
  if (loadingTechs) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
  if (!tech) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <NavHeader title="Perfil técnico" />
      <p className="text-slate-500 text-center mt-8">Técnico no encontrado para: {techEmail}</p>
    </div>
  );

  const thisMonthRegistros = registros.filter(r => r.fecha >= currentMonthStart && r.fecha <= currentMonthEnd);
  const totalHorasMes = thisMonthRegistros.reduce((acc, r) => acc + (r.horas_totales || 0), 0);
  const ausenciasPendientes = ausencias.filter(a => a.estado === 'pendiente').length;
  const techClients = clients.filter(c => c.assigned_technician === techEmail || c.assigned_technician === tech?.email);

  const TIPO_LABELS = {
    vacaciones: 'Vacaciones',
    baja_medica: 'Baja médica',
    permiso: 'Permiso',
    asunto_propio: 'Asunto propio',
    maternidad_paternidad: 'Mat./Paternidad',
    otro: 'Otro',
  };

  // Vacaciones
  const vacacionesAnuales = tech?.vacaciones_anuales ?? 22;
  const vacacionesUsadas = ausencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada')
    .reduce((acc, a) => acc + (a.dias_totales || 0), 0);
  const vacacionesDisponibles = vacacionesAnuales - vacacionesUsadas;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar
        isSessionTech={isSessionTechNav}
        isAdmin={currentUser?.role === 'admin'}
        isLoading={false}
        onLogout={handleLogout}
        techEmail={sessionTechEmailNav || currentUser?.email}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
              ${tech.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {tech.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-800">{tech.name}</h2>
                {tech.is_admin && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                    <Shield className="h-3 w-3 mr-1" />Admin
                  </Badge>
                )}
                <Badge className={tech.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-slate-100 text-slate-500 border-0 text-xs'}>
                  {tech.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="text-slate-500 text-sm">{techEmail}</p>
              {tech.company_name && (
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{tech.company_name}
                </p>
              )}
              {tech.specialty && <p className="text-slate-400 text-xs">{tech.specialty}</p>}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{Math.round(totalHorasMes * 10) / 10}h</p>
            <p className="text-xs text-slate-500">Horas este mes</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-800">{thisMonthRegistros.length}</p>
            <p className="text-xs text-slate-500">Días trabajados</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{ausenciasPendientes}</p>
            <p className="text-xs text-slate-500">Ausencias pendientes</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-emerald-600">{techClients.length}</p>
            <p className="text-xs text-slate-500">Clientes asignados</p>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link to={`/ControlHorario`}>
            <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Control Horario</p>
                    <p className="text-xs text-slate-400">Ver registros de jornada</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Card>
          </Link>
          <Link to={`/GestionAusencias`}>
            <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Ausencias</p>
                    <p className="text-xs text-slate-400">{ausenciasPendientes > 0 ? `${ausenciasPendientes} pendiente${ausenciasPendientes > 1 ? 's' : ''}` : 'Sin pendientes'}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="registros">
          <TabsList className="mb-4">
            <TabsTrigger value="registros">Registros</TabsTrigger>
            <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
            <TabsTrigger value="contacto">Datos de contacto</TabsTrigger>
          </TabsList>

          <TabsContent value="registros">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-50">
                <h3 className="font-semibold text-slate-700">Últimos registros de jornada</h3>
              </div>
              {registros.length === 0 ? (
                <p className="text-slate-400 text-sm text-center p-6">Sin registros</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {registros.slice(0, 10).map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {r.fecha && format(parseISO(r.fecha), "EEE d MMM", { locale: es })}
                      </span>
                      <div className="flex gap-4">
                        <span className="text-emerald-600">{r.hora_entrada || '—'}</span>
                        <span className="text-red-500">{r.hora_salida || '—'}</span>
                        <span className="font-medium text-slate-700">{r.horas_totales ? `${r.horas_totales}h` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="ausencias">
            {/* Resumen vacaciones */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3 bg-blue-50 border-0 shadow-sm text-center">
                <p className="text-xl font-bold text-blue-600">{vacacionesAnuales}</p>
                <p className="text-xs text-slate-500">Días pactados</p>
              </Card>
              <Card className="p-3 bg-slate-50 border-0 shadow-sm text-center">
                <p className="text-xl font-bold text-slate-600">{vacacionesUsadas}</p>
                <p className="text-xs text-slate-500">Días usados</p>
              </Card>
              <Card className={`p-3 border-0 shadow-sm text-center ${vacacionesDisponibles < 5 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <p className={`text-xl font-bold ${vacacionesDisponibles < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{vacacionesDisponibles}</p>
                <p className="text-xs text-slate-500">Días disponibles</p>
              </Card>
            </div>
            <Link to="/GestionAusencias">
              <Button size="sm" className="mb-4 bg-blue-600 hover:bg-blue-700 text-white">
                <Calendar className="h-4 w-4 mr-2" />Gestionar ausencias
              </Button>
            </Link>
            {ausencias.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 text-sm">Sin ausencias registradas</Card>
            ) : (
              <Card className="bg-white border-0 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {ausencias.slice(0, 8).map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-700 font-medium">{TIPO_LABELS[a.tipo] || a.tipo}</span>
                        <span className="text-slate-400 ml-2 text-xs">
                          {a.fecha_inicio && format(parseISO(a.fecha_inicio), "d MMM", { locale: es })}
                          {' — '}
                          {a.fecha_fin && format(parseISO(a.fecha_fin), "d MMM yyyy", { locale: es })}
                          {a.dias_totales && <span className="ml-1">({a.dias_totales}d)</span>}
                        </span>
                      </div>
                      <Badge className={
                        a.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' :
                        a.estado === 'rechazada' ? 'bg-red-100 text-red-700 border-0 text-xs' :
                        'bg-amber-100 text-amber-700 border-0 text-xs'
                      }>
                        {a.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contacto">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-1">Datos de contacto</h3>
              <p className="text-xs text-slate-400 mb-5">Usados para envíos de documentación (control horario, nóminas, etc.)</p>
              {contactForm && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-600 mb-1">Nombre completo</Label>
                    <Input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" />
                  </div>
                  <div>
                    <Label className="text-slate-600 mb-1">Teléfono</Label>
                    <Input value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="+34 600 000 000" type="tel" />
                  </div>
                  <div>
                    <Label className="text-slate-600 mb-1">Correo electrónico</Label>
                    <Input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@empresa.com" type="email" />
                  </div>
                  <div className="pt-2">
                    <Button onClick={() => saveContactMutation.mutate()} disabled={saveContactMutation.isPending} className="bg-blue-600">
                      {saveContactMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar cambios</>}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}