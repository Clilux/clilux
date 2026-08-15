import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Building2, Users, UserPlus, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, Sparkles, Rocket, Briefcase,
} from 'lucide-react';

/**
 * Asistente de primera configuración para administradores de empresa nuevos.
 * Se muestra cuando el admin entra por primera vez y aún no tiene clientes.
 * Pasos: 1) Bienvenida  2) Crear primeros técnicos  3) Crear primer cliente  4) Listo
 */
export default function OnboardingWizard({ techRecord, sessionTechEmail, onComplete, onDismiss }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // ── Paso 2: técnicos ──
  const [techs, setTechs] = useState([
    { name: '', email: '', password: '' },
  ]);
  const [savingTechs, setSavingTechs] = useState(false);

  // ── Paso 3: primer cliente ──
  const [client, setClient] = useState({ name: '', cif: '', contact_person: '', phone: '', address: '' });
  const [savingClient, setSavingClient] = useState(false);

  const companyName = techRecord?.company_name || 'tu empresa';
  const adminName = techRecord?.name || sessionTechEmail;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
    queryClient.invalidateQueries({ queryKey: ['technicians'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  // ── Guardar técnicos creados (paso 2) ──
  const handleSaveTechs = async () => {
    const valid = techs.filter(t => t.name.trim() && t.email.trim() && t.password.trim());
    if (valid.length === 0) {
      toast.error('Añade al menos un técnico con nombre, email y contraseña');
      return;
    }
    for (const t of valid) {
      if (t.password.length < 4) {
        toast.error('Las contraseñas deben tener al menos 4 caracteres');
        return;
      }
    }
    setSavingTechs(true);
    try {
      const existing = await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail, entity: 'technicians',
      });
      const existingEmails = (existing.data?.data || []).map(t => (t.email || '').toLowerCase());
      for (const t of valid) {
        if (existingEmails.includes(t.email.trim().toLowerCase())) {
          toast.error(`Ya existe un técnico con el email ${t.email}`);
          setSavingTechs(false);
          return;
        }
      }
      for (const t of valid) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'technician_create',
          record: {
            name: t.name.trim(),
            email: t.email.trim().toLowerCase(),
            portal_password: t.password.trim(),
            status: 'active',
          },
        });
      }
      toast.success(`${valid.length} técnico${valid.length > 1 ? 's' : ''} creado${valid.length > 1 ? 's' : ''}`);
      invalidateAll();
      setStep(3);
    } catch (err) {
      toast.error('Error al crear técnicos: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSavingTechs(false);
    }
  };

  // ── Guardar primer cliente (paso 3) ──
  const handleSaveClient = async () => {
    if (!client.name.trim() || !client.cif.trim()) {
      toast.error('Nombre y CIF del cliente son obligatorios');
      return;
    }
    setSavingClient(true);
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail,
        entity: 'client_create',
        record: {
          name: client.name.trim(),
          cif: client.cif.trim(),
          contact_person: client.contact_person.trim() || undefined,
          phone: client.phone.trim() || undefined,
          address: client.address.trim() || undefined,
          assigned_technician: sessionTechEmail,
          assigned_technician_name: adminName,
        },
      });
      toast.success('Cliente creado correctamente');
      invalidateAll();
      setStep(4);
    } catch (err) {
      toast.error('Error al crear el cliente: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSavingClient(false);
    }
  };

  const finish = () => {
    onComplete?.();
    onDismiss?.();
  };

  const skip = () => {
    onDismiss?.();
  };

  const updateTech = (idx, field, value) => {
    setTechs(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };
  const addTechRow = () => setTechs(prev => [...prev, { name: '', email: '', password: '' }]);
  const removeTechRow = (idx) => setTechs(prev => prev.filter((_, i) => i !== idx));

  const steps = [
    { id: 'bienvenida', label: 'Bienvenida', icon: Sparkles },
    { id: 'tecnicos', label: 'Técnicos', icon: Users },
    { id: 'cliente', label: 'Primer cliente', icon: Briefcase },
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
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Configuración inicial</p>
                <p className="text-blue-100 text-xs">{companyName}</p>
              </div>
            </div>
            <button onClick={skip} className="text-blue-100 hover:text-white text-xs underline">
              Omitir por ahora
            </button>
          </div>
          {/* Step indicator */}
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
          {/* ── Paso 0: Bienvenida ── */}
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Bienvenido a Clilux, {adminName?.split(' ')[0]}!</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto mb-6">
                Tu empresa <strong className="text-slate-700">{companyName}</strong> ya está dada de alta.
                Vamos a configurarla en 3 pasos: crearás tus primeros técnicos y tu primer cliente.
                Después podrás empezar a registrar equipos, revisiones e incidencias.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                {[
                  { icon: Users, label: 'Técnicos', desc: 'Tu equipo' },
                  { icon: Briefcase, label: 'Clientes', desc: 'A quién mantienes' },
                  { icon: Building2, label: 'Edificios', desc: 'Instalaciones' },
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

          {/* ── Paso 1: Crear técnicos ── */}
          {step === 1 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" /> Crea tus primeros técnicos
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Son las personas que trabajarán en la app (tú ya eres administrador). Entrarán con su email y la contraseña que les asignes.
              </p>
              <div className="space-y-3">
                {techs.map((t, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs">Nombre</Label>
                      <Input value={t.name} onChange={(e) => updateTech(idx, 'name', e.target.value)} placeholder="Juan García" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={t.email} onChange={(e) => updateTech(idx, 'email', e.target.value)} placeholder="tecnico@empresa.com" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <Label className="text-xs">Contraseña</Label>
                      <Input value={t.password} onChange={(e) => updateTech(idx, 'password', e.target.value)} placeholder="••••••" className="h-9" />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      {techs.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeTechRow(idx)} className="text-red-400 hover:text-red-600 h-9 w-9 p-0">
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addTechRow} className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-50 h-9">
                <UserPlus className="h-4 w-4 mr-2" /> Añadir otro técnico
              </Button>
            </div>
          )}

          {/* ── Paso 2: Primer cliente ── */}
          {step === 2 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" /> Crea tu primer cliente
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                El cliente es la empresa o instalación a la que darás mantenimiento. Después podrás añadirle edificios y equipos.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre / Razón social *</Label>
                  <Input value={client.name} onChange={(e) => setClient(p => ({ ...p, name: e.target.value }))} placeholder="Hotel Costa SA" className="mt-1" />
                </div>
                <div>
                  <Label>CIF / NIF *</Label>
                  <Input value={client.cif} onChange={(e) => setClient(p => ({ ...p, cif: e.target.value }))} placeholder="B12345678" className="mt-1" />
                </div>
                <div>
                  <Label>Persona de contacto</Label>
                  <Input value={client.contact_person} onChange={(e) => setClient(p => ({ ...p, contact_person: e.target.value }))} placeholder="Responsable" className="mt-1" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={client.phone} onChange={(e) => setClient(p => ({ ...p, phone: e.target.value }))} placeholder="+34 600 000 000" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Input value={client.address} onChange={(e) => setClient(p => ({ ...p, address: e.target.value }))} placeholder="Calle..." className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* ── Paso 3: Listo ── */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Rocket className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Todo listo!</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto mb-6">
                Tu empresa <strong className="text-slate-700">{companyName}</strong> ya está configurada.
                Ya puedes empezar a registrar edificios, equipos y revisiones para tus clientes.
              </p>
              <Button onClick={finish} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6">
                Entrar a la aplicación <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step > 0 && step < 3 && (
          <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-white">
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} className="text-slate-500">
              <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
            </Button>
            {step === 1 && (
              <Button onClick={handleSaveTechs} disabled={savingTechs} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingTechs ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Guardar y continuar
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleSaveClient} disabled={savingClient} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingClient ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Crear cliente
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}