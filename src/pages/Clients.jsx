import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Building2, MapPin, Phone, Eye, EyeOff, Users, Filter, X, CalendarDays } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import ClientCard from '../components/cards/ClientCard';
import ViewModeToggle from '../components/ui/ViewModeToggle';
import StatusBadge from '../components/ui/StatusBadge';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentTechnician } from '@/hooks/useCurrentTechnician';

const TIPOS = [
  { value: 'residencial', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
];
const ESTADOS_CRM = [
  { value: 'activo', label: 'Activo' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];
const ESTADO_CRM_COLORS = {
  activo: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  completado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-red-100 text-red-700',
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterId, setFilterId] = useState('');
  const [soloAsignados, setSoloAsignados] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('clients_view') || 'list');
  const { technician, user } = useCurrentTechnician();

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  const myEmail = isSessionTech ? sessionTechEmail : user?.email;

  const tieneFiltros = filterTipo !== 'todos' || filterEstado !== 'todos' || filterId.trim() !== '' || soloAsignados;
  const limpiarFiltros = () => { setFilterTipo('todos'); setFilterEstado('todos'); setFilterId(''); setSoloAsignados(false); };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('clients_view', mode);
  };

  const { data: proxyData } = useQuery({
    queryKey: ['proxy-all', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'all' });
      return res.data || {};
    },
    enabled: isSessionTech,
    staleTime: 30000,
  });

  const { data: clientsDirect = [], isLoading } = useQuery({
    queryKey: ['clients', 'direct'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !isSessionTech,
  });

  const { data: buildingsDirect = [] } = useQuery({
    queryKey: ['buildings', 'direct'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !isSessionTech,
  });

  const clients   = isSessionTech ? (proxyData?.clients   || []) : clientsDirect;
  const buildings = isSessionTech ? (proxyData?.buildings || []) : buildingsDirect;

  // Técnicos de sesión: el proxy ya controla los permisos, mostrar todos.
  // Admins Base44: ver todo. Usuarios Base44 normales: filtrar por empresa/asignación.
  const isAdmin = !isSessionTech && user?.role === 'admin';
  const visibleClients = (isSessionTech || isAdmin) ? clients : clients.filter(c => {
    if (technician?.company_id && c.company_id === technician.company_id) return true;
    if (c.assigned_technician === user?.email) return true;
    return false;
  });

  const filteredClients = visibleClients.filter(client => {
    if (!showInactive && client.status === 'inactive') return false;
    if (filterTipo !== 'todos' && client.tipo !== filterTipo) return false;
    if (filterEstado !== 'todos' && client.estado_crm !== filterEstado) return false;
    if (filterId.trim()) {
      const q = filterId.trim().toLowerCase();
      if (!(client.id?.toLowerCase().includes(q))) return false;
    }
    if (soloAsignados && myEmail) {
      const esAsignado = client.assigned_technician?.toLowerCase() === myEmail.toLowerCase()
        || (Array.isArray(client.tecnicos_asignados) && client.tecnicos_asignados.some(a => a.technician_email?.toLowerCase() === myEmail.toLowerCase()));
      if (!esAsignado) return false;
    }
    const q = searchTerm.toLowerCase();
    if (q && !(client.name?.toLowerCase().includes(q) || client.cif?.toLowerCase().includes(q) || client.city?.toLowerCase().includes(q))) return false;
    return true;
  });

  const getBuildingCount = (clientId) => {
    return buildings.filter(b => b.client_id === clientId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        <NavHeader title="Clientes" />

        {!searchTerm && visibleClients.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Clientes recientes</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {visibleClients.slice(0, 5).map(client => (
                <Link key={client.id} to={createPageUrl(`ClientDetail?id=${client.id}`)} className="shrink-0">
                  <Card className="p-3 bg-white border hover:shadow-md transition-all cursor-pointer flex items-center gap-3 min-w-[210px]">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {client.photo_url
                        ? <img src={client.photo_url} alt={client.name} className="w-9 h-9 object-cover" />
                        : <Users className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{client.name}</p>
                      <p className="text-xs text-slate-500 truncate">{client.city || client.email || ''}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

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

          <ViewModeToggle viewMode={viewMode} onChange={handleViewChange} />
          <Button
            variant={showInactive ? 'default' : 'outline'}
            onClick={() => setShowInactive(s => !s)}
            className="whitespace-nowrap"
          >
            {showInactive ? <><EyeOff className="h-4 w-4 mr-2" />Ocultar inactivos</> : <><Eye className="h-4 w-4 mr-2" />Ver inactivos</>}
          </Button>
          <Link to={createPageUrl('ClientForm')}>
            <Button className="bg-slate-800 hover:bg-slate-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>

        {(isSessionTech || isAdmin) && (
          <div className="mb-6">
            <Link to={createPageUrl('TecnicoCitas')}>
              <Button variant="outline" className="bg-white">
                <CalendarDays className="h-4 w-4 mr-2" />
                Citas de mis clientes
              </Button>
            </Link>
          </div>
        )}

        {/* Filtros avanzados */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <Filter className="h-3.5 w-3.5" />Filtros
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[170px] bg-white h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[170px] bg-white h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS_CRM.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="ID de cliente..."
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="w-[200px] bg-white h-9 text-sm"
          />
          {myEmail && (
            <Button
              variant={soloAsignados ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSoloAsignados(s => !s)}
              className="h-9"
            >
              <Users className="h-4 w-4 mr-2" />
              {soloAsignados ? 'Asignados a mí' : 'Solo mis clientes'}
            </Button>
          )}
          {tieneFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-9 text-slate-500">
              <X className="h-4 w-4 mr-1" />Limpiar
            </Button>
          )}
        </div>

        {(isSessionTech ? !proxyData : isLoading) ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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