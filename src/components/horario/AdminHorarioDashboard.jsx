import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, MapPin, History, Pencil, BarChart3, FileText } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import MapaRuta from '@/components/horario/MapaRuta';
import EditarRegistroModal from './EditarRegistroModal';
import CrearAlbaranStelModal from './CrearAlbaranStelModal';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminHorarioDashboard({ currentUser, technicians, myTechRecord }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('month'); // day | week | month | year
  const [refDate, setRefDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [albaranRecord, setAlbaranRecord] = useState(null);

  const companyTechs = technicians.filter(t =>
    !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id
  );

  // Determine date range
  const dateRange = useMemo(() => {
    if (period === 'day') return { start: format(refDate, 'yyyy-MM-dd'), end: format(refDate, 'yyyy-MM-dd') };
    if (period === 'week') return { start: format(startOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    if (period === 'month') return { start: format(startOfMonth(refDate), 'yyyy-MM-dd'), end: format(endOfMonth(refDate), 'yyyy-MM-dd') };
    return { start: format(startOfYear(refDate), 'yyyy-MM-dd'), end: format(endOfYear(refDate), 'yyyy-MM-dd') };
  }, [period, refDate]);

  const { data: allRegistros = [], isLoading } = useQuery({
    queryKey: ['admin-registros', dateRange.start, dateRange.end],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 2000);
      return all.filter(r => r.fecha >= dateRange.start && r.fecha <= dateRange.end);
    },
  });

  const registros = useMemo(() => {
    let filtered = allRegistros;
    if (selectedTech !== 'all') filtered = filtered.filter(r => r.technician_email === selectedTech);
    if (myTechRecord?.company_id) {
      filtered = filtered.filter(r => {
        const t = technicians.find(t => t.user_email === r.technician_email || t.email === r.technician_email);
        return t?.company_id === myTechRecord.company_id;
      });
    }
    return filtered;
  }, [allRegistros, selectedTech, myTechRecord, technicians]);

  // Navigate period
  const nav = (dir) => {
    setRefDate(d => {
      const n = new Date(d);
      if (period === 'day') n.setDate(n.getDate() + dir);
      else if (period === 'week') n.setDate(n.getDate() + dir * 7);
      else if (period === 'month') n.setMonth(n.getMonth() + dir);
      else n.setFullYear(n.getFullYear() + dir);
      return n;
    });
  };

  const periodLabel = useMemo(() => {
    if (period === 'day') return format(refDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    if (period === 'week') {
      const s = startOfWeek(refDate, { weekStartsOn: 1 });
      const e = endOfWeek(refDate, { weekStartsOn: 1 });
      return `Sem. ${getISOWeek(refDate)} · ${format(s, 'd MMM', { locale: es })} – ${format(e, 'd MMM yyyy', { locale: es })}`;
    }
    if (period === 'month') return format(refDate, 'MMMM yyyy', { locale: es });
    return format(refDate, 'yyyy');
  }, [period, refDate]);

  // Chart data
  const chartData = useMemo(() => {
    if (period === 'day') {
      return companyTechs
        .filter(t => selectedTech === 'all' || (t.user_email === selectedTech || t.email === selectedTech))
        .map(t => {
          const email = t.user_email || t.email;
          const recs = registros.filter(r => r.technician_email === email);
          return {
            name: t.name.split(' ')[0],
            normal: Math.round(recs.reduce((a, r) => a + (r.horas_normales || 0), 0) * 10) / 10,
            extra: Math.round(recs.reduce((a, r) => a + (r.horas_extra || 0), 0) * 10) / 10,
          };
        }).filter(d => d.normal > 0 || d.extra > 0);
    }
    if (period === 'week') {
      const days = eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) });
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const recs = registros.filter(r => r.fecha === dayStr);
        return {
          name: format(day, 'EEE d', { locale: es }),
          normal: Math.round(recs.reduce((a, r) => a + (r.horas_normales || 0), 0) * 10) / 10,
          extra: Math.round(recs.reduce((a, r) => a + (r.horas_extra || 0), 0) * 10) / 10,
        };
      });
    }
    if (period === 'month') {
      const techsToShow = selectedTech !== 'all'
        ? [companyTechs.find(t => t.user_email === selectedTech || t.email === selectedTech)].filter(Boolean)
        : companyTechs.slice(0, 8);
      return techsToShow.map(t => {
        const email = t.user_email || t.email;
        const recs = registros.filter(r => r.technician_email === email);
        return {
          name: t.name.split(' ')[0],
          normal: Math.round(recs.reduce((a, r) => a + (r.horas_normales || 0), 0) * 10) / 10,
          extra: Math.round(recs.reduce((a, r) => a + (r.horas_extra || 0), 0) * 10) / 10,
          dias: new Set(recs.map(r => r.fecha)).size,
        };
      }).filter(d => d.normal > 0 || d.extra > 0);
    }
    // Year — by month
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = `${format(refDate, 'yyyy')}-${String(i + 1).padStart(2, '0')}`;
      const recs = registros.filter(r => r.fecha?.startsWith(monthStr));
      return {
        name: format(new Date(2024, i, 1), 'MMM', { locale: es }),
        normal: Math.round(recs.reduce((a, r) => a + (r.horas_normales || 0), 0) * 10) / 10,
        extra: Math.round(recs.reduce((a, r) => a + (r.horas_extra || 0), 0) * 10) / 10,
      };
    });
  }, [registros, period, refDate, dateRange, companyTechs, selectedTech]);

  const totalNormal = registros.reduce((a, r) => a + (r.horas_normales || 0), 0);
  const totalExtra = registros.reduce((a, r) => a + (r.horas_extra || 0), 0);
  const totalDias = new Set(registros.map(r => r.fecha + r.technician_email)).size;
  const conGPS = registros.filter(r => r.geopoints?.length > 0 || r.ubicacion_entrada).length;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="year">Año</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-slate-700 text-sm min-w-52 text-center capitalize">{periodLabel}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => nav(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Todos los técnicos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los técnicos</SelectItem>
            {companyTechs.map(t => (
              <SelectItem key={t.id} value={t.user_email || t.email}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{Math.round(totalNormal * 10) / 10}h</p>
          <p className="text-xs text-slate-500">H. normales</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className={`text-2xl font-bold ${totalExtra > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{Math.round(totalExtra * 10) / 10}h</p>
          <p className="text-xs text-slate-500">H. extra</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{totalDias}</p>
          <p className="text-xs text-slate-500">Jornadas</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{conGPS}</p>
          <p className="text-xs text-slate-500">Con GPS</p>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-slate-700 text-sm">Horas normales vs. extra</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [`${v}h`, n === 'normal' ? 'H. normales' : 'H. extra']} />
              <Legend formatter={v => v === 'normal' ? 'H. normales' : 'H. extra'} />
              <Bar dataKey="normal" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="extra" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Records list */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Registros detallados</h3>
          <span className="text-xs text-slate-400">{registros.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-3 text-slate-500 font-medium">Técnico</th>
                <th className="text-left p-3 text-slate-500 font-medium">Fecha</th>
                <th className="text-left p-3 text-slate-500 font-medium">Entrada</th>
                <th className="text-left p-3 text-slate-500 font-medium">Salida</th>
                <th className="text-left p-3 text-slate-500 font-medium">Normal</th>
                <th className="text-left p-3 text-slate-500 font-medium">Extra</th>
                <th className="text-left p-3 text-slate-500 font-medium">GPS/Ruta</th>
                <th className="p-3 text-slate-500 font-medium">STEL</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin registros en este período</td></tr>
              ) : (
                registros.sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.technician_name || '').localeCompare(b.technician_name || '')).map(r => {
                  const tieneGeo = r.geopoints?.length > 0 || r.ubicacion_entrada;
                  const isExpanded = expandedRow === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`border-b border-slate-50 hover:bg-slate-50 ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-3 font-medium text-slate-700">{r.technician_name || r.technician_email}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : '-'}
                        </td>
                        <td className="p-3 text-emerald-600 font-medium">{r.hora_entrada || '—'}</td>
                        <td className="p-3 text-red-500 font-medium">{r.hora_salida || '—'}</td>
                        <td className="p-3 font-semibold text-blue-600">{r.horas_normales ? `${r.horas_normales}h` : '—'}</td>
                        <td className="p-3 font-semibold text-orange-500">{r.horas_extra > 0 ? `${r.horas_extra}h` : '—'}</td>
                        <td className="p-3">
                          {tieneGeo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 gap-1 px-2"
                              onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              {isExpanded ? 'Ocultar' : 'Ver ruta'}
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs">Sin GPS</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50 px-2"
                            onClick={() => setAlbaranRecord(r)}
                            title="Crear albarán en STEL Order"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Albarán
                          </Button>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {r.historial_modificaciones?.length > 0 && (
                              <History className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" title={`${r.historial_modificaciones.length} mod.`} />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600"
                              onClick={() => setEditingRecord(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/20">
                          <td colSpan={8} className="px-4 pb-4 pt-2">
                            <MapaRuta registro={r} />
                            {r.pausas?.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-3">
                                {r.pausas.map((p, i) => (
                                  <span key={i} className="bg-amber-50 rounded px-2 py-1">
                                    ☕ Pausa {i + 1}: {p.inicio} → {p.fin || 'activa'}
                                    {p.motivo && ` (${p.motivo})`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {r.historial_modificaciones?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {r.historial_modificaciones.map((h, i) => (
                                  <div key={i} className="text-xs bg-amber-50 rounded px-2 py-1 flex items-center gap-2">
                                    <History className="h-3 w-3 text-amber-400 flex-shrink-0" />
                                    <span className="font-medium text-slate-600">{h.campo}</span>
                                    <span className="text-red-400 line-through">{h.valor_anterior}</span>
                                    <span>→</span>
                                    <span className="text-emerald-600">{h.valor_nuevo}</span>
                                    {h.motivo && <span className="text-slate-400 italic">"{h.motivo}"</span>}
                                    <span className="ml-auto text-slate-400">{h.usuario} · {h.fecha_mod ? format(new Date(h.fecha_mod), 'dd/MM HH:mm') : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {albaranRecord && (
        <CrearAlbaranStelModal
          registro={albaranRecord}
          onClose={() => setAlbaranRecord(null)}
          onCreated={() => { setAlbaranRecord(null); queryClient.invalidateQueries({ queryKey: ['admin-registros'] }); }}
        />
      )}

      {editingRecord && (
        <EditarRegistroModal
          registro={editingRecord}
          currentUser={currentUser}
          jornadaDiaria={8}
          onClose={() => { setEditingRecord(null); queryClient.invalidateQueries({ queryKey: ['admin-registros'] }); }}
        />
      )}
    </div>
  );
}