import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Phone, ChevronRight, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatusBadge from '../ui/StatusBadge';

export default function ClientCard({ client, buildingCount = 0 }) {
  return (
    <Link to={createPageUrl(`ClientDetail?id=${client.id}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {client.photo_url && (
              <img src={client.photo_url} alt={client.name} className="h-12 w-12 rounded-lg object-contain flex-shrink-0 border border-slate-100 bg-slate-50" />
            )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-lg">{client.name}</h3>
              <StatusBadge status={client.status || 'active'} />
              {client.tipo && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">{client.tipo}</span>
              )}
              {client.estado_crm && client.estado_crm !== 'activo' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  client.estado_crm === 'pendiente' ? 'bg-amber-100 text-amber-700'
                  : client.estado_crm === 'completado' ? 'bg-blue-100 text-blue-700'
                  : client.estado_crm === 'cancelado' ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
                }`}>{client.estado_crm}</span>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-3">CIF: {client.cif}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {client.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{client.city || client.address}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{buildingCount} edificio{buildingCount !== 1 ? 's' : ''}</span>
              </div>
              {client.created_by_name && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <User className="h-4 w-4" />
                  <span>Creado por: {client.created_by_name}</span>
                </div>
              )}
            </div>
          </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}