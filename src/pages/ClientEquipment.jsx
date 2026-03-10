import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Thermometer, MapPin, Calendar, Home, AlertCircle, LayoutGrid, List, LayoutList } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';

const statusColors = {
  operational: 'bg-green-100 text-green-700',
  maintenance_needed: 'bg-amber-100 text-amber-700',
  out_of_service: 'bg-red-100 text-red-700'
};

const statusLabels = {
  operational: 'Operativo',
  maintenance_needed: 'Requiere Mantenimiento',
  out_of_service: 'Fuera de Servicio'
};

export default function ClientEquipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientId, setClientId] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('client_equipment_view') || 'list');

  React.useEffect(() => {
    const loadClient = async () => {
      // Recuperar client_id del sessionStorage (guardado al hacer login en HomeCliente)
      const storedClientId = sessionStorage.getItem('client_id');
      if (storedClientId) {
        setClientId(storedClientId);
      }
    };
    loadClient();
  }, []);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['client-equipment', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['client-buildings', clientId],
    queryFn: () => base44.entities.Building.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const filteredEquipment = equipment.filter((eq) =>
  !searchTerm ||
  eq.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  eq.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  eq.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBuildingName = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    return building?.name || 'N/A';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>);

  }

  return (
    <div className="bg-white p-6 min-h-screen">
      <div className="bg-white mx-auto max-w-6xl">
        <NavHeader title="Mis Equipos" showBack={false} homeUrl="HomeCliente" />

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white" />
          </div>
          <div className="flex gap-1 border rounded-lg p-1 bg-white w-fit">
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('client_equipment_view', 'list'); }}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lista">
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('client_equipment_view', 'grid'); }}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title="Cuadrícula">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setViewMode('compact'); localStorage.setItem('client_equipment_view', 'compact'); }}
              className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title="Compacto">
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredEquipment.length === 0 ?
        <Card className="p-12 bg-white border text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-slate-400" />
              <div>
                <p className="text-slate-600 text-lg mb-2">No se encontraron equipos</p>
                <p className="text-slate-400 text-sm mb-4">
                  {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no tienes equipos registrados'}
                </p>
              </div>
              <Link to={createPageUrl('HomeCliente')}>
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </Card> :

        <>
          {/* LIST VIEW */}
          {viewMode === 'list' && <div className="grid gap-4">
            {filteredEquipment.map((eq) =>
              <Link key={eq.id} to={createPageUrl(`ClientEquipmentDetail?id=${eq.id}`)}>
                <Card className="bg-white p-5 rounded-xl border shadow hover:shadow-md transition-all cursor-pointer">
                  <div className="flex gap-4">
                    {eq.photo_url &&
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img src={eq.photo_url} alt={`${eq.brand} ${eq.model}`} className="w-full h-full object-contain" />
                      </div>
                    }
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 leading-tight">
                            {eq.reference_name || `${eq.brand} ${eq.model}`}
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5">{eq.brand} {eq.model}</p>
                          {eq.location && <div className="flex items-center gap-1 mt-1 text-sm text-blue-700 font-medium"><MapPin className="h-3.5 w-3.5" />{eq.location}</div>}
                        </div>
                        <Badge className={statusColors[eq.status || 'operational']}>
                          {statusLabels[eq.status || 'operational']}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" />{getBuildingName(eq.building_id)}</div>
                        {eq.installation_date && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Instalado: {format(new Date(eq.installation_date), 'dd/MM/yyyy')}</div>}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )}
          </div>}

          {/* GRID VIEW */}
          {viewMode === 'grid' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredEquipment.map((eq) =>
              <Link key={eq.id} to={createPageUrl(`ClientEquipmentDetail?id=${eq.id}`)}>
                <Card className="bg-white border shadow hover:shadow-md transition-all cursor-pointer">
                  {eq.photo_url && <div className="h-40 overflow-hidden rounded-t-xl"><img src={eq.photo_url} alt="" className="w-full h-full object-contain bg-slate-50" /></div>}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{eq.reference_name || `${eq.brand} ${eq.model}`}</h3>
                      <Badge className={`${statusColors[eq.status || 'operational']} text-xs ml-1`}>{statusLabels[eq.status || 'operational']}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{eq.brand} {eq.model}</p>
                    {eq.location && <div className="flex items-center gap-1 mt-1 text-xs text-blue-700 font-medium"><MapPin className="h-3 w-3" />{eq.location}</div>}
                  </div>
                </Card>
              </Link>
            )}
          </div>}

          {/* COMPACT VIEW */}
          {viewMode === 'compact' && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredEquipment.map((eq) =>
              <Link key={eq.id} to={createPageUrl(`ClientEquipmentDetail?id=${eq.id}`)}>
                <Card className="bg-white border p-3 hover:shadow-md transition-all cursor-pointer">
                  {eq.photo_url && <div className="h-20 -mx-3 -mt-3 mb-2 overflow-hidden rounded-t-xl"><img src={eq.photo_url} alt="" className="w-full h-full object-contain bg-slate-50" /></div>}
                  <p className="font-bold text-sm text-slate-900 leading-tight">{eq.reference_name || `${eq.brand} ${eq.model}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{eq.brand} {eq.model}</p>
                  {eq.location && <div className="flex items-center gap-0.5 mt-1 text-xs text-blue-700 font-medium"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{eq.location}</span></div>}
                </Card>
              </Link>
            )}
          </div>}
        </>
        }
      </div>
    </div>);

}