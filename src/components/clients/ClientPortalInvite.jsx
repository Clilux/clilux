import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, Trash2, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPortalInvite({ client, isSessionTech, techEmail }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  const invoke = (entity, extra = {}) =>
    base44.functions.invoke('getCompanyData', { technician_email: techEmail, entity, ...extra });

  // ¿Es gerente? (sesión portal) — los admin Base44 siempre pueden
  const { data: me } = useQuery({
    queryKey: ['me', techEmail],
    queryFn: async () => {
      const res = await invoke('me');
      return res.data?.data || null;
    },
    enabled: isSessionTech && !!techEmail,
  });
  const isGerente = !isSessionTech || !!me?.is_admin;

  // Usuarios del portal para este cliente
  const { data: portalUsers = [] } = useQuery({
    queryKey: ['client-portal-users', client.id, isSessionTech ? techEmail : 'direct'],
    queryFn: async () => {
      let users;
      if (isSessionTech) {
        const res = await invoke('settings');
        users = res.data?.data?.client_users || [];
      } else {
        const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
        users = all[0]?.client_users || [];
      }
      return users.filter(u => u.client_id === client.id);
    },
  });

  const genPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    setPassword(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!email || !password) throw new Error('Email y contraseña obligatorios');
      if (isSessionTech) {
        await invoke('client_invite', { client_id: client.id, email, password, can_edit: canEdit });
      } else {
        const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
        const s = all[0];
        if (!s) throw new Error('Configuración no encontrada');
        const users = Array.isArray(s.client_users) ? [...s.client_users] : [];
        const idx = users.findIndex(u => u.client_id === client.id && (u.email || '').toLowerCase() === email.trim().toLowerCase());
        const entry = { email: email.trim().toLowerCase(), password, client_id: client.id, can_edit: canEdit };
        if (idx >= 0) users[idx] = entry; else users.push(entry);
        await base44.entities.AppSettings.update(s.id, { client_users: users });
        await base44.entities.Client.update(client.id, { user_email: email.trim().toLowerCase() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-users', client.id] });
      queryClient.invalidateQueries({ queryKey: ['client', client.id] });
      toast.success('Invitación creada. El cliente ya puede entrar al portal con ese email y contraseña.');
      setEmail(''); setPassword(''); setCanEdit(false);
    },
    onError: (e) => toast.error(e?.message || 'Error al invitar'),
  });

  const deleteUser = async (u) => {
    if (!confirm(`¿Quitar el acceso de ${u.email}?`)) return;
    try {
      if (isSessionTech) {
        await invoke('client_user_delete', { client_id: client.id, email: u.email });
      } else {
        const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
        const s = all[0];
        const users = (s?.client_users || []).filter(x => !(x.client_id === client.id && x.email === u.email));
        await base44.entities.AppSettings.update(s.id, { client_users: users });
      }
      queryClient.invalidateQueries({ queryKey: ['client-portal-users', client.id] });
      toast.success('Acceso eliminado');
    } catch (e) { toast.error('Error al eliminar el acceso'); }
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm mt-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-blue-100"><Mail className="h-5 w-5 text-blue-600" /></div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">Acceso al Portal del Cliente</h3>
          <p className="text-sm text-slate-500">El cliente entra al portal con email y contraseña para ver sus edificios, equipos e incidencias.</p>
        </div>
      </div>

      {portalUsers.length > 0 && (
        <div className="space-y-2 mb-4">
          {portalUsers.map((u, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <div className="min-w-0">
                <p className="text-sm font-mono text-blue-900 truncate">{u.email}</p>
                <p className="text-xs text-blue-600">Contraseña: <span className="font-mono">{u.password}</span>{u.can_edit ? ' · puede editar' : ' · solo lectura'}</p>
              </div>
              {isGerente && (
                <Button variant="ghost" size="icon" onClick={() => deleteUser(u)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isGerente ? (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-600 mb-1">Email del cliente</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Contraseña</Label>
              <div className="flex gap-2">
                <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" />
                <Button type="button" variant="outline" onClick={genPassword} title="Generar contraseña"><KeyRound className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="can_edit" checked={canEdit} onCheckedChange={v => setCanEdit(!!v)} />
            <label htmlFor="can_edit" className="text-sm text-slate-600">Permitir al cliente crear incidencias</label>
          </div>
          <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !email || !password} className="bg-blue-600 hover:bg-blue-700 text-white">
            {inviteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Invitando...</> : <><UserPlus className="h-4 w-4 mr-2" />Invitar al portal</>}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Solo el gerente puede invitar clientes al portal.</p>
      )}
    </Card>
  );
}