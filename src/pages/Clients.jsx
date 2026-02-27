import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Building2, MapPin, Phone, ChevronRight } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import ClientCard from '../components/cards/ClientCard';
import ExportButton from '../components/ExportButton';
import ImportButton from '../components/ImportButton';
import ViewModeToggle from '../components/ui/ViewModeToggle';
import StatusBadge from '../components/ui/StatusBadge';
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';

export default function Clients() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('clients_view') || 'list');

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('clients_view', mode);
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const handleImport = async (data) => {
    const clientsToImport = data.map(row => ({
      name: row.Nombre || row.name || '',
      cif: row.CIF || row.cif || '',
      address: row.Dirección || row.address || '',
      city: row.Ciudad || row.city || '',
      province: row.Provincia || row.province || '',
      postal_code: row['Código Postal'] || row.postal_code || '',
      phone: row.Teléfono || row.phone || '',
      email: row.Email || row.email || '',
      contact_person: row.Contacto || row.contact_person || '',
      status: row.Estado || row.status || 'active',
    }));
    
    await base44.entities.Client.bulkCreate(clientsToImport);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBuildingCount = (clientId) => {
    return buildings.filter(b => b.client_id === clientId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Clientes" />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, CIF o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <ImportButton onImport={handleImport} label="Importar" />
            <ExportButton
              data={clients}
              filename="clientes"
              columns={[
                { key: 'name', label: 'Nombre' },
                { key: 'cif', label: 'CIF' },
                { key: 'address', label: 'Dirección' },
                { key: 'city', label: 'Ciudad' },
                { key: 'province', label: 'Provincia' },
                { key: 'phone', label: 'Teléfono' },
                { key: 'email', label: 'Email' },
                { key: 'contact_person', label: 'Contacto' },
                { key: 'status', label: 'Estado' },
              ]}
            />
            <Button
              variant="outline"
              onClick={() => {
                toast.error('Para exportar a Google Drive, habilita las funciones de backend en la configuración de la app');
              }}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              Drive
            </Button>
          </div>
          <ViewModeToggle viewMode={viewMode} onChange={handleViewChange} />
          <Link to={createPageUrl('ClientForm')}>
            <Button className="bg-slate-800 hover:bg-slate-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
            {!searchTerm && (
              <Link to={createPageUrl('ClientForm')}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredClients.map(client => (
                  <ClientCard key={client.id} client={client} buildingCount={getBuildingCount(client.id)} />
                ))}
              </div>
            )}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                  <Link key={client.id} to={createPageUrl(`ClientDetail?id=${client.id}`)}>
                    <Card className="p-5 bg-white border shadow-sm hover:shadow-md transition-all cursor-pointer group h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-800">{client.name}</h3>
                        <StatusBadge status={client.status || 'active'} />
                      </div>
                      <p className="text-xs text-slate-400 mb-3">CIF: {client.cif}</p>
                      <div className="space-y-1.5 text-sm text-slate-500">
                        {client.city && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{client.city}</div>}
                        {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}</div>}
                        <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{getBuildingCount(client.id)} edificio{getBuildingCount(client.id) !== 1 ? 's' : ''}</div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {viewMode === 'compact' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredClients.map(client => (
                  <Link key={client.id} to={createPageUrl(`ClientDetail?id=${client.id}`)}>
                    <Card className="p-3 bg-white border hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-sm text-slate-800 leading-tight">{client.name}</span>
                        <StatusBadge status={client.status || 'active'} />
                      </div>
                      <p className="text-xs text-slate-400">CIF: {client.cif}</p>
                      {client.city && <p className="text-xs text-slate-500 mt-1 truncate">{client.city}</p>}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}