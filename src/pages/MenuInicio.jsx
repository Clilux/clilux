import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thermometer, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function MenuInicio() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    }
  });

  // Cargar credenciales guardadas al montar
  useEffect(() => {
    const savedEmail = localStorage.getItem('clilux_email');
    const savedPassword = localStorage.getItem('clilux_password');
    if (savedEmail && savedPassword) {
      setCredentials({ email: savedEmail, password: savedPassword });
    }
  }, []);

  // Auto-login si hay credenciales guardadas
  useEffect(() => {
    const autoLogin = async () => {
      const savedEmail = localStorage.getItem('clilux_email');
      const savedPassword = localStorage.getItem('clilux_password');
      
      if (savedEmail && savedPassword && settings) {
        // Verificar si es usuario cliente
        const clientUsers = settings.client_users || [];
        const clientUser = clientUsers.find(u => u.email === savedEmail && u.password === savedPassword);
        
        if (clientUser) {
          sessionStorage.setItem('client_id', clientUser.client_id);
          navigate(createPageUrl('HomeCliente'));
          return;
        }

        // Si no es cliente, verificar si está autenticado como técnico
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            navigate(createPageUrl('HomeTecnico'));
          }
        } catch (error) {
          // No hacer nada, mostrar login normal
        }
      }
    };
    
    autoLogin();
  }, [settings, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      // Verificar si es usuario cliente
      const clientUsers = settings?.client_users || [];
      const clientUser = clientUsers.find(u => u.email === credentials.email && u.password === credentials.password);
      
      if (clientUser) {
        // Guardar credenciales
        localStorage.setItem('clilux_email', credentials.email);
        localStorage.setItem('clilux_password', credentials.password);
        sessionStorage.setItem('client_id', clientUser.client_id);
        
        // Login como cliente (sin autenticación de Base44)
        navigate(createPageUrl('HomeCliente'));
        return;
      }

      // Si no es cliente, guardar credenciales y redirigir a login técnico
      localStorage.setItem('clilux_email', credentials.email);
      localStorage.setItem('clilux_password', credentials.password);
      
      await base44.auth.redirectToLogin(createPageUrl('HomeTecnico'));
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md p-8 bg-white/10 backdrop-blur-sm border-white/20 relative z-10">
        <div className="text-center mb-8">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-20 object-contain mx-auto mb-4" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Thermometer className="h-10 w-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white">{settings?.company_name || 'Clilux M'}</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestión de Climatización</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label className="text-white text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              placeholder="tu@email.com"
              required
              disabled={isLoggingIn}
            />
          </div>

          <div>
            <Label className="text-white text-sm font-medium">Contraseña</Label>
            <Input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              placeholder="••••••••"
              required
              disabled={isLoggingIn}
            />
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 h-11"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>
          
          <Button 
            type="button"
            variant="outline"
            onClick={() => {
              localStorage.removeItem('clilux_email');
              localStorage.removeItem('clilux_password');
              sessionStorage.removeItem('client_id');
              setCredentials({ email: '', password: '' });
              toast.success('Credenciales olvidadas');
            }}
            className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 mt-2"
          >
            Olvidar credenciales
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Acceso para técnicos y clientes
          </p>
        </div>
      </Card>

      <p className="absolute bottom-6 text-center text-slate-500 text-sm">
        © 2024 Clilux - Todos los derechos reservados
      </p>
    </div>
  );
}