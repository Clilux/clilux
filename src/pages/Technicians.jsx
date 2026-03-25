import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, User, Mail, Phone, Edit, Trash2, Eye, EyeOff, KeyRound } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function Technicians() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    status: 'active',
    portal_email: '',
    portal_password: '',
  });

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTech) {
        return base44.entities.Technician.update(editingTech.id, data);
      }
      return base44.entities.Technician.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(editingTech ? 'Técnico actualizado' : 'Técnico añadido');
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Technician.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Técnico eliminado');
    },
  });

  const handleOpenDialog = (tech = null) => {
    if (tech) {
      setEditingTech(tech);
      setFormData(tech);
    } else {
      setEditingTech(null);
      setFormData({ name: '', email: '', phone: '', specialty: '', status: 'active', portal_email: '', portal_password: '' });
    }
    setShowPortalPassword(false);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTech(null);
    setFormData({ name: '', email: '', phone: '', specialty: '', status: 'active', portal_email: '', portal_password: '' });
    setShowPortalPassword(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Técnicos" />

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
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{tech.name}</h3>
                    <Badge variant={tech.status === 'active' ? 'default' : 'secondary'} className="mt-1">
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

              <div className="space-y-2 text-sm">
                {tech.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>{tech.email}</span>
                  </div>
                )}
                {tech.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{tech.phone}</span>
                  </div>
                )}
                {tech.specialty && (
                  <p className="text-slate-500 italic">{tech.specialty}</p>
                )}
                {(tech.portal_email || tech.portal_password) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Acceso Portal
                    </p>
                    {tech.portal_email && (
                      <p className="text-xs text-slate-600">{tech.portal_email}</p>
                    )}
                    {tech.portal_password && (
                      <p className="text-xs text-slate-400">{'•'.repeat(tech.portal_password.length)}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {technicians.length === 0 && !isLoading && (
          <Card className="p-8 text-center bg-white border-0 shadow-sm">
            <p className="text-slate-500">No hay técnicos registrados. Añade el primero.</p>
          </Card>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTech ? 'Editar Técnico' : 'Añadir Técnico'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1"
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

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Credenciales de Acceso al Portal
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>Email de acceso</Label>
                    <Input
                      type="email"
                      value={formData.portal_email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, portal_email: e.target.value }))}
                      placeholder="tecnico@portal.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contraseña</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPortalPassword ? 'text' : 'password'}
                        value={formData.portal_password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, portal_password: e.target.value }))}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10"
                        onClick={() => setShowPortalPassword(p => !p)}
                      >
                        {showPortalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editingTech ? 'Guardar' : 'Añadir'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}