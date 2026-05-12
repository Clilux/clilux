import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MapPin, Layers, Thermometer, ChevronRight } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import BuildingCard from '../components/cards/BuildingCard';
import ViewModeToggle from '../components/ui/ViewModeToggle';
import StatusBadge from '../components/ui/StatusBadge';
import { Card } from "@/components/ui/card";

export default function Buildings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('buildings_view') || 'list');

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('buildings_view', mode);
  };

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['buildings', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'buildings' });
        return res.data?.data || [];
      }
      return base44.entities.Building.list('-created_date');
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'equipment' });
        return res.data?.data || [];
      }
      return base44.entities.Equipment.list();
    },
  });

  const filteredBuildings = buildings.filter(building =>
    building.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEquipmentCount = (buildingId) => {
    return equipment.filter(e => e.building_id === buildingId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Edificios" />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, dirección o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <ViewModeToggle viewMode={viewMode} onChange={handleViewChange} />
          <Link to={createPageUrl('BuildingForm')}>
            <Button className="bg-slate-800 hover:bg-slate-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Edificio
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">
              {searchTerm ? 'No se encontraron edificios' : 'No hay edificios registrados'}
            </p>
            {!searchTerm && (
              <Link to={createPageUrl('BuildingForm')}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer edificio
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredBuildings.map(building => (
                  <BuildingCard key={building.id} building={building} equipmentCount={getEquipmentCount(building.id)} />
                ))}
              </div>
            )}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuildings.map(building => (
                  <Link key={building.id} to={createPageUrl(`BuildingDetail?id=${building.id}`)}>
                    <Card className="p-5 bg-white border shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-800">{building.name}</h3>
                        <StatusBadge status={building.status || 'active'} />
                      </div>
                      <div className="space-y-1.5 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{building.address}, {building.city}</div>
                        {building.floors && <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{building.floors} plantas</div>}
                        <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" />{getEquipmentCount(building.id)} equipo{getEquipmentCount(building.id) !== 1 ? 's' : ''}</div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {viewMode === 'compact' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredBuildings.map(building => (
                  <Link key={building.id} to={createPageUrl(`BuildingDetail?id=${building.id}`)}>
                    <Card className="p-3 bg-white border hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-sm text-slate-800 leading-tight">{building.name}</span>
                        <StatusBadge status={building.status || 'active'} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{building.city}</p>
                      <p className="text-xs text-slate-400 mt-1">{getEquipmentCount(building.id)} equipos</p>
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