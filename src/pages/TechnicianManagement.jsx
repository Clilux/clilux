import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Shield, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@$!%*?&';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function TechnicianManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [createdPassword, setCreatedPassword] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const technicians = users.filter(u => u.role === 'admin' || !u.user_email);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, fullName }) => {
      await base44.users.inviteUser(email, 'user');
      // También crear el registro Technician si no existe
      const existing = await base44.entities.Technician.filter({ email });
      if (existing.length === 0) {
        await base44.entities.Technician.create({
          name: fullName || email.split('@')[0],
          email,
          status: 'active',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setInviteSuccess(true);
      toast.success('Técnico invitado correctamente');
    },
    onError: (error) => {
      toast.error('Error al invitar técnico: ' + error.message);
    }
  });

  const createMutation = useMutation({
    mutationFn: async ({ email, full_name, password }) => {
      const technicianData = { 
        name: full_name || email.split('@')[0],
        email: email,
        specialty: 'Técnico HVAC',
        status: 'active'
      };
      await base44.entities.Technician.create(technicianData);
      
      const settingsAll = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      const settings = settingsAll[0] || { setting_key: 'main', client_users: [] };
      
      const updatedClientUsers = [
        ...(settings.client_users || []),
        { email, password, can_edit: true, role: 'technician' }
      ];
      
      if (settings.id) {
        await base44.entities.AppSettings.update(settings.id, { 
          client_users: updatedClientUsers 
        });
      } else {
        await base44.entities.AppSettings.create({ 
          setting_key: 'main',
          client_users: updatedClientUsers 
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setInviteSuccess(true);
      setCreatedPassword(variables.password);
      toast.success('Técnico creado correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear técnico: ' + error.message);
    }
  });

  const handleOpenDialog = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setShowPassword(false);
    setInviteSuccess(false);
    setCreatedPassword('');
    setShowDialog(true);
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error('Introduce el email del técnico');
      return;
    }
    inviteMutation.mutate({ email, fullName });
  };

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error('Introduce email y contraseña');
      return;
    }
    createMutation.mutate({ email, full_name: fullName, password });
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    setShowPassword(true);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Decorative spheres */}
      <div className="fixed top-20 right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      <div className="max-w-4xl mx-auto relative">
        <NavHeader title="Gestión de Técnicos" />

        <div className="flex justify-end mb-6">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Invitar Técnico
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nuevo Técnico</DialogTitle>
              </DialogHeader>
              
              {!inviteSuccess ? (
                <Tabs defaultValue="direct" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="direct">Crear Directo</TabsTrigger>
                    <TabsTrigger value="invite">Enviar Invitación</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="direct" className="space-y-4 py-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tecnico@ejemplo.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Nombre completo</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Contraseña *</Label>
                      <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña segura"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGeneratePassword}
                        >
                          Generar
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                      <p className="font-medium mb-1">✓ Creación directa</p>
                      <p className="text-xs">El técnico podrá iniciar sesión inmediatamente con estas credenciales. Compártele la contraseña de forma segura.</p>
                    </div>
                    <Button 
                      onClick={handleCreate} 
                      disabled={createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Crear Técnico
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="invite" className="space-y-4 py-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tecnico@ejemplo.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Nombre completo</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="mt-1"
                      />
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <p className="font-medium mb-1">ℹ️ Cómo funciona:</p>
                      <p className="text-xs">El técnico recibirá un email de bienvenida. Para acceder, deberá ir a la pantalla de login y pulsar <strong>"¿Olvidaste tu contraseña?"</strong> para establecer la suya. Revisar spam si no llega.</p>
                    </div>
                    <Button 
                      onClick={handleInvite} 
                      disabled={inviteMutation.isPending}
                      className="w-full"
                    >
                      {inviteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Enviar Invitación
                    </Button>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <Check className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                    <p className="font-medium text-emerald-800 mb-2">
                      {createdPassword ? '¡Técnico creado!' : '¡Invitación enviada!'}
                    </p>
                    {createdPassword ? (
                      <div className="space-y-3">
                        <p className="text-sm text-emerald-700">
                          Credenciales para <strong>{email}</strong>:
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-emerald-200">
                          <p className="text-xs text-slate-500 mb-1">Contraseña:</p>
                          <p className="font-mono text-sm font-semibold text-slate-800 break-all">{createdPassword}</p>
                        </div>
                        <p className="text-xs text-emerald-600">
                          ⚠️ Guarda esta contraseña de forma segura y compártela con el técnico.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-emerald-700">
                          Se ha enviado un email de bienvenida a <strong>{email}</strong>.
                        </p>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          <p className="font-semibold mb-1">📧 Instrucciones para el técnico:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Ir a la pantalla de inicio de sesión</li>
                            <li>Pulsar <strong>"¿Olvidaste tu contraseña?"</strong></li>
                            <li>Introducir su email y seguir el enlace recibido</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => setShowDialog(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Técnicos del Sistema
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-white/10" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {technicians.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {(user.full_name || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {technicians.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No hay técnicos registrados
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="mt-6 p-6 bg-blue-500/10 border-blue-500/30">
          <h3 className="font-medium text-blue-400 mb-2">ℹ️ Sobre las invitaciones</h3>
          <p className="text-sm text-blue-300/80">
            Las invitaciones se envían desde <strong>noreply@base44.com</strong>. Si el técnico no recibe el email:
          </p>
          <ul className="text-sm text-blue-300/80 list-disc list-inside mt-2 space-y-1">
            <li>Revisa la carpeta de spam/correo no deseado</li>
            <li>Verifica que el email sea correcto</li>
            <li>Añade noreply@base44.com a los contactos seguros</li>
          </ul>
        </Card>

        <Card className="mt-4 p-6 bg-amber-500/10 border-amber-500/30">
          <h3 className="font-medium text-amber-400 mb-2">Nota sobre integraciones</h3>
          <p className="text-sm text-amber-300/80">
            Para integrar con <strong>Stel Order</strong> y <strong>Google Calendar</strong>, 
            es necesario habilitar las funciones de backend en la configuración de la aplicación. 
            Contacta con el administrador para activar estas funcionalidades.
          </p>
        </Card>
      </div>
    </div>
  );
}