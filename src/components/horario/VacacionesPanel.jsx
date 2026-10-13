import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Calendar, Pencil, CheckCircle, XCircle, Trash2, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { notificar } from '@/lib/buzon';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DIAS_VACACIONES_DEFECTO, diasLaborablesDe, diasDeAusencia, colorTrabajador, iniciales,
} from '@/lib/vacaciones-utils';
import VacacionesGrafica from '@/components/vacaciones/VacacionesGrafica';
import CalendarioVacaciones from '@/components/vacaciones/CalendarioVacaciones';
import DetalleTrabajador from '@/components/vacaciones/DetalleTrabajador';
import EditarAusenciaModal from '@/components/vacaciones/EditarAusenciaModal';
import EditVacacionesConfigModal from '@/components/vacaciones/EditVacacionesConfigModal';

const TIPO_AUS = {
  vacaciones: 'Vacaciones', baja_medica: 'Baja médica', permiso: 'Permiso',
  asunto_propio: 'Asunto propio', maternidad_paternidad: 'Mat./Paternidad', otro: 'Otro',
};

export default function VacacionesPanel({ technicians, myTechRecord, isSessionTech, effectiveEmail }) {
  const queryClient = useQueryClient();
  const [editingTech, setEditingTech] = useState(null);
  const [expandedTechId, setExpandedTechId] = useState(null);
  const [editingAusencia, setEditingAusencia] = useState(null); // { ausencia, tech, diasOcupados }

  const companyTechs = technicians.filter(t =>
    !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id
  );

  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);

  const { data: allAusencias = [] } = useQuery({
    queryKey: ['ausencias-company', isSessionTech ? 'proxy' : 'direct', effectiveEmail],
    queryFn: async () => {
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'ausencias_admin_list' });
        return res.data?.data || [];
      }
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 500);
      const companyEmails = new Set(companyTechs.map(t => (t.email || '').trim().toLowerCase()));
      return all.filter(a => companyEmails.has((a.technician_email || '').trim().toLowerCase()));
    },
  });

  const esDeTech = (a, t) => a.technician_email === t.email || a.technician_email === t.user_email;
  const ausenciasAnio = allAusencias.filter(a => (a.fecha_inicio || '').startsWith(yearStr));
  const pendientes = allAusencias.filter(a => a.estado === 'pendiente');

  const diasDe = (t, estado) => ausenciasAnio
    .filter(a => a.tipo === 'vacaciones' && esDeTech(a, t) && (!estado || a.estado === estado))
    .flatMap(a => diasDeAusencia(a, diasLaborablesDe(t)));

  const stats = companyTechs.map(t => {
    const anuales = t.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO;
    const anteriores = t.vacaciones_dias_usados_anteriores ?? 0;
    const disfrutados = diasDe(t, 'aprobada').length;
    const diasPendientes = diasDe(t, 'pendiente').length;
    const totalUsados = anteriores + disfrutados;
    return { tech: t, anuales, anteriores, disfrutados, diasPendientes, totalUsados, restantes: Math.max(0, anuales - totalUsados) };
  });

  const diasOcupadosDe = (a) => allAusencias
    .filter(x => x.id !== a.id && x.estado !== 'rechazada')
    .flatMap(x => diasDeAusencia(x, diasLaborablesDe(companyTechs.find(t => esDeTech(x, t)))));

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['ausencias-company'] });
    queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
    queryClient.invalidateQueries({ queryKey: ['estado-trabajadores-ausencias'] });
    queryClient.invalidateQueries({ queryKey: ['estado-trabajadores'] });
  };

  const resolver = async (a, estado) => {
    try {
      if (isSessionTech && effectiveEmail) {
        await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'ausencia_update', record_id: a.id, updates: { estado } });
      } else {
        await base44.entities.Ausencia.update(a.id, { estado });
      }
      invalidar();
      notificar('vacacion_resuelta', {
        company_id: myTechRecord?.company_id || '',
        worker_email: a.technician_email,
        worker_name: a.technician_name,
        estado,
        tipo_aus: TIPO_AUS[a.tipo] || 'Vacaciones',
        fecha_inicio: a.fecha_inicio,
        fecha_fin: a.fecha_fin,
      });
      toast.success(estado === 'aprobada' ? 'Aprobada' : 'Rechazada');
    } catch { toast.error('Error al actualizar'); }
  };

  const borrar = async (a) => {
    if (!confirm('¿Eliminar esta petición? No se puede deshacer.')) return;
    try {
      if (isSessionTech && effectiveEmail) {
        await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'ausencia_delete', record_id: a.id });
      } else {
        await base44.entities.Ausencia.delete(a.id);
      }
      invalidar();
      toast.success('Petición eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const FilaTrabajador = ({ s, index }) => {
    const abierto = expandedTechId === s.tech.id;
    const pct = s.anuales > 0 ? Math.min(100, Math.round((s.totalUsados / s.anuales) * 100)) : 0;
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: colorTrabajador(index) }}>
            {iniciales(s.tech.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 text-sm truncate">{s.tech.name}</p>
            <p className="text-xs text-slate-400">
              <strong className="text-emerald-600">{s.disfrutados}d disfrutados</strong>
              {s.diasPendientes > 0 && <> · <span className="text-amber-600">{s.diasPendientes}d pendientes</span></>}
              {s.anteriores > 0 && <> · {s.anteriores}d antes</>}
              {' · '}{s.restantes} de {s.anuales} disponibles
            </p>
          </div>
          <Badge className={`${s.restantes === 0 ? 'bg-red-100 text-red-700' : s.restantes <= 5 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'} border-0 font-semibold shrink-0`}>
            {s.restantes}d
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 shrink-0"
            onClick={() => setExpandedTechId(abierto ? null : s.tech.id)} title="Ver días disfrutados">
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 shrink-0"
            onClick={() => setEditingTech(s.tech)} title="Configurar días anuales">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }} />
        </div>

        {abierto && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <DetalleTrabajador
              tech={s.tech}
              year={currentYear}
              ausencias={ausenciasAnio.filter(a => esDeTech(a, s.tech))}
              onEdit={(a, ocupados) => setEditingAusencia({ ausencia: a, tech: s.tech, diasOcupados: ocupados })}
              onDelete={borrar}
            />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-brand-500" />
        <h3 className="font-semibold text-slate-700">Gestión de vacaciones · {currentYear}</h3>
      </div>

      {/* Solicitudes pendientes — el gerente las ve nada más abrir */}
      {pendientes.length > 0 && (
        <Card className="bg-amber-50/60 border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 bg-amber-100/60 border-b border-amber-200">
            <Bell className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">Solicitudes pendientes ({pendientes.length})</h3>
          </div>
          <div className="divide-y divide-amber-100">
            {pendientes.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 text-sm">
                    {a.technician_name}
                    <span className="text-slate-400 font-normal ml-2 text-xs">
                      {a.fecha_inicio && format(parseISO(a.fecha_inicio), 'd MMM', { locale: es })} → {a.fecha_fin && format(parseISO(a.fecha_fin), 'd MMM yyyy', { locale: es })}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {TIPO_AUS[a.tipo] || a.tipo} · {a.dias_totales}d{a.motivo ? ` · ${a.motivo}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" onClick={() => resolver(a, 'aprobada')} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprobar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolver(a, 'rechazada')} className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3">
                    <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-slate-500 hover:text-blue-600"
                    onClick={() => setEditingAusencia({ ausencia: a, tech: companyTechs.find(t => esDeTech(a, t)), diasOcupados: diasOcupadosDe(a) })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Días
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => borrar(a)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="resumen">
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4 mt-4">
          <VacacionesGrafica datos={stats.map(s => ({
            nombre: (s.tech.name || '').split(' ')[0],
            disfrutados: s.disfrutados,
            pendientes: s.diasPendientes,
            restantes: s.restantes,
          }))} />
          <div className="space-y-3">
            {stats.map((s, i) => <FilaTrabajador key={s.tech.id} s={s} index={i} />)}
            {stats.length === 0 && (
              <Card className="p-8 text-center bg-white border-0 shadow-sm">
                <p className="text-slate-500 text-sm">No hay trabajadores activos en la empresa.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CalendarioVacaciones ausencias={allAusencias} technicians={companyTechs} />
        </TabsContent>
      </Tabs>

      {editingTech && (
        <EditVacacionesConfigModal tech={editingTech} isSessionTech={isSessionTech} effectiveEmail={effectiveEmail} onClose={() => setEditingTech(null)} />
      )}

      {editingAusencia && (
        <EditarAusenciaModal
          ausencia={editingAusencia.ausencia}
          tech={editingAusencia.tech}
          diasOcupados={editingAusencia.diasOcupados}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          onClose={() => setEditingAusencia(null)}
        />
      )}
    </div>
  );
}