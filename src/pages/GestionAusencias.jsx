import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, CheckCircle, XCircle, Clock, Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPO_LABELS = {
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-100 text-blue-700' },
  baja_medica: { label: 'Baja médica', color: 'bg-red-100 text-red-700' },
  permiso: { label: 'Permiso', color: 'bg-yellow-100 text-yellow-700' },
  asunto_propio: { label: 'Asunto propio', color: 'bg-purple-100 text-purple-700' },
  maternidad_paternidad: { label: 'Mat./Paternidad', color: 'bg-pink-100 text-pink-700' },
  otro: { label: 'Otro', color: 'bg-slate-100 text-slate-700' },
};

const TIPO_COLORS_CAL = {
  vacaciones: 'bg-blue-200 text-blue-800',
  baja_medica: 'bg-red-200 text-red-800',
  permiso: 'bg-yellow-200 text-yellow-800',
  asunto_propio: 'bg-purple-200 text-purple-800',
  maternidad_paternidad: 'bg-pink-200 text-pink-800',
  otro: 'bg-slate-200 text-slate-700',
};

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700' },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
};

// ── Mini-calendario de ausencias ─────────────────────────────────────────────
function CalendarioAusencias({ ausencias, technicians }) {
  const [mes, setMes] = useState(new Date());

  const start = startOfMonth(mes);
  const end = endOfMonth(mes);
  const days = eachDayOfInterval({ start, end });

  // Calcular offset días de semana (lunes=0)
  const startDow = (getDay(start) + 6) % 7; // 0=Lun

  // Agrupar ausencias aprobadas por día
  const aprobadas = ausencias.filter(a => a.estado === 'aprobada');

  const getAusenciasForDay = (day) => {
    return aprobadas.filter(a => {
      if (!a.fecha_inicio || !a.fecha_fin) return false;
      return isWithinInterval(day, { start: parseISO(a.fecha_inicio), end: parseISO(a.fecha_fin) });
    });
  };

  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header mes */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-slate-700 capitalize">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h3>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMes(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid días de semana */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DOW.map(d => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-slate-400">{d}</div>
        ))}
      </div>

      {/* Grid días */}
      <div className="grid grid-cols-7">
        {/* Offset */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`e-${i}`} className="h-16 border-b border-r border-slate-50" />
        ))}
        {days.map(day => {
          const ausenciasDay = getAusenciasForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <div key={day.toISOString()}
              className={`h-16 border-b border-r border-slate-50 p-1 ${isToday ? 'bg-blue-50' : ''}`}>
              <p className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                {format(day, 'd')}
              </p>
              <div className="space-y-0.5 overflow-hidden">
                {ausenciasDay.slice(0, 2).map((a, i) => {
                  const tech = technicians?.find(t => t.email === a.technician_email || t.user_email === a.technician_email);
                  const nombre = tech?.name || a.technician_name || '?';
                  return (
                    <div key={i} className={`text-[10px] px-1 rounded truncate ${TIPO_COLORS_CAL[a.tipo] || TIPO_COLORS_CAL.otro}`}>
                      {nombre.split(' ')[0]}
                    </div>
                  );
                })}
                {ausenciasDay.length > 2 && (
                  <div className="text-[10px] text-slate-400">+{ausenciasDay.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <div key={k} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${TIPO_COLORS_CAL[k]}`}>
              {v.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GestionAusencias() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTechForNew, setSelectedTechForNew] = useState('');
  const [editingVacDias, setEditingVacDias] = useState(null); // { techId, dias }
  const [newData, setNewData] = useState({
    tipo: 'vacaciones',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
  });

  // Soporte tanto para usuarios Base44 como técnicos de sesión
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const sessionTechName = sessionStorage.getItem('technician_name');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: !!currentUser || !!sessionTechEmail,
  });

  const isAdmin = currentUser?.role === 'admin';
  const myEmail = currentUser?.email || sessionTechEmail;
  const myTechRecord = technicians.find(t =>
    t.user_email === myEmail || t.email === myEmail
  );

  const { data: ausencias = [], isLoading } = useQuery({
    queryKey: ['ausencias', myEmail, isAdmin],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 200);
      if (!isAdmin) return all.filter(a => a.technician_email === myEmail);
      if (myTechRecord?.company_id) {
        return all.filter(a => {
          const tech = technicians.find(t => t.user_email === a.technician_email || t.email === a.technician_email);
          return tech?.company_id === myTechRecord.company_id;
        });
      }
      return all;
    },
    enabled: !!myEmail,
  });

  // Calcular días de vacaciones disponibles (para técnicos)
  const vacacionesConfig = myTechRecord?.vacaciones_anuales ?? 22;
  const vacacionesUsadas = ausencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada' && a.technician_email === myEmail)
    .reduce((acc, a) => acc + (a.dias_totales || 0), 0);
  const vacacionesDisponibles = vacacionesConfig - vacacionesUsadas;

  const pendientes = ausencias.filter(a => a.estado === 'pendiente');
  const aprobadas = ausencias.filter(a => a.estado === 'aprobada');
  const rechazadas = ausencias.filter(a => a.estado === 'rechazada');

  const updateVacDiasMutation = useMutation({
    mutationFn: ({ techId, dias }) => base44.entities.Technician.update(techId, { vacaciones_anuales: Number(dias) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setEditingVacDias(null);
      toast.success('Días de vacaciones actualizados');
    },
  });

  const handleCreate = async () => {
    if (!newData.fecha_inicio || !newData.fecha_fin) return;
    setSaving(true);
    const dias = differenceInCalendarDays(parseISO(newData.fecha_fin), parseISO(newData.fecha_inicio)) + 1;

    let targetTech = myTechRecord;
    let targetEmail = myEmail;
    if (isAdmin && selectedTechForNew) {
      const t = technicians.find(x => x.id === selectedTechForNew);
      if (t) { targetTech = t; targetEmail = t.email || t.user_email || ''; }
    }

    await base44.entities.Ausencia.create({
      technician_email: targetEmail,
      technician_name: targetTech?.name || currentUser?.full_name || sessionTechName || targetEmail,
      technician_id: targetTech?.id || '',
      company_id: targetTech?.company_id || myTechRecord?.company_id || '',
      ...newData,
      dias_totales: dias,
      estado: isAdmin ? 'aprobada' : 'pendiente',
    });
    queryClient.invalidateQueries({ queryKey: ['ausencias'] });
    toast.success(isAdmin ? 'Ausencia registrada' : 'Solicitud enviada');
    setShowNewDialog(false);
    setSelectedTechForNew('');
    setNewData({ tipo: 'vacaciones', fecha_inicio: '', fecha_fin: '', motivo: '' });
    setSaving(false);
  };

  const handleEstado = async (ausencia, estado) => {
    await base44.entities.Ausencia.update(ausencia.id, { estado });
    queryClient.invalidateQueries({ queryKey: ['ausencias'] });
    toast.success(estado === 'aprobada' ? 'Aprobada' : 'Rechazada');
  };

  if (!myEmail) return null;

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('technician_name');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    navigate(createPageUrl('MenuInicio'));
  };

  const AusenciaCard = ({ ausencia }) => {
    const tipo = TIPO_LABELS[ausencia.tipo] || TIPO_LABELS.otro;
    const estado = ESTADO_CONFIG[ausencia.estado] || ESTADO_CONFIG.pendiente;
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {isAdmin && (
              <p className="font-semibold text-slate-800 text-sm mb-1">{ausencia.technician_name || ausencia.technician_email}</p>
            )}
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge className={`${tipo.color} border-0 text-xs`}>{tipo.label}</Badge>
              <Badge className={`${estado.color} border-0 text-xs`}>{estado.label}</Badge>
            </div>
            <p className="text-sm text-slate-600">
              {ausencia.fecha_inicio && format(parseISO(ausencia.fecha_inicio), "d MMM yyyy", { locale: es })}
              {' → '}
              {ausencia.fecha_fin && format(parseISO(ausencia.fecha_fin), "d MMM yyyy", { locale: es })}
              <span className="text-slate-400 ml-2">({ausencia.dias_totales} día{ausencia.dias_totales !== 1 ? 's' : ''})</span>
            </p>
            {ausencia.motivo && <p className="text-xs text-slate-400 mt-1">{ausencia.motivo}</p>}
          </div>
          {isAdmin && ausencia.estado === 'pendiente' && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => handleEstado(ausencia, 'aprobada')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprobar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleEstado(ausencia, 'rechazada')}
                className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3">
                <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar
        isSessionTech={!!sessionTechEmail}
        isAdmin={isAdmin}
        isLoading={false}
        onLogout={handleLogout}
        techEmail={myEmail}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-5">Ausencias y Vacaciones</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{pendientes.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-emerald-600">{aprobadas.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Aprobadas</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-red-500">{rechazadas.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rechazadas</p>
          </Card>
          {!isAdmin && (
            <Card className="p-4 bg-white border-0 shadow-sm text-center">
              <p className={`text-2xl font-bold ${vacacionesDisponibles < 5 ? 'text-red-500' : 'text-blue-600'}`}>
                {vacacionesDisponibles}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Vacaciones disp.</p>
              <p className="text-xs text-slate-400">(de {vacacionesConfig})</p>
            </Card>
          )}
        </div>

        {/* Resumen vacaciones por técnico — solo admin */}
        {isAdmin && technicians.length > 0 && (
          <Card className="mb-4 p-4 bg-white border-0 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Días de vacaciones por técnico</h3>
            <div className="space-y-2">
              {technicians.filter(t => t.status !== 'inactive').map(t => {
                const email = t.email || t.user_email || '';
                const vacUsadas = ausencias.filter(a => a.technician_email === email && a.tipo === 'vacaciones' && a.estado === 'aprobada').reduce((s, a) => s + (a.dias_totales || 0), 0);
                const vacTotal = t.vacaciones_anuales ?? 22;
                const vacDisp = vacTotal - vacUsadas;
                const isEd = editingVacDias?.techId === t.id;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-blue-400 rounded-full transition-all" style={{ width: `${Math.min(100, (vacUsadas / vacTotal) * 100)}%` }} />
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${vacDisp < 3 ? 'text-red-500' : 'text-slate-500'}`}>{vacDisp}/{vacTotal} días disp.</span>
                      </div>
                    </div>
                    {isEd ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Input type="number" min="0" max="60" value={editingVacDias.dias}
                          onChange={e => setEditingVacDias(p => ({ ...p, dias: e.target.value }))}
                          className="h-7 w-16 text-xs px-1" />
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-2"
                          onClick={() => updateVacDiasMutation.mutate({ techId: t.id, dias: editingVacDias.dias })}>✓</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                          onClick={() => setEditingVacDias(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-slate-600 px-2 shrink-0"
                        onClick={() => setEditingVacDias({ techId: t.id, dias: vacTotal })}>
                        Editar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Botón nueva solicitud — visible para cualquier usuario (técnico o admin) */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowNewDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva solicitud
          </Button>
        </div>

        <Tabs defaultValue="lista">
          <TabsList className="mb-4">
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="lista">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <>
                {pendientes.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <h3 className="font-semibold text-slate-700">Pendientes de aprobación</h3>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{pendientes.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {pendientes.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
                    </div>
                  </div>
                )}
                {aprobadas.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <h3 className="font-semibold text-slate-700">Aprobadas</h3>
                    </div>
                    <div className="space-y-3">
                      {aprobadas.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
                    </div>
                  </div>
                )}
                {rechazadas.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <h3 className="font-semibold text-slate-700">Rechazadas</h3>
                    </div>
                    <div className="space-y-3">
                      {rechazadas.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
                    </div>
                  </div>
                )}
                {ausencias.length === 0 && (
                  <Card className="p-8 text-center bg-white border-0 shadow-sm">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hay solicitudes de ausencia</p>
                    <Button onClick={() => setShowNewDialog(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />Crear solicitud
                    </Button>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarioAusencias ausencias={ausencias} technicians={technicians} />
          </TabsContent>
        </Tabs>

        {/* Dialog nueva solicitud */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {isAdmin && (
                <div>
                  <Label>Técnico (opcional — para registrar a otro técnico)</Label>
                  <select value={selectedTechForNew} onChange={e => setSelectedTechForNew(e.target.value)}
                    className="w-full h-9 text-sm border border-input rounded-md px-2 bg-background mt-1">
                    <option value="">— Mi propia ausencia —</option>
                    {technicians.map(t => {
                      const email = t.email || t.user_email || '';
                      const vacUsadas = ausencias.filter(a => a.technician_email === email && a.tipo === 'vacaciones' && a.estado === 'aprobada').reduce((s, a) => s + (a.dias_totales || 0), 0);
                      const vacTotal = t.vacaciones_anuales ?? 22;
                      return <option key={t.id} value={t.id}>{t.name} · {vacTotal - vacUsadas}/{vacTotal} días vac. disp.</option>;
                    })}
                  </select>
                </div>
              )}
              {!isAdmin && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                  Tienes <strong>{vacacionesDisponibles} días de vacaciones disponibles</strong> de {vacacionesConfig} totales.
                </div>
              )}
              <div>
                <Label>Tipo de ausencia</Label>
                <Select value={newData.tipo} onValueChange={v => setNewData(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="date" value={newData.fecha_inicio}
                    onChange={e => setNewData(p => ({ ...p, fecha_inicio: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="date" value={newData.fecha_fin} min={newData.fecha_inicio}
                    onChange={e => setNewData(p => ({ ...p, fecha_fin: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {newData.fecha_inicio && newData.fecha_fin && (
                <p className="text-sm text-blue-600 font-medium">
                  {differenceInCalendarDays(parseISO(newData.fecha_fin), parseISO(newData.fecha_inicio)) + 1} días
                </p>
              )}
              <div>
                <Label>Motivo / Observaciones</Label>
                <Input value={newData.motivo}
                  onChange={e => setNewData(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="Opcional" className="mt-1" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreate}
                  disabled={!newData.fecha_inicio || !newData.fecha_fin || saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </div>
  );
}