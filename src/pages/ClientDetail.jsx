import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Edit, Plus, Building2, MapPin, Phone, Mail, 
  User, FileText, Thermometer, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import BuildingCard from '../components/cards/BuildingCard';
import StatusBadge from '../components/ui/StatusBadge';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import ClientDocumentsTab from '../components/clients/ClientDocumentsTab';
import ScadaAccessPanel from '../components/clients/ScadaAccessPanel';
import { toast } from 'sonner';

export default function ClientDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const toggleClientStatusMutation = useMutation({
    mutationFn: async (currentStatus) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await base44.entities.Client.update(clientId, { status: newStatus });
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success(newStatus === 'inactive' ? 'Cliente desactivado' : 'Cliente activado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      toast.error('No se pueden eliminar clientes ni sus datos relacionados');
      throw new Error('Eliminación de clientes no permitida');
    },
    onError: (error) => {
      // Ya mostrado el toast en mutationFn
    },
  });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId, isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'clients' });
        const clients = res.data?.data || [];
        return clients.find(c => c.id === clientId) || null;
      }
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', clientId, isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'buildings' });
        return (res.data?.data || []).filter(b => b.client_id === clientId);
      }
      return base44.entities.Building.filter({ client_id: clientId });
    },
    enabled: !!clientId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-client', clientId, isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'equipment' });
        return (res.data?.data || []).filter(e => e.client_id === clientId);
      }
      return base44.entities.Equipment.filter({ client_id: clientId });
    },
    enabled: !!clientId,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    },
  });

  const clientPortalUsers = settings?.client_users?.filter(u => u.client_id === clientId) || [];

  const getEquipmentCount = (buildingId) => {
    return equipment.filter(e => e.building_id === buildingId).length;
  };

  const getTotalCoolingKw = (buildingId) => {
    return equipment
      .filter(e => e.building_id === buildingId)
      .reduce((sum, e) => sum + (parseFloat(e.cooling_power_kw) || 0), 0);
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
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={client.status || 'active'} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleClientStatusMutation.mutate(client.status || 'active')}
                disabled={toggleClientStatusMutation.isPending}
                className={client.status === 'inactive' ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-600'}
              >
                {client.status === 'inactive'
                  ? <><ToggleRight className="h-4 w-4 mr-2" />Activar</>
                  : <><ToggleLeft className="h-4 w-4 mr-2" />Desactivar</>
                }
              </Button>
              <Link to={createPageUrl(`ClientForm?id=${client.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
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
            <div className="mt-4 p-4 rounded-lg bg-slate-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="w-full">
                  <p className="text-sm font-medium text-slate-600 mb-2">Observaciones</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Campos personalizados */}
          {client.custom_fields && Object.keys(client.custom_fields).length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(client.custom_fields).map(([key, value]) => {
                const fieldConfig = settings?.client_fields?.find(f => f.field_name === key);
                if (!value || !fieldConfig) return null;
                
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-50">
                    <p className="text-sm text-slate-500">{fieldConfig.field_label}</p>
                    <p className="text-slate-700">
                      {fieldConfig.field_type === 'checkbox' 
                        ? (value ? '✓ Sí' : '✗ No')
                        : value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <ScadaAccessPanel client={client} />

          {clientPortalUsers.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Acceso Portal Cliente</h4>
              <div className="space-y-3">
                {clientPortalUsers.map((u, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 text-sm border-t border-blue-100 pt-2 first:border-t-0 first:pt-0">
                    <div>
                      <span className="text-blue-600">Email:</span>
                      <p className="font-mono text-blue-900">{u.email}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Contraseña:</span>
                      <p className="font-mono text-blue-900">{u.password}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Tabs defaultValue="buildings" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="buildings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Edificios ({buildings.length})
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Equipos ({equipment.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Link to={createPageUrl(`EquipmentForm?client_id=${client.id}`)}>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Equipo
                </Button>
              </Link>
              <Link to={createPageUrl(`BuildingForm?client_id=${client.id}`)}>
                <Button className="bg-slate-800 hover:bg-slate-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Edificio
                </Button>
              </Link>
            </div>
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
                    totalCoolingKw={getTotalCoolingKw(building.id)}
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

          <TabsContent value="documents">
            <ClientDocumentsTab clientId={clientId} />
          </TabsContent>
        </Tabs>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar cliente?"
          description={`Se eliminará "${client.name}" y todos sus datos asociados. Esta acción no se puede deshacer.`}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}