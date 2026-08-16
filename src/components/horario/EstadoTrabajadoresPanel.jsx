import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Users, UserCheck, Coffee, Umbrella, HeartPulse, UserX, Clock, Check, X, Trash2, Save, Loader2, Shield, HardHat, Briefcase } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { notificar } from '@/lib/buzon';

const TIPO_LABELS = {
  vacaciones: 'Vacaciones',
  baja_medica: 'Baja médica',
  permiso: 'Permiso',
  asunto_propio: 'Asunto propio',
  maternidad_paternidad: 'Mat./Paternidad',
  otro: 'Otro',
};
const TIPO_BADGE = {
  vacaciones: 'bg-blue-100 text-blue-700',
  baja_medica: 'bg-red-100 text-red-700',
  permiso: 'bg-yellow-100 text-yellow-700',
  asunto_propio: 'bg-purple-100 text-purple-700',
  maternidad_paternidad: 'bg-pink-100 text-pink-700',
  otro: 'bg-slate-100 text-slate-700',
};

function computeStatus(worker, todayRec, activeAusencia) {
  if (worker.status === 'inactive') return { key: 'inactive', label: 'Inactivo', badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' };
  if (activeAusencia) {
    const t = TIPO_LABELS[activeAusencia.tipo] || 'Ausencia';
    const badge = TIPO_BADGE[activeAusencia.tipo] || 'bg-slate-100 text-slate-700';
    return { key: 'ausencia', label: t, badge, dot: 'bg-blue-400' };
  }
  if (!todayRec) return { key: 'no_iniciado', label: 'No iniciado', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-300' };
  const intervalos = todayRec.intervalos || [];
  const ultimo = intervalos[intervalos.length - 1];
  if (ultimo && !ultimo.salida) return { key: 'trabajando', label: 'Trabajando', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
  if (todayRec.finalizada) return { key: 'finalizada', label: 'Finalizada', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' };
  if (intervalos.length > 0 && ultimo?.salida) return { key: 'pausado', label: 'Pausado', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' };
  return { key: 'no_iniciado', label: 'No iniciado', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-300' };
}

function WorkerDetailDialog({ worker, registrosMes, ausencias, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('estado');
  const email = worker.email || worker.user_email || '';
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRec = registrosMes.find(r => r.fecha === todayStr && r.technician_email === email);
  const workerAusencias = ausencias.filter(a => a.technician_email === email);
  const pendientes = workerAusencias.filter(a => a.estado === 'pendiente');
  const activeAusencia = workerAusencias.find(a =>
    a.estado === 'aprobada' && a.fecha_inicio && a.fecha_fin &&
    isWithinInterval(new Date(), { start: parseISO(a.fecha_inicio), end: parseISO(a.fecha_fin) })
  );
  const status = computeStatus(worker, todayRec, activeAusencia);

  // Vacaciones
  const yearStr = String(new Date().getFullYear());
  const diasAnules = worker.vacaciones_anuales ?? 22;
  const diasAnteriores = worker.vacaciones_dias_usados_anteriores ?? 0;
  const diasSistema = workerAusencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada' && (a.fecha_inicio || '').startsWith(yearStr))
    .reduce((s, a) => s + (a.dias_totales || 0), 0);
  const restantes = Math.max(0, diasAnules - diasAnteriores - diasSistema);

  const [vacForm, setVacForm] = useState({ anuales: diasAnules, anteriores: diasAnteriores, notas: worker.vacaciones_notas || '' });
  const [vacSaving, setVacSaving] = useState(false);

  const saveVac = async () => {
    setVacSaving(true);
    try {
      await base44.entities.Technician.update(worker.id, {
        vacaciones_anuales: Number(vacForm.anuales),
        vacaciones_dias_usados_anteriores: Number(vacForm.anteriores),
        vacaciones_notas: vacForm.notas,
      });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-vacaciones'] });
      toast.success('Vacaciones actualizadas');
    } catch { toast.error('Error al guardar vacaciones'); }
    finally { setVacSaving(false); }
  };

  const setEstado = async (a, estado) => {
    try {
      await base44.entities.Ausencia.update(a.id, { estado });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores'] });
      notificar('vacacion_resuelta', {
        worker_email: a.technician_email,
        worker_name: a.technician_name,
        estado,
        tipo_aus: TIPO_LABELS[a.tipo] || 'Vacaciones',
        fecha_inicio: a.fecha_inicio,
        fecha_fin: a.fecha_fin,
      });
      toast.success(estado === 'aprobada' ? 'Aprobada' : 'Rechazada');
    } catch { toast.error('Error al actualizar'); }
  };

  const borrar = async (a) => {
    if (!confirm('¿Eliminar esta petición? No se puede deshacer.')) return;
    try {
      await base44.entities.Ausencia.delete(a.id);
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores'] });
      toast.success('Petición eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const workerRegistros = registrosMes
    .filter(r => r.technician_email === email)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 ${worker.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {worker.photo_url ? <img src={worker.photo_url} alt={worker.name} className="w-full h-full object-cover" /> : (worker.name?.charAt(0)?.toUpperCase() || '?')}
            </div>
            <div className="flex-1">
              <span>{worker.name}</span>
              <p className="text-xs font-normal text-slate-400">{email}</p>
            </div>
            <Badge className={`${status.badge} border-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5`} />{status.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-slate-100">
          {['estado', 'vacaciones', 'registros', 'peticiones'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t === 'peticiones' ? `Peticiones${pendientes.length ? ` (${pendientes.length})` : ''}` : t}
            </button>
          ))}
        </div>

        {tab === 'estado' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-slate-50 border-0">
                <p className="text-xs text-slate-400">Estado actual</p>
                <p className="font-semibold text-slate-700">{status.label}</p>
              </Card>
              <Card className="p-3 bg-slate-50 border-0">
                <p className="text-xs text-slate-400">Jornada de hoy</p>
                <p className="font-semibold text-slate-700">
                  {todayRec ? `${todayRec.hora_entrada || '—'} → ${todayRec.hora_salida || (status.key === 'trabajando' ? 'en curso' : '—')}` : 'Sin fichaje'}
                </p>
              </Card>
              <Card className="p-3 bg-slate-50 border-0">
                <p className="text-xs text-slate-400">Horas efectivas hoy</p>
                <p className="font-semibold text-blue-600">{todayRec?.horas_efectivas ? `${todayRec.horas_efectivas}h` : '—'}</p>
              </Card>
              <Card className="p-3 bg-slate-50 border-0">
                <p className="text-xs text-slate-400">Ubicación</p>
                <p className="font-semibold text-slate-700 flex items-center gap-1">
                  {todayRec?.ubicacion_entrada ? <><MapPin className="h-3.5 w-3.5 text-emerald-500" />GPS</> : 'Sin GPS'}
                </p>
              </Card>
            </div>
            {activeAusencia && (
              <div className={`rounded-lg p-3 text-sm ${TIPO_BADGE[activeAusencia.tipo] || TIPO_BADGE.otro}`}>
                {TIPO_LABELS[activeAusencia.tipo]} del {format(parseISO(activeAusencia.fecha_inicio), 'd MMM', { locale: es })} al {format(parseISO(activeAusencia.fecha_fin), 'd MMM yyyy', { locale: es })}
              </div>
            )}
          </div>
        )}

        {tab === 'vacaciones' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Card className="p-3 bg-blue-50 border-0"><p className="text-xl font-bold text-blue-600">{diasAnules}</p><p className="text-xs text-slate-500">Días anuales</p></Card>
              <Card className="p-3 bg-orange-50 border-0"><p className="text-xl font-bold text-orange-600">{diasAnteriores + diasSistema}</p><p className="text-xs text-slate-500">Usados</p></Card>
              <Card className="p-3 bg-emerald-50 border-0"><p className="text-xl font-bold text-emerald-600">{restantes}</p><p className="text-xs text-slate-500">Restantes</p></Card>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              Si el trabajador viene de otra app o empieza a mitad de año, ajusta los días ya usados antes de incorporarse.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Días anuales</Label>
                <Input type="number" min={0} max={60} value={vacForm.anuales} onChange={e => setVacForm(p => ({ ...p, anuales: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1">Usados antes del sistema</Label>
                <Input type="number" min={0} value={vacForm.anteriores} onChange={e => setVacForm(p => ({ ...p, anteriores: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-1">Notas</Label>
              <Textarea rows={2} value={vacForm.notas} onChange={e => setVacForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: viene de Factorial, 5 días usados en enero" />
            </div>
            <Button onClick={saveVac} disabled={vacSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {vacSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Guardar vacaciones
            </Button>
          </div>
        )}

        {tab === 'registros' && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {workerRegistros.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">Sin registros este mes</p>
            ) : workerRegistros.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">
                <span className="text-slate-600 capitalize">{r.fecha && format(parseISO(r.fecha), "EEE d MMM", { locale: es })}</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600">{r.hora_entrada || '—'}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-red-500">{r.hora_salida || (r.finalizada ? '—' : 'en curso')}</span>
                  <span className="font-semibold text-slate-700 w-12 text-right">{r.horas_efectivas ? `${r.horas_efectivas}h` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'peticiones' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {workerAusencias.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">Sin peticiones</p>
            ) : workerAusencias.sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')).map(a => (
              <div key={a.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${TIPO_BADGE[a.tipo] || TIPO_BADGE.otro} border-0 text-xs`}>{TIPO_LABELS[a.tipo] || a.tipo}</Badge>
                    <Badge className={a.estado === 'pendiente' ? 'bg-amber-100 text-amber-700 border-0 text-xs' : a.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-red-100 text-red-700 border-0 text-xs'}>{a.estado}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.estado === 'pendiente' && (
                      <>
                        <Button size="sm" onClick={() => setEstado(a, 'aprobada')} className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setEstado(a, 'rechazada')} className="h-7 px-2 border-red-200 text-red-600"><X className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => borrar(a)} className="h-7 w-7 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1.5">
                  {a.fecha_inicio && format(parseISO(a.fecha_inicio), 'd MMM yyyy', { locale: es })} → {a.fecha_fin && format(parseISO(a.fecha_fin), 'd MMM yyyy', { locale: es })}
                  <span className="text-slate-400 ml-2">({a.dias_totales}d)</span>
                </p>
                {a.motivo && <p className="text-xs text-slate-400 mt-0.5">{a.motivo}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EstadoTrabajadoresPanel({ technicians, myTechRecord }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStr = format(new Date(), 'yyyy-MM');

  const companyTechs = useMemo(
    () => technicians.filter(t => !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id),
    [technicians, myTechRecord]
  );
  const techEmails = useMemo(() => new Set(companyTechs.map(t => t.email || t.user_email)), [companyTechs]);

  const { data: registrosMes = [], isLoading } = useQuery({
    queryKey: ['estado-trabajadores', monthStr],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 2000);
      return all.filter(r => r.fecha?.startsWith(monthStr) && techEmails.has(r.technician_email));
    },
    enabled: companyTechs.length > 0,
  });

  const { data: ausencias = [] } = useQuery({
    queryKey: ['estado-trabajadores-ausencias'],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 500);
      return all.filter(a => techEmails.has(a.technician_email));
    },
    enabled: companyTechs.length > 0,
  });

  const rows = companyTechs.map(t => {
    const email = t.email || t.user_email;
    const todayRec = registrosMes.find(r => r.fecha === todayStr && r.technician_email === email);
    const activeAusencia = ausencias.find(a =>
      a.estado === 'aprobada' && a.fecha_inicio && a.fecha_fin &&
      isWithinInterval(new Date(), { start: parseISO(a.fecha_inicio), end: parseISO(a.fecha_fin) }) &&
      a.technician_email === email
    );
    const pendientes = ausencias.filter(a => a.technician_email === email && a.estado === 'pendiente').length;
    return { tech: t, email, todayRec, activeAusencia, pendientes, status: computeStatus(t, todayRec, activeAusencia) };
  });

  const counts = rows.reduce((acc, r) => { acc[r.status.key] = (acc[r.status.key] || 0) + 1; return acc; }, {});

  const summary = [
    { key: 'trabajando', label: 'Trabajando', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'pausado', label: 'Pausado', icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'ausencia', label: 'Vacaciones/Baja', icon: Umbrella, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'no_iniciado', label: 'No iniciado', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50' },
    { key: 'finalizada', label: 'Finalizada', icon: Check, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'inactive', label: 'Inactivo', icon: UserX, color: 'text-slate-400', bg: 'bg-slate-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold text-slate-700">Estado del equipo · {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {summary.map(s => (
          <Card key={s.key} className={`p-3 ${s.bg} border-0 shadow-sm text-center`}>
            <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
            <p className={`text-lg font-bold ${s.color}`}>{counts[s.key] || 0}</p>
            <p className="text-[11px] text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Worker list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">No hay trabajadores en tu empresa.</Card>
      ) : (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {rows.map(({ tech, email, todayRec, activeAusencia, pendientes, status }) => (
              <button key={tech.id} onClick={() => setSelected(tech)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
                <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 ${tech.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {tech.photo_url ? <img src={tech.photo_url} alt={tech.name} className="w-full h-full object-cover" /> : (tech.name?.charAt(0)?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-700 truncate">{tech.name}</span>
                    {tech.is_admin && <Shield className="h-3 w-3 text-amber-500" />}
                    {tech.worker_type === 'tecnico' ? <HardHat className="h-3 w-3 text-cyan-500" /> : tech.worker_type === 'administracion' ? <Briefcase className="h-3 w-3 text-purple-500" /> : null}
                    {pendientes > 0 && <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">{pendientes} pet.</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {todayRec ? `${todayRec.hora_entrada || '—'} → ${todayRec.hora_salida || (status.key === 'trabajando' ? 'en curso' : '—')}` : 'Sin fichaje hoy'}
                    {todayRec?.ubicacion_entrada && <span className="ml-2 text-emerald-500">· GPS</span>}
                  </p>
                </div>
                <Badge className={`${status.badge} border-0 shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5 ${status.key === 'trabajando' ? 'animate-pulse' : ''}`} />{status.label}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      {selected && (
        <WorkerDetailDialog worker={selected} registrosMes={registrosMes} ausencias={ausencias} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}