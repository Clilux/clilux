import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import { Plus, Search, Filter } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import IncidentCard from '../components/incidents/IncidentCard';
import { toast } from 'sonner';

export default function Incidents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [deleteId, setDeleteId] = useState(null);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'incidents' });
        return res.data?.data || [];
      }
      return base44.entities.Incident.list('-created_date');
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Sincronización en tiempo real
  useEffect(() => {
    if (isSessionTech) return; // proxy mode no soporta subscribe
    const unsub = base44.entities.Incident.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });
    return unsub;
  }, [isSessionTech]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Incident.update(id, { status: 'deleted_by_technician' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incidencia marcada como eliminada');
      setDeleteId(null);
    },
    onError: () => toast.error('Error al eliminar la incidencia'),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'equipment' });
        return res.data?.data || [];
      }
      return base44.entities.Equipment.list();
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'buildings' });
        return res.data?.data || [];
      }
      return base44.entities.Building.list();
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'clients' });
        return res.data?.data || [];
      }
      return base44.entities.Client.list();
    },
  });

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : '';
  };

  const getBuildingName = (buildingId) => {
    return buildings.find(b => b.id === buildingId)?.name || '';
  };

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.name || '';
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || incident.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Incidencias" />

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar incidencias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 bg-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En curso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Link to={createPageUrl('IncidentForm')}>
              <Button className="bg-slate-800 hover:bg-slate-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No hay incidencias</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map(incident => (
              <IncidentCard 
                key={incident.id} 
                incident={incident}
                equipmentName={getEquipmentName(incident.equipment_id)}
                buildingName={getBuildingName(incident.building_id)}
                showClient={true}
                clientName={getClientName(incident.client_id)}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="¿Eliminar incidencia?"
          description="Esta incidencia se eliminará permanentemente. Esta acción no se puede deshacer."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}