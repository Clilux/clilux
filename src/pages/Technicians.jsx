import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, User, Mail, Phone, Edit, Trash2, UserCheck, Send, Loader2, Info } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const emptyForm = { name: '', email: '', phone: '', specialty: '', status: 'active', company_name: '', fgas_cert_num: '', rite_cert_num: '', empresa_fgas_cert_num: '' };

export default function Technicians() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [invitingId, setInvitingId] = useState(null);

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTech) {
        return base44.entities.Technician.update(editingTech.id, data);
      }
      // Al crear: también invitar automáticamente al sistema
      const tech = await base44.entities.Technician.create(data);
      await base44.users.inviteUser(data.email, 'user');
      await base44.entities.Technician.update(tech.id, {
        user_email: data.email,
        invited_at: new Date().toISOString(),
      });
      return tech;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(editingTech ? 'Técnico actualizado' : 'Técnico añadido e invitación enviada');
      handleCloseDialog();
    },
    onError: (err) => {
      toast.error('Error: ' + (err.message || 'Inténtalo de nuevo'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Technician.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Técnico eliminado');
    },
  });

  const handleReinvite = async (tech) => {
    const email = tech.user_email || tech.email;
    if (!email) { toast.error('El técnico no tiene email'); return; }
    setInvitingId(tech.id);
    try {
      await base44.users.inviteUser(email, 'user');
      await base44.entities.Technician.update(tech.id, { user_email: email, invited_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(`Invitación reenviada a ${email}`);
    } catch {
      toast.error('Error al enviar la invitación');
    } finally {
      setInvitingId(null);
    }
  };

  const handleOpenDialog = (tech = null) => {
    setEditingTech(tech);
    setFormData(tech ? { name: tech.name, email: tech.email, phone: tech.phone || '', specialty: tech.specialty || '', status: tech.status || 'active', company_name: tech.company_name || '', fgas_cert_num: tech.fgas_cert_num || '', rite_cert_num: tech.rite_cert_num || '', empresa_fgas_cert_num: tech.empresa_fgas_cert_num || '' } : emptyForm);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTech(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Técnicos" />

        {/* Info banner */}
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Al añadir un técnico se le enviará un email de invitación. Deberá usar <strong>"¿Olvidaste tu contraseña?"</strong> en el inicio de sesión para establecer su contraseña y acceder a la app.
          </p>
        </div>

        <div className="flex justify-end mb-6">
          <Button onClick={() => handleOpenDialog()} className="bg-slate-800 hover:bg-slate-700">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Técnico
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map(tech => (
            <Card key={tech.id} className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {(tech.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{tech.name}</h3>
                    <Badge variant={tech.status === 'active' ? 'default' : 'secondary'} className="mt-1 text-xs">
                      {tech.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tech)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tech.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {tech.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                )}
                {tech.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{tech.phone}</span>
                  </div>
                )}
                {tech.specialty && (
                  <p className="text-slate-500 italic text-xs">{tech.specialty}</p>
                )}
              </div>

              {/* Estado de acceso */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                {tech.invited_at ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                      <UserCheck className="h-3.5 w-3.5" />
                      Invitación enviada
                    </div>
                    <button
                      onClick={() => handleReinvite(tech)}
                      disabled={invitingId === tech.id}
                      className="text-xs text-slate-400 hover:text-blue-600 underline underline-offset-2 flex items-center gap-1"
                    >
                      {invitingId === tech.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Reenviar invitación
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50 w-full"
                    disabled={invitingId === tech.id}
                    onClick={() => handleReinvite(tech)}
                  >
                    {invitingId === tech.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    Enviar invitación
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {technicians.length === 0 && !isLoading && (
          <Card className="p-8 text-center bg-white border-0 shadow-sm">
            <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay técnicos registrados. Añade el primero.</p>
          </Card>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTech ? 'Editar Técnico' : 'Añadir Técnico'}</DialogTitle>
            </DialogHeader>
            {!editingTech && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  Se enviará automáticamente un email de invitación al técnico para que active su cuenta.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="mt-1"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <Label>Email * {!editingTech && <span className="text-slate-400 font-normal">(se usará para el acceso)</span>}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="mt-1"
                  placeholder="tecnico@empresa.com"
                  disabled={!!editingTech}
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1"
                  placeholder="+34 600 000 000"
                />
              </div>
              <div>
                <Label>Especialidad</Label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Ej: Climatización, Refrigeración"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-slate-600 mb-3">Datos de certificación (opcional)</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs">Empresa mantenedora</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Nombre de la empresa"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Carné F-Gas</Label>
                    <Input
                      value={formData.fgas_cert_num}
                      onChange={(e) => setFormData(prev => ({ ...prev, fgas_cert_num: e.target.value }))}
                      placeholder="Nº certificado frigorista"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Carné RITE</Label>
                    <Input
                      value={formData.rite_cert_num}
                      onChange={(e) => setFormData(prev => ({ ...prev, rite_cert_num: e.target.value }))}
                      placeholder="Nº habilitación RITE"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Certificado Empresa F-Gas</Label>
                    <Input
                      value={formData.empresa_fgas_cert_num}
                      onChange={(e) => setFormData(prev => ({ ...prev, empresa_fgas_cert_num: e.target.value }))}
                      placeholder="Nº cert. empresa habilitada"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTech ? 'Guardar cambios' : 'Añadir e invitar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}