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

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list('-created_date'),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
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
          <div className="space-y-4">
            {filteredBuildings.map(building => (
              <BuildingCard 
                key={building.id} 
                building={building}
                equipmentCount={getEquipmentCount(building.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}