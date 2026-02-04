import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, Shield, Loader2, Check } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function TechnicianManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const technicians = users.filter(u => u.role === 'admin' || !u.user_email);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteSuccess(true);
      toast.success('Técnico invitado correctamente');
    },
    onError: (error) => {
      toast.error('Error al invitar técnico: ' + error.message);
    }
  });

  const handleOpenDialog = () => {
    setEmail('');
    setFullName('');
    setInviteSuccess(false);
    setShowDialog(true);
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error('Introduce el email del técnico');
      return;
    }
    inviteMutation.mutate({ email, role: 'admin' });
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
                <DialogTitle>Invitar Nuevo Técnico</DialogTitle>
              </DialogHeader>
              
              {!inviteSuccess ? (
                <div className="space-y-4 py-4">
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
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-1">ℹ️ Cómo funciona:</p>
                    <p className="text-xs">El técnico recibirá un email de invitación con un enlace para crear su contraseña y acceder a la aplicación.</p>
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
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <Check className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                    <p className="font-medium text-emerald-800 mb-2">¡Invitación enviada!</p>
                    <p className="text-sm text-emerald-700">
                      {email} recibirá un email con instrucciones para crear su contraseña y acceder a la aplicación.
                    </p>
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

        <Card className="mt-6 p-6 bg-amber-500/10 border-amber-500/30">
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