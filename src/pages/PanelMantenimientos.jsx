import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import RevisionEditDialog from '@/components/revisions/RevisionEditDialog';
import {
  Building2, Wrench, Search, CalendarClock, Pencil, Power, ChevronRight,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_LABELS = {
  monthly: 'Mensual', quarterly: 'Trimestral',
  biannual: 'Semestral', annual: 'Anual', unified: 'Unificada',
};

const fechaCorta = (v) => String(v || '').slice(0, 10);

// Mantenimientos: solo edificios con revisiones programadas activas.
// Cabecera verde azulado (teal). Permite editar cada mantenimiento
// (fecha, descripción) y activarlo/desactivarlo.
export default function PanelMantenimientos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const proxyFetch = (entity) => base44.functions.invoke('getCompanyData', {
    technician_email: sessionTechEmail, entity,
  }).then((r) => r.data?.data || []);

  const { data: revisions = [], isLoading: loadingRev } = useQuery({
    queryKey: ['scheduled-revisions', isSessionTech ? 'proxy' : 'direct'],
    queryFn: () => isSessionTech ? proxyFetch('revisions') : base44.entities.ScheduledRevision.list(),
  });
  const { data: buildings = [], isLoading: loadingBld } = useQuery({
    queryKey: ['buildings', isSessionTech ? 'proxy-mant' : 'direct-mant'],
    queryFn: () => isSessionTech ? proxyFetch('buildings') : base44.entities.Building.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', isSessionTech ? 'proxy-mant' : 'direct-mant'],
    queryFn: () => isSessionTech ? proxyFetch('clients') : base44.entities.Client.list(),
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', isSessionTech ? 'proxy-mant' : 'direct-mant'],
    queryFn: () => isSessionTech ? proxyFetch('equipment') : base44.entities.Equipment.list(),
  });

  const isLoading = loadingRev || loadingBld;
  const today = new Date();

  // Equipos inactivos y clientes inactivos fuera
  const activeBuildings = useMemo(() => buildings.filter((b) => {
    if (b.status === 'inactive') return false;
    const client = clients.find((c) => c.id === b.client_id);
    return client?.status !== 'inactive';
  }), [buildings, clients]);

  // Solo revisiones activas (no canceladas) para mostrar en la lista.
  const activeRevisions = useMemo(
    () => revisions.filter((r) => r.status !== 'cancelled'),
    [revisions],
  );

  const equipName = (id) => {
    const eq = equipment.find((e) => e.id === id);
    return eq ? `${eq.brand || ''} ${eq.model || ''}`.trim() || eq.reference_name || '' : '';
  };

  // Agrupar revisiones activas por edificio
  const buildingGroups = useMemo(() => {
    const map = new Map();
    activeRevisions.forEach((rev) => {
      if (!map.has(rev.building_id)) map.set(rev.building_id, []);
      map.get(rev.building_id).push(rev);
    });
    const groups = activeBuildings
      .filter((b) => map.has(b.id))
      .map((b) => {
        const revs = (map.get(b.id) || [])
          .sort((a, c) => fechaCorta(a.scheduled_date).localeCompare(fechaCorta(c.scheduled_date)));
        const pending = revs.filter((r) => r.status === 'pending');
        const vencidas = pending.filter((r) => isBefore(parseISO(fechaCorta(r.scheduled_date)), today)).length;
        return { building: b, client: clients.find((c) => c.id === b.client_id), revisions: revs, pendingCount: pending.length, vencidas };
      });
    return groups;
  }, [activeBuildings, activeRevisions, clients]);

  const filtered = buildingGroups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.building.name?.toLowerCase().includes(q) ||
      g.client?.name?.toLowerCase().includes(q)
    );
  });

  const totalPendientes = buildingGroups.reduce((s, g) => s + g.pendingCount, 0);
  const totalVencidas = buildingGroups.reduce((s, g) => s + g.vencidas, 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
    queryClient.invalidateQueries({ queryKey: ['buildings'] });
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const kpis = [
    { label: 'Edificios con mantenimiento', value: buildingGroups.length, icon: Building2, color: 'bg-teal-50 border-teal-200', iconBg: 'bg-teal-100', iconCls: 'text-teal-600' },
    { label: 'Mantenimientos activos', value: totalPendientes, icon: Wrench, color: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-100', iconCls: 'text-blue-600' },
    { label: 'Vencidos', value: totalVencidas, icon: CalendarClock, color: totalVencidas > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200', iconBg: totalVencidas > 0 ? 'bg-red-100' : 'bg-slate-100', iconCls: totalVencidas > 0 ? 'text-red-500' : 'text-slate-400' },
  ];

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar isSessionTech={isSessionTech} isAdmin={!isSessionTech} isLoading={false} onLogout={() => {}} techEmail={sessionTechEmail} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabecera verde azulado */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 border-b border-teal-800 shadow-sm">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('HomeTecnico')}>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1">
                  ← Volver
                </Button>
              </Link>
              <div className="w-px h-8 bg-white/20" />
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-lg font-bold">Mantenimientos</h1>
                <p className="text-teal-100 text-xs">Revisiones programadas por edificio</p>
              </div>
            </div>
            <p className="text-white text-sm font-medium hidden sm:block">
              {format(today, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {kpis.map(({ label, value, icon: Icon, color, iconBg, iconCls }) => (
                <Card key={label} className={`${color} border p-4 shadow-sm`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${iconCls}`} />
                    </div>
                    <div>
                      {isLoading ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-bold text-slate-800">{value}</p>}
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por edificio o cliente..."
                className="pl-10 bg-white border-slate-200"
              />
            </div>

            {/* Lista de edificios con sus mantenimientos */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-slate-200 p-12 text-center bg-white">
                <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay edificios con mantenimientos activos</p>
                <p className="text-slate-400 text-sm mt-1">Las revisiones programadas aparecerán aquí agrupadas por edificio</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(({ building, client, revisions: revs, pendingCount, vencidas }) => (
                  <Card key={building.id} className="border-slate-200 bg-white p-4 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{building.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{client?.name || 'Sin cliente'}</p>
                      </div>
                      <Link to={`/BuildingDetail?id=${building.id}`} className="shrink-0">
                        <Button size="sm" variant="ghost" className="text-teal-600 hover:bg-teal-50 h-8 px-2">
                          <Building2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <Badge className="bg-teal-50 text-teal-700 border-0">{pendingCount} pendientes</Badge>
                      {vencidas > 0 && <Badge className="bg-red-50 text-red-600 border-0">{vencidas} vencidas</Badge>}
                    </div>

                    <div className="space-y-2 flex-1">
                      {revs.slice(0, 5).map((rev) => {
                        const vencida = rev.status === 'pending' && isBefore(parseISO(fechaCorta(rev.scheduled_date)), today);
                        const inactiva = rev.status === 'cancelled';
                        return (
                          <div
                            key={rev.id}
                            className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                              inactiva ? 'bg-slate-50 border-slate-200 opacity-60' : vencida ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700">
                                  {TYPE_LABELS[rev.revision_type] || rev.revision_type}
                                </span>
                                {vencida && <Badge className="bg-red-100 text-red-600 border-0 text-[10px]">Vencida</Badge>}
                                {inactiva && <Badge className="bg-slate-200 text-slate-500 border-0 text-[10px]">Inactivo</Badge>}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {format(parseISO(fechaCorta(rev.scheduled_date)), 'd MMM yyyy', { locale: es })}
                                {rev.equipment_id && <span> · {equipName(rev.equipment_id)}</span>}
                              </p>
                              {rev.notes && <p className="text-xs text-slate-400 truncate mt-0.5">{rev.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-200"
                                onClick={() => setEditing({ ...rev, equipment_name: rev.equipment_id ? equipName(rev.equipment_id) : '' })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {revs.length > 5 && (
                        <p className="text-xs text-slate-400 text-center pt-1">+{revs.length - 5} más...</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RevisionEditDialog
        revision={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}