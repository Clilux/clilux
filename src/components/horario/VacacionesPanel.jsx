import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Calendar, Pencil, Check, X, Info, CheckCircle, XCircle, Trash2, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Días laborables de vacaciones en España por defecto: 22 días/año
const DIAS_VACACIONES_DEFECTO = 22;

function EditVacacionesModal({ tech, onClose }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [diasTotales, setDiasTotales] = useState(
    tech.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO
  );
  const [diasUsadosAnteriores, setDiasUsadosAnteriores] = useState(
    tech.vacaciones_dias_usados_anteriores ?? 0
  );
  const [notas, setNotas] = useState(tech.vacaciones_notas ?? '');

  const mutation = useMutation({
    mutationFn: () => base44.entities.Technician.update(tech.id, {
      vacaciones_anuales: Number(diasTotales),
      vacaciones_dias_usados_anteriores: Number(diasUsadosAnteriores),
      vacaciones_notas: notas,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Vacaciones actualizadas');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-lg">Vacaciones · {tech.name}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Si el trabajador viene de otra aplicación o empieza a mitad de año, indica los días ya utilizados antes de incorporarse a este sistema.</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Días de vacaciones anuales
            </label>
            <Input
              type="number"
              min={0}
              max={60}
              value={diasTotales}
              onChange={e => setDiasTotales(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Por convenio general: 22 días laborables/año</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Días ya usados antes de entrar al sistema ({currentYear})
            </label>
            <Input
              type="number"
              min={0}
              value={diasUsadosAnteriores}
              onChange={e => setDiasUsadosAnteriores(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Días disfrutados en otra app o antes de la incorporación</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Notas</label>
            <Input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Viene de Factorial, tenía 5 días usados en enero"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Check className="h-4 w-4 mr-2" />Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function VacacionesPanel({ technicians, myTechRecord }) {
  const queryClient = useQueryClient();
  const [editingTech, setEditingTech] = useState(null);

  const companyTechs = technicians.filter(t =>
    !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id
  );
  const companyTechEmails = new Set(companyTechs.map(t => t.user_email || t.email));

  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);

  // Solicitudes pendientes (todos los tipos) — para que el gerente las vea al instante
  const { data: pendientes = [] } = useQuery({
    queryKey: ['ausencias-pendientes'],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 500);
      return all.filter(a => a.estado === 'pendiente' && companyTechEmails.has(a.technician_email));
    },
  });

  const resolver = async (a, estado) => {
    try {
      await base44.entities.Ausencia.update(a.id, { estado });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-vacaciones', yearStr] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores-ausencias'] });
      toast.success(estado === 'aprobada' ? 'Aprobada' : 'Rechazada');
    } catch { toast.error('Error al actualizar'); }
  };

  const borrar = async (a) => {
    if (!confirm('¿Eliminar esta petición? No se puede deshacer.')) return;
    try {
      await base44.entities.Ausencia.delete(a.id);
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['ausencias-pendientes-count'] });
      queryClient.invalidateQueries({ queryKey: ['estado-trabajadores-ausencias'] });
      toast.success('Petición eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  // Cargar todas las ausencias del año para calcular días usados
  const { data: ausencias = [] } = useQuery({
    queryKey: ['ausencias-vacaciones', yearStr],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 500);
      return all.filter(a =>
        a.tipo === 'vacaciones' &&
        a.estado === 'aprobada' &&
        a.fecha_inicio?.startsWith(yearStr)
      );
    },
  });

  const TIPO_AUS = {
    vacaciones: 'Vacaciones', baja_medica: 'Baja médica', permiso: 'Permiso',
    asunto_propio: 'Asunto propio', maternidad_paternidad: 'Mat./Paternidad', otro: 'Otro',
  };

  const getDiasUsadosEnSistema = (techEmail) => {
    return ausencias
      .filter(a => a.technician_email === techEmail)
      .reduce((sum, a) => sum + (a.dias_totales || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold text-slate-700">Gestión de vacaciones · {currentYear}</h3>
      </div>

      {/* Solicitudes pendientes — el gerente las ve nada más abrir */}
      {pendientes.length > 0 && (
        <Card className="bg-amber-50/60 border-amber-200 shadow-sm mb-4 overflow-hidden">
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
                  <Button size="icon" variant="ghost" onClick={() => borrar(a)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-3 text-slate-500 font-medium">Trabajador</th>
                <th className="text-center p-3 text-slate-500 font-medium">Días anuales</th>
                <th className="text-center p-3 text-slate-500 font-medium">Usados antes*</th>
                <th className="text-center p-3 text-slate-500 font-medium">Usados en sistema</th>
                <th className="text-center p-3 text-slate-500 font-medium">Total usados</th>
                <th className="text-center p-3 text-slate-500 font-medium">Restantes</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {companyTechs.map(tech => {
                const diasAnuales = tech.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO;
                const diasAnteriores = tech.vacaciones_dias_usados_anteriores ?? 0;
                const diasSistema = getDiasUsadosEnSistema(tech.user_email || tech.email);
                const totalUsados = diasAnteriores + diasSistema;
                const restantes = Math.max(0, diasAnuales - totalUsados);
                const porcentaje = Math.round((totalUsados / diasAnuales) * 100);

                return (
                  <tr key={tech.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-slate-700">{tech.name}</p>
                        {tech.vacaciones_notas && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">{tech.vacaciones_notas}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700">{diasAnuales}d</td>
                    <td className="p-3 text-center text-orange-600 font-medium">
                      {diasAnteriores > 0 ? `${diasAnteriores}d` : '—'}
                    </td>
                    <td className="p-3 text-center text-blue-600 font-medium">{diasSistema}d</td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${totalUsados > diasAnuales ? 'text-red-500' : 'text-slate-700'}`}>
                          {totalUsados}d
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${porcentaje >= 100 ? 'bg-red-500' : porcentaje >= 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, porcentaje)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`${restantes === 0 ? 'bg-red-100 text-red-700' : restantes <= 5 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'} border-0 font-semibold`}>
                        {restantes}d
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-blue-600"
                        onClick={() => setEditingTech(tech)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 p-3 border-t border-slate-50">
          * Días usados antes de incorporarse a este sistema (otra app, inicio de año, etc.)
        </p>
      </Card>

      {editingTech && (
        <EditVacacionesModal tech={editingTech} onClose={() => setEditingTech(null)} />
      )}
    </div>
  );
}