import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Phone, User, AlertCircle, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NavHeader from '../components/navigation/NavHeader';

export default function ClientBuildings() {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const storedClientId = sessionStorage.getItem('client_id');
    if (storedClientId) setClientId(storedClientId);
  }, []);

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['client-buildings-page', clientId],
    queryFn: () => base44.entities.Building.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-500 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 bg-white/10" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-500 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Mis Edificios" showBack={true} homeUrl="HomeCliente" />

        {buildings.length === 0 ? (
          <Card className="p-12 bg-white/10 border-white/20 text-center">
            <div className="flex flex-col items-center gap-4">
              <Building2 className="h-16 w-16 text-slate-400" />
              <p className="text-slate-300 text-lg">No hay edificios registrados</p>
              <Link to={createPageUrl('HomeCliente')}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {buildings.map((building) => (
              <Card key={building.id} className="bg-slate-200 p-6 rounded-xl border shadow">
                <div className="flex gap-4">
                  {building.photo_url && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={building.photo_url} alt={building.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800">{building.name}</h3>
                        {building.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${building.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {building.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                      {building.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{building.address}{building.city ? `, ${building.city}` : ''}</span>
                        </div>
                      )}
                      {building.contact_person && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>{building.contact_person}</span>
                        </div>
                      )}
                      {building.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{building.contact_phone}</span>
                        </div>
                      )}
                      {building.floors && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>{building.floors} plantas{building.surface_m2 ? ` · ${building.surface_m2} m²` : ''}</span>
                        </div>
                      )}
                    </div>
                    {building.notes && (
                      <p className="text-sm text-slate-500 mt-2">{building.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}