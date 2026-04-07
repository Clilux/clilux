import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle2, RefreshCw, GitMerge, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks,
  addYears, subYears, startOfYear, endOfYear, eachMonthOfInterval, getYear, getMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NavHeader from '../components/navigation/NavHeader';
import UnifyRevisionsModal from '../components/calendar/UnifyRevisionsModal';
import UnifiedRevisionModal from '../components/calendar/UnifiedRevisionModal';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual',
  unified: 'Unificada'
};

const revisionTypeColors = {
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-purple-100 text-purple-700',
  biannual: 'bg-orange-100 text-orange-700',
  annual: 'bg-red-100 text-red-700',
  unified: 'bg-emerald-100 text-emerald-700',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [viewMode, setViewMode] = useState('month');
  const [syncing, setSyncing] = useState(false);
  const [showUnifyModal, setShowUnifyModal] = useState(false);
  const [selectedUnifiedRevision, setSelectedUnifiedRevision] = useState(null);

  const queryClient = useQueryClient();

  const handleSyncGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', {});
      const { created, failed, total } = res.data;
      toast.success(`Sincronizados ${created} de ${total} eventos${failed > 0 ? ` (${failed} errores)` : ''}`);
    } catch {
      toast.error('Error al sincronizar con Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const { data: scheduledRevisions = [] } = useQuery({
    queryKey: ['scheduled-revisions'],
    queryFn: () => base44.entities.ScheduledRevision.list(),
  });
  const { data: equipment = [] } = useQuery({ queryKey: ['equipment'], queryFn: () => base44.entities.Equipment.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: () => base44.entities.Building.list() });

  const filteredRevisions = scheduledRevisions.filter(rev =>
    filterClient === 'all' || rev.client_id === filterClient
  );

  const getRevisionsForDay = (day) =>
    filteredRevisions.filter(rev => isSameDay(new Date(rev.scheduled_date), day));

  const getEquipmentInfo = (id) => equipment.find(e => e.id === id);
  const getBuildingInfo = (id) => buildings.find(b => b.id === id);

  const handleRevisionClick = (rev, e) => {
    if (rev.is_unified_revision) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedUnifiedRevision(rev);
    }
  };

  // Navigation helpers
  const navigate = (dir) => {
    if (viewMode === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else if (viewMode === 'year') setCurrentDate(dir > 0 ? addYears(currentDate, 1) : subYears(currentDate, 1));
    else if (viewMode === 'agenda') setCurrentDate(dir > 0 ? addMonths(currentDate, 3) : subMonths(currentDate, 3));
  };

  const getNavLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: es });
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { locale: es });
      const we = endOfWeek(currentDate, { locale: es });
      return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`;
    }
    if (viewMode === 'year') return format(currentDate, 'yyyy');
    return 'Agenda';
  };

  // MONTH VIEW
  const MonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: es });
    const calendarEnd = endOfWeek(monthEnd, { locale: es });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-4 bg-white">
          <div className="grid grid-cols-7 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayRevs = getRevisionsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-16 p-1 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                    ${isCurrentMonth ? 'bg-white' : 'bg-slate-50 opacity-50'}
                    ${isToday ? 'border-blue-500 border-2' : 'border-slate-100'}
                    ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className={`text-xs font-medium mb-0.5 ${isCurrentMonth ? 'text-slate-800' : 'text-slate-400'} ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayRevs.slice(0, 2).map(rev => {
                      const bld = rev.is_unified_revision ? getBuildingInfo(rev.building_id) : null;
                      return (
                        <div
                          key={rev.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${rev.status === 'completed' ? 'bg-green-100 text-green-700' : revisionTypeColors[rev.revision_type] || 'bg-blue-100 text-blue-700'}`}
                          onClick={rev.is_unified_revision ? (e) => { e.stopPropagation(); setSelectedUnifiedRevision(rev); } : undefined}
                        >
                          {rev.is_unified_revision ? `🏢 ${bld?.name || 'Edificio'}` : revisionTypeLabels[rev.revision_type]}
                        </div>
                      );
                    })}
                    {dayRevs.length > 2 && <div className="text-xs text-slate-400">+{dayRevs.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <SidePanel selectedDate={selectedDate} />
      </div>
    );
  };

  // WEEK VIEW
  const WeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: es });
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { locale: es }) });
    return (
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dayRevs = getRevisionsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`min-h-48 p-2 rounded-xl border cursor-pointer transition-all hover:shadow-md
                  ${isToday ? 'border-blue-500 border-2 bg-blue-50' : 'border-slate-100 bg-white'}
                  ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs text-slate-500 capitalize">{format(day, 'EEE', { locale: es })}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{format(day, 'd')}</div>
                </div>
                <div className="space-y-1">
                  {dayRevs.map(rev => {
                    const eq = getEquipmentInfo(rev.equipment_id);
                    const bld = rev.is_unified_revision ? getBuildingInfo(rev.building_id) : null;
                    if (rev.is_unified_revision) {
                      return (
                        <div
                          key={rev.id}
                          onClick={e => { e.stopPropagation(); setSelectedUnifiedRevision(rev); }}
                          className="text-xs p-1.5 rounded-lg mb-1 cursor-pointer hover:opacity-80 bg-emerald-100 text-emerald-700"
                        >
                          <div className="font-medium flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {bld?.name || 'Edificio'}
                          </div>
                          <div className="truncate opacity-80">{(rev.unified_equipment_info || []).length} equipos</div>
                        </div>
                      );
                    }
                    return (
                      <Link key={rev.id} to={createPageUrl(`RevisionForm?id=${rev.id}`)} onClick={e => e.stopPropagation()}>
                        <div className={`text-xs p-1.5 rounded-lg mb-1 cursor-pointer hover:opacity-80 ${rev.status === 'completed' ? 'bg-green-100 text-green-700' : revisionTypeColors[rev.revision_type] || 'bg-blue-100 text-blue-700'}`}>
                          <div className="font-medium">{revisionTypeLabels[rev.revision_type]}</div>
                          {eq && <div className="truncate opacity-80">{eq.reference_name || `${eq.brand} ${eq.model}`}</div>}
                        </div>
                      </Link>
                    );
                  })}
                  {dayRevs.length === 0 && <p className="text-xs text-slate-300 text-center pt-2">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // YEAR VIEW
  const YearView = () => {
    const year = getYear(currentDate);
    const months = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month, mi) => {
          const monthStart2 = startOfMonth(month);
          const monthEnd2 = endOfMonth(month);
          const days = eachDayOfInterval({ start: startOfWeek(monthStart2, { locale: es }), end: endOfWeek(monthEnd2, { locale: es }) });
          const monthRevs = filteredRevisions.filter(rev => {
            const d = new Date(rev.scheduled_date);
            return getYear(d) === year && getMonth(d) === mi;
          });
          const isCurrentMonth = isSameMonth(month, new Date());
          return (
            <Card
              key={mi}
              className={`p-3 cursor-pointer hover:shadow-md transition-all ${isCurrentMonth ? 'border-blue-400 border-2' : ''}`}
              onClick={() => { setCurrentDate(month); setViewMode('month'); }}
            >
              <h4 className="font-semibold text-slate-700 capitalize mb-2 text-sm">{format(month, 'MMMM', { locale: es })}</h4>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['L','M','X','J','V','S','D'].map(d => (
                  <div key={d} className="text-center text-slate-300 text-xs">{d[0]}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day, di) => {
                  const inMonth = isSameMonth(day, month);
                  const dayRevs = getRevisionsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={di} className={`text-center text-xs rounded-full w-5 h-5 flex items-center justify-center mx-auto
                      ${!inMonth ? 'opacity-0' : ''}
                      ${isToday ? 'bg-blue-500 text-white font-bold' : ''}
                      ${dayRevs.length > 0 && !isToday ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-500'}`}>
                      {inMonth ? format(day, 'd') : ''}
                    </div>
                  );
                })}
              </div>
              {monthRevs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{monthRevs.length} revisión{monthRevs.length !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // AGENDA VIEW
  const AgendaView = () => {
    const agendaStart = new Date();
    const agendaRevisions = filteredRevisions
      .filter(rev => rev.status === 'pending' && new Date(rev.scheduled_date) >= agendaStart)
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    const grouped = {};
    agendaRevisions.forEach(rev => {
      const monthKey = format(new Date(rev.scheduled_date), 'MMMM yyyy', { locale: es });
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(rev);
    });

    return (
      <Card className="p-6 bg-white">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Próximas Revisiones Pendientes</h2>
        {Object.keys(grouped).length === 0 && <p className="text-slate-400 text-center py-8">No hay revisiones pendientes</p>}
        {Object.entries(grouped).map(([month, revs]) => (
          <div key={month} className="mb-8">
            <h3 className="font-semibold text-slate-700 mb-3 capitalize text-base border-b pb-2">{month}</h3>
            <div className="space-y-3">
              {revs.map(rev => {
                const eq = getEquipmentInfo(rev.equipment_id);
                const bld = getBuildingInfo(rev.building_id);
                if (rev.is_unified_revision) {
                  return (
                    <div key={rev.id} className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-12">
                          <div className="text-xl font-bold text-slate-700">{format(new Date(rev.scheduled_date), 'd')}</div>
                          <div className="text-xs text-slate-400 capitalize">{format(new Date(rev.scheduled_date), 'EEE', { locale: es })}</div>
                        </div>
                        <div>
                          <Badge className="bg-emerald-100 text-emerald-700 mb-1">Revisión Unificada</Badge>
                          <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" /> {bld?.name || 'Edificio'}
                          </p>
                          <p className="text-xs text-slate-400">{(rev.unified_equipment_info || []).length} equipos agrupados</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedUnifiedRevision(rev)}>
                        Ver equipos
                      </Button>
                    </div>
                  );
                }
                return (
                  <div key={rev.id} className="p-4 border rounded-xl hover:bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-12">
                        <div className="text-xl font-bold text-slate-700">{format(new Date(rev.scheduled_date), 'd')}</div>
                        <div className="text-xs text-slate-400 capitalize">{format(new Date(rev.scheduled_date), 'EEE', { locale: es })}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={revisionTypeColors[rev.revision_type] || 'bg-blue-100 text-blue-700'}>
                            {revisionTypeLabels[rev.revision_type]}
                          </Badge>
                        </div>
                        {eq && <p className="text-sm font-medium text-slate-700">{eq.reference_name || `${eq.brand} ${eq.model}`}</p>}
                        {bld && <p className="text-xs text-slate-400">{bld.name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={createPageUrl(`RevisionForm?id=${rev.id}`)}>
                        <Button size="sm" variant="outline">Realizar</Button>
                      </Link>
                      <Link to={createPageUrl(`EditScheduledRevision?id=${rev.id}`)}>
                        <Button size="sm" variant="ghost"><CalendarIcon className="h-3.5 w-3.5" /></Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    );
  };

  // SIDE PANEL for month/week
  const SidePanel = ({ selectedDate }) => {
    const revs = selectedDate ? getRevisionsForDay(selectedDate) : filteredRevisions
      .filter(rev => rev.status === 'pending' && new Date(rev.scheduled_date) >= new Date())
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 8);

    return (
      <Card className="p-4 bg-white">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">
          {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Próximas revisiones'}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {revs.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Sin revisiones</p>}
          {revs.map(rev => {
            const eq = getEquipmentInfo(rev.equipment_id);
            const bld = getBuildingInfo(rev.building_id);
            if (rev.is_unified_revision) {
              return (
                <div key={rev.id} className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className="text-xs bg-emerald-100 text-emerald-700">Unificada</Badge>
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">{bld?.name || 'Edificio'}</p>
                  <p className="text-xs text-slate-400">{(rev.unified_equipment_info || []).length} equipos</p>
                  {!selectedDate && <p className="text-xs text-slate-400 mt-0.5">{format(new Date(rev.scheduled_date), "d MMM", { locale: es })}</p>}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7 mt-2"
                    onClick={() => setSelectedUnifiedRevision(rev)}
                  >
                    Ver equipos
                  </Button>
                </div>
              );
            }
            return (
              <div key={rev.id} className="p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <Badge className={`text-xs ${revisionTypeColors[rev.revision_type] || 'bg-blue-100 text-blue-700'}`}>
                    {revisionTypeLabels[rev.revision_type]}
                  </Badge>
                  {rev.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-blue-500" />}
                </div>
                {eq && <p className="text-xs font-medium text-slate-700">{eq.reference_name || `${eq.brand} ${eq.model}`}</p>}
                {bld && <p className="text-xs text-slate-400">{bld.name}</p>}
                {!selectedDate && <p className="text-xs text-slate-400 mt-0.5">{format(new Date(rev.scheduled_date), "d MMM", { locale: es })}</p>}
                <div className="flex gap-1 mt-2">
                  <Link to={createPageUrl(`RevisionForm?id=${rev.id}`)} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-7">Realizar</Button>
                  </Link>
                  <Link to={createPageUrl(`EditScheduledRevision?id=${rev.id}`)}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><CalendarIcon className="h-3 w-3" /></Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <NavHeader title="Calendario de Revisiones" />

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 items-start md:items-center">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Unify button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setShowUnifyModal(true)}
            >
              <GitMerge className="h-4 w-4 mr-1" />
              Unificar revisiones
            </Button>

            {/* View mode toggles */}
            <div className="flex gap-1 bg-white border rounded-lg p-1">
              {[
                { key: 'month', label: 'Mes' },
                { key: 'week', label: 'Semana' },
                { key: 'agenda', label: 'Agenda' },
                { key: 'year', label: 'Año' },
              ].map(v => (
                <Button
                  key={v.key}
                  variant={viewMode === v.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(v.key)}
                  className="text-xs h-7"
                >
                  {v.label}
                </Button>
              ))}
            </div>

            <Button variant="outline" onClick={handleSyncGoogleCalendar} disabled={syncing} size="sm" className="bg-white">
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </div>

        {/* Navigation bar (not for agenda) */}
        {viewMode !== 'agenda' && (
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="bg-white">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-slate-800 capitalize">{getNavLabel()}</h2>
            <Button variant="outline" size="icon" onClick={() => navigate(1)} className="bg-white">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {viewMode === 'month' && <MonthView />}
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'agenda' && <AgendaView />}
        {viewMode === 'year' && <YearView />}
      </div>

      {/* Modals */}
      <UnifyRevisionsModal
        open={showUnifyModal}
        onClose={() => setShowUnifyModal(false)}
        revisions={scheduledRevisions}
        equipment={equipment}
        buildings={buildings}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] })}
      />

      <UnifiedRevisionModal
        open={!!selectedUnifiedRevision}
        onClose={() => setSelectedUnifiedRevision(null)}
        revision={selectedUnifiedRevision}
        building={selectedUnifiedRevision ? getBuildingInfo(selectedUnifiedRevision.building_id) : null}
      />
    </div>
  );
}