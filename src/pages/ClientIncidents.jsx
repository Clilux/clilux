import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Home, Calendar } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En curso', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-600' },
};

export default function ClientIncidents() {
  const [clientId, setClientId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  React.useEffect(() => {
    const loadClient = async () => {
      const user = await base44.auth.me();
      const clients = await base44.entities.Client.filter({ user_email: user.email });
      if (clients.length > 0) {
        setClientId(clients[0].id);
      }
    };
    loadClient();
  }, []);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['client-incidents', clientId],
    queryFn: () => base44.entities.Incident.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['client-equipment-incidents', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const filteredIncidents = incidents
    .filter(inc => filterStatus === 'all' || inc.status === filterStatus)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : 'N/A';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Mis Incidencias" showBack={false} />

        <div className="flex gap-4 mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="in_progress">En Curso</SelectItem>
              <SelectItem value="resolved">Resueltas</SelectItem>
              <SelectItem value="closed">Cerradas</SelectItem>
            </SelectContent>
          </Select>

          <Link to={createPageUrl('ClientReportIncident')} className="ml-auto">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Reportar Incidencia
            </Button>
          </Link>
        </div>

        {filteredIncidents.length === 0 ? (
          <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-16 w-16 text-slate-400" />
              <div>
                <p className="text-slate-300 text-lg mb-2">No hay incidencias</p>
                <p className="text-slate-400 text-sm mb-4">
                  {filterStatus !== 'all' ? 'No hay incidencias con este estado' : 'Aún no has reportado ninguna incidencia'}
                </p>
              </div>
              <div className="flex gap-3">
                <Link to={createPageUrl('ClientReportIncident')}>
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Reportar Incidencia
                  </Button>
                </Link>
                <Link to={createPageUrl('HomeCliente')}>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Home className="h-4 w-4 mr-2" />
                    Volver al inicio
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredIncidents.map(incident => {
              const priority = priorityConfig[incident.priority] || priorityConfig.medium;
              const status = statusConfig[incident.status] || statusConfig.pending;

              return (
                <Link key={incident.id} to={createPageUrl(`ClientIncidentDetail?id=${incident.id}`)}>
                  <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                          <Badge className={priority.color}>{priority.label}</Badge>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <p className="text-slate-300 text-sm line-clamp-2">{incident.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(incident.created_date), "d 'de' MMMM, yyyy", { locale: es })}</span>
                      </div>
                      {incident.equipment_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Equipo:</span>
                          <span className="text-slate-300">{getEquipmentName(incident.equipment_id)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}