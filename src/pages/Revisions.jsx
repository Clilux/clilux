import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import RevisionCard from '../components/cards/RevisionCard';

export default function Revisions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list('-revision_date'),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : '';
  };

  const getBuildingName = (buildingId) => {
    const bld = buildings.find(b => b.id === buildingId);
    return bld?.name || '';
  };

  const filteredRevisions = revisions.filter(revision => {
    const equipmentName = getEquipmentName(revision.equipment_id).toLowerCase();
    const buildingName = getBuildingName(revision.building_id).toLowerCase();
    const matchesSearch = equipmentName.includes(searchTerm.toLowerCase()) ||
                          buildingName.includes(searchTerm.toLowerCase()) ||
                          revision.technician_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || revision.revision_type === filterType;
    const matchesStatus = filterStatus === 'all' || revision.general_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Historial de Revisiones" />

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por equipo, edificio o técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="preventive">Preventivo</SelectItem>
                <SelectItem value="corrective">Correctivo</SelectItem>
                <SelectItem value="it3_rite">IT3 RITE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="good">Bueno</SelectItem>
                <SelectItem value="acceptable">Aceptable</SelectItem>
                <SelectItem value="needs_repair">Necesita reparación</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
            <Link to={createPageUrl('RevisionForm')}>
              <Button className="bg-slate-800 hover:bg-slate-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filteredRevisions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'No se encontraron revisiones' 
                : 'No hay revisiones registradas'}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Link to={createPageUrl('RevisionForm')}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera revisión
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRevisions.map(revision => (
              <RevisionCard 
                key={revision.id} 
                revision={revision}
                equipmentName={getEquipmentName(revision.equipment_id)}
                buildingName={getBuildingName(revision.building_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}