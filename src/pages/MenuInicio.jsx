import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thermometer, Loader2, Users, Wrench, Shield, UserPlus, ArrowLeft, KeyRound, ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function MenuInicio() {
  const navigate = useNavigate();
  const initialMode = new URLSearchParams(window.location.search).get('mode');
  const [mode, setMode] = useState(initialMode || null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [techCredentials, setTechCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [techLoginError, setTechLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: '', contactEmail: '', password: '', passwordConfirm: '',
    companyName: '', companyCif: '', companyAddress: '', technicianEmail: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSending, setRegisterSending] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  useEffect(() => {
    const autoLogin = async () => {
      if (sessionStorage.getItem('just_logged_out')) {
        sessionStorage.removeItem('just_logged_out');
        return;
      }
      // Técnico: primero sessionStorage, luego localStorage (persistencia entre pestañas)
      const activeTechSession = sessionStorage.getItem('technician_email') || localStorage.getItem('clilux_tech_email');
      if (activeTechSession) {
        sessionStorage.setItem('technician_email', activeTechSession);
        navigate(createPageUrl('HomeTecnico'));
        return;
      }
      const activeClientSession = sessionStorage.getItem('client_id');
      if (activeClientSession) {
        navigate(createPageUrl('HomeCliente'));
        return;
      }
      // Auto-login de cliente por localStorage
      const savedEmail = localStorage.getItem('clilux_email');
      const savedPassword = localStorage.getItem('clilux_password');
      if (savedEmail && savedPassword) {
        try {
          const res = await base44.functions.invoke('clientLogin', {
            email: savedEmail,
            password: savedPassword
          });
          if (res.data?.success) {
            sessionStorage.setItem('client_id', res.data.client_id);
            navigate(createPageUrl('HomeCliente'));
          }
        } catch {
          // Si falla el auto-login, simplemente mostrar el menú
        }
      }
    };
    autoLogin();
  }, [navigate]);

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await base44.functions.invoke('clientLogin', {
        email: credentials.email.trim(),
        password: credentials.password
      });
      const data = res.data;
      if (data?.success) {
        localStorage.setItem('clilux_email', credentials.email.trim());
        localStorage.setItem('clilux_password', credentials.password);
        sessionStorage.setItem('client_id', data.client_id);
        navigate(createPageUrl('HomeCliente'));
      } else {
        setLoginError(data?.error || 'Email o contraseña incorrectos');
      }
    } catch (err) {
      setLoginError('Error al iniciar sesión: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTechnicianLogin = async (e) => {
    e.preventDefault();
    setTechLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await base44.functions.invoke('technicianLogin', {
        email: techCredentials.email.trim(),
        password: techCredentials.password.trim()
      });
      const data = res.data;
      if (data?.success) {
        // Limpiar cualquier sesión de cliente previa
        sessionStorage.removeItem('client_id');
        localStorage.removeItem('clilux_email');
        localStorage.removeItem('clilux_password');
        // Guardar sesión de técnico en AMBOS storages para persistencia
        sessionStorage.setItem('technician_email', data.email);
        localStorage.setItem('clilux_tech_email', data.email);
        if (data.id) sessionStorage.setItem('technician_id', data.id);
        navigate(createPageUrl('HomeTecnico'));
      } else {
        setTechLoginError(data?.error || 'Email o contraseña incorrectos');
      }
    } catch (err) {
      setTechLoginError('Error al iniciar sesión: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogin = () => base44.auth.redirectToLogin(createPageUrl('HomeTecnico'));

  const logoUrl = null;
  const companyName = 'Clilux';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo & brand */}
        <div className="text-center mb-8">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-20 object-contain mx-auto mb-4" />
            : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Thermometer className="h-10 w-10 text-white" />
              </div>
            )
          }
          <h1 className="text-white text-3xl font-bold tracking-tight">{companyName}</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de Gestión de Climatización</p>
        </div>

        {/* Panel */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">

          {/* ── Selección de modo ── */}
          {!mode && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs text-center uppercase tracking-widest mb-5 font-semibold">¿Cómo deseas acceder?</p>

              <button
                onClick={() => setMode('technician')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-700/60 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <Wrench className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Técnico</p>
                  <p className="text-slate-400 text-xs">Gestión de equipos y clientes</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              <button
                onClick={() => setMode('client')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-700/60 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/30 transition-colors">
                  <Users className="h-6 w-6 text-teal-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Cliente</p>
                  <p className="text-slate-400 text-xs">Portal de seguimiento</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </button>

              <div className="pt-2">
                <div className="h-px bg-white/5 mb-4" />
                <button
                  onClick={handleAdminLogin}
                  className="w-full flex items-center gap-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-300 font-medium text-sm">Acceso Administrador</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-500/50" />
                </button>
                <button
                  onClick={() => setMode('admin_register')}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-400 py-3 transition-colors"
                >
                  ¿Primera vez? Solicitar acceso administrador
                </button>
              </div>
            </div>
          )}

          {/* ── Login técnico ── */}
          {mode === 'technician' && (
            <form onSubmit={handleTechnicianLogin} className="space-y-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Acceso Técnico</p>
                  <p className="text-slate-400 text-xs">Credenciales asignadas por tu administrador</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Email</Label>
                <Input type="email" value={techCredentials.email}
                  onChange={e => setTechCredentials(p => ({ ...p, email: e.target.value }))}
                  className="mt-1.5 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  placeholder="tecnico@empresa.com" required disabled={isLoggingIn} />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Contraseña</Label>
                <Input type="password" value={techCredentials.password}
                  onChange={e => setTechCredentials(p => ({ ...p, password: e.target.value }))}
                  className="mt-1.5 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  placeholder="••••••••" required disabled={isLoggingIn} />
              </div>
              {techLoginError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{techLoginError}</p>
                </div>
              )}
              <Button type="submit" disabled={isLoggingIn}
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Iniciar Sesión'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setMode(null); setTechLoginError(''); }}
                className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
            </form>
          )}

          {/* ── Login cliente ── */}
          {mode === 'client' && (
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Portal Cliente</p>
                  <p className="text-slate-400 text-xs">Accede a tus equipos e incidencias</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Email</Label>
                <Input type="email" value={credentials.email}
                  onChange={e => setCredentials(p => ({ ...p, email: e.target.value }))}
                  className="mt-1.5 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-teal-500"
                  placeholder="tu@email.com" required disabled={isLoggingIn} />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Contraseña</Label>
                <Input type="password" value={credentials.password}
                  onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))}
                  className="mt-1.5 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-teal-500"
                  placeholder="••••••••" required disabled={isLoggingIn} />
              </div>
              {loginError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{loginError}</p>
                </div>
              )}
              <Button type="submit" disabled={isLoggingIn}
                className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl">
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Iniciar Sesión'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setMode(null); setLoginError(''); }}
                className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
            </form>
          )}

          {/* ── Registro administrador ── */}
          {mode === 'admin_register' && !registerDone && (
            <div className="space-y-3">
              <p className="text-white font-semibold mb-1">Solicitud de acceso administrador</p>
              <p className="text-slate-400 text-xs mb-4">Rellena el formulario y revisaremos tu solicitud.</p>
              {[
                { label: 'Nombre completo *', key: 'fullName', type: 'text', placeholder: 'Juan García López' },
                { label: 'Email de acceso *', key: 'contactEmail', type: 'email', placeholder: 'admin@tuempresa.com' },
                { label: 'Contraseña *', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'Confirmar contraseña *', key: 'passwordConfirm', type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-slate-300 text-xs">{f.label}</Label>
                  <Input type={f.type} value={registerData[f.key]}
                    onChange={e => setRegisterData(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                </div>
              ))}
              <div className="pt-2 border-t border-white/10">
                <p className="text-amber-400 text-xs font-semibold mb-2 uppercase tracking-wide">Datos de la empresa</p>
              </div>
              {[
                { label: 'Nombre de la empresa *', key: 'companyName', placeholder: 'Climatización S.L.' },
                { label: 'CIF / NIF *', key: 'companyCif', placeholder: 'B12345678' },
                { label: 'Dirección', key: 'companyAddress', placeholder: 'Calle Mayor 1, Madrid' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-slate-300 text-xs">{f.label}</Label>
                  <Input value={registerData[f.key]}
                    onChange={e => setRegisterData(p => ({ ...p, [f.key]: f.key === 'companyCif' ? e.target.value.toUpperCase() : e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                </div>
              ))}
              {registerError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{registerError}</p>
                </div>
              )}
              <Button
                onClick={async () => {
                  setRegisterError('');
                  const { fullName, contactEmail, password, passwordConfirm, companyName, companyCif } = registerData;
                  if (!fullName || !contactEmail || !password || !companyName || !companyCif) { setRegisterError('Rellena todos los campos obligatorios (*)'); return; }
                  if (password !== passwordConfirm) { setRegisterError('Las contraseñas no coinciden'); return; }
                  if (password.length < 6) { setRegisterError('La contraseña debe tener al menos 6 caracteres'); return; }
                  setRegisterSending(true);
                  try {
                    const existing = await base44.entities.AdminRequest.filter({ company_cif: companyCif.toUpperCase() });
                    if (existing.length > 0) { setRegisterError('Ya existe una solicitud con ese CIF.'); setRegisterSending(false); return; }
                    await base44.entities.AdminRequest.create({
                      full_name: fullName, contact_email: contactEmail,
                      company_name: companyName, company_cif: companyCif.toUpperCase(),
                      company_address: registerData.companyAddress,
                      technician_email: registerData.technicianEmail || null, status: 'pending',
                    });
                    setRegisterDone(true);
                  } catch (err) {
                    setRegisterError('Error al enviar: ' + (err.message || ''));
                  } finally {
                    setRegisterSending(false);
                  }
                }}
                disabled={registerSending}
                className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl">
                {registerSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" />Enviar solicitud</>}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setMode(null); setRegisterError(''); }}
                className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
            </div>
          )}

          {/* ── Registro completado ── */}
          {mode === 'admin_register' && registerDone && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-white text-lg font-semibold">Solicitud enviada</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                El administrador revisará tus datos y te enviará una invitación a <strong className="text-white">{registerData.contactEmail}</strong>.
              </p>
              <Button onClick={() => { setMode(null); setRegisterDone(false); setRegisterData({ fullName: '', contactEmail: '', password: '', passwordConfirm: '', companyName: '', companyCif: '', companyAddress: '', technicianEmail: '' }); }}
                className="w-full h-11 bg-slate-700 hover:bg-slate-600 text-white rounded-xl">
                Volver al inicio
              </Button>
            </div>
          )}

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© {new Date().getFullYear()} {companyName} · Todos los derechos reservados</p>
      </div>
    </div>
  );
}