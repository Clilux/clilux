import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarCheck, Clock } from 'lucide-react';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';
import DetalleTrabajador from '@/components/vacaciones/DetalleTrabajador';
import {
  diasDeAusencia, diasLaborablesDe, DIAS_VACACIONES_DEFECTO,
} from '@/lib/vacaciones-utils';

/** Resumen detallado de un trabajador: vacaciones disfrutadas (con fechas) y horas. */
export default function ResumenTrabajadorDialog({ tech, isSessionTech, sessionTechEmail, onClose }) {
  const email = (tech?.email || tech?.user_email || '').trim().toLowerCase();
  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);
  const now = new Date();

  const { data: ausencias = [], isLoading: loadingAus } = useQuery({
    queryKey: ['resumen-ausencias', email, isSessionTech ? sessionTechEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && sessionTechEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'ausencias_admin_list' });
        return (res.data || []).filter(a => (a.technician_email || '').trim().toLowerCase() === email);
      }
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 500);
      return all.filter(a => (a.technician_email || '').trim().toLowerCase() === email);
    },
    enabled: !!tech,
  });

  const { data: horarios = [], isLoading: loadingHor } = useQuery({
    queryKey: ['resumen-horario', email, isSessionTech ? sessionTechEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && sessionTechEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'registro_horario_admin_list' });
        return (res.data || []).filter(r => (r.technician_email || '').trim().toLowerCase() === email);
      }
      const all = await base44.entities.RegistroHorario.list('-fecha', 3000);
      return all.filter(r => (r.technician_email || '').trim().toLowerCase() === email);
    },
    enabled: !!tech,
  });

  const diasLaborables = diasLaborablesDe(tech);
  const ausenciasAnio = ausencias.filter(a => (a.fecha_inicio || '').startsWith(yearStr));
  const disfrutados = ausenciasAnio
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'aprobada')
    .flatMap(a => diasDeAusencia(a, diasLaborables));
  const pendientes = ausenciasAnio
    .filter(a => a.tipo === 'vacaciones' && a.estado === 'pendiente')
    .flatMap(a => diasDeAusencia(a, diasLaborables));
  const anuales = tech?.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO;
  const anteriores = tech?.vacaciones_dias_usados_anteriores ?? 0;
  const restantes = Math.max(0, anuales - anteriores - disfrutados.length);

  const horariosAnio = horarios.filter(r => (r.fecha || '').startsWith(yearStr));
  const horariosMes = horariosAnio.filter(r => {
    try { return isSameMonth(parseISO(r.fecha), now) && isSameYear(parseISO(r.fecha), now); } catch { return false; }
  });
  const sumHoras = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const horasMes = sumHoras(horariosMes, 'horas_efectivas') || sumHoras(horariosMes, 'horas_trabajadas');
  const horasExtraMes = sumHoras(horariosMes, 'horas_extra');
  const horasAnio = sumHoras(horariosAnio, 'horas_efectivas') || sumHoras(horariosAnio, 'horas_trabajadas');
  const diasTrabajadosMes = horariosMes.length;

  return (
    <Dialog open={!!tech} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumen de {tech?.name}</DialogTitle>
        </DialogHeader>
        {(loadingAus || loadingHor) ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 bg-white border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-bold text-emerald-600">{disfrutados.length}d</p>
                <p className="text-xs text-slate-500 mt-0.5">Vac. disfrutadas</p>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm text-center">
                <p className={`text-2xl font-bold ${restantes <= 5 ? 'text-red-500' : 'text-blue-600'}`}>{restantes}d</p>
                <p className="text-xs text-slate-500 mt-0.5">Vac. disponibles</p>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-bold text-slate-700">{horasMes.toFixed(1)}h</p>
                <p className="text-xs text-slate-500 mt-0.5">Horas este mes</p>
              </Card>
              <Card className="p-3 bg-white border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-bold text-orange-500">{horasExtraMes.toFixed(1)}h</p>
                <p className="text-xs text-slate-500 mt-0.5">Horas extra (mes)</p>
              </Card>
            </div>

            {/* Vacaciones disfrutadas — listado con fechas exactas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Vacaciones y ausencias · {currentYear}</h3>
                {pendientes.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto">{pendientes.length}d pendientes</Badge>
                )}
              </div>
              <DetalleTrabajador tech={tech} year={currentYear} ausencias={ausenciasAnio} />
            </div>

            {/* Horas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-700">Horas · {currentYear}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Este mes</span>
                  <span className="text-sm font-semibold text-slate-700">{horasMes.toFixed(1)}h · {diasTrabajadosMes} días</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Acumulado año</span>
                  <span className="text-sm font-semibold text-slate-700">{horasAnio.toFixed(1)}h</span>
                </div>
              </div>
              {horariosAnio.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...horariosAnio]
                    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                    .slice(0, 8)
                    .map(r => {
                      const h = Number(r.horas_efectivas) || Number(r.horas_trabajadas) || 0;
                      const extra = Number(r.horas_extra) || 0;
                      return (
                        <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                          <span className="text-slate-600">
                            {r.fecha && format(parseISO(r.fecha), "EEE d MMM yyyy", { locale: es })}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {h.toFixed(1)}h{extra > 0 && <span className="text-orange-500"> +{extra.toFixed(1)}h</span>}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
              {horariosAnio.length === 0 && (
                <p className="text-xs text-slate-400">Sin registros horarios este año.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}