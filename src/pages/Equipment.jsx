import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Plus, Thermometer, MapPin,
  Building2, Calendar, LayoutGrid, List, LayoutList } from
'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import NavHeader from '../components/navigation/NavHeader';

const statusLabels = {
  operational: { label: 'Operativo', color: 'bg-emerald-500/20 text-emerald-400' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-500/20 text-amber-400' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-500/20 text-red-400' }
};

// 'grid' = tarjetas grandes, 'compact' = tarjetas pequeñas, 'list' = lista
export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('equipment_view') || 'grid');

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('-created_date')
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const filteredEquipment = equipment.filter((eq) => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const building = buildings.find((b) => b.id === eq.building_id);
    const client = clients.find((c) => c.id === eq.client_id);

    return (
      eq.brand?.toLowerCase().includes(search) ||
      eq.model?.toLowerCase().includes(search) ||
      eq.serial_number?.toLowerCase().includes(search) ||
      eq.equipment_type?.toLowerCase().includes(search) ||
      eq.location?.toLowerCase().includes(search) ||
      building?.name?.toLowerCase().includes(search) ||
      client?.name?.toLowerCase().includes(search));

  });

  return (
    <div className="bg-gray-100 p-6 min-h-screen from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gray-50 mx-auto max-w-7xl">
        <NavHeader title="Equipos" />

        <div className="mb-6 flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo, serie, ubicación, edificio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-white/10 text-slate-950 pl-10 w-full" />
          </div>

          <div className="flex flex-wrap gap-3 w-full items-center">
            {/* View mode toggles */}
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <button
                onClick={() => { setViewMode('grid'); localStorage.setItem('equipment_view', 'grid'); }}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Cuadrícula">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setViewMode('compact'); localStorage.setItem('equipment_view', 'compact'); }}
                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Compacto">
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setViewMode('list'); localStorage.setItem('equipment_view', 'list'); }}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Lista">
                <List className="h-4 w-4" />
              </button>
            </div>

            <Link to={createPageUrl('EquipmentForm')} className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Equipo
              </Button>
            </Link>
            


          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
                <div className="h-32 animate-pulse bg-white/5 rounded" />
              </Card>
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Thermometer className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer equipo'}
            </p>
            {!searchTerm && <p className="text-slate-400 text-sm mt-2">Usa "Escanear" para agregar equipos desde la página principal</p>}
          </Card>
        ) : (
          <>
        {/* GRID VIEW */}
        {viewMode === 'grid' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((eq) => {
            const building = buildings.find((b) => b.id === eq.building_id);
            const statusInfo = statusLabels[eq.status] || statusLabels.operational;
            return (
              <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                <Card className="p-5 bg-white hover:shadow-md transition-all group border">
                  {eq.photo_url &&
                    <div className="mb-4 -mx-5 -mt-5 h-32 overflow-hidden rounded-t-xl">
                      <img src={eq.photo_url} alt={`${eq.brand} ${eq.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  }
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="text-teal-700 text-base font-semibold">{eq.reference_name || `${eq.brand} ${eq.model}`}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{eq.brand} {eq.model}</p>
                  <p className="text-xs text-slate-400 mb-3">{eq.equipment_type}</p>
                  <div className="space-y-1.5">
                    {building && <div className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="h-3.5 w-3.5 text-slate-400" />{building.name}</div>}
                    {eq.location && <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" />{eq.location}</div>}
                    {eq.serial_number && <div className="text-xs text-slate-400">S/N: {eq.serial_number}</div>}
                  </div>
                </Card>
              </Link>);
          })}
          </div>}

        {/* COMPACT VIEW */}
        {viewMode === 'compact' && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredEquipment.map((eq) => {
            const statusInfo = statusLabels[eq.status] || statusLabels.operational;
            return (
              <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                <Card className="p-3 bg-white hover:shadow-md transition-all border flex flex-col gap-1">
                  {eq.photo_url && <div className="h-20 -mx-3 -mt-3 mb-2 overflow-hidden rounded-t-xl"><img src={eq.photo_url} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-semibold text-teal-700 leading-tight">{eq.reference_name || `${eq.brand} ${eq.model}`}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{eq.brand} {eq.model}</p>
                  <p className="text-xs text-slate-400">{eq.equipment_type}</p>
                  {eq.location && <p className="text-xs text-slate-500 truncate">{eq.location}</p>}
                </Card>
              </Link>);
          })}
          </div>}

        {/* LIST VIEW */}
        {viewMode === 'list' && <div className="flex flex-col gap-2">
            {filteredEquipment.map((eq) => {
            const building = buildings.find((b) => b.id === eq.building_id);
            const client = clients.find((c) => c.id === eq.client_id);
            const statusInfo = statusLabels[eq.status] || statusLabels.operational;
            return (
              <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                <Card className="px-4 py-3 bg-white hover:shadow-md transition-all border flex items-center gap-4">
                  {eq.photo_url
                    ? <img src={eq.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                    : <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Thermometer className="h-5 w-5 text-slate-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-teal-700">{eq.reference_name || `${eq.brand} ${eq.model}`}</span>
                      <span className="text-xs text-slate-500">{eq.brand} {eq.model}</span>
                      <span className="text-xs text-slate-400">{eq.equipment_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                      {client && <span>{client.name}</span>}
                      {building && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{building.name}</span>}
                      {eq.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{eq.location}</span>}
                      {eq.serial_number && <span>S/N: {eq.serial_number}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>
                </Card>
              </Link>);
          })}
          </div>}
          </>
        )}
      </div>
    </div>);

}