import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { parseISO, format, subMonths, startOfMonth, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const MONTHS_BACK = 12;

// Obtiene la clave YYYY-MM y la etiqueta legible
function monthKey(date) {
  return format(date, 'yyyy-MM');
}
function monthLabel(date) {
  return format(date, 'MMM yy', { locale: es });
}

// Construye la serie de últimos N meses vacía
function buildEmptySeries() {
  const series = [];
  const today = new Date();
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(today, i));
    series.push({
      key: monthKey(d),
      label: monthLabel(d),
      incidencias: 0,
      revisiones: 0,
    });
  }
  return series;
}

export default function EstadisticasTab({ incidents = [], revisions = [], isLoading = false }) {
  const data = useMemo(() => {
    const series = buildEmptySeries();
    const idxMap = {};
    series.forEach((s, i) => { idxMap[s.key] = i; });

    // Incidencias resueltas: status resolved o closed, por resolution_date o updated_date
    incidents.forEach(inc => {
      if (!inc) return;
      const isResolved = inc.status === 'resolved' || inc.status === 'closed';
      if (!isResolved) return;
      const rawDate = inc.resolution_date || inc.updated_date || inc.created_date;
      if (!rawDate) return;
      let d;
      try { d = typeof rawDate === 'string' ? parseISO(rawDate) : new Date(rawDate); } catch { return; }
      if (!d || isNaN(d.getTime())) return;
      const k = monthKey(d);
      if (idxMap[k] !== undefined) series[idxMap[k]].incidencias += 1;
    });

    // Revisiones realizadas: status completed, por completed_date
    revisions.forEach(rev => {
      if (!rev) return;
      if (rev.status !== 'completed') return;
      const rawDate = rev.completed_date || rev.updated_date || rev.scheduled_date;
      if (!rawDate) return;
      let d;
      try { d = typeof rawDate === 'string' ? parseISO(rawDate) : new Date(rawDate); } catch { return; }
      if (!d || isNaN(d.getTime())) return;
      const k = monthKey(d);
      if (idxMap[k] !== undefined) series[idxMap[k]].revisiones += 1;
    });

    return series;
  }, [incidents, revisions]);

  const totalResueltas = data.reduce((s, d) => s + d.incidencias, 0);
  const totalRevisiones = data.reduce((s, d) => s + d.revisiones, 0);
  const ultimoMes = data[data.length - 1] || { incidencias: 0, revisiones: 0 };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        Estadísticas de actividad
      </h2>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalResueltas}</p>
              <p className="text-xs text-slate-500 font-medium">Incidencias resueltas ({MONTHS_BACK}m)</p>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalRevisiones}</p>
              <p className="text-xs text-slate-500 font-medium">Revisiones realizadas ({MONTHS_BACK}m)</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-50 border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{ultimoMes.revisiones}</p>
              <p className="text-xs text-slate-500 font-medium">Revisiones este mes · {ultimoMes.incidencias} incidencias</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico combinado */}
      <Card className="bg-white border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-800 font-semibold text-sm">Volumen mensual</h3>
            <p className="text-slate-500 text-xs">Incidencias resueltas vs revisiones realizadas</p>
          </div>
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelStyle={{ fontWeight: 600, color: '#0f172a' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revisiones" name="Revisiones" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="incidencias" name="Incidencias resueltas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line type="monotone" dataKey="incidencias" stroke="#0ea5e9" strokeWidth={2} dot={false} legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Gráficos individuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-white border-slate-200 p-5 shadow-sm">
          <h3 className="text-slate-800 font-semibold text-sm mb-1">Incidencias resueltas</h3>
          <p className="text-slate-500 text-xs mb-4">Evolución mensual</p>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="incidencias" name="Resueltas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-5 shadow-sm">
          <h3 className="text-slate-800 font-semibold text-sm mb-1">Revisiones realizadas</h3>
          <p className="text-slate-500 text-xs mb-4">Evolución mensual</p>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="revisiones" name="Revisiones" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}