import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thermometer, Loader2, Users, Wrench, Shield, UserPlus, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';


export default function MenuInicio() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'client' | 'admin' | 'admin_register'
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: '',
    contactEmail: '',
    password: '',
    passwordConfirm: '',
    companyName: '',
    companyCif: '',
    companyAddress: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSending, setRegisterSending] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    }
  });

  // Auto-login para cliente si hay credenciales guardadas (solo si no viene de logout)
  useEffect(() => {
    const autoLogin = async () => {
      // Si hay flag de logout reciente, no hacer auto-login
      if (sessionStorage.getItem('just_logged_out')) {
        sessionStorage.removeItem('just_logged_out');
        return;
      }
      const savedEmail = localStorage.getItem('clilux_email');
      const savedPassword = localStorage.getItem('clilux_password');

      if (savedEmail && savedPassword && settings) {
        const clientUsers = settings.client_users || [];
        const clientUser = clientUsers.find((u) => u.email === savedEmail && u.password === savedPassword);

        if (clientUser) {
          sessionStorage.setItem('client_id', clientUser.client_id);
          navigate(createPageUrl('HomeCliente'));
        }
      }
    };

    autoLogin();
  }, [settings, navigate]);

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const clientUsers = settings?.client_users || [];
      const clientUser = clientUsers.find((u) => u.email === credentials.email && u.password === credentials.password);

      if (clientUser) {
        localStorage.setItem('clilux_email', credentials.email);
        localStorage.setItem('clilux_password', credentials.password);
        sessionStorage.setItem('client_id', clientUser.client_id);
        navigate(createPageUrl('HomeCliente'));
      } else {
        setLoginError('Email o contraseña incorrectos');
      }
    } catch (error) {
      setLoginError('Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTechnicianLogin = async () => {
    setIsLoggingIn(true);
    await base44.auth.redirectToLogin(createPageUrl('HomeTecnico'));
  };

  const handleForget = () => {
    localStorage.removeItem('clilux_email');
    localStorage.removeItem('clilux_password');
    sessionStorage.removeItem('client_id');
    setCredentials({ email: '', password: '' });
    setMode(null);
    toast.success('Credenciales olvidadas');
  };

  return (
    <div className="bg-slate-100 p-6 min-h-screen from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center">
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <Card className="bg-[#f0f5f5] text-card-foreground p-8 rounded-xl border shadow w-full max-w-md backdrop-blur-sm border-white/20 relative z-10">
        <div className="text-center mb-8">
          {settings?.logo_url ?
          <img src={settings.logo_url} alt="Logo" className="h-20 object-contain mx-auto mb-4" /> :

          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Thermometer className="h-10 w-10 text-white" />
            </div>
          }
          <h1 className="text-white text-4xl font-bold">{settings?.company_name || 'Clilux M'}</h1>
          <p className="text-slate-400 mt-2 text-lg">Sistema de Gestión de Climatización</p>
        </div>

        {/* Selección de modo */}
        {!mode &&
        <div className="space-y-3">
            <p className="text-center text-slate-300 text-sm mb-5">¿Cómo deseas acceder?</p>
            <Button
            onClick={() => setMode('client')} className="bg-[#16bba4] text-white px-4 py-2 text-base font-medium rounded-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-12 hover:bg-blue-700 flex items-center justify-center gap-3">
              <Users className="h-5 w-5" />
              Acceso Cliente
            </Button>
            <Button
            onClick={handleTechnicianLogin} className="bg-[#525b57] text-white px-4 py-2 text-base font-medium rounded-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground w-full h-12 hover:bg-white/20 border border-white/20 flex items-center justify-center gap-3"
            variant="ghost">
              <Wrench className="h-5 w-5" />
              Acceso Técnico
            </Button>
            <Button
            onClick={() => setMode('admin')}
            className="bg-amber-700/80 text-white w-full h-12 hover:bg-amber-700 border border-amber-600/40 flex items-center justify-center gap-3 text-base font-medium rounded-md"
            variant="ghost">
              <Shield className="h-5 w-5" />
              Acceso Administrador
            </Button>

          </div>
        }

        {/* Modo administrador - elegir login o registro */}
        {mode === 'admin' &&
        <div className="space-y-4">
          <p className="text-center text-slate-300 text-sm mb-2">Panel de Administración</p>
          <Button
            onClick={() => base44.auth.redirectToLogin('/AdminPanel')}
            className="bg-amber-600 text-white w-full h-12 hover:bg-amber-700 flex items-center justify-center gap-3 text-base font-medium rounded-md"
          >
            <Shield className="h-5 w-5" />
            Iniciar sesión como administrador
          </Button>
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-slate-400 text-xs">¿Primera vez?</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <Button
            onClick={() => setMode('admin_register')}
            className="bg-white/10 border border-white/20 text-white w-full h-12 hover:bg-white/20 flex items-center justify-center gap-3 text-base font-medium rounded-md"
            variant="ghost"
          >
            <UserPlus className="h-5 w-5" />
            Registrarse como nuevo administrador
          </Button>
          <Button
            type="button"
            onClick={() => setMode(null)}
            className="w-full h-10 bg-white/5 border border-white/20 text-white hover:bg-white/10 text-sm font-medium"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
        }

        {/* Registro nuevo administrador */}
        {mode === 'admin_register' && !registerDone &&
        <div className="space-y-3">
          <p className="text-center text-slate-300 text-sm mb-1">Solicitud de acceso administrador</p>

          <div>
            <Label className="text-white text-sm">Nombre completo *</Label>
            <Input
              value={registerData.fullName}
              onChange={(e) => setRegisterData(p => ({ ...p, fullName: e.target.value }))}
              placeholder="Juan García López"
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-white text-sm">Email de acceso / recuperación *</Label>
            <Input
              type="email"
              value={registerData.contactEmail}
              onChange={(e) => setRegisterData(p => ({ ...p, contactEmail: e.target.value }))}
              placeholder="admin@tuempresa.com"
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-white text-sm">Contraseña *</Label>
            <Input
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-white text-sm">Confirmar contraseña *</Label>
            <Input
              type="password"
              value={registerData.passwordConfirm}
              onChange={(e) => setRegisterData(p => ({ ...p, passwordConfirm: e.target.value }))}
              placeholder="••••••••"
              className={`mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400 ${registerData.passwordConfirm && registerData.password !== registerData.passwordConfirm ? 'border-red-400' : ''}`}
            />
            {registerData.passwordConfirm && registerData.password !== registerData.passwordConfirm && (
              <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <div className="pt-1 border-t border-white/10">
            <p className="text-xs text-amber-300 mb-2 font-medium">Datos de la empresa</p>
          </div>

          <div>
            <Label className="text-white text-sm">Nombre de la empresa *</Label>
            <Input
              value={registerData.companyName}
              onChange={(e) => setRegisterData(p => ({ ...p, companyName: e.target.value }))}
              placeholder="Climatización S.L."
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-white text-sm">CIF / NIF * (identificador único de empresa)</Label>
            <Input
              value={registerData.companyCif}
              onChange={(e) => setRegisterData(p => ({ ...p, companyCif: e.target.value.toUpperCase() }))}
              placeholder="B12345678"
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-white text-sm">Dirección</Label>
            <Input
              value={registerData.companyAddress}
              onChange={(e) => setRegisterData(p => ({ ...p, companyAddress: e.target.value }))}
              placeholder="Calle Mayor 1, Madrid"
              className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
          </div>

          {registerError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{registerError}</p>
            </div>
          )}

          <Button
            onClick={async () => {
              setRegisterError('');
              const { fullName, contactEmail, password, passwordConfirm, companyName, companyCif } = registerData;
              if (!fullName || !contactEmail || !password || !companyName || !companyCif) {
                setRegisterError('Rellena todos los campos obligatorios (*)');
                return;
              }
              if (password !== passwordConfirm) {
                setRegisterError('Las contraseñas no coinciden');
                return;
              }
              if (password.length < 6) {
                setRegisterError('La contraseña debe tener al menos 6 caracteres');
                return;
              }
              setRegisterSending(true);
              try {
                // Verificar que no exista ya un admin con ese CIF
                const existing = await base44.entities.AdminRequest.filter({ company_cif: companyCif.toUpperCase() });
                if (existing.length > 0) {
                  setRegisterError('Ya existe una solicitud o empresa registrada con ese CIF. Solo puede haber un administrador por empresa.');
                  setRegisterSending(false);
                  return;
                }
                // Guardar la solicitud
                await base44.entities.AdminRequest.create({
                  full_name: fullName,
                  contact_email: contactEmail,
                  company_name: companyName,
                  company_cif: companyCif.toUpperCase(),
                  company_address: registerData.companyAddress,
                  status: 'pending',
                });
                setRegisterDone(true);
              } catch (err) {
                setRegisterError('Error al enviar la solicitud: ' + (err.message || ''));
              } finally {
                setRegisterSending(false);
              }
            }}
            disabled={registerSending || (registerData.passwordConfirm && registerData.password !== registerData.passwordConfirm)}
            className="bg-amber-600 text-white w-full h-12 hover:bg-amber-700 flex items-center justify-center gap-3 text-base font-medium rounded-md"
          >
            {registerSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Enviar solicitud de registro
          </Button>
          <Button
            type="button"
            onClick={() => { setMode('admin'); setRegisterError(''); }}
            className="w-full h-10 bg-white/5 border border-white/20 text-white hover:bg-white/10 text-sm font-medium"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
        }

        {/* Registro completado */}
        {mode === 'admin_register' && registerDone &&
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-white text-lg font-semibold">Solicitud enviada</h3>
          <p className="text-slate-300 text-sm">
            Tu solicitud de acceso como administrador ha sido registrada. Un administrador del sistema revisará tus datos y te enviará un email de acceso a <strong className="text-white">{registerData.contactEmail}</strong>.
          </p>
          <Button
            onClick={() => { setMode(null); setRegisterDone(false); setRegisterData({ fullName: '', contactEmail: '', password: '', passwordConfirm: '', companyName: '', companyCif: '', companyAddress: '' }); }}
            className="w-full h-11 bg-white/10 border border-white/20 text-white hover:bg-white/20"
            variant="ghost"
          >
            Volver al inicio
          </Button>
        </div>
        }

        {/* Formulario cliente */}
        {mode === 'client' &&
        <form onSubmit={handleClientLogin} className="space-y-5">
            <div>
              <Label className="text-white text-sm font-medium">Email</Label>
              <Input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              placeholder="tu@email.com"
              required
              disabled={isLoggingIn} />

            </div>

            <div>
              <Label className="text-white text-sm font-medium">Contraseña</Label>
              <Input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              placeholder="••••••••"
              required
              disabled={isLoggingIn} />

            </div>

            {loginError &&
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{loginError}</p>
              </div>
          }

            <Button
            type="submit" className="bg-stone-600 text-primary-foreground px-4 py-2 text-base font-medium rounded-[10px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-12 hover:bg-blue-700"

            disabled={isLoggingIn}>

              {isLoggingIn ?
            <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Iniciando sesión...
                </> :

            'Iniciar Sesión'
            }
            </Button>

            <Button
            type="button"
            onClick={() => {setMode(null);setLoginError('');}}
            className="w-full h-12 bg-white/5 border border-white/20 text-white hover:bg-white/10 text-base font-medium"
            variant="ghost">

              ← Volver
            </Button>

            <Button
            type="button"
            onClick={handleForget}
            className="w-full h-12 bg-white/5 border border-white/20 text-white hover:bg-white/10 text-base font-medium"
            variant="ghost">

              Olvidar credenciales
            </Button>
          </form>
        }

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">Acceso para técnicos y clientes</p>
        </div>
      </Card>

      <p className="absolute bottom-6 text-center text-slate-500 text-sm">
        © 2024 Clilux - Todos los derechos reservados
      </p>
    </div>);

}