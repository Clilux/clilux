import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { MapPin, Layers, Thermometer, ChevronRight, Snowflake, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StatusBadge from '../ui/StatusBadge';

export default function BuildingCard({ building, equipmentCount = 0, totalCoolingKw = 0 }) {
  return (
    <Link to={createPageUrl(`BuildingDetail?id=${building.id}`)}>
      <Card className={`p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group ${building.status === 'inactive' ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {building.photo_url && (
              <img src={building.photo_url} alt={building.name} className="h-12 w-12 rounded-lg object-contain flex-shrink-0 border border-slate-100 bg-slate-50" />
            )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-800 text-lg">{building.name}</h3>
              <StatusBadge status={building.status || 'active'} />
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{building.address}, {building.city}</span>
              </div>
              {building.floors && (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  <span>{building.floors} plantas</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-4 w-4" />
                <span>{equipmentCount} equipo{equipmentCount !== 1 ? 's' : ''}</span>
              </div>
              {totalCoolingKw > 0 && (
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Snowflake className="h-4 w-4" />
                  <span>{totalCoolingKw.toFixed(1)} kW</span>
                </div>
              )}
              {building.created_by_name && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <User className="h-4 w-4" />
                  <span>Creado por: {building.created_by_name}</span>
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