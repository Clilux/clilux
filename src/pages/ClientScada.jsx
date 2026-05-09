import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Cpu, Wind, ArrowLeft, ChevronRight } from 'lucide-react';

const BRAND_INFO = {
  loxone: {
    label: 'Loxone',
    description: 'Control domótica y automatización de edificio',
    icon: Cpu,
    color: 'bg-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    page: 'ControlLoxone',
  },
  airzone: {
    label: 'Airzone',
    description: 'Control climatización y confort',
    icon: Wind,
    color: 'bg-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    page: 'ControlClimatizacion',
  },
};

export default function ClientScada() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const savedClientId = sessionStorage.getItem('client_id');
    if (savedClientId) {
      setClientId(savedClientId);
    } else {
      navigate(createPageUrl('MenuInicio'));
    }
  }, []);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-scada', clientId],
    queryFn: async () => {
      const list = await base44.entities.Client.filter({ id: clientId });
      return list[0] || null;
    },
    enabled: !!clientId,
  });

  if (!clientId) return null;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('HomeCliente')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-purple-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">SCADA</h1>
              <p className="text-slate-400 text-sm">Sistemas de automatización</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !client?.scada_enabled ? (
          <Card className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No tienes acceso SCADA habilitado</p>
            <p className="text-sm text-slate-400 mt-2">Contacta con tu técnico para solicitar acceso</p>
          </Card>
        ) : client.scada_brands?.length === 0 ? (
          <Card className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No hay sistemas SCADA configurados</p>
          </Card>
        ) : (
          <>
            <p className="text-slate-600 font-medium">Sistemas disponibles</p>
            {client.scada_brands.map(brandId => {
              const info = BRAND_INFO[brandId];
              if (!info) return null;
              const Icon = info.icon;
              return (
                <Link key={brandId} to={createPageUrl(info.page)}>
                  <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${info.iconBg}`}>
                        <Icon className={`h-8 w-8 ${info.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-slate-800">{info.label}</h2>
                        <p className="text-sm text-slate-500">{info.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}