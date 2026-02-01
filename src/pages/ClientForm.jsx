import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, UserPlus } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function ClientForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const isEditing = !!clientId;

  const [formData, setFormData] = useState({
    name: '',
    cif: '',
    address: '',
    city: '',
    postal_code: '',
    province: '',
    phone: '',
    email: '',
    contact_person: '',
    notes: '',
    status: 'active',
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (clientId) {
      const loadClient = async () => {
        const clients = await base44.entities.Client.filter({ id: clientId });
        if (clients.length > 0) {
          setFormData(clients[0]);
        }
      };
      loadClient();
    }
  }, [clientId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Client.update(clientId, data);
      }
      return base44.entities.Client.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(isEditing ? 'Cliente actualizado' : 'Cliente creado');
      navigate(createPageUrl('Clients'));
    },
    onError: (error) => {
      toast.error('Error al guardar el cliente');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleInviteClient = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, 'user');
      // Vincular el email al cliente
      await base44.entities.Client.update(clientId, { user_email: inviteEmail });
      toast.success('Invitación enviada al cliente');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (error) {
      toast.error('Error al enviar la invitación');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre / Razón Social *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cif">CIF/NIF *</Label>
                <Input
                  id="cif"
                  value={formData.cif}
                  onChange={(e) => handleChange('cif', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_person">Persona de Contacto</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="bg-slate-800 hover:bg-slate-700"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </Card>

        {isEditing && (
          <Card className="p-6 bg-white border-0 shadow-sm mt-6">
            <h3 className="font-semibold text-slate-800 mb-4">Invitar Cliente al Portal</h3>
            <p className="text-sm text-slate-500 mb-4">
              Envía una invitación al cliente para que pueda acceder al portal y ver el estado de sus equipos.
            </p>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Email del cliente"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleInviteClient}
                disabled={isInviting || !inviteEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isInviting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Invitar
              </Button>
            </div>
            {formData.user_email && (
              <p className="text-sm text-emerald-600 mt-3">
                ✓ Cliente vinculado: {formData.user_email}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}