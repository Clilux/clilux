import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, UserPlus, Loader2, Check, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TechniciansTab({ technicians, queryClient }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');

  const inviteMutation = useMutation({
    mutationFn: async ({ email, name }) => {
      // 1. Invitar como usuario de la app (envía email de activación)
      await base44.users.inviteUser(email, 'user');
      // 2. Crear registro Technician si no existe
      const existing = await base44.entities.Technician.filter({ email });
      if (existing.length === 0) {
        await base44.entities.Technician.create({
          name: name || email.split('@')[0],
          email,
          status: 'active',
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setInvitedEmail(vars.email);
      setInviteEmail('');
      setInviteName('');
    },
    onError: (error) => {
      toast.error('Error al invitar: ' + error.message);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Introduce el email del técnico');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, name: inviteName });
  };

  return (
    <div className="space-y-4">
      {/* Invitar nuevo técnico */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Invitar Nuevo Técnico</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          El técnico recibirá un email para activar su cuenta. Deberá usar <strong>"¿Olvidaste tu contraseña?"</strong> en la pantalla de inicio de sesión para establecer su contraseña.
        </p>

        {invitedEmail ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-emerald-600" />
              <p className="font-medium text-emerald-800">¡Invitación enviada a {invitedEmail}!</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
              <p className="font-semibold mb-1">📧 Instrucciones para el técnico:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Revisar el email (también en spam) de <strong>noreply@base44.com</strong></li>
                <li>Hacer clic en el enlace del email</li>
                <li>Si no llega, ir al login y pulsar <strong>"¿Olvidaste tu contraseña?"</strong> con su email</li>
              </ol>
            </div>
            <Button size="sm" variant="outline" onClick={() => setInvitedEmail('')}>
              Invitar otro técnico
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email del técnico *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="tecnico@empresa.com"
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
              </div>
              <div>
                <Label className="text-xs">Nombre (opcional)</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Enviar invitación
            </Button>
          </div>
        )}
      </Card>

      {/* Lista de técnicos actuales */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Técnicos registrados</h3>
          </div>
          <Link to={createPageUrl('Technicians')}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Gestionar
            </Button>
          </Link>
        </div>

        {technicians.length === 0 ? (
          <p className="text-center py-6 text-slate-400">No hay técnicos registrados.</p>
        ) : (
          <div className="space-y-2">
            {technicians.map((tech) => (
              <div key={tech.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {(tech.name || tech.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{tech.name}</p>
                    <p className="text-xs text-slate-400">{tech.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${tech.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tech.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Nota informativa */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>¿Cómo acceden los técnicos?</strong> Desde la pantalla de inicio, pulsan <strong>"Acceso Técnico"</strong>. 
          Si es la primera vez, deben usar <strong>"¿Olvidaste tu contraseña?"</strong> con su email para establecer su contraseña.
        </p>
      </Card>
    </div>
  );
}