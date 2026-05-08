import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, UserPlus, Loader2, Check, Eye, EyeOff, ExternalLink, Pencil, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function TechniciansTab({ technicians, queryClient }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', phone: '', specialty: '' });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);

  const createMutation = useMutation({
    mutationFn: async ({ name, email, password, phone, specialty }) => {
      const existing = await base44.entities.Technician.filter({ email });
      if (existing.length > 0) throw new Error('Ya existe un técnico con ese email');
      await base44.entities.Technician.create({
        name,
        email,
        portal_password: password,
        phone: phone || '',
        specialty: specialty || '',
        status: 'active',
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setDone(true);
      setForm({ name: '', email: '', password: '', passwordConfirm: '', phone: '', specialty: '' });
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ id, password }) => {
      await base44.entities.Technician.update(id, { portal_password: password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setEditingId(null);
      setEditPassword('');
      toast.success('Contraseña actualizada');
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.Technician.update(id, { status: status === 'active' ? 'inactive' : 'active' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technicians'] }),
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    setFormError('');
    const { name, email, password, passwordConfirm } = form;
    if (!name || !email || !password) { setFormError('Nombre, email y contraseña son obligatorios'); return; }
    if (password !== passwordConfirm) { setFormError('Las contraseñas no coinciden'); return; }
    if (password.length < 4) { setFormError('La contraseña debe tener al menos 4 caracteres'); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      {/* Crear nuevo técnico */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Crear Nuevo Técnico</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Crea las credenciales del técnico. Él accederá con su email y contraseña desde <strong>"Acceso Técnico"</strong> en la pantalla de inicio.
        </p>

        {done ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-emerald-600" />
              <p className="font-medium text-emerald-800">¡Técnico creado correctamente!</p>
            </div>
            <p className="text-sm text-emerald-700 mb-3">
              Comparte las credenciales con el técnico: accede desde <strong>"Acceso Técnico"</strong> con su email y contraseña.
            </p>
            <Button size="sm" variant="outline" onClick={() => setDone(false)}>
              Crear otro técnico
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre completo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Juan Pérez"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="tecnico@empresa.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Contraseña *</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Confirmar contraseña *</Label>
                <Input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm(p => ({ ...p, passwordConfirm: e.target.value }))}
                  placeholder="••••••••"
                  className={`mt-1 ${form.passwordConfirm && form.password !== form.passwordConfirm ? 'border-red-400' : ''}`}
                />
                {form.passwordConfirm && form.password !== form.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-0.5">Las contraseñas no coinciden</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Teléfono (opcional)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="666 123 456"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Especialidad (opcional)</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm(p => ({ ...p, specialty: e.target.value }))}
                  placeholder="Climatización, Fontanería..."
                  className="mt-1"
                />
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-600 text-sm">{formError}</p>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Crear técnico
            </Button>
          </div>
        )}
      </Card>

      {/* Lista de técnicos */}
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
          <div className="space-y-3">
            {technicians.map((tech) => (
              <div key={tech.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {(tech.name || tech.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{tech.name}</p>
                      <p className="text-xs text-slate-400">{tech.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${tech.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {tech.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                      onClick={() => { setEditingId(editingId === tech.id ? null : tech.id); setEditPassword(''); }}>
                      <Key className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500 hover:text-slate-800"
                      onClick={() => toggleStatusMutation.mutate({ id: tech.id, status: tech.status })}>
                      {tech.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>

                {/* Editar contraseña inline */}
                {editingId === tech.id && (
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
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0"
                      disabled={!editPassword || updatePasswordMutation.isPending}
                      onClick={() => updatePasswordMutation.mutate({ id: tech.id, password: editPassword })}>
                      {updatePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>¿Cómo acceden los técnicos?</strong> Desde la pantalla de inicio pulsan <strong>"Acceso Técnico"</strong> e introducen el email y contraseña que tú les has asignado. Si necesitas cambiar la contraseña, usa el icono 🔑 en la lista.
        </p>
      </Card>
    </div>
  );
}