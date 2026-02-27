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
import { Loader2, Save, MapPin } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import ImageUploader from '../components/ui/ImageUploader';
import { toast } from 'sonner';

export default function BuildingForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const buildingId = urlParams.get('id');
  const preselectedClientId = urlParams.get('client_id');
  const isEditing = !!buildingId;

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    name: '',
    address: '',
    city: '',
    postal_code: '',
    province: '',
    latitude: '',
    longitude: '',
    contact_person: '',
    contact_phone: '',
    floors: '',
    surface_m2: '',
    notes: '',
    status: 'active',
  });
  const [geocoding, setGeocoding] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  useEffect(() => {
    if (buildingId) {
      const loadBuilding = async () => {
        const buildings = await base44.entities.Building.filter({ id: buildingId });
        if (buildings.length > 0) {
          setFormData(buildings[0]);
        }
      };
      loadBuilding();
    }
  }, [buildingId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        floors: data.floors ? Number(data.floors) : null,
        surface_m2: data.surface_m2 ? Number(data.surface_m2) : null,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
      };
      if (isEditing) {
        return base44.entities.Building.update(buildingId, cleanData);
      }
      return base44.entities.Building.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success(isEditing ? 'Edificio actualizado' : 'Edificio creado');
      if (formData.client_id) {
        navigate(createPageUrl(`ClientDetail?id=${formData.client_id}`));
      } else {
        navigate(-1);
      }
    },
    onError: (error) => {
      toast.error('Error al guardar el edificio');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGeocode = async () => {
    if (!formData.address || !formData.city) {
      toast.error('Introduce dirección y ciudad primero');
      return;
    }

    setGeocoding(true);
    try {
      const address = `${formData.address}, ${formData.city}, ${formData.province || ''}, España`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));
        toast.success('Coordenadas obtenidas correctamente');
      } else {
        toast.error('No se pudo encontrar la ubicación');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
      toast.error('Error al obtener coordenadas');
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title={isEditing ? 'Editar Edificio' : 'Nuevo Edificio'} />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => handleChange('client_id', v)}
                  disabled={!!preselectedClientId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre del Edificio *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Ej: Oficinas Centrales, Almacén Norte..."
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

              <div>
                <Label htmlFor="floors">Nº de Plantas</Label>
                <Input
                  id="floors"
                  type="number"
                  value={formData.floors}
                  onChange={(e) => handleChange('floors', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  required
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

              <div className="md:col-span-2">
                <Label>Coordenadas GPS (opcional)</Label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <Input
                    placeholder="Latitud"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                  />
                  <Input
                    placeholder="Longitud"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeocode}
                  disabled={geocoding}
                  className="mt-2"
                >
                  {geocoding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Obteniendo...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Obtener coordenadas automáticamente
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label htmlFor="surface_m2">Superficie (m²)</Label>
                <Input
                  id="surface_m2"
                  type="number"
                  value={formData.surface_m2}
                  onChange={(e) => handleChange('surface_m2', e.target.value)}
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

              <div>
                <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
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
                {isEditing ? 'Guardar Cambios' : 'Crear Edificio'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}