import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ClipboardCheck, AlertCircle } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterClient, setFilterClient] = useState('all');

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  // Eventos del calendario: próximas revisiones y revisiones realizadas
  const calendarEvents = useMemo(() => {
    const events = [];
    
    // Próximas revisiones programadas
    equipment.forEach(eq => {
      if (eq.next_revision_date) {
        if (filterClient === 'all' || eq.client_id === filterClient) {
          events.push({
            date: eq.next_revision_date,
            type: 'scheduled',
            title: `${eq.brand} ${eq.model}`,
            equipment: eq,
            client_id: eq.client_id,
          });
        }
      }
    });

    // Revisiones realizadas
    revisions.forEach(rev => {
      const eq = equipment.find(e => e.id === rev.equipment_id);
      if (filterClient === 'all' || rev.client_id === filterClient) {
        events.push({
          date: rev.revision_date,
          type: 'completed',
          title: eq ? `${eq.brand} ${eq.model}` : 'Revisión',
          revision: rev,
          equipment: eq,
          client_id: rev.client_id,
        });
      }
    });

    return events;
  }, [equipment, revisions, filterClient]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getEventsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return calendarEvents.filter(event => event.date === dateStr);
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || '';
  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || '';

  // Calcular inicio del calendario (lunes)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startPadding = (firstDayOfMonth.getDay() + 6) % 7; // Ajustar para que lunes sea 0

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Calendario de Revisiones" />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendario */}
          <div className="flex-1">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-semibold text-slate-800 capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {/* Padding para alinear el primer día */}
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-24" />
                ))}
                
                {days.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const hasScheduled = dayEvents.some(e => e.type === 'scheduled');
                  const hasCompleted = dayEvents.some(e => e.type === 'completed');

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-24 p-2 rounded-lg border text-left transition-all",
                        isSelected ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200",
                        isToday && "ring-2 ring-blue-500 ring-offset-2"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isToday ? "text-blue-600" : "text-slate-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1 space-y-1">
                        {hasScheduled && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-slate-500 truncate">Programada</span>
                          </div>
                        )}
                        {hasCompleted && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-slate-500 truncate">Realizada</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-600">Revisión programada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600">Revisión realizada</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Panel lateral - eventos del día */}
          <div className="w-full lg:w-80">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
              </h3>

              {selectedDate && selectedDateEvents.length === 0 && (
                <p className="text-slate-500 text-sm">No hay eventos para este día</p>
              )}

              <div className="space-y-3">
                {selectedDateEvents.map((event, index) => (
                  <div key={index} className={cn(
                    "p-3 rounded-lg border",
                    event.type === 'scheduled' ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
                  )}>
                    <div className="flex items-start gap-2">
                      {event.type === 'scheduled' ? (
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4 text-green-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{event.title}</p>
                        <p className="text-xs text-slate-500">{getClientName(event.client_id)}</p>
                        {event.equipment && (
                          <p className="text-xs text-slate-500">{event.equipment.location}</p>
                        )}
                        {event.type === 'scheduled' && event.equipment && (
                          <Link to={createPageUrl(`EquipmentDetail?id=${event.equipment.id}`)}>
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                              Ver equipo →
                            </Button>
                          </Link>
                        )}
                        {event.type === 'completed' && event.revision && (
                          <Link to={createPageUrl(`RevisionDetail?id=${event.revision.id}`)}>
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                              Ver revisión →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Próximas revisiones */}
            <Card className="p-6 bg-white border-0 shadow-sm mt-4">
              <h3 className="font-semibold text-slate-800 mb-4">Próximas Revisiones</h3>
              <div className="space-y-3">
                {calendarEvents
                  .filter(e => e.type === 'scheduled' && new Date(e.date) >= new Date())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 5)
                  .map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{event.title}</p>
                        <p className="text-xs text-slate-500">{getClientName(event.client_id)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(event.date), 'dd/MM')}
                      </Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}