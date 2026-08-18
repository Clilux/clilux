import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Plus, Thermometer, MapPin,
  Building2, LayoutGrid, List, LayoutList, Copy, Loader2, CalendarCheck, CalendarX } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import PullToRefresh from '@/components/PullToRefresh';

const statusLabels = {
  operational: { label: 'Operativo', color: 'bg-emerald-500/20 text-emerald-400' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-500/20 text-amber-400' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-500/20 text-red-400' }
};

// ── Context Menu ─────────────────────────────────────────────
function ContextMenu({ x, y, onDuplicate, onOpen, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ top: y, left: x }}
    >
      <button
        onClick={onOpen}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
      >
        <Thermometer className="h-4 w-4 text-slate-400" />
        Abrir equipo
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button
        onClick={onDuplicate}
        className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
      >
        <Copy className="h-4 w-4 text-blue-500" />
        Duplicar equipo
      </button>
    </div>
  );
}

// 'grid' = tarjetas grandes, 'compact' = tarjetas pequeñas, 'list' = lista
export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    const v = localStorage.getItem('equipment_view');
    return ['grid', 'compact', 'list'].includes(v) ? v : 'grid';
  });
  const [contextMenu, setContextMenu] = useState(null); // { x, y, eq }
  const [duplicating, setDuplicating] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: proxyData, isError: proxyError } = useQuery({
    queryKey: ['proxy-all', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'all' });
      return res.data || {};
    },
    enabled: isSessionTech,
    staleTime: 30000,
  });

  const { data: equipmentDirect = [], isLoading: loadingDirect } = useQuery({
    queryKey: ['equipment', 'direct'],
    queryFn: () => base44.entities.Equipment.list('-created_date'),
    enabled: !isSessionTech,
  });

  const { data: buildingsDirect = [] } = useQuery({
    queryKey: ['buildings', 'direct'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !isSessionTech,
  });

  const { data: clientsDirect = [] } = useQuery({
    queryKey: ['clients', 'direct'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !isSessionTech,
  });

  const { data: revisionsDirect = [] } = useQuery({
    queryKey: ['revisions', 'direct'],
    queryFn: () => base44.entities.ScheduledRevision.list(),
    enabled: !isSessionTech,
  });

  const equipment = isSessionTech ? (proxyData?.equipment || []) : equipmentDirect;
  const buildings = isSessionTech ? (proxyData?.buildings || []) : buildingsDirect;
  const clients   = isSessionTech ? (proxyData?.clients   || []) : clientsDirect;
  const revisions = isSessionTech ? (proxyData?.revisions || []) : revisionsDirect;
  const isLoading = isSessionTech ? (!proxyData && !proxyError) : loadingDirect;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['equipment'] });
    await queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
    await queryClient.invalidateQueries({ queryKey: ['buildings'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['revisions'] });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Para cada equipo: buscar su próxima revisión pendiente más cercana
  const getRevisionStatus = (eqId) => {
    const eqRevisions = revisions.filter(r => r.equipment_id === eqId && r.status === 'pending');
    if (eqRevisions.length === 0) return null;
    const next = eqRevisions.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];
    const date = new Date(next.scheduled_date);
    return { date, overdue: date < today };
  };

  const filteredEquipment = equipment.filter((eq) => {
    // Ocultar unidades interiores: solo se ven desde su unidad exterior
    if (eq.parent_equipment_id) return false;
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
      eq.reference_name?.toLowerCase().includes(search) ||
      building?.name?.toLowerCase().includes(search) ||
      client?.name?.toLowerCase().includes(search)
    );
  });

  const handleContextMenu = useCallback((e, eq) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 100);
    setContextMenu({ x, y, eq });
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!contextMenu?.eq) return;
    setContextMenu(null);
    setDuplicating(true);
    const source = contextMenu.eq;
    try {
      // Clonar todos los campos relevantes, omitir id, created_date, updated_date
      const {
        id, created_date, updated_date, created_by,
        ...rest
      } = source;

      const newEquip = await base44.entities.Equipment.create({
        ...rest,
        reference_name: `Copia de ${source.reference_name || source.brand + ' ' + source.model}`,
        serial_number: '', // limpiar número de serie (no puede ser el mismo)
        registration_date: new Date().toISOString().split('T')[0],
      });

      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipo duplicado. Abriendo para editar...');
      navigate(createPageUrl(`EquipmentForm?id=${newEquip.id}`));
    } catch (err) {
      toast.error('Error al duplicar el equipo');
    } finally {
      setDuplicating(false);
    }
  }, [contextMenu, navigate, queryClient]);

  const handleOpen = useCallback(() => {
    if (!contextMenu?.eq) return;
    const id = contextMenu.eq.id;
    setContextMenu(null);
    navigate(createPageUrl(`EquipmentDetail?id=${id}`));
  }, [contextMenu, navigate]);

  // Cerrar menú con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setContextMenu(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="bg-background p-6 min-h-screen">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="mx-auto max-w-7xl">
        <NavHeader title="Equipos" />

        <div className="mb-6 flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo, serie, ubicación, edificio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-card/10 text-slate-950 pl-10 w-full" />
          </div>

          <div className="flex flex-wrap gap-3 w-full items-center">
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <button
                onClick={() => { setViewMode('grid'); localStorage.setItem('equipment_view', 'grid'); }}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Cuadrícula">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setViewMode('compact'); localStorage.setItem('equipment_view', 'compact'); }}
                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Compacto">
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setViewMode('list'); localStorage.setItem('equipment_view', 'list'); }}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Lista">
                <List className="h-4 w-4" />
              </button>
            </div>

            <Link to={createPageUrl('EquipmentForm')} className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Equipo
              </Button>
            </Link>

            {duplicating && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicando...
              </div>
            )}
          </div>
        </div>

        {/* Hint clic derecho */}
        {filteredEquipment.length > 0 && (
          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
            <Copy className="h-3 w-3" />
            Clic derecho sobre un equipo para duplicarlo
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="h-32 animate-pulse bg-slate-200 rounded" />
              </Card>
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <Card className="p-12 bg-white border border-slate-200 shadow-sm text-center">
            <Thermometer className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm ? 'No se encontraron equipos' : 'No hay equipos registrados'}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer equipo'}
            </p>
          </Card>
        ) : (
          <>
          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map((eq) => {
                const building = buildings.find((b) => b.id === eq.building_id);
                const statusInfo = statusLabels[eq.status] || statusLabels.operational;
                const revStatus = getRevisionStatus(eq.id);
                return (
                  <div key={eq.id} onContextMenu={(e) => handleContextMenu(e, eq)}>
                    <Link to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                      <Card className="p-5 bg-card hover:shadow-md transition-all group border cursor-pointer select-none">
                        {eq.photo_url &&
                          <div className="mb-4 -mx-5 -mt-5 h-32 overflow-hidden rounded-t-xl bg-background">
                            <img src={eq.photo_url} alt={`${eq.brand} ${eq.model}`} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                          </div>
                        }
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <h3 className="text-teal-700 text-base font-semibold">{eq.reference_name || `${eq.brand} ${eq.model}`}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{eq.brand} {eq.model}</p>
                        <p className="text-xs text-slate-400 mb-3">{eq.equipment_type}</p>
                        <div className="space-y-1.5">
                          {building && <div className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="h-3.5 w-3.5 text-slate-400" />{building.name}</div>}
                          {eq.location && <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" />{eq.location}</div>}
                          {eq.serial_number && <div className="text-xs text-slate-400">S/N: {eq.serial_number}</div>}
                          {revStatus && (
                            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit ${revStatus.overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {revStatus.overdue ? <CalendarX className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
                              {revStatus.overdue ? 'Revisión caducada' : `Revisión: ${revStatus.date.toLocaleDateString('es-ES')}`}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* COMPACT VIEW */}
          {viewMode === 'compact' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredEquipment.map((eq) => {
                const statusInfo = statusLabels[eq.status] || statusLabels.operational;
                const revStatus = getRevisionStatus(eq.id);
                return (
                  <div key={eq.id} onContextMenu={(e) => handleContextMenu(e, eq)}>
                    <Link to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                      <Card className="p-3 bg-card hover:shadow-md transition-all border flex flex-col gap-1 cursor-pointer select-none">
                        {eq.photo_url && <div className="h-20 -mx-3 -mt-3 mb-2 overflow-hidden rounded-t-xl bg-background"><img src={eq.photo_url} alt="" className="w-full h-full object-contain" /></div>}
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-semibold text-teal-700 leading-tight">{eq.reference_name || `${eq.brand} ${eq.model}`}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">{eq.brand} {eq.model}</p>
                        <p className="text-xs text-slate-400">{eq.equipment_type}</p>
                        {eq.location && <p className="text-xs text-slate-500 truncate">{eq.location}</p>}
                        {revStatus && (
                          <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-0.5 ${revStatus.overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {revStatus.overdue ? <CalendarX className="h-2.5 w-2.5" /> : <CalendarCheck className="h-2.5 w-2.5" />}
                            {revStatus.overdue ? 'Caducada' : revStatus.date.toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="flex flex-col gap-2">
              {filteredEquipment.map((eq) => {
                const building = buildings.find((b) => b.id === eq.building_id);
                const client = clients.find((c) => c.id === eq.client_id);
                const statusInfo = statusLabels[eq.status] || statusLabels.operational;
                const revStatus = getRevisionStatus(eq.id);
                return (
                  <div key={eq.id} onContextMenu={(e) => handleContextMenu(e, eq)}>
                    <Link to={createPageUrl(`EquipmentDetail?id=${eq.id}`)}>
                      <Card className="px-4 py-3 bg-card hover:shadow-md transition-all border flex items-center gap-4 cursor-pointer select-none">
                        {eq.photo_url
                          ? <img src={eq.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                          : <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Thermometer className="h-5 w-5 text-slate-400" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-teal-700">{eq.reference_name || `${eq.brand} ${eq.model}`}</span>
                            <span className="text-xs text-slate-500">{eq.brand} {eq.model}</span>
                            <span className="text-xs text-slate-400">{eq.equipment_type}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                            {client && <span>{client.name}</span>}
                            {building && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{building.name}</span>}
                            {eq.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{eq.location}</span>}
                            {eq.serial_number && <span>S/N: {eq.serial_number}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {revStatus && (
                            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap ${revStatus.overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {revStatus.overdue ? <CalendarX className="h-3 w-3" /> : <CalendarCheck className="h-3 w-3" />}
                              {revStatus.overdue ? 'Revisión caducada' : revStatus.date.toLocaleDateString('es-ES')}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onOpen={handleOpen}
          onDuplicate={handleDuplicate}
          onClose={() => setContextMenu(null)}
        />
      )}
      </PullToRefresh>
    </div>
  );
}