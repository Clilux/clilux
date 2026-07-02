import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import EdificioStatusCard from '@/components/dashboard/EdificioStatusCard';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import {
  Building2, AlertTriangle, Wrench, ClipboardCheck, Search,
  Filter, AlertCircle, ChevronRight, ArrowLeft
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const FILTERS = [
  { id: 'all',      label: 'Todos' },
  { id: 'critical', label: 'Críticos' },
  { id: 'warning',  label: 'Atención' },
  { id: 'ok',       label: 'Operativos' },
];

export default function PanelEdificios() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  // Carga unificada para técnicos (proxy) o directa para admins
  const { data: proxyData, isLoading: proxyLoading } = useQuery({
    queryKey: ['proxy-all-panel', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'all' });
      return res.data || {};
    },
    enabled: isSessionTech,
    staleTime: 30000,
  });

  const { data: directBuildings = [], isLoading: loadingB } = useQuery({
    queryKey: ['buildings', 'panel-direct'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !isSessionTech,
    staleTime: 60000,
  });
  const { data: directClients = [] } = useQuery({
    queryKey: ['clients', 'panel-direct'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !isSessionTech,
    staleTime: 60000,
  });
  const { data: directEquipment = [] } = useQuery({
    queryKey: ['equipment', 'panel-direct'],
    queryFn: () => base44.entities.Equipment.list(),
    enabled: !isSessionTech,
    staleTime: 60000,
  });
  const { data: directIncidents = [] } = useQuery({
    queryKey: ['incidents', 'panel-direct'],
    queryFn: () => base44.entities.Incident.list('-created_date'),
    enabled: !isSessionTech,
    staleTime: 60000,
  });
  const { data: directRevisions = [] } = useQuery({
    queryKey: ['scheduledRevisions', 'panel-direct'],
    queryFn: () => base44.entities.ScheduledRevision.list(),
    enabled: !isSessionTech,
    staleTime: 60000,
  });

  const isLoading = isSessionTech ? proxyLoading : loadingB;

  const buildings  = isSessionTech ? (proxyData?.buildings ?? []) : directBuildings;
  const clients    = isSessionTech ? (proxyData?.clients   ?? []) : directClients;
  const equipment  = isSessionTech ? (proxyData?.equipment ?? []) : directEquipment;
  const incidents  = isSessionTech ? (proxyData?.incidents ?? []) : directIncidents;
  const revisions  = isSessionTech ? (proxyData?.revisions ?? []) : directRevisions;

  const today = new Date();

  // Equipos que necesitan revisión: estado no operativo o fecha de revisión pasada
  const equipmentNeedingReviewMap = useMemo(() => {
    const map = {};
    equipment.forEach(eq => {
      const needsReview =
        eq.status === 'maintenance_needed' ||
        eq.status === 'out_of_service' ||
        (eq.first_revision_date && isBefore(parseISO(eq.first_revision_date), today)) ||
        (eq.next_leak_check_date && isBefore(parseISO(eq.next_leak_check_date), today));
      if (needsReview) {
        if (!map[eq.building_id]) map[eq.building_id] = [];
        map[eq.building_id].push(eq);
      }
    });
    return map;
  }, [equipment]);

  // Incidencias pendientes por edificio
  const pendingIncidentsMap = useMemo(() => {
    const map = {};
    incidents
      .filter(i => i.status === 'pending' || i.status === 'in_progress')
      .forEach(i => {
        if (!i.building_id) return;
        if (!map[i.building_id]) map[i.building_id] = [];
        map[i.building_id].push(i);
      });
    return map;
  }, [incidents]);

  // Revisiones pendientes (vencidas o próximas 30 días) por edificio
  const pendingRevisionsMap = useMemo(() => {
    const next30 = addDays(today, 30);
    const map = {};
    revisions
      .filter(r => r.status === 'pending')
      .filter(r => {
        const d = parseISO(r.scheduled_date);
        return isBefore(d, next30); // incluye vencidas y próximas
      })
      .forEach(r => {
        if (!r.building_id) return;
        if (!map[r.building_id]) map[r.building_id] = [];
        map[r.building_id].push(r);
      });
    return map;
  }, [revisions]);

  // Calcular nivel de cada edificio
  const buildingSummaries = useMemo(() => {
    return buildings.map(b => {
      const incs = pendingIncidentsMap[b.id] || [];
      const eqs  = equipmentNeedingReviewMap[b.id] || [];
      const revs = pendingRevisionsMap[b.id] || [];
      let level = 'ok';
      if (incs.length > 0 || eqs.length > 0) level = 'critical';
      else if (revs.length > 0) level = 'warning';
      return { building: b, level, incs, eqs, revs };
    });
  }, [buildings, pendingIncidentsMap, equipmentNeedingReviewMap, pendingRevisionsMap]);

  // KPIs globales
  const totalBuildings = buildings.length;
  const totalIncidents = Object.values(pendingIncidentsMap).reduce((s, arr) => s + arr.length, 0);
  const totalEqReview  = Object.values(equipmentNeedingReviewMap).reduce((s, arr) => s + arr.length, 0);
  const totalRevisions = Object.values(pendingRevisionsMap).reduce((s, arr) => s + arr.length, 0);

  // Filtrado
  const filtered = buildingSummaries
    .filter(s => filter === 'all' || s.level === filter)
    .filter(s => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const client = clients.find(c => c.id === s.building.client_id);
      return (
        s.building.name?.toLowerCase().includes(q) ||
        s.building.address?.toLowerCase().includes(q) ||
        s.building.city?.toLowerCase().includes(q) ||
        client?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Críticos primero, luego atención, luego ok
      const order = { critical: 0, warning: 1, ok: 2 };
      if (order[a.level] !== order[b.level]) return order[a.level] - order[b.level];
      return (b.incs.length + b.eqs.length) - (a.incs.length + a.eqs.length);
    });

  const kpis = [
    { label: 'Edificios',        value: totalBuildings, icon: Building2,      color: 'bg-blue-50 border-blue-200',    iconBg: 'bg-blue-100',    iconCls: 'text-blue-600' },
    { label: 'Alertas activas',  value: totalIncidents, icon: AlertTriangle,  color: totalIncidents > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200', iconBg: totalIncidents > 0 ? 'bg-red-100' : 'bg-slate-100', iconCls: totalIncidents > 0 ? 'text-red-500' : 'text-slate-400' },
    { label: 'Equipos a revisar',value: totalEqReview,  icon: Wrench,         color: totalEqReview > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200', iconBg: totalEqReview > 0 ? 'bg-orange-100' : 'bg-slate-100', iconCls: totalEqReview > 0 ? 'text-orange-500' : 'text-slate-400' },
    { label: 'Revisiones 30d',   value: totalRevisions, icon: ClipboardCheck, color: totalRevisions > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200', iconBg: totalRevisions > 0 ? 'bg-amber-100' : 'bg-slate-100', iconCls: totalRevisions > 0 ? 'text-amber-500' : 'text-slate-400' },
  ];

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar isSessionTech={isSessionTech} isAdmin={!isSessionTech} isLoading={false} onLogout={() => {}} techEmail={sessionTechEmail} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-800 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('HomeTecnico')}>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Volver
                </Button>
              </Link>
              <div className="w-px h-8 bg-white/20" />
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-lg font-bold">Panel de Edificios</h1>
                <p className="text-blue-100 text-xs">Estado global de instalaciones conectadas</p>
              </div>
            </div>
            <p className="text-white text-sm font-medium hidden sm:block">
              {format(today, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            {/* Barra de búsqueda + filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por edificio, cliente o ciudad…"
                  className="pl-10 bg-white border-slate-200"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                <Filter className="h-4 w-4 text-slate-400 mx-1.5 shrink-0" />
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filter === f.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de edificios */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-slate-200 p-12 text-center bg-white">
                <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay edificios que coincidan con el filtro</p>
                <p className="text-slate-400 text-sm mt-1">Prueba a cambiar la búsqueda o el filtro de estado</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(({ building, level, incs, eqs, revs }) => {
                  const client = clients.find(c => c.id === building.client_id);
                  return (
                    <EdificioStatusCard
                      key={building.id}
                      building={building}
                      client={client}
                      incidents={incs}
                      equipmentNeedingReview={eqs}
                      pendingRevisions={revs}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}