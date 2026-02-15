import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Plus, Filter, FileDown, FileUp, Thermometer, MapPin,
  Building2, Calendar, AlertCircle } from
'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import NavHeader from '../components/navigation/NavHeader';
import ExportButton from '../components/ExportButton';
import ImportButton from '../components/ImportButton';

const statusLabels = {
  operational: { label: 'Operativo', color: 'bg-emerald-500/20 text-emerald-400' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-500/20 text-amber-400' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-500/20 text-red-400' }
};

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');

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

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo, serie, ubicación, edificio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="bg-white/10 text-slate-950 pl-10 px-3 py-1 text-base rounded-md flex h-9 w-full border shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border-white/20 placeholder:text-slate-400" />


          </div>

          <div className="flex gap-3">
            <ExportButton
              data={filteredEquipment.map((eq) => {
                const building = buildings.find((b) => b.id === eq.building_id);
                const client = clients.find((c) => c.id === eq.client_id);
                return {
                  'Cliente': client?.name || '',
                  'Edificio': building?.name || '',
                  'Tipo': eq.equipment_type || '',
                  'Marca': eq.brand || '',
                  'Modelo': eq.model || '',
                  'Nº Serie': eq.serial_number || '',
                  'Ubicación': eq.location || '',
                  'Estado': statusLabels[eq.status]?.label || '',
                  'Potencia Frío (kW)': eq.cooling_power_kw || '',
                  'Potencia Calor (kW)': eq.heating_power_kw || '',
                  'Refrigerante': eq.refrigerant_type || '',
                  'Carga (kg)': eq.refrigerant_charge_kg || '',
                  'Instalación': eq.installation_date || '',
                  'Próxima Revisión': eq.next_revision_date || ''
                };
              })}
              fileName="equipos" />

            
            <ImportButton
              entityName="Equipment"
              onComplete={() => {
                window.location.reload();
              }} />

          </div>
        </div>

        {isLoading ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) =>
          <Card key={i} className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
                <div className="h-32 animate-pulse bg-white/5 rounded" />
              </Card>
          )}
          </div> :
        filteredEquipment.length === 0 ?
        <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <Thermometer className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer equipo'}
            </p>
            {!searchTerm &&
          <p className="text-slate-400 text-sm mt-2">
                Usa "Escanear" para agregar equipos desde la página principal
              </p>
          }
          </Card> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((eq) => {
            const building = buildings.find((b) => b.id === eq.building_id);
            const client = clients.find((c) => c.id === eq.client_id);
            const statusInfo = statusLabels[eq.status] || statusLabels.operational;

            return (
              <Link key={eq.id} to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                  <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all group">
                    {eq.photo_url &&
                  <div className="mb-4 -mx-5 -mt-5 h-32 overflow-hidden rounded-t-xl">
                        <img
                      src={eq.photo_url}
                      alt={`${eq.brand} ${eq.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" />

                      </div>
                  }
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="bg-slate-50 text-teal-700 text-lg font-semibold">
                            {eq.brand} {eq.model}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{eq.equipment_type}</p>
                      </div>

                      <div className="space-y-2">
                        {building &&
                      <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{building.name}</span>
                          </div>
                      }
                        
                        {eq.location &&
                      <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{eq.location}</span>
                          </div>
                      }

                        {eq.next_revision_date &&
                      <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">
                              Próxima: {format(parseISO(eq.next_revision_date), "dd MMM yyyy", { locale: es })}
                            </span>
                          </div>
                      }

                        {eq.serial_number &&
                      <div className="text-xs text-slate-500 mt-2">
                            S/N: {eq.serial_number}
                          </div>
                      }
                      </div>
                    </div>
                  </Card>
                </Link>);

          })}
          </div>
        }
      </div>
    </div>);

}