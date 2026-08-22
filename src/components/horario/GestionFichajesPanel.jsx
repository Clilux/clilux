import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, ChevronLeft, ChevronRight, Pencil, AlertTriangle, Mail, History, PlusCircle, Clock } from 'lucide-react';
import JornadaAtrasadaModal from './JornadaAtrasadaModal';
import EditarRegistroModal from './EditarRegistroModal';
import { notificar } from '@/lib/buzon';
import { formatHoras } from '@/lib/horario-utils';

export default function GestionFichajesPanel({ technicians, myTechRecord, isSessionTech, effectiveEmail }) {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState('all');
  const [showAtrasada, setShowAtrasada] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const monthStr = format(viewMonth, 'yyyy-MM');
  const start = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
  const end = format(endOfMonth(viewMonth), 'yyyy-MM-dd');

  const companyTechs = useMemo(
    () => technicians.filter(t => !myTechRecord?.company_id || t.company_id === myTechRecord.company_id),
    [technicians, myTechRecord]
  );
  const companyEmails = useMemo(() => new Set(companyTechs.map(t => (t.email || t.user_email || '').trim().toLowerCase())), [companyTechs]);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['gestion-fichajes', monthStr, isSessionTech, effectiveEmail],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail,
          entity: 'registro_horario_admin_list',
          start,
          end,
        });
        return res.data?.data || [];
      }
      const all = await base44.entities.RegistroHorario.list('-fecha', 3000);
      return all.filter(r => r.fecha?.startsWith(monthStr) && companyEmails.has((r.technician_email || '').trim().toLowerCase()));
    },
    enabled: companyTechs.length > 0,
  });

  const filtered = useMemo(() => {
    let r = registros;
    if (selectedTech !== 'all') r = r.filter(x => x.technician_email === selectedTech);
    return r;
  }, [registros, selectedTech]);

  // Detección de fichajes tardíos:
  //  - registro creado (created_date) en fecha posterior al día trabajado (fecha)
  //  - o con historial de corrección (registro_atrasado / edicion_admin)
  const tardios = useMemo(() => filtered.filter(r => {
    if (!r.fecha) return false;
    const creadoSolo = r.created_date ? r.created_date.slice(0, 10) : null;
    const esTardioCreado = creadoSolo && creadoSolo > r.fecha;
    const tieneCorreccion = (r.historial_modificaciones || []).some(h => h.campo === 'registro_atrasado' || h.campo === 'edicion_admin');
    return esTardioCreado || tieneCorreccion;
  }), [filtered]);

  const yaAmonestado = (r) => !!(r.notas || '').includes('Amonestación enviada');

  const adminUpdateRegistro = async (id, updates, motivo) => {
    if (isSessionTech) {
      return base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail,
        entity: 'registro_horario_admin_update',
        record_id: id,
        updates,
        motivo,
      });
    }
    return base44.entities.RegistroHorario.update(id, updates);
  };

  const amonestar = async (r) => {
    if (yaAmonestado(r)) {
      toast.info('Este registro ya fue amonestado');
      return;
    }
    const observaciones = window.prompt('Observaciones para el trabajador (opcional):') || '';
    try {
      await notificar('amonestacion_fichaje_tardio', {
        worker_email: r.technician_email,
        worker_name: r.technician_name,
        company_id: r.company_id,
        fecha: r.fecha,
        observaciones,
      });
      // Marcar en notas para evitar re-amonestar y dejar traza visible
      const sello = `Amonestación enviada el ${format(new Date(), 'dd/MM/yyyy')}${observaciones ? ` (${observaciones})` : ''}`;
      const nuevasNotas = r.notas ? `${r.notas}\n${sello}` : sello;
      await adminUpdateRegistro(r.id, { notas: nuevasNotas }, 'Amonestación por fichaje tardío');
      queryClient.invalidateQueries({ queryKey: ['gestion-fichajes'] });
      toast.success('Amonestación enviada por email y registrada en el historial del trabajador');
    } catch (e) {
      toast.error('Error al enviar amonestación');
    }
  };

  const sortedTardios = [...tardios].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-slate-700">Gestión de fichajes y olvidos</h3>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Todos los técnicos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los técnicos</SelectItem>
            {companyTechs.map(t => (
              <SelectItem key={t.id} value={t.email || t.user_email}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-slate-700 text-sm min-w-40 text-center capitalize">{format(viewMonth, 'MMMM yyyy', { locale: es })}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <Button className="bg-amber-600 hover:bg-amber-700 text-white ml-auto" onClick={() => setShowAtrasada(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />Añadir jornada atrasada
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{filtered.length}</p>
          <p className="text-xs text-slate-500">Jornadas del mes</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600">{sortedTardios.length}</p>
          <p className="text-xs text-slate-500">Fichajes tardíos</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{sortedTardios.filter(r => !yaAmonestado(r)).length}</p>
          <p className="text-xs text-slate-500">Pendientes de amonestar</p>
        </Card>
      </div>

      {/* Fichajes tardíos */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Fichajes tardíos · {format(viewMonth, 'MMMM yyyy', { locale: es })}</span>
          <span className="text-xs text-amber-600 ml-auto">{sortedTardios.length} detectados</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : sortedTardios.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            No hay fichajes tardíos este mes.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sortedTardios.map(r => {
              const amonestado = yaAmonestado(r);
              const creado = r.created_date ? format(parseISO(r.created_date), 'dd/MM/yyyy HH:mm') : '—';
              const diasRetraso = (() => {
                if (!r.created_date) return 0;
                const d1 = new Date(r.fecha + 'T12:00:00');
                const d2 = new Date(r.created_date);
                return Math.max(0, Math.round((d2 - d1) / 86400000));
              })();
              return (
                <div key={r.id} className={`px-4 py-3 flex items-start gap-3 ${amonestado ? 'bg-emerald-50/30' : 'bg-amber-50/20'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-slate-700 text-sm">{r.technician_name || r.technician_email}</span>
                      <Badge variant="secondary" className="text-xs">
                        {r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : r.fecha}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        <span className="text-emerald-600 font-medium">{r.hora_entrada || '—'}</span>
                        {' → '}
                        <span className="text-red-500 font-medium">{r.hora_salida || '—'}</span>
                      </span>
                      {diasRetraso > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Registrado {diasRetraso}d tarde</Badge>
                      )}
                      {amonestado && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs"><Mail className="h-3 w-3 mr-1" />Amonestado</Badge>
                      )}
                      {(r.historial_modificaciones || []).length > 0 && (
                        <History className="h-3.5 w-3.5 text-amber-400" title={`${r.historial_modificaciones.length} modificaciones`} />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Creado el {creado}{(r.horas_efectivas || r.horas_normales) ? ` · ${formatHoras(r.horas_efectivas || r.horas_normales)} efectivas` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => setEditingRecord(r)} title="Editar registro">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!amonestado && (
                      <Button size="sm" className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white text-xs gap-1" onClick={() => amonestar(r)}>
                        <Mail className="h-3.5 w-3.5" />Amonestar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Listado completo del mes */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Todas las jornadas del mes</span>
          <span className="text-xs text-slate-400">{filtered.length} registros</span>
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
                <th className="text-center p-3 text-slate-500 font-medium">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin registros este mes</td></tr>
              ) : filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(r => {
                const esTardio = tardios.includes(r);
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-700">{r.technician_name || r.technician_email}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{r.fecha ? format(parseISO(r.fecha), "EEE d MMM", { locale: es }) : '-'}</td>
                    <td className="p-3 text-emerald-600 font-medium">{r.hora_entrada || '—'}</td>
                    <td className="p-3 text-red-500 font-medium">{r.hora_salida || '—'}</td>
                    <td className="p-3 font-semibold text-blue-600">{r.horas_normales ? formatHoras(r.horas_normales) : '—'}</td>
                    <td className="p-3 font-semibold text-orange-500">{r.horas_extra > 0 ? formatHoras(r.horas_extra) : '—'}</td>
                    <td className="p-3 text-center">
                      {esTardio
                        ? <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Tardío</Badge>
                        : <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">OK</Badge>}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => setEditingRecord(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showAtrasada && (
        <JornadaAtrasadaModal
          technicians={technicians}
          myTechRecord={myTechRecord}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          onClose={() => setShowAtrasada(false)}
        />
      )}

      {editingRecord && (
        <EditarRegistroModal
          registro={editingRecord}
          currentUser={{ full_name: myTechRecord?.name || effectiveEmail || 'Administrador' }}
          jornadaDiaria={companyTechs.find(t => (t.email || t.user_email) === editingRecord.technician_email)?.horas_jornada_diaria || 8}
          updateRegistro={(id, updates) => adminUpdateRegistro(id, updates, 'Edición administrativa de fichaje')}
          onClose={() => { setEditingRecord(null); queryClient.invalidateQueries({ queryKey: ['gestion-fichajes'] }); queryClient.invalidateQueries({ queryKey: ['admin-registros'] }); }}
        />
      )}
    </div>
  );
}