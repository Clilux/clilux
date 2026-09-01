import React, { useState, useEffect, useRef } from 'react';
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
import { Clock, Calendar, User, Building2, Shield, ChevronRight, Save, Loader2, HardHat, Briefcase, Camera, FileText, Download, Fingerprint } from 'lucide-react';
import { isBiometricAvailable, isBiometricEnabled, registerBiometric, clearBiometric, getBiometricEmail } from '@/lib/biometricAuth';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import EliminarCuentaDialog from '@/components/settings/EliminarCuentaDialog';
import TrabajadoresTab from '@/components/settings/TrabajadoresTab';
import WorkerDocumentsPanel from '@/components/settings/WorkerDocumentsPanel';

export default function TechnicianProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionEmailFallback = sessionStorage.getItem('technician_email');
  const techEmail = urlParams.get('email') || sessionEmailFallback;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState(null);
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [jornadaForm, setJornadaForm] = useState(null);
  const [jornadaSaving, setJornadaSaving] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const sessionTechEmailNav = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmailNav;

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('technician_name');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    navigate(createPageUrl('MenuInicio'));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
  });

  // ── Carga de la ficha del técnico vía proxy (sesión propia) o directa (Base44) ──
  const effectiveEmail = isSessionTech ? sessionTechEmailNav : currentUser?.email;
  const useProxy = isSessionTech || !!currentUser?.email;

  const { data: proxyData, isLoading: proxyLoading } = useQuery({
    queryKey: ['profile-proxy-all', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'all' });
      return res.data || {};
    },
    enabled: useProxy && !!effectiveEmail,
    staleTime: 30000,
  });

  const { data: directTechs = [], isLoading: loadingDirect } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: !useProxy,
  });

  // Ficha resuelta
  const tech = isSessionTech
    ? (proxyData?.tech || null)
    : (directTechs.find(t => t.user_email === techEmail || t.email === techEmail) || null);
  const myCompany = isSessionTech ? (proxyData?.company || null) : null;

  const isLoading = isSessionTech ? proxyLoading : loadingDirect;

  const isGerente = !!tech?.is_admin;
  const isPlatformAdmin = !isSessionTech && currentUser?.role === 'admin';
  const isAdminUser = isPlatformAdmin || isGerente;
  const canEditPhoto = isSessionTech && techEmail === sessionTechEmailNav;

  // Inicializar formularios cuando se carga tech
  useEffect(() => {
    if (tech && contactForm === null) {
      setContactForm({ name: tech.name || '', phone: tech.phone || '', email: tech.email || '' });
    }
    if (tech && jornadaForm === null) {
      setJornadaForm({
        dias_laborables: Array.isArray(tech.dias_laborables) && tech.dias_laborables.length ? tech.dias_laborables : [1, 2, 3, 4, 5],
        horas: tech.horas_jornada_diaria ?? 8,
      });
    }
  }, [tech]);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    setBioEnabled(isBiometricEnabled() && getBiometricEmail() === techEmail);
  }, [techEmail]);

  const enableBiometric = async () => {
    setBioLoading(true);
    try {
      await registerBiometric(effectiveEmail);
      setBioEnabled(true);
      toast.success('Acceso por huella activado');
    } catch (err) {
      toast.error(err?.message || 'No se pudo activar la huella');
    } finally {
      setBioLoading(false);
    }
  };

  const disableBiometric = () => {
    clearBiometric();
    setBioEnabled(false);
    toast.success('Acceso por huella desactivado');
  };

  // Guardar datos de contacto vía proxy (sesión) o directo (Base44)
  const saveContact = async () => {
    if (!tech) return;
    try {
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'me_update',
          updates: { name: contactForm.name, phone: contactForm.phone },
        });
      } else {
        await base44.entities.Technician.update(tech.id, { name: contactForm.name, phone: contactForm.phone, email: contactForm.email });
      }
      queryClient.invalidateQueries({ queryKey: ['profile-proxy-all', effectiveEmail] });
      queryClient.invalidateQueries({ queryKey: ['proxy-all', effectiveEmail] });
      toast.success('Datos guardados');
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const savePin = async () => {
    if (!tech) return;
    if (!/^\d{4,6}$/.test(pinForm.pin)) { toast.error('El PIN debe tener 4-6 dígitos numéricos'); return; }
    if (pinForm.pin !== pinForm.confirm) { toast.error('Los PIN no coinciden'); return; }
    setPinSaving(true);
    try {
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'me_update',
          updates: { pin: pinForm.pin },
        });
      } else {
        await base44.entities.Technician.update(tech.id, { pin: pinForm.pin });
      }
      queryClient.invalidateQueries({ queryKey: ['profile-proxy-all', effectiveEmail] });
      toast.success('PIN actualizado');
      setPinForm({ pin: '', confirm: '' });
    } catch (err) {
      toast.error('Error al guardar el PIN');
    } finally {
      setPinSaving(false);
    }
  };

  const savePwd = async () => {
    if (!tech) return;
    if (!pwdForm.current || !pwdForm.next) { toast.error('Completa todos los campos'); return; }
    if (pwdForm.next.length < 4) { toast.error('La nueva contraseña debe tener al menos 4 caracteres'); return; }
    if (pwdForm.next !== pwdForm.confirm) { toast.error('Las contraseñas no coinciden'); return; }
    setPwdSaving(true);
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail, entity: 'me_password',
        current_password: pwdForm.current, new_password: pwdForm.next,
      });
      toast.success('Contraseña actualizada');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err?.message || 'Error al cambiar la contraseña');
    } finally {
      setPwdSaving(false);
    }
  };

  const saveJornada = async () => {
    if (!tech || !jornadaForm) return;
    setJornadaSaving(true);
    try {
      const updates = { dias_laborables: jornadaForm.dias_laborables, horas_jornada_diaria: Number(jornadaForm.horas) };
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'me_update', updates });
      } else {
        await base44.entities.Technician.update(tech.id, updates);
      }
      queryClient.invalidateQueries({ queryKey: ['profile-proxy-all', effectiveEmail] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Jornada guardada');
    } catch { toast.error('Error al guardar jornada'); }
    finally { setJornadaSaving(false); }
  };

  const fileInputRef = useRef(null);
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !tech) return;
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'me_update',
          updates: { photo_url: up.file_url },
        });
      } else {
        await base44.entities.Technician.update(tech.id, { photo_url: up.file_url });
      }
      queryClient.invalidateQueries({ queryKey: ['profile-proxy-all', effectiveEmail] });
      toast.success('Foto actualizada');
    } catch { toast.error('Error al subir la foto'); }
    finally { e.target.value = ''; }
  };

  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: registros = [] } = useQuery({
    queryKey: ['registros-tech', techEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: techEmail, entity: 'registro_horario_mes', mes: format(new Date(), 'yyyy-MM'),
      });
      return res.data?.data || [];
    },
    enabled: !!techEmail && isSessionTech,
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['ausencias-tech', techEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: techEmail, entity: 'ausencias_pendientes',
      });
      return res.data?.data || [];
    },
    enabled: !!techEmail && isSessionTech,
  });

  // Mientras carga, mostrar spinner
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
  if (!tech) return (
    <div className="min-h-screen bg-background p-6">
      <NavHeader title="Perfil técnico" />
      <p className="text-slate-500 text-center mt-8">Técnico no encontrado para: {techEmail}</p>
    </div>
  );

  const thisMonthRegistros = registros.filter(r => r.fecha >= currentMonthStart && r.fecha <= currentMonthEnd);
  const totalHorasMes = thisMonthRegistros.reduce((acc, r) => acc + (r.horas_efectivas || r.horas_trabajadas || 0), 0);
  const ausenciasPendientes = ausencias.length;

  // Jornada laboral: días laborables y horas diarias pactadas → horas teóricas del mes
  const diasLab = (jornadaForm?.dias_laborables) || (Array.isArray(tech?.dias_laborables) && tech.dias_laborables.length ? tech.dias_laborables : [1, 2, 3, 4, 5]);
  const horasDia = Number(jornadaForm?.horas ?? tech?.horas_jornada_diaria ?? 8);
  const monthDays = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const expectedHoras = monthDays.filter(d => diasLab.includes(d.getDay())).length * horasDia;
  const diffHoras = Math.round((totalHorasMes - expectedHoras) * 10) / 10;

  const TIPO_LABELS = {
    vacaciones: 'Vacaciones', baja_medica: 'Baja médica', permiso: 'Permiso',
    asunto_propio: 'Asunto propio', maternidad_paternidad: 'Mat./Paternidad', otro: 'Otro',
  };

  const vacacionesAnuales = tech?.vacaciones_anuales ?? 22;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <TechnicianSidebar
        isSessionTech={isSessionTech}
        isAdmin={isAdminUser}
        isPlatformAdmin={isPlatformAdmin}
        isLoading={false}
        onLogout={handleLogout}
        techEmail={sessionTechEmailNav || currentUser?.email}
        company={myCompany}
        isGerente={isGerente}
        sessionTechEmail={sessionTechEmailNav}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto">

        {/* Header con tipo de usuario */}
        <Card className="p-4 sm:p-6 bg-card border-0 shadow-sm mb-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => canEditPhoto && fileInputRef.current?.click()}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 ${canEditPhoto ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400' : 'cursor-default'} ${tech.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
            >
              {tech.photo_url ? (
                <img src={tech.photo_url} alt={tech.name} className="w-full h-full object-cover" />
              ) : (
                tech.name?.charAt(0)?.toUpperCase() || '?'
              )}
              {canEditPhoto && (
                <span className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white">
                  <Camera className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground break-words leading-tight">{tech.name}</h2>
              <div className="flex items-center gap-1.5 mt-1 mb-1.5 flex-wrap">
                {tech.is_admin ? (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                    <Shield className="h-3 w-3 mr-1" />Gerente
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    <User className="h-3 w-3 mr-1" />Trabajador
                  </Badge>
                )}
                {tech.worker_type && (
                  <Badge className={tech.worker_type === 'tecnico' ? 'bg-cyan-100 text-cyan-700 border-0 text-xs' : 'bg-purple-100 text-purple-700 border-0 text-xs'}>
                    {tech.worker_type === 'tecnico' ? <><HardHat className="h-3 w-3 mr-1" />Técnico</> : <><Briefcase className="h-3 w-3 mr-1" />Administración</>}
                  </Badge>
                )}
                <Badge className={tech.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-slate-100 text-slate-500 border-0 text-xs'}>
                  {tech.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="text-slate-500 text-sm truncate">{techEmail}</p>
              <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 min-w-0">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{myCompany?.name || tech.company_name || 'Sin empresa asignada'}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-card border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{Math.round(totalHorasMes * 10) / 10}h</p>
            <p className="text-xs text-slate-500">Horas este mes</p>
          </Card>
          <Card className="p-4 bg-card border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{thisMonthRegistros.length}</p>
            <p className="text-xs text-slate-500">Días trabajados</p>
          </Card>
          <Card className="p-4 bg-card border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{ausenciasPendientes}</p>
            <p className="text-xs text-slate-500">Ausencias pendientes</p>
          </Card>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="empresa">Empresa y tipo</TabsTrigger>
            <TabsTrigger value="contacto">Datos de contacto</TabsTrigger>
            <TabsTrigger value="registros">Registros</TabsTrigger>
            <TabsTrigger value="jornada">Jornada</TabsTrigger>
            <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
            <TabsTrigger value="pin">PIN Kiosko</TabsTrigger>
            {isSessionTech && <TabsTrigger value="contrasena">Contraseña</TabsTrigger>}
            {isSessionTech && <TabsTrigger value="huella">Huella</TabsTrigger>}
            {isSessionTech && <TabsTrigger value="documentos">Documentos</TabsTrigger>}
            {isSessionTech && isGerente && <TabsTrigger value="trabajadores">Trabajadores</TabsTrigger>}
          </TabsList>

          {/* ── Empresa y tipo de usuario ── */}
          <TabsContent value="empresa">
            <Card className="p-6 bg-card border-0 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-1">Empresa asignada</h3>
              <p className="text-xs text-slate-400 mb-5">
                Esta es la empresa a la que perteneces. Determina los clientes, edificios y datos que ves.
              </p>

              {/* Tipo de usuario (solo lectura) */}
              <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Tipo de usuario</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {tech.is_admin ? (
                    <Badge className="bg-amber-100 text-amber-700 border-0">
                      <Shield className="h-3 w-3 mr-1" />Gerente (administrador de empresa)
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      <User className="h-3 w-3 mr-1" />Trabajador
                    </Badge>
                  )}
                  {tech.worker_type && (
                    <Badge className={tech.worker_type === 'tecnico' ? 'bg-cyan-100 text-cyan-700 border-0' : 'bg-purple-100 text-purple-700 border-0'}>
                      {tech.worker_type === 'tecnico' ? 'Técnico de campo' : 'Personal de administración'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-slate-700">{myCompany?.name || tech.company_name || 'Sin empresa'}</p>
                </div>
                {myCompany?.cif && <p className="text-xs text-slate-500">CIF: {myCompany.cif}</p>}
                {myCompany?.address && <p className="text-xs text-slate-500">{myCompany.address}</p>}
                {myCompany?.city && <p className="text-xs text-slate-500">{myCompany.city}{myCompany.postal_code ? ` · ${myCompany.postal_code}` : ''}</p>}
                <p className="text-xs text-slate-400 mt-2">La empresa la asigna el administrador de Clilux al crear tu cuenta.</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contacto">
            <Card className="p-6 bg-card border-0 shadow-sm">
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
                    <Input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@empresa.com" type="email" disabled={isSessionTech} />
                    {isSessionTech && <p className="text-xs text-slate-400 mt-1">El correo no se puede cambiar desde el perfil.</p>}
                  </div>
                  <div className="pt-2">
                    <Button onClick={saveContact} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Save className="h-4 w-4 mr-2" />Guardar cambios
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="registros">
            <Card className="bg-card border-0 shadow-sm overflow-hidden">
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
                        <span className="font-medium text-slate-700">{r.horas_efectivas || r.horas_trabajadas ? `${r.horas_efectivas || r.horas_trabajadas}h` : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="jornada">
            <Card className="p-6 bg-card border-0 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-1">Jornada laboral</h3>
              <p className="text-xs text-slate-400 mb-5">Indica tus días laborables y las horas diarias pactadas. Sirve para calcular las horas teóricas del mes y compararlas con las fichadas.</p>

              <div className="space-y-5">
                <div>
                  <Label className="text-slate-600 mb-2 block">Días laborables</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { d: 1, l: 'Lun' }, { d: 2, l: 'Mar' }, { d: 3, l: 'Mié' }, { d: 4, l: 'Jue' },
                      { d: 5, l: 'Vie' }, { d: 6, l: 'Sáb' }, { d: 0, l: 'Dom' },
                    ].map(({ d, l }) => {
                      const active = (jornadaForm?.dias_laborables || []).includes(d);
                      return (
                        <button key={d} type="button"
                          onClick={() => setJornadaForm(p => {
                            const set = new Set(p.dias_laborables);
                            if (set.has(d)) set.delete(d); else set.add(d);
                            return { ...p, dias_laborables: Array.from(set).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)) };
                          })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="max-w-xs">
                  <Label className="text-slate-600 mb-1">Horas diarias pactadas</Label>
                  <Input type="number" min={1} max={12} step={0.5}
                    value={jornadaForm?.horas ?? 8}
                    onChange={e => setJornadaForm(p => ({ ...p, horas: e.target.value }))}
                  />
                </div>

                <div className="pt-1">
                  <Button onClick={saveJornada} disabled={jornadaSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {jornadaSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar jornada</>}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-0 shadow-sm mt-4">
              <h3 className="font-semibold text-slate-700 mb-1">Resumen del mes · {format(new Date(), 'MMMM yyyy', { locale: es })}</h3>
              <p className="text-xs text-slate-400 mb-4">Horas teóricas según tu jornada vs. horas realmente fichadas.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-bold text-slate-700">{expectedHoras}h</p>
                  <p className="text-xs text-slate-500">Teóricas</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(totalHorasMes * 10) / 10}h</p>
                  <p className="text-xs text-slate-500">Fichadas</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{thisMonthRegistros.length}</p>
                  <p className="text-xs text-slate-500">Días fichados</p>
                </div>
                <div className={`p-4 rounded-lg border text-center ${diffHoras < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-2xl font-bold ${diffHoras < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{diffHoras > 0 ? '+' : ''}{diffHoras}h</p>
                  <p className="text-xs text-slate-500">Diferencia</p>
                </div>
              </div>
              {diffHoras < 0 && (
                <p className="text-xs text-red-500 mt-3">Te faltan {Math.abs(diffHoras)}h por fichar este mes respecto a tu jornada teórica.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="ausencias">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3 bg-blue-50 border-0 shadow-sm text-center">
                <p className="text-xl font-bold text-blue-600">{vacacionesAnuales}</p>
                <p className="text-xs text-slate-500">Días pactados</p>
              </Card>
              <Card className="p-3 bg-emerald-50 border-0 shadow-sm text-center">
                <p className="text-xl font-bold text-emerald-600">{vacacionesAnuales - ausencias.filter(a => a.tipo === 'vacaciones').length}</p>
                <p className="text-xs text-slate-500">Días disponibles</p>
              </Card>
              <Card className="p-3 bg-amber-50 border-0 shadow-sm text-center">
                <p className="text-xl font-bold text-amber-600">{ausenciasPendientes}</p>
                <p className="text-xs text-slate-500">Pendientes</p>
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
              <Card className="bg-card border-0 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {ausencias.slice(0, 8).map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-700 font-medium">{TIPO_LABELS[a.tipo] || a.tipo}</span>
                        <span className="text-slate-400 ml-2 text-xs">
                          {a.fecha_inicio && format(parseISO(a.fecha_inicio), "d MMM", { locale: es })}
                          {' — '}
                          {a.fecha_fin && format(parseISO(a.fecha_fin), "d MMM yyyy", { locale: es })}
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

          <TabsContent value="pin">
            <Card className="p-6 bg-card border-0 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-1">PIN de Kiosko</h3>
              <p className="text-xs text-slate-400 mb-5">PIN personal (4-6 dígitos) para fichar en el kiosko de la oficina. Cada trabajador gestiona el suyo.</p>
              <div className="flex items-center gap-2 mb-5">
                <Badge className={tech.pin ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-500 border-0'}>
                  {tech.pin ? 'PIN configurado' : 'Sin PIN configurado'}
                </Badge>
              </div>
              <div className="space-y-4 max-w-xs">
                <div>
                  <Label className="text-slate-600 mb-1">Nuevo PIN (4-6 dígitos)</Label>
                  <Input type="password" inputMode="numeric" value={pinForm.pin}
                    onChange={e => setPinForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="••••" className="tracking-widest text-lg" />
                </div>
                <div>
                  <Label className="text-slate-600 mb-1">Confirmar PIN</Label>
                  <Input type="password" inputMode="numeric" value={pinForm.confirm}
                    onChange={e => setPinForm(p => ({ ...p, confirm: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="••••" className="tracking-widest text-lg" />
                </div>
                <div className="pt-2">
                  <Button onClick={savePin} disabled={pinSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {pinSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar PIN</>}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {isSessionTech && (
            <TabsContent value="contrasena">
              <Card className="p-6 bg-card border-0 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-1">Cambiar contraseña</h3>
                <p className="text-xs text-slate-400 mb-5">Usa una contraseña de al menos 4 caracteres. La contraseña actual se verifica por seguridad.</p>
                <div className="space-y-4 max-w-xs">
                  <div>
                    <Label className="text-slate-600 mb-1">Contraseña actual</Label>
                    <Input type="password" value={pwdForm.current}
                      onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))}
                      placeholder="••••" className="tracking-widest" />
                  </div>
                  <div>
                    <Label className="text-slate-600 mb-1">Nueva contraseña</Label>
                    <Input type="password" value={pwdForm.next}
                      onChange={e => setPwdForm(p => ({ ...p, next: e.target.value }))}
                      placeholder="••••" className="tracking-widest" />
                  </div>
                  <div>
                    <Label className="text-slate-600 mb-1">Confirmar nueva contraseña</Label>
                    <Input type="password" value={pwdForm.confirm}
                      onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="••••" className="tracking-widest" />
                  </div>
                  <div className="pt-2">
                    <Button onClick={savePwd} disabled={pwdSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {pwdSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar contraseña</>}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          )}

          {isSessionTech && (
            <TabsContent value="huella">
              <Card className="p-6 bg-card border-0 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-blue-600" />Acceso con huella dactilar
                </h3>
                <p className="text-xs text-slate-400 mb-5">Activa el desbloqueo biométrico para entrar a la app sin escribir la contraseña. Usa el sensor de huella o Face ID de tu dispositivo.</p>
                {!bioAvailable ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-sm text-amber-700">Tu dispositivo no tiene sensor biométrico disponible o no es compatible. Necesitas un móvil con huella/Face ID y un navegador compatible (Chrome Android o Safari iOS).</p>
                  </div>
                ) : bioEnabled ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-emerald-600 shrink-0" />
                      <p className="text-sm text-emerald-700">Acceso por huella activado para <strong>{effectiveEmail}</strong>.</p>
                    </div>
                    <Button onClick={disableBiometric} variant="outline" className="text-red-600 hover:text-red-700">
                      Desactivar huella
                    </Button>
                  </div>
                ) : (
                  <Button onClick={enableBiometric} disabled={bioLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {bioLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activando...</> : <><Fingerprint className="h-4 w-4 mr-2" />Activar huella dactilar</>}
                  </Button>
                )}
              </Card>
            </TabsContent>
          )}

          {isSessionTech && (
            <TabsContent value="documentos">
              <WorkerDocumentsPanel sessionEmail={effectiveEmail} targetEmail={effectiveEmail} canEdit={false} />
            </TabsContent>
          )}

          {isSessionTech && isGerente && (
            <TabsContent value="trabajadores">
              <TrabajadoresTab techEmail={effectiveEmail} />
            </TabsContent>
          )}
        </Tabs>

        {isSessionTech && techEmail === sessionTechEmailNav && (
          <div className="mt-8 border-t border-red-100 pt-6">
            <h3 className="font-semibold text-foreground mb-1">Zona de peligro</h3>
            <p className="text-sm text-muted-foreground mb-4">Puedes eliminar tu propia cuenta. Esta acción no se puede deshacer.</p>
            <EliminarCuentaDialog techId={tech?.id} onDeleted={handleLogout} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}