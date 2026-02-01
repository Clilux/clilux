import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, X } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function IncidentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const incidentId = urlParams.get('id');
  const isEditing = !!incidentId;

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    building_id: '',
    equipment_id: '',
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    photos: [],
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const clients = await base44.entities.Client.filter({ user_email: currentUser.email });
      if (clients.length > 0) {
        setUserRole('client');
        setClientData(clients[0]);
        setFormData(prev => ({
          ...prev,
          client_id: clients[0].id,
          reported_by: currentUser.email,
          reported_by_name: currentUser.full_name || '',
        }));
      } else {
        setUserRole('technician');
      }
    };
    loadUser();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: userRole === 'technician',
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  useEffect(() => {
    if (incidentId) {
      const loadIncident = async () => {
        const incidents = await base44.entities.Incident.filter({ id: incidentId });
        if (incidents.length > 0) {
          setFormData(incidents[0]);
        }
      };
      loadIncident();
    }
  }, [incidentId]);

  const filteredBuildings = formData.client_id 
    ? buildings.filter(b => b.client_id === formData.client_id)
    : (clientData ? buildings.filter(b => b.client_id === clientData.id) : buildings);

  const filteredEquipment = formData.building_id
    ? equipment.filter(e => e.building_id === formData.building_id)
    : equipment;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) {
        return base44.entities.Incident.update(incidentId, data);
      }
      return base44.entities.Incident.create({
        ...data,
        reported_by: user?.email,
        reported_by_name: user?.full_name || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(isEditing ? 'Incidencia actualizada' : 'Incidencia creada');
      navigate(createPageUrl('Incidents'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), result.file_url] }));
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Incidencia' : 'Reportar Incidencia'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRole === 'technician' && (
                <div>
                  <Label>Cliente</Label>
                  <Select value={formData.client_id} onValueChange={(v) => {
                    handleChange('client_id', v);
                    handleChange('building_id', '');
                    handleChange('equipment_id', '');
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Edificio</Label>
                <Select value={formData.building_id} onValueChange={(v) => {
                  handleChange('building_id', v);
                  handleChange('equipment_id', '');
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar edificio" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBuildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Equipo (opcional)</Label>
                <Select value={formData.equipment_id} onValueChange={(v) => handleChange('equipment_id', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.brand} {eq.model} - {eq.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {userRole === 'technician' && (
                <div>
                  <Label>Prioridad</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Resumen breve del problema"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  required
                  className="mt-1"
                  rows={4}
                  placeholder="Describa el problema con detalle..."
                />
              </div>

              <div className="md:col-span-2">
                <Label>Fotos</Label>
                <div className="mt-2 flex flex-wrap gap-4">
                  {formData.photos?.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload">
                    <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-slate-400" />}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-slate-800 hover:bg-slate-700">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isEditing ? 'Guardar' : 'Enviar Incidencia'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}