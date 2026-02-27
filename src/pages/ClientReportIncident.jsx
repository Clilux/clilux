import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function ClientReportIncident() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    equipment_id: '',
    building_id: '',
    photos: []
  });

  React.useEffect(() => {
    const storedClientId = sessionStorage.getItem('client_id');
    if (storedClientId) {
      setClientId(storedClientId);
    }
    const storedEmail = localStorage.getItem('clilux_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      setUserName(storedEmail);
    }
  }, []);

  const { data: equipment = [] } = useQuery({
    queryKey: ['client-equipment-report', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['client-buildings-report', clientId],
    queryFn: () => base44.entities.Building.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.create(data),
    onSuccess: () => {
      toast.success('Incidencia reportada correctamente');
      navigate(createPageUrl('ClientIncidents'));
    },
    onError: () => toast.error('Error al reportar la incidencia'),
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photos: [...prev.photos, file_url] }));
      toast.success('Foto subida');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoUrl) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p !== photoUrl)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Completa los campos requeridos');
      return;
    }

    createMutation.mutate({
      ...formData,
      client_id: clientId,
      reported_by: userEmail,
      reported_by_name: userName,
      status: 'pending'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title="Reportar Incidencia" backUrl="ClientIncidents" homeUrl="HomeCliente" />

        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-slate-300">Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resumen breve del problema"
                className="mt-1 bg-white/5 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-slate-300">Descripción *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe detalladamente el problema..."
                className="mt-1 bg-white/5 border-white/20 text-white"
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Prioridad</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
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

              <div>
                <Label className="text-slate-300">Edificio</Label>
                <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar edificio" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Equipo (opcional)</Label>
              <Select value={formData.equipment_id} onValueChange={(v) => setFormData({ ...formData, equipment_id: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin equipo específico</SelectItem>
                  {equipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model} - {eq.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Fotos (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full mt-1 border-white/20 text-white hover:bg-white/10"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Adjuntar Foto
                  </>
                )}
              </Button>

              {formData.photos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img src={photo} alt="" className="w-24 h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('ClientIncidents'))}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Reportar Incidencia'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}