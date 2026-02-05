import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Thermometer, Search, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NavHeader from '../components/navigation/NavHeader';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const buildingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function Maps() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid por defecto
  const [geocoding, setGeocoding] = useState(false);

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  // Geocodificar edificios sin coordenadas
  const geocodeBuilding = async (building) => {
    if (building.latitude && building.longitude) return;
    
    try {
      const address = `${building.address}, ${building.city}, ${building.province || ''}, España`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        await base44.entities.Building.update(building.id, {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        });
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    }
    return null;
  };

  const geocodeAllBuildings = async () => {
    setGeocoding(true);
    let count = 0;
    for (const building of buildings) {
      if (!building.latitude || !building.longitude) {
        const result = await geocodeBuilding(building);
        if (result) count++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      }
    }
    setGeocoding(false);
    if (count > 0) {
      toast.success(`${count} ubicaciones geocodificadas`);
      window.location.reload();
    } else {
      toast.info('Todos los edificios ya tienen coordenadas');
    }
  };

  const buildingsWithCoords = buildings.filter(b => b.latitude && b.longitude);

  const filteredBuildings = buildingsWithCoords.filter(building => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const client = clients.find(c => c.id === building.client_id);
    return (
      building.name?.toLowerCase().includes(search) ||
      building.address?.toLowerCase().includes(search) ||
      building.city?.toLowerCase().includes(search) ||
      client?.name?.toLowerCase().includes(search)
    );
  });

  const focusOnBuilding = (building) => {
    setMapCenter([building.latitude, building.longitude]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <NavHeader title="Mapa de Equipos" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar edificio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>

              {buildingsWithCoords.length < buildings.length && (
                <Button 
                  onClick={geocodeAllBuildings}
                  disabled={geocoding}
                  variant="outline"
                  size="sm"
                  className="w-full mb-3 border-white/20 text-white hover:bg-white/10"
                >
                  {geocoding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Geocodificando...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Geocodificar {buildings.length - buildingsWithCoords.length} edificios
                    </>
                  )}
                </Button>
              )}

              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {filteredBuildings.map(building => {
                  const client = clients.find(c => c.id === building.client_id);
                  const buildingEquipment = equipment.filter(e => e.building_id === building.id);
                  
                  return (
                    <Card 
                      key={building.id}
                      className="p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => focusOnBuilding(building)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white text-sm truncate">
                            {building.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{client?.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                              {buildingEquipment.length} equipos
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {filteredBuildings.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    {searchTerm ? 'No se encontraron edificios' : 'No hay edificios con coordenadas'}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="p-0 bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden h-[calc(100vh-180px)]">
              {buildingsWithCoords.length > 0 ? (
                <MapContainer
                  center={mapCenter}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} />
                  
                  {filteredBuildings.map(building => {
                    const client = clients.find(c => c.id === building.client_id);
                    const buildingEquipment = equipment.filter(e => e.building_id === building.id);
                    
                    return (
                      <Marker 
                        key={building.id}
                        position={[building.latitude, building.longitude]}
                        icon={buildingIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-sm mb-1">{building.name}</h3>
                            <p className="text-xs text-slate-600 mb-2">{client?.name}</p>
                            <p className="text-xs text-slate-500 mb-3">{building.address}, {building.city}</p>
                            
                            <div className="space-y-1 mb-3">
                              <p className="text-xs font-medium">
                                {buildingEquipment.length} equipos:
                              </p>
                              {buildingEquipment.slice(0, 3).map(eq => (
                                <Link 
                                  key={eq.id}
                                  to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}
                                  className="block text-xs text-blue-600 hover:underline"
                                >
                                  • {eq.brand} {eq.model}
                                </Link>
                              ))}
                              {buildingEquipment.length > 3 && (
                                <p className="text-xs text-slate-500">
                                  +{buildingEquipment.length - 3} más
                                </p>
                              )}
                            </div>
                            
                            <Link to={createPageUrl(`BuildingDetail?id=${building.id}`)}>
                              <Button size="sm" className="w-full text-xs">
                                Ver Edificio
                              </Button>
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No hay edificios con coordenadas
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Los edificios necesitan latitud y longitud para aparecer en el mapa
                    </p>
                    {buildings.length > 0 && (
                      <Button 
                        onClick={geocodeAllBuildings}
                        disabled={geocoding}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {geocoding ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Geocodificando...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 mr-2" />
                            Geocodificar Edificios
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}