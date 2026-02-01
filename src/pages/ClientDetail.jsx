import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Edit, Plus, Building2, MapPin, Phone, Mail, 
  User, FileText, Thermometer
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import BuildingCard from '../components/cards/BuildingCard';
import StatusBadge from '../components/ui/StatusBadge';

export default function ClientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', clientId],
    queryFn: () => base44.entities.Building.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-client', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const getEquipmentCount = (buildingId) => {
    return equipment.filter(e => e.building_id === buildingId).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-slate-500">Cliente no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={client.name} />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-50">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{client.name}</h2>
                <p className="text-slate-500">CIF: {client.cif}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={client.status || 'active'} />
              <Link to={createPageUrl(`ClientForm?id=${client.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.address && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Dirección</p>
                  <p className="text-slate-700">{client.address}</p>
                  {(client.city || client.province) && (
                    <p className="text-slate-600">{client.postal_code} {client.city}, {client.province}</p>
                  )}
                </div>
              </div>
            )}
            {client.phone && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Teléfono</p>
                  <p className="text-slate-700">{client.phone}</p>
                </div>
              </div>
            )}
            {client.email && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-slate-700">{client.email}</p>
                </div>
              </div>
            )}
            {client.contact_person && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Contacto</p>
                  <p className="text-slate-700">{client.contact_person}</p>
                </div>
              </div>
            )}
          </div>

          {client.notes && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Observaciones</p>
                  <p className="text-slate-700">{client.notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Tabs defaultValue="buildings" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="buildings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Edificios ({buildings.length})
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Equipos ({equipment.length})
              </TabsTrigger>
            </TabsList>
            <Link to={createPageUrl(`BuildingForm?client_id=${client.id}`)}>
              <Button className="bg-slate-800 hover:bg-slate-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Edificio
              </Button>
            </Link>
          </div>

          <TabsContent value="buildings">
            {buildings.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">No hay edificios registrados</p>
                <Link to={createPageUrl(`BuildingForm?client_id=${client.id}`)}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir primer edificio
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {buildings.map(building => (
                  <BuildingCard 
                    key={building.id} 
                    building={building}
                    equipmentCount={getEquipmentCount(building.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipment">
            {equipment.length === 0 ? (
              <Card className="p-8 text-center">
                <Thermometer className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No hay equipos registrados</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {equipment.map(eq => {
                  const building = buildings.find(b => b.id === eq.building_id);
                  return (
                    <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                      <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-slate-800">{eq.brand} {eq.model}</h3>
                            <p className="text-sm text-slate-500">{eq.location} · {building?.name}</p>
                          </div>
                          <StatusBadge status={eq.status || 'operational'} />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}