import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserPlus, Building2,
  Shield, Loader2, Trash2, RefreshCw, Link2, CheckCircle, XCircle, Clock, Settings, Send,
  Eye, EyeOff, Key, Lock, Save
} from 'lucide-react';
import PermisosTecnicoPanel from '@/components/settings/PermisosTecnicoPanel';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [manageTech, setManageTech] = useState(null);
  const [manageData, setManageData] = useState({ companyName: '', companyId: '', isAdmin: false, name: '', phone: '', specialty: '', fgas_cert_num: '', rite_cert_num: '', empresa_fgas_cert_num: '' });
  const [showPermisosDialog, setShowPermisosDialog] = useState(false);
  const [permisosTech, setPermisosTech] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', techName: '', companyName: '', companyId: '', password: '', passwordConfirm: '' });
  const [showInvitePwd, setShowInvitePwd] = useState(false);
  const [editingPwdId, setEditingPwdId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [linkData, setLinkData] = useState({ techId: '', companyName: '', companyId: '' });
  const [sending, setSending] = useState(false);
  const [permisosLocal, setPermisosLocal] = useState({});

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: technicians = [], isLoading: loadingTechs } = useQuery({
    queryKey: ['technicians', isSessionTech ? sessionTechEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'technicians' });
        return res.data?.data || [];
      }
      return base44.entities.Technician.list('-created_date');
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', isSessionTech ? sessionTechEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'clients' });
        return res.data?.data || [];
      }
      return base44.entities.Client.list('-created_date');
    },
  });

  const { data: adminRequests = [] } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => base44.entities.AdminRequest.filter({ status: 'pending' }),
    enabled: !isSessionTech,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: myTechRecord } = useQuery({
    queryKey: ['my-tech-record', sessionTechEmail],
    queryFn: async () => {
      if (!sessionTechEmail) return null;
      const techs = await base44.entities.Technician.filter({ email: sessionTechEmail });
      return techs[0] || null;
    },
    enabled: isSessionTech,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'technician_delete', technician_id: id,
        });
      } else {
        await base44.entities.Technician.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Técnico eliminado');
    },
  });

  // Mientras carga, no mostrar nada (evitar flash de acceso restringido)
  const isSessionAdmin = isSessionTech && myTechRecord?.is_admin === true;
  const isBase44Admin = !isSessionTech && currentUser?.role === 'admin';
  if (!isSessionTech && !currentUser) return null;
  if (isSessionTech && !myTechRecord) return null;

  if (!isSessionAdmin && !isBase44Admin) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-slate-500 hover:text-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { window.location.href = '/'; }} className="text-slate-500 hover:text-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </Button>
          </div>
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Acceso restringido</h2>
            <p className="text-slate-500">Solo los gerentes de empresa y el administrador de la app pueden acceder a este panel.</p>
          </Card>
        </div>
      </div>
    );
  }

  const handleInviteTechnician = async () => {
    if (!inviteData.email || !inviteData.techName || !inviteData.password) {
      toast.error('Nombre, email y contraseña son obligatorios');
      return;
    }
    if (inviteData.password !== inviteData.passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (inviteData.password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setSending(true);
    try {
      const existing = technicians.find(t => t.email === inviteData.email);
      if (existing) {
        toast.error('Ya existe un técnico con ese email');
        setSending(false);
        return;
      }
      const companyId = inviteData.companyId && inviteData.companyId !== '__nueva__'
        ? inviteData.companyId
        : (inviteData.companyName ? inviteData.companyName.toLowerCase().replace(/\s+/g, '_') : '');

      if (isSessionTech) {
        // Admin de empresa (sesión): crea el técnico dentro de su empresa vía proxy
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'technician_create',
          record: {
            name: inviteData.techName.trim(),
            email: inviteData.email.trim().toLowerCase(),
            portal_password: inviteData.password.trim(),
            status: 'active',
          },
        });
      } else {
        await base44.entities.Technician.create({
          name: inviteData.techName.trim(),
          email: inviteData.email.trim().toLowerCase(),
          portal_password: inviteData.password.trim(),
          company_name: inviteData.companyName || '',
          company_id: companyId,
          status: 'active',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(`Técnico ${inviteData.techName} creado correctamente`);
      setShowInviteDialog(false);
      setInviteData({ email: '', techName: '', companyName: '', companyId: '', password: '', passwordConfirm: '' });
    } catch (err) {
      toast.error('Error al crear el técnico: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };

  const handleUpdatePassword = async (techId) => {
    if (!editPassword || editPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    try {
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'technician_update',
          technician_id: techId, updates: { portal_password: editPassword.trim() },
        });
      } else {
        await base44.entities.Technician.update(techId, { portal_password: editPassword.trim() });
      }
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Contraseña actualizada');
      setEditingPwdId(null);
      setEditPassword('');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleLinkCompany = async () => {
    if (!linkData.techId || !linkData.companyName) return;
    setSending(true);
    try {
      const companyId = linkData.companyId || linkData.companyName.toLowerCase().replace(/\s+/g, '_');
      await base44.entities.Technician.update(linkData.techId, {
        company_name: linkData.companyName,
        company_id: companyId,
      });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Empresa vinculada correctamente');
      setShowLinkDialog(false);
      setLinkData({ techId: '', companyName: '', companyId: '' });
    } catch (err) {
      toast.error('Error al vincular empresa: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };

  const handleApproveAdmin = async (req) => {
    setSending(true);
    try {
      // Comprobar duplicado por CIF
      const existingTechs = technicians.filter(t => t.company_id === req.company_cif?.toLowerCase());
      const isAdminAlready = existingTechs.some(t => t.is_admin);
      if (isAdminAlready) {
        toast.error('Ya existe un gerente para esa empresa (CIF duplicado)');
        setSending(false);
        return;
      }
      // El gerente NO es administrador de la app (Base44): entra solo por el
      // portal de técnico con su email + contraseña. Se crea como Technician
      // con is_admin=true (gerente de su empresa).
      const adminEmail = req.technician_email || req.contact_email;
      const chosenPassword = req.password || '';
      if (req.technician_email) {
        // Buscar técnico existente por email y actualizarlo
        const existingTechList = await base44.entities.Technician.filter({ user_email: req.technician_email });
        const techByEmail = existingTechList[0] || (await base44.entities.Technician.filter({ email: req.technician_email }))[0];
        if (techByEmail) {
          await base44.entities.Technician.update(techByEmail.id, {
            is_admin: true,
            company_id: req.company_cif?.toLowerCase(),
            company_name: req.company_name,
            ...(chosenPassword ? { portal_password: chosenPassword } : {}),
          });
        } else {
          // No encontrado: crear nuevo técnico vinculado
          await base44.entities.Technician.create({
            name: req.full_name,
            email: req.technician_email,
            user_email: req.technician_email,
            company_name: req.company_name,
            company_id: req.company_cif?.toLowerCase(),
            is_admin: true,
            status: 'active',
            portal_password: chosenPassword || undefined,
            invited_at: new Date().toISOString(),
          });
        }
      } else {
        await base44.entities.Technician.create({
          name: req.full_name,
          email: req.contact_email,
          user_email: req.contact_email,
          company_name: req.company_name,
          company_id: req.company_cif?.toLowerCase(),
          is_admin: true,
          status: 'active',
          portal_password: chosenPassword || undefined,
          invited_at: new Date().toISOString(),
        });
      }
      // Crear / asegurar registro de la empresa (Company) con los datos de la solicitud
      try {
        const companyId = req.company_cif?.toLowerCase();
        if (companyId) {
          const existingCompanies = await base44.entities.Company.filter({ company_id: companyId });
          if (!existingCompanies[0]) {
            await base44.entities.Company.create({
              company_id: companyId,
              name: req.company_name,
              cif: req.company_cif,
              address: req.company_address || '',
              email: req.contact_email || '',
              status: 'active',
              onboarding_completed: false,
            });
          }
        }
      } catch (e) {
        console.warn('No se pudo crear el registro de empresa:', e.message);
      }
      // Registrar al gerente como usuario de la app (rol "user", NO admin) para que
      // el correo de bienvenida llegue garantizado (SendEmail entrega a usuarios
      // registrados) sin darle acceso de administrador de la plataforma.
      let invitedOk = false;
      try {
        await base44.users.inviteUser(adminEmail, 'user');
        invitedOk = true;
      } catch (e) {
        // Es normal si ya estaba registrado: el correo igualmente llegará.
        console.warn('Invitación Base44 (probablemente ya existe):', e.message);
      }
      // Correo de bienvenida con credenciales del portal de técnico
      let emailSent = false;
      if (chosenPassword) {
        try {
          await base44.integrations.Core.SendEmail({
            to: adminEmail,
            subject: 'Bienvenido a Clilux — Acceso de Gerente',
            body: `Hola ${req.full_name},\n\nTu empresa ${req.company_name} ya está dada de alta en Clilux. A partir de ahora eres el GERENTE de tu empresa (no confundir con el administrador de la plataforma).\n\nPara entrar a la app:\n1. Ve a la pantalla de inicio y pulsa "Técnico".\n2. Inicia sesión con tu email (${adminEmail}) y la contraseña que elegiste al registrarte.\n3. Completa los datos de tu empresa y crea a tus trabajadores desde el asistente o desde "Administración".\n\nBienvenido,\nEquipo Clilux`,
          });
          emailSent = true;
        } catch (e) {
          console.warn('No se pudo enviar el correo de bienvenida personalizado:', e.message);
        }
      }
      // Marcar solicitud como aprobada
      await base44.entities.AdminRequest.update(req.id, { status: 'approved' });
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      if (!chosenPassword) {
        toast.success(`Gerente aprobado: ${adminEmail} (sin contraseña — asígnala desde "Gestionar")`);
      } else if (emailSent) {
        toast.success(`Gerente aprobado: ${adminEmail}. Correo de bienvenida enviado.`);
      } else {
        toast.warning(`Gerente aprobado: ${adminEmail}. No se pudo enviar el correo automáticamente; comparte las credenciales manualmente.`);
      }
    } catch (err) {
      toast.error('Error al aprobar: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };

  const handleRejectAdmin = async (req) => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    await base44.entities.AdminRequest.update(req.id, { status: 'rejected' });
    queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    toast.success('Solicitud rechazada');
  };

  const handleOpenManage = (tech) => {
    setManageTech(tech);
    setManageData({
      companyName: tech.company_name || '',
      companyId: tech.company_id || '',
      isAdmin: tech.is_admin || false,
      name: tech.name || '',
      phone: tech.phone || '',
      specialty: tech.specialty || '',
      fgas_cert_num: tech.fgas_cert_num || '',
      rite_cert_num: tech.rite_cert_num || '',
      empresa_fgas_cert_num: tech.empresa_fgas_cert_num || '',
    });
    setShowManageDialog(true);
  };

  const handleSaveManage = async () => {
    if (!manageTech) return;
    setSending(true);
    try {
      const companyId = manageData.companyId || manageData.companyName?.toLowerCase().replace(/\s+/g, '_');
      const updates = {
        name: manageData.name,
        phone: manageData.phone,
        specialty: manageData.specialty,
        is_admin: manageData.isAdmin,
        fgas_cert_num: manageData.fgas_cert_num,
        rite_cert_num: manageData.rite_cert_num,
        empresa_fgas_cert_num: manageData.empresa_fgas_cert_num,
      };
      if (isSessionTech) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'technician_update',
          technician_id: manageTech.id, updates,
        });
      } else {
        await base44.entities.Technician.update(manageTech.id, {
          ...updates,
          company_name: manageData.companyName,
          company_id: companyId,
        });
        // Nota: el gerente (is_admin) NO recibe cuenta de admin de la plataforma.
        // Entra por el portal de técnico con email + contraseña.
      }
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Técnico actualizado correctamente');
      setShowManageDialog(false);
    } catch (err) {
      toast.error('Error: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };



  // Group technicians by company
  const companies = {};
  technicians.forEach(t => {
    const key = t.company_id || '__sin_empresa__';
    const label = t.company_name || 'Sin empresa';
    if (!companies[key]) companies[key] = { label, techs: [] };
    companies[key].techs.push(t);
  });

  const clientsByTech = (techEmail) =>
    clients.filter(c => c.assigned_technician === techEmail || c.company_id === technicians.find(t => t.email === techEmail)?.company_id).length;

  // Empresas únicas ya existentes en técnicos
  const existingCompanies = [...new Map(
    technicians.filter(t => t.company_id && t.company_name)
      .map(t => [t.company_id, { id: t.company_id, name: t.company_name }])
  ).values()];

  // Técnicos sin empresa asignada
  const techsWithoutCompany = technicians.filter(t => !t.company_id);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={isBase44Admin ? 'Panel del Administrador de la App' : 'Panel del Gerente'} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{technicians.length}</p>
                <p className="text-xs text-slate-500">Técnicos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{technicians.filter(t => t.portal_password && t.status === 'active').length}</p>
                <p className="text-xs text-slate-500">Con contraseña activa</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
                <p className="text-xs text-slate-500">Clientes</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending admin requests */}
        {adminRequests.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-slate-700">Solicitudes de gerente pendientes</h3>
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{adminRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {adminRequests.map(req => (
                <Card key={req.id} className="p-4 bg-amber-50 border border-amber-200 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{req.full_name}</p>
                      <p className="text-sm text-slate-500">{req.contact_email}</p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-slate-600"><span className="font-medium">Empresa:</span> {req.company_name}</span>
                        <span className="text-xs text-slate-600"><span className="font-medium">CIF:</span> {req.company_cif}</span>
                        {req.company_address && <span className="text-xs text-slate-500">{req.company_address}</span>}
                        {req.technician_email && <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded"><span className="font-medium">Técnico vinculado:</span> {req.technician_email}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApproveAdmin(req)}
                        disabled={sending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectAdmin(req)}
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mb-5">
          {techsWithoutCompany.length > 0 && (
            <Button
              onClick={() => setShowLinkDialog(true)}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Vincular empresa ({techsWithoutCompany.length})
            </Button>
          )}
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Crear técnico
          </Button>
        </div>

        {/* Technicians grouped by company */}
        <div className="space-y-6">
          {Object.entries(companies).map(([companyId, { label, techs }]) => (
            <div key={companyId}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-400" />
                <h3 className="font-semibold text-slate-700">{label}</h3>
                <Badge variant="secondary" className="text-xs">{techs.length} técnico{techs.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {techs.map(tech => {
                  const accessEmail = tech.email;
                  const hasAccess = !!tech.portal_password && tech.status === 'active';
                  return (
                    <Card key={tech.id} className="p-4 bg-white border-0 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                            ${hasAccess ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {tech.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 text-sm">{tech.name}</p>
                              {tech.is_admin && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-1.5 py-0"><Shield className="h-2.5 w-2.5 mr-0.5" />Gerente</Badge>}
                            </div>
                            <p className="text-xs text-slate-500">{tech.email}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{clientsByTech(tech.email)} cliente{clientsByTech(tech.email) !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {hasAccess ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                              Pendiente
                            </Badge>
                          )}
                          <div className="flex gap-1 mt-1 flex-wrap justify-end">
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                             title="Gestionar técnico"
                             onClick={() => handleOpenManage(tech)}
                           >
                             <Settings className="h-3 w-3 mr-1" />
                             Gestionar
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                             title="Permisos de acceso"
                             onClick={() => { setPermisosTech(tech); setShowPermisosDialog(true); }}
                           >
                             <Lock className="h-3 w-3 mr-1" />
                             Permisos
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                             title="Cambiar contraseña"
                             onClick={() => { setEditingPwdId(editingPwdId === tech.id ? null : tech.id); setEditPassword(''); }}
                           >
                             <Key className="h-3 w-3 mr-1" />
                             Contraseña
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7 text-slate-300 hover:text-red-500"
                             onClick={() => { if (window.confirm('¿Eliminar técnico?')) deleteMutation.mutate(tech.id); }}
                           >
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                          </div>
                          </div>
                          </div>
                          {editingPwdId === tech.id && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showEditPwd ? 'text' : 'password'}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Nueva contraseña"
                              className="pr-10 text-sm"
                            />
                            <button type="button" onClick={() => setShowEditPwd(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                            disabled={!editPassword}
                            onClick={() => handleUpdatePassword(tech.id)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingPwdId(null)}>Cancelar</Button>
                          </div>
                          )}
                          </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {technicians.length === 0 && !loadingTechs && (
            <Card className="p-8 text-center bg-white border-0 shadow-sm">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">Aún no hay técnicos registrados</p>
              <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Crear primer técnico
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Link company dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular técnico a empresa existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Técnico sin empresa</Label>
              <Select value={linkData.techId} onValueChange={(v) => setLinkData(p => ({ ...p, techId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {techsWithoutCompany.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa</Label>
              {existingCompanies.length > 0 ? (
                <Select
                  value={linkData.companyId}
                  onValueChange={(v) => {
                    const found = existingCompanies.find(c => c.id === v);
                    setLinkData(p => ({ ...p, companyId: v, companyName: found?.name || '' }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona empresa existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__nueva__">+ Nueva empresa...</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(linkData.companyId === '__nueva__' || existingCompanies.length === 0) && (
                <Input
                  className="mt-2"
                  placeholder="Nombre de la nueva empresa"
                  value={linkData.companyName}
                  onChange={(e) => setLinkData(p => ({ ...p, companyName: e.target.value, companyId: '' }))}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleLinkCompany}
                disabled={!linkData.techId || !linkData.companyName || sending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Vincular empresa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage technician dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar técnico: {manageTech?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={manageData.name}
                  onChange={(e) => setManageData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={manageData.phone}
                  onChange={(e) => setManageData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Especialidad</Label>
                <Input
                  value={manageData.specialty}
                  onChange={(e) => setManageData(p => ({ ...p, specialty: e.target.value }))}
                  placeholder="Climatización..."
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Nombre de empresa</Label>
              <Input
                value={manageData.companyName}
                onChange={(e) => setManageData(p => ({ ...p, companyName: e.target.value, companyId: '' }))}
                placeholder="Nombre de la empresa"
                className="mt-1"
              />
            </div>
            {existingCompanies.length > 0 && (
              <div>
                <Label>O selecciona empresa existente</Label>
                <Select
                  value={manageData.companyId}
                  onValueChange={(v) => {
                    const found = existingCompanies.find(c => c.id === v);
                    setManageData(p => ({ ...p, companyId: v, companyName: found?.name || p.companyName }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-slate-600 mb-2">Certificaciones F-Gas / RITE</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label className="text-xs">Nº Carné F-Gas</Label>
                  <Input value={manageData.fgas_cert_num} onChange={(e) => setManageData(p => ({ ...p, fgas_cert_num: e.target.value }))} placeholder="Nº certificado frigorista" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Nº Carné RITE</Label>
                  <Input value={manageData.rite_cert_num} onChange={(e) => setManageData(p => ({ ...p, rite_cert_num: e.target.value }))} placeholder="Nº habilitación RITE" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Nº Certificado Empresa F-Gas</Label>
                  <Input value={manageData.empresa_fgas_cert_num} onChange={(e) => setManageData(p => ({ ...p, empresa_fgas_cert_num: e.target.value }))} placeholder="Nº cert. empresa habilitada" className="mt-1 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox
                id="isAdmin"
                checked={manageData.isAdmin}
                onCheckedChange={(v) => setManageData(p => ({ ...p, isAdmin: !!v }))}
              />
              <div>
              <Label htmlFor="isAdmin" className="cursor-pointer font-medium text-amber-800">Gerente de empresa</Label>
              <p className="text-xs text-amber-600 mt-0.5">{isSessionTech ? 'Podrá crear e invitar trabajadores dentro de tu empresa' : 'Gerente: gestiona su empresa y sus trabajadores (no es admin de la plataforma)'}</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <p className="text-slate-500">Email de acceso: <span className="font-medium text-slate-700">{manageTech?.user_email || manageTech?.email}</span></p>
              {!isSessionTech && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
                onClick={async () => {
                  const email = manageTech?.user_email || manageTech?.email;
                  if (!email) return;
                  try {
                    await base44.users.inviteUser(email, 'user');
                    await base44.entities.Technician.update(manageTech.id, { invited_at: new Date().toISOString() });
                    queryClient.invalidateQueries({ queryKey: ['technicians'] });
                    toast.success(`Invitación enviada a ${email}`);
                  } catch {
                    toast.error('Error al enviar la invitación');
                  }
                }}
                disabled={sending}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Enviar/reenviar invitación de acceso
              </Button>
              )}
              {isSessionTech && (
                <p className="mt-2 text-xs text-slate-500">El técnico accederá desde "Acceso Técnico" con el email y la contraseña que asignaste arriba.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowManageDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveManage}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permisos Dialog */}
      <Dialog open={showPermisosDialog} onOpenChange={setShowPermisosDialog}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Permisos de acceso</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-4 px-4">
            {permisosTech && (
              <PermisosTecnicoPanel
                technician={permisosTech}
                onPermisoChange={setPermisosLocal}
                onUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['technicians'] });
                }}
              />
            )}
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowPermisosDialog(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                setSending(true);
                try {
                  if (isSessionTech) {
                    await base44.functions.invoke('getCompanyData', {
                      technician_email: sessionTechEmail, entity: 'technician_update',
                      technician_id: permisosTech.id, updates: { permisos: permisosLocal },
                    });
                  } else {
                    await base44.entities.Technician.update(permisosTech.id, { permisos: permisosLocal });
                  }
                  queryClient.invalidateQueries({ queryKey: ['technicians'] });
                  toast.success('Permisos guardados');
                  setShowPermisosDialog(false);
                } catch (err) {
                  toast.error('Error al guardar: ' + err.message);
                } finally {
                  setSending(false);
                }
              }}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar permisos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite / Create technician dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo técnico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre completo *</Label>
                <Input
                  value={inviteData.techName}
                  onChange={(e) => setInviteData(p => ({ ...p, techName: e.target.value }))}
                  placeholder="Juan García"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(p => ({ ...p, email: e.target.value }))}
                  placeholder="tecnico@empresa.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contraseña *</Label>
                <div className="relative mt-1">
                  <Input
                    type={showInvitePwd ? 'text' : 'password'}
                    value={inviteData.password}
                    onChange={(e) => setInviteData(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowInvitePwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showInvitePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar contraseña *</Label>
                <Input
                  type="password"
                  value={inviteData.passwordConfirm}
                  onChange={(e) => setInviteData(p => ({ ...p, passwordConfirm: e.target.value }))}
                  placeholder="••••••••"
                  className={`mt-1 ${inviteData.passwordConfirm && inviteData.password !== inviteData.passwordConfirm ? 'border-red-400' : ''}`}
                />
                {inviteData.passwordConfirm && inviteData.password !== inviteData.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-0.5">No coinciden</p>
                )}
              </div>
            </div>
            <div>
              <Label>Empresa / Grupo</Label>
              {existingCompanies.length > 0 ? (
                <Select
                  value={inviteData.companyId}
                  onValueChange={(v) => {
                    const found = existingCompanies.find(c => c.id === v);
                    setInviteData(p => ({ ...p, companyId: v, companyName: found?.name || '' }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona empresa existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__nueva__">+ Nueva empresa...</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(inviteData.companyId === '__nueva__' || existingCompanies.length === 0) && (
                <Input
                  className="mt-2"
                  placeholder="Nombre de la nueva empresa"
                  value={inviteData.companyName}
                  onChange={(e) => setInviteData(p => ({ ...p, companyName: e.target.value, companyId: '' }))}
                />
              )}
            </div>
            <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded-lg border border-blue-100">
              El técnico accederá desde <strong>"Acceso Técnico"</strong> con su email y la contraseña que asignes aquí.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleInviteTechnician}
                disabled={!inviteData.email || !inviteData.techName || !inviteData.password || sending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Crear técnico
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}