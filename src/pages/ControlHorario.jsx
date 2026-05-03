import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Calendar, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ControlHorario() {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: !!currentUser,
  });

  const isAdmin = currentUser?.role === 'admin';

  // Find current technician record
  const myTechRecord = technicians.find(t =>
    t.user_email === currentUser?.email || t.email === currentUser?.email
  );

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-horario', format(viewMonth, 'yyyy-MM'), selectedTech, currentUser?.email],
    queryFn: async () => {
      const monthStr = format(viewMonth, 'yyyy-MM');
      const all = await base44.entities.RegistroHorario.list('-fecha', 500);
      return all.filter(r => {
        const inMonth = r.fecha?.startsWith(monthStr);
        if (!inMonth) return false;
        if (!isAdmin) return r.technician_email === currentUser?.email;
        if (selectedTech !== 'all') return r.technician_email === selectedTech;
        // Admin: filter by company
        if (myTechRecord?.company_id) {
          const techInCompany = technicians.find(t => t.user_email === r.technician_email || t.email === r.technician_email);
          return techInCompany?.company_id === myTechRecord.company_id;
        }
        return true;
      });
    },
    enabled: !!currentUser,
  });

  // Today's record for current user
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = registros.find(r =>
    r.fecha === todayStr && r.technician_email === currentUser?.email
  );

  const fichaEntradaMutation = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), 'HH:mm');
      if (todayRecord) {
        return base44.entities.RegistroHorario.update(todayRecord.id, { hora_entrada: now });
      }
      return base44.entities.RegistroHorario.create({
        technician_email: currentUser.email,
        technician_name: myTechRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: myTechRecord?.id || '',
        company_id: myTechRecord?.company_id || '',
        fecha: todayStr,
        hora_entrada: now,
        tipo_jornada: 'normal',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-horario'] });
      toast.success('Entrada registrada');
    },
  });

  const fichaSalidaMutation = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const now = format(new Date(), 'HH:mm');
      const entradaMins = todayRecord.hora_entrada ? timeToMinutes(todayRecord.hora_entrada) : 0;
      const salidaMins = timeToMinutes(now);
      const horas = Math.max(0, (salidaMins - entradaMins) / 60);
      return base44.entities.RegistroHorario.update(todayRecord.id, {
        hora_salida: now,
        horas_totales: Math.round(horas * 100) / 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-horario'] });
      toast.success('Salida registrada');
    },
  });

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // Stats
  const totalHoras = registros.reduce((acc, r) => acc + (r.horas_totales || 0), 0);
  const diasTrabajados = new Set(registros.map(r => r.fecha)).size;

  // Days in current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  });

  // Technicians in same company (for admin filter)
  const companyTechs = isAdmin
    ? technicians.filter(t => !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id)
    : [];

  const exportCSV = () => {
    const rows = [['Técnico', 'Fecha', 'Entrada', 'Salida', 'Horas', 'Tipo', 'Notas']];
    registros.forEach(r => {
      rows.push([r.technician_name || r.technician_email, r.fecha, r.hora_entrada || '', r.hora_salida || '', r.horas_totales || '', r.tipo_jornada || 'normal', r.notas || '']);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control_horario_${format(viewMonth, 'yyyy-MM')}.csv`;
    a.click();
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Control Horario" />

        {/* Fichar - solo para técnicos */}
        {!isAdmin && (
          <Card className="p-5 bg-white border-0 shadow-sm mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-semibold text-slate-800 text-lg">Fichaje de hoy</h2>
                <p className="text-slate-500 text-sm">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                {todayRecord && (
                  <div className="flex gap-4 mt-2 text-sm">
                    {todayRecord.hora_entrada && (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5" /> Entrada: {todayRecord.hora_entrada}
                      </span>
                    )}
                    {todayRecord.hora_salida && (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <LogOut className="h-3.5 w-3.5" /> Salida: {todayRecord.hora_salida}
                      </span>
                    )}
                    {todayRecord.horas_totales && (
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {todayRecord.horas_totales}h
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => fichaEntradaMutation.mutate()}
                  disabled={fichaEntradaMutation.isPending || !!todayRecord?.hora_entrada}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {todayRecord?.hora_entrada ? `Entrada: ${todayRecord.hora_entrada}` : 'Fichar Entrada'}
                </Button>
                <Button
                  onClick={() => fichaSalidaMutation.mutate()}
                  disabled={fichaSalidaMutation.isPending || !todayRecord?.hora_entrada || !!todayRecord?.hora_salida}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {todayRecord?.hora_salida ? `Salida: ${todayRecord.hora_salida}` : 'Fichar Salida'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{Math.round(totalHoras * 10) / 10}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Horas este mes</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{diasTrabajados}</p>
            <p className="text-xs text-slate-500 mt-0.5">Días trabajados</p>
          </Card>
          {isAdmin && (
            <Card className="p-4 bg-white border-0 shadow-sm">
              <p className="text-2xl font-bold text-slate-800">{companyTechs.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Técnicos en empresa</p>
            </Card>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-slate-700 w-36 text-center capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Select value={selectedTech} onValueChange={setSelectedTech}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los técnicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los técnicos</SelectItem>
                  {companyTechs.map(t => (
                    <SelectItem key={t.id} value={t.user_email || t.email}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {isAdmin && <th className="text-left p-3 text-slate-500 font-medium">Técnico</th>}
                  <th className="text-left p-3 text-slate-500 font-medium">Fecha</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Entrada</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Salida</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Horas</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : registros.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400">No hay registros este mes</td></tr>
                ) : (
                  registros.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      {isAdmin && (
                        <td className="p-3 text-slate-700 font-medium">{r.technician_name || r.technician_email}</td>
                      )}
                      <td className="p-3 text-slate-600">
                        {r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : '-'}
                      </td>
                      <td className="p-3">
                        {r.hora_entrada ? (
                          <span className="text-emerald-600 font-medium">{r.hora_entrada}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3">
                        {r.hora_salida ? (
                          <span className="text-red-500 font-medium">{r.hora_salida}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {r.horas_totales ? `${r.horas_totales}h` : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs capitalize">{r.tipo_jornada || 'normal'}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-slate-400 mt-3 text-center">
          Registros conservados conforme al RD-ley 8/2019 (mín. 4 años)
        </p>
      </div>
    </div>
  );
}