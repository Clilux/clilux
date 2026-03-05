import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NavHeader from '../components/navigation/NavHeader';
import ExportButton from '../components/ExportButton';
import ImportButton from '../components/ImportButton';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function Calendar() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');
  const [syncing, setSyncing] = useState(false);

  const handleSyncGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', {});
      const { created, failed, total } = res.data;
      toast.success(`Sincronizados ${created} de ${total} eventos con Google Calendar${failed > 0 ? ` (${failed} errores)` : ''}`);
    } catch (e) {
      toast.error('Error al sincronizar con Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const { data: scheduledRevisions = [] } = useQuery({
    queryKey: ['scheduled-revisions'],
    queryFn: () => base44.entities.ScheduledRevision.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredRevisions = scheduledRevisions.filter(rev => {
    if (filterClient !== 'all' && rev.client_id !== filterClient) return false;
    return true;
  });

  const getRevisionsForDay = (day) => {
    return filteredRevisions.filter(rev => 
      isSameDay(new Date(rev.scheduled_date), day)
    );
  };

  const getUpcomingRevisions = () => {
    const today = new Date();
    return filteredRevisions
      .filter(rev => rev.status === 'pending' && new Date(rev.scheduled_date) >= today)
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 10);
  };

  const getRevisionsByMonth = () => {
    const grouped = {};
    filteredRevisions
      .filter(rev => rev.status === 'pending')
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .forEach(rev => {
        const monthKey = format(new Date(rev.scheduled_date), 'MMMM yyyy', { locale: es });
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(rev);
      });
    return grouped;
  };

  const getEquipmentInfo = (equipmentId) => {
    return equipment.find(e => e.id === equipmentId);
  };

  const getBuildingInfo = (buildingId) => {
    return buildings.find(b => b.id === buildingId);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <NavHeader title="Calendario de Revisiones" />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleSyncGoogleCalendar}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sync Google Calendar'}
            </Button>
            <ExportButton
              data={filteredRevisions.map(rev => {
                const eq = equipment.find(e => e.id === rev.equipment_id);
                const building = buildings.find(b => b.id === rev.building_id);
                const client = clients.find(c => c.id === rev.client_id);
                return {
                  'Cliente': client?.name || '',
                  'Edificio': building?.name || '',
                  'Equipo': eq ? `${eq.brand} ${eq.model}` : '',
                  'Tipo Revisión': revisionTypeLabels[rev.revision_type] || '',
                  'Fecha': rev.scheduled_date || '',
                  'Estado': rev.status === 'completed' ? 'Completada' : 'Pendiente'
                };
              })}
              filename="revisiones"
            />
            <ImportButton
              onImport={async (data) => {
                const revisionsToImport = data.map(row => ({
                  client_id: row.client_id || '',
                  building_id: row.building_id || '',
                  equipment_id: row.equipment_id || '',
                  scheduled_date: row.scheduled_date || row['Fecha'] || '',
                  revision_type: row.revision_type || row['Tipo Revisión'] || 'monthly',
                  status: row.status || row['Estado'] === 'Completada' ? 'completed' : 'pending'
                }));
                await base44.entities.ScheduledRevision.bulkCreate(revisionsToImport);
                queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
              }}
              label="Importar"
            />
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setViewMode('calendar')}
            >
              Vista Calendario
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'outline'}
              onClick={() => setViewMode('agenda')}
            >
              Vista Agenda
            </Button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 bg-white">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-slate-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  const dayRevisions = getRevisionsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-20 p-2 rounded-lg border cursor-pointer transition-all
                        ${isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                        ${isToday ? 'border-blue-500 border-2' : 'border-slate-200'}
                        ${isSelected ? 'ring-2 ring-blue-400' : ''}
                        hover:shadow-md
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayRevisions.slice(0, 2).map(rev => (
                          <div
                            key={rev.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              rev.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {revisionTypeLabels[rev.revision_type]}
                          </div>
                        ))}
                        {dayRevisions.length > 2 && (
                          <div className="text-xs text-slate-500">+{dayRevisions.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <h3 className="font-semibold text-slate-800 mb-4">
                {selectedDate
                  ? format(selectedDate, "d 'de' MMMM", { locale: es })
                  : 'Próximas revisiones'}
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(selectedDate ? getRevisionsForDay(selectedDate) : getUpcomingRevisions()).map(rev => {
                  const equipmentInfo = getEquipmentInfo(rev.equipment_id);
                  const buildingInfo = getBuildingInfo(rev.building_id);

                  return (
                    <div key={rev.id} className="p-3 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-slate-800">
                          {revisionTypeLabels[rev.revision_type]}
                        </span>
                        {rev.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      {equipmentInfo && (
                        <p className="text-sm text-slate-600">
                          {equipmentInfo.brand} {equipmentInfo.model}
                        </p>
                      )}
                      {buildingInfo && (
                        <p className="text-xs text-slate-500">{buildingInfo.name}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(rev.scheduled_date), "d MMM yyyy", { locale: es })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Link to={createPageUrl(`RevisionForm?id=${rev.id}`)} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            Realizar
                          </Button>
                        </Link>
                        <Link to={createPageUrl(`EditScheduledRevision?id=${rev.id}`)} className="flex-1">
                          <Button size="sm" variant="ghost" className="w-full">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Agenda de Revisiones</h2>
            {Object.entries(getRevisionsByMonth()).map(([month, revisions]) => (
              <div key={month} className="mb-8">
                <h3 className="font-semibold text-slate-700 mb-4 capitalize">{month}</h3>
                <div className="space-y-3">
                  {revisions.map(rev => {
                    const equipmentInfo = getEquipmentInfo(rev.equipment_id);
                    const buildingInfo = getBuildingInfo(rev.building_id);

                    return (
                      <div key={rev.id} className="p-4 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium text-slate-800">
                                {revisionTypeLabels[rev.revision_type]}
                              </span>
                              {rev.status === 'completed' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            {equipmentInfo && (
                              <p className="text-sm text-slate-600">
                                {equipmentInfo.brand} {equipmentInfo.model}
                              </p>
                            )}
                            {buildingInfo && (
                              <p className="text-xs text-slate-500">{buildingInfo.name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-800">
                              {format(new Date(rev.scheduled_date), "d MMM", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={createPageUrl(`RevisionForm?id=${rev.id}`)} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              Realizar
                            </Button>
                          </Link>
                          <Link to={createPageUrl(`EditScheduledRevision?id=${rev.id}`)} className="flex-1">
                            <Button size="sm" variant="ghost" className="w-full">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Editar Fecha
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}