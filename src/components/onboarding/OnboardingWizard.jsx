import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, UserPlus, UserCog, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, Sparkles, Rocket, Briefcase, ShieldCheck,
} from 'lucide-react';

/**
 * Asistente de primera configuración para el GERENTE de empresa.
 * Pasos: 0) Bienvenida  1) Datos de la empresa  2) Mi perfil  3) Trabajadores (opcional)  4) Listo
 */
export default function OnboardingWizard({ techRecord, sessionTechEmail, onDismiss }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // ── Empresa ──
  const [company, setCompany] = useState({
    name: '', cif: '', address: '', city: '', postal_code: '', province: '', phone: '', email: '', web: '',
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // ── Perfil del gerente ──
  const [profile, setProfile] = useState({
    name: techRecord?.name || '', phone: techRecord?.phone || '', specialty: techRecord?.specialty || '',
    fgas_cert_num: techRecord?.fgas_cert_num || '', rite_cert_num: techRecord?.rite_cert_num || '',
    empresa_fgas_cert_num: techRecord?.empresa_fgas_cert_num || '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Trabajadores ──
  const [workers, setWorkers] = useState([{ name: '', email: '', password: '' }]);
  const [savingWorkers, setSavingWorkers] = useState(false);

  // Cargar datos de la empresa al montar
  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'company',
        });
        const c = res.data?.data || res.data || null;
        if (c) {
          setCompany(prev => ({
            name: c.name || prev.name, cif: c.cif || prev.cif, address: c.address || '',
            city: c.city || '', postal_code: c.postal_code || '', province: c.province || '',
            phone: c.phone || '', email: c.email || '', web: c.web || '',
          }));
        }
      } catch (e) { /* sin empresa todavía */ }
    })();
  }, [sessionTechEmail]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
    queryClient.invalidateQueries({ queryKey: ['technicians'] });
    queryClient.invalidateQueries({ queryKey: ['my-tech-record'] });
  };

  // ── Guardar empresa (paso 1) ──
  const handleSaveCompany = async () => {
    if (!company.name.trim() || !company.cif.trim()) {
      toast.error('Nombre y CIF de la empresa son obligatorios');
      return;
    }
    setSavingCompany(true);
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'company_update',
        record: {
          name: company.name.trim(), cif: company.cif.trim(), address: company.address.trim(),
          city: company.city.trim(), postal_code: company.postal_code.trim(),
          province: company.province.trim(), phone: company.phone.trim(),
          email: company.email.trim(), web: company.web.trim(),
        },
      });
      toast.success('Datos de la empresa guardados');
      invalidateAll();
      setStep(2);
    } catch (err) {
      toast.error('Error al guardar la empresa: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSavingCompany(false);
    }
  };

  // ── Guardar perfil del gerente (paso 2) ──
  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error('Tu nombre es obligatorio');
      return;
    }
    if (newPassword && newPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setSavingProfile(true);
    try {
      const updates = {
        name: profile.name.trim(), phone: profile.phone.trim(), specialty: profile.specialty.trim(),
        fgas_cert_num: profile.fgas_cert_num.trim(), rite_cert_num: profile.rite_cert_num.trim(),
        empresa_fgas_cert_num: profile.empresa_fgas_cert_num.trim(),
      };
      if (newPassword) updates.portal_password = newPassword.trim();
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'me_update', updates,
      });
      toast.success('Perfil actualizado');
      invalidateAll();
      setStep(3);
    } catch (err) {
      toast.error('Error al guardar el perfil: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Guardar trabajadores (paso 3) ──
  const handleSaveWorkers = async () => {
    const valid = workers.filter(w => w.name.trim() && w.email.trim() && w.password.trim());
    for (const w of valid) {
      if (w.password.length < 4) {
        toast.error('Las contraseñas deben tener al menos 4 caracteres');
        return;
      }
    }
    if (valid.length === 0) {
      // sin trabajadores → ir a finalizar
      setStep(4);
      return;
    }
    setSavingWorkers(true);
    try {
      const existing = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'technicians',
      });
      const existingEmails = (existing.data?.data || []).map(t => (t.email || '').toLowerCase());
      for (const w of valid) {
        if (existingEmails.includes(w.email.trim().toLowerCase())) {
          toast.error(`Ya existe un técnico con el email ${w.email}`);
          setSavingWorkers(false);
          return;
        }
      }
      for (const w of valid) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'technician_create',
          record: {
            name: w.name.trim(), email: w.email.trim().toLowerCase(),
            portal_password: w.password.trim(), status: 'active',
          },
        });
      }
      toast.success(`${valid.length} trabajador${valid.length > 1 ? 'es' : ''} creado${valid.length > 1 ? 's' : ''}`);
      invalidateAll();
      setStep(4);
    } catch (err) {
      toast.error('Error al crear trabajadores: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSavingWorkers(false);
    }
  };

  // ── Finalizar ──
  const finish = async () => {
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'company_update',
        record: { onboarding_completed: true },
      });
    } catch (e) { /* no crítico */ }
    invalidateAll();
    onDismiss?.();
  };

  const skip = () => onDismiss?.();

  const updateWorker = (idx, field, value) =>
    setWorkers(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  const addWorkerRow = () => setWorkers(prev => [...prev, { name: '', email: '', password: '' }]);
  const removeWorkerRow = (idx) => setWorkers(prev => prev.filter((_, i) => i !== idx));

  const companyName = company.name || techRecord?.company_name || 'tu empresa';
  const gerenteName = profile.name || techRecord?.name || sessionTechEmail;

  const steps = [
    { id: 'bienvenida', label: 'Bienvenida', icon: Sparkles },
    { id: 'empresa', label: 'Mi empresa', icon: Briefcase },
    { id: 'perfil', label: 'Mi perfil', icon: UserCog },
    { id: 'trabajadores', label: 'Trabajadores', icon: Users },
    { id: 'listo', label: 'Listo', icon: Rocket },
  ];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) skip(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Stepper header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Configuración inicial — Gerente</p>
                <p className="text-blue-100 text-xs">{companyName}</p>
              </div>
            </div>
            <button onClick={skip} className="text-blue-100 hover:text-white text-xs underline">
              Omitir por ahora
            </button>
          </div>
          <div className="flex items-center gap-1 mt-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const done = step > i;
              const active = step === i;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className={`flex items-center gap-1.5 ${active ? 'text-white' : done ? 'text-blue-100' : 'text-blue-300/60'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${done ? 'bg-emerald-400 text-emerald-900' : active ? 'bg-white text-blue-700' : 'bg-white/20 text-white/70'}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${done ? 'bg-emerald-400' : 'bg-white/20'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Paso 0: Bienvenida */}
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Hola, {gerenteName?.split(' ')[0]}!</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto mb-6">
                Tu empresa <strong className="text-slate-700">{companyName}</strong> ya está dada de alta y tú eres el <strong>gerente</strong>.
                Vamos a configurarla en 3 pasos: completaremos los datos de tu empresa, tu perfil de gerente y,
                si quieres, crearemos a tus trabajadores.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                {[
                  { icon: Briefcase, label: 'Mi empresa', desc: 'Datos fiscales' },
                  { icon: UserCog, label: 'Mi perfil', desc: 'Gerente' },
                  { icon: Users, label: 'Trabajadores', desc: 'Tu equipo' },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <Icon className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                      <p className="text-[10px] text-slate-400">{c.desc}</p>
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => setStep(1)} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6">
                Empezar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Paso 1: Datos de la empresa */}
          {step === 1 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" /> Datos de tu empresa
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Estos datos aparecerán en tus certificados, contratos y documentos.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre / Razón social *</Label>
                  <Input value={company.name} onChange={(e) => setCompany(p => ({ ...p, name: e.target.value }))} placeholder="Climatización Sur SL" className="mt-1" />
                </div>
                <div>
                  <Label>CIF / NIF *</Label>
                  <Input value={company.cif} onChange={(e) => setCompany(p => ({ ...p, cif: e.target.value }))} placeholder="B12345678" className="mt-1" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={company.phone} onChange={(e) => setCompany(p => ({ ...p, phone: e.target.value }))} placeholder="+34 900 000 000" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Input value={company.address} onChange={(e) => setCompany(p => ({ ...p, address: e.target.value }))} placeholder="Calle..." className="mt-1" />
                </div>
                <div>
                  <Label>Código postal</Label>
                  <Input value={company.postal_code} onChange={(e) => setCompany(p => ({ ...p, postal_code: e.target.value }))} placeholder="28001" className="mt-1" />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input value={company.city} onChange={(e) => setCompany(p => ({ ...p, city: e.target.value }))} placeholder="Madrid" className="mt-1" />
                </div>
                <div>
                  <Label>Provincia</Label>
                  <Input value={company.province} onChange={(e) => setCompany(p => ({ ...p, province: e.target.value }))} placeholder="Madrid" className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={company.email} onChange={(e) => setCompany(p => ({ ...p, email: e.target.value }))} placeholder="info@empresa.com" className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Mi perfil */}
          {step === 2 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" /> Tu perfil de gerente
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Tu nombre aparecerá en los partes de trabajo y certificados. Puedes cambiar tu contraseña de acceso aquí.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre completo *</Label>
                  <Input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Juan García" className="mt-1" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+34 600 000 000" className="mt-1" />
                </div>
                <div>
                  <Label>Especialidad</Label>
                  <Input value={profile.specialty} onChange={(e) => setProfile(p => ({ ...p, specialty: e.target.value }))} placeholder="Climatización" className="mt-1" />
                </div>
              </div>
              <div className="border-t border-slate-200 mt-4 pt-4">
                <p className="text-xs font-medium text-slate-600 mb-2">Certificaciones (opcional)</p>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs">Nº Carné F-Gas</Label>
                    <Input value={profile.fgas_cert_num} onChange={(e) => setProfile(p => ({ ...p, fgas_cert_num: e.target.value }))} placeholder="Nº certificado frigorista" className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Carné RITE</Label>
                    <Input value={profile.rite_cert_num} onChange={(e) => setProfile(p => ({ ...p, rite_cert_num: e.target.value }))} placeholder="Nº habilitación RITE" className="mt-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Certificado Empresa F-Gas</Label>
                    <Input value={profile.empresa_fgas_cert_num} onChange={(e) => setProfile(p => ({ ...p, empresa_fgas_cert_num: e.target.value }))} placeholder="Nº cert. empresa habilitada" className="mt-1 text-sm" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 mt-4 pt-4">
                <Label>Contraseña de acceso</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Con esta contraseña entrarás a la app con tu email <strong>{sessionTechEmail}</strong>.</p>
              </div>
            </div>
          )}

          {/* Paso 3: Trabajadores */}
          {step === 3 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" /> Crea a tus trabajadores
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Opcional: añade ya a tu equipo o hazlo más tarde desde <strong>Administración</strong>.
                Entrarán con su email y la contraseña que les asignes.
              </p>
              <div className="space-y-3">
                {workers.map((w, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs">Nombre</Label>
                      <Input value={w.name} onChange={(e) => updateWorker(idx, 'name', e.target.value)} placeholder="Ana López" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={w.email} onChange={(e) => updateWorker(idx, 'email', e.target.value)} placeholder="ana@empresa.com" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className="text-xs">Contraseña</Label>
                      <Input value={w.password} onChange={(e) => updateWorker(idx, 'password', e.target.value)} placeholder="••••••" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      {workers.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeWorkerRow(idx)} className="text-red-400 hover:text-red-600 h-9 w-9 p-0">✕</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addWorkerRow} className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-50 h-9">
                <UserPlus className="h-4 w-4 mr-2" /> Añadir otro trabajador
              </Button>
            </div>
          )}

          {/* Paso 4: Listo */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Rocket className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Todo configurado!</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto mb-6">
                Tu empresa <strong className="text-slate-700">{companyName}</strong> ya está lista.
                Ya puedes empezar a crear clientes, edificios y equipos desde el menú principal.
              </p>
              <Button onClick={finish} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6">
                Entrar a la aplicación <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step > 0 && step < 4 && (
          <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-white">
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} className="text-slate-500">
              <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
            </Button>
            {step === 1 && (
              <Button onClick={handleSaveCompany} disabled={savingCompany} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingCompany ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Guardar y continuar
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Guardar y continuar
              </Button>
            )}
            {step === 3 && (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(4)} className="text-slate-500">
                  Saltar
                </Button>
                <Button onClick={handleSaveWorkers} disabled={savingWorkers} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {savingWorkers ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Guardar trabajadores
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}