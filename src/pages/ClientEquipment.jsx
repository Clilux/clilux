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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>);

  }

  return (
    <div className="bg-slate-200 p-6 min-h-screen from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-slate-200 mx-auto max-w-6xl">
        <NavHeader title="Mis Equipos" showBack={false} homeUrl="HomeCliente" />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white" />

          </div>
        </div>

        {filteredEquipment.length === 0 ?
        <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-slate-400" />
              <div>
                <p className="text-slate-300 text-lg mb-2">No se encontraron equipos</p>
                <p className="text-slate-400 text-sm mb-4">
                  {searchTerm ? 'Intenta con otro término de búsqueda' : 'Aún no tienes equipos registrados'}
                </p>
              </div>
              <Link to={createPageUrl('HomeCliente')}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </Card> :

        <div className="grid gap-4">
            {filteredEquipment.map((eq) =>
          <Link key={eq.id} to={createPageUrl(`ClientEquipmentDetail?id=${eq.id}`)}>
                <Card className="bg-gray-50 text-card-foreground p-6 rounded-2xl border shadow backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex gap-6">
                    {eq.photo_url &&
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                        <img src={eq.photo_url} alt={`${eq.brand} ${eq.model}`} className="w-full h-full object-cover" />
                      </div>
                }
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-0.5">
                            {eq.reference_name || `${eq.brand} ${eq.model}`}
                          </h3>
                          <p className="text-sm text-slate-400 mb-0.5">{eq.brand} {eq.model}</p>
                          {eq.serial_number &&
                      <p className="text-xs text-slate-500">S/N: {eq.serial_number}</p>
                      }
                        </div>
                        <Badge className={statusColors[eq.status || 'operational']}>
                          {statusLabels[eq.status || 'operational']}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {eq.location &&
                    <div className="flex items-center gap-2 text-slate-300">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{eq.location}</span>
                          </div>
                    }
                        <div className="flex items-center gap-2 text-slate-300">
                          <Thermometer className="h-4 w-4 text-slate-400" />
                          <span>{getBuildingName(eq.building_id)}</span>
                        </div>
                        {eq.installation_date &&
                    <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>Instalado: {format(new Date(eq.installation_date), 'dd/MM/yyyy')}</span>
                          </div>
                    }
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
          )}
          </div>
        }
      </div>
    </div>);

}