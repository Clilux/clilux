import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, TrendingUp, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileText, Receipt, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const EUR = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const STATUS_CONF = {
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-700' },
  pagada: { label: 'Pagada', color: 'bg-emerald-100 text-emerald-700' },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  anulada: { label: 'Anulada', color: 'bg-slate-100 text-slate-500' },
};

export default function ClientEconomicTab({ clientId, clientName, isSessionTech, sessionTechEmail }) {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const { data: facturas = [], isLoading, error } = useQuery({
    queryKey: ['client-facturas', clientId, isSessionTech ? 'proxy' : 'direct', sessionTechEmail],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'facturas' });
        if (res.data?.no_permission) throw { no_permission: true };
        return (res.data?.data || []).filter(f => f.client_id === clientId);
      }
      return base44.entities.Factura.filter({ client_id: clientId });
    },
    enabled: !!clientId,
    retry: false,
  });

  const yearStr = String(viewYear);

  // Gráfica mensual del año seleccionado (excluye anuladas)
  const chartData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const ms = `${yearStr}-${String(i + 1).padStart(2, '0')}`;
    const recs = facturas.filter(f => f.fecha?.startsWith(ms) && f.status !== 'anulada');
    return { name: format(new Date(2024, i, 1), 'MMM', { locale: es }), total: Math.round(recs.reduce((a, f) => a + (f.total || 0), 0)) };
  }), [facturas, yearStr]);

  // Permiso denegado (sólo sesión de técnico sin ver_economia)
  if (error?.no_permission) {
    return (
      <Card className="p-10 text-center bg-white border-0 shadow-sm">
        <Lock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium mb-1">No tienes autorización para ver los datos económicos</p>
        <p className="text-sm text-slate-400">Contacta con el administrador de la empresa para que te conceda acceso a economía.</p>
      </Card>
    );
  }

  // Resumen del año
  const facturadoAno = facturas.filter(f => f.fecha?.startsWith(yearStr) && f.status !== 'anulada').reduce((a, f) => a + (f.total || 0), 0);
  const cobradoAno = facturas.filter(f => f.fecha?.startsWith(yearStr) && f.status === 'pagada').reduce((a, f) => a + (f.total || 0), 0);
  // Pendientes / vencidas (independientes del año)
  const pendientes = facturas.filter(f => f.status === 'emitida' || f.status === 'vencida').sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const totalPendiente = pendientes.filter(f => f.status === 'emitida').reduce((a, f) => a + (f.total || 0), 0);
  const totalVencido = pendientes.filter(f => f.status === 'vencida').reduce((a, f) => a + (f.total || 0), 0);
  const ticketMedio = facturadoAno > 0 && facturas.filter(f => f.fecha?.startsWith(yearStr) && f.status !== 'anulada').length > 0
    ? facturadoAno / facturas.filter(f => f.fecha?.startsWith(yearStr) && f.status !== 'anulada').length
    : 0;

  const maxBar = Math.max(...chartData.map(d => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Año + resumen superior */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Economía de {clientName || 'el cliente'}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-slate-700 text-sm min-w-16 text-center">{viewYear}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= new Date().getFullYear() + 1}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-50"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
            <p className="text-xs text-slate-500">Facturado {viewYear}</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{EUR(facturadoAno)}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
            <p className="text-xs text-slate-500">Cobrado {viewYear}</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">{EUR(cobradoAno)}</p>
          {facturadoAno > 0 && <p className="text-[11px] text-slate-400 mt-0.5">{Math.round((cobradoAno / facturadoAno) * 100)}% cobrado</p>}
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-amber-50"><Clock className="h-4 w-4 text-amber-600" /></div>
            <p className="text-xs text-slate-500">Pendiente de cobro</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{EUR(totalPendiente + totalVencido)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{pendientes.length} factura{pendientes.length !== 1 ? 's' : ''}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /></div>
            <p className="text-xs text-slate-500">Vencido</p>
          </div>
          <p className={`text-xl font-bold ${totalVencido > 0 ? 'text-red-600' : 'text-slate-300'}`}>{EUR(totalVencido)}</p>
        </Card>
      </div>

      {/* Gráfica facturación mensual */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-slate-400" />
          <h3 className="font-semibold text-slate-700 text-sm">Facturación mensual · {viewYear}</h3>
          {ticketMedio > 0 && <span className="text-xs text-slate-400 ml-auto">Ticket medio: {EUR(ticketMedio)}</span>}
        </div>
        {isLoading ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
        ) : facturadoAno === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
            <Receipt className="h-10 w-10 text-slate-200 mb-2" />
            Sin facturación registrada en {viewYear}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => [EUR(v), 'Facturado']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.total > 0 ? '#2563eb' : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Facturas pendientes */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Facturas pendientes de cobro</span>
          </div>
          <span className="text-xs text-slate-400">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : pendientes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-200 mb-2" />
            No hay facturas pendientes. Todo al día.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 text-slate-500 font-medium">Factura</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Fecha</th>
                  <th className="text-center p-3 text-slate-500 font-medium">Estado</th>
                  <th className="text-right p-3 text-slate-500 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map(r => {
                  const sc = STATUS_CONF[r.status] || STATUS_CONF.emitida;
                  const diasVencido = r.status === 'vencida' && r.fecha ? Math.max(0, Math.floor((Date.now() - new Date(r.fecha + 'T12:00:00').getTime()) / 86400000)) : 0;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">{r.numero || '—'}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{r.fecha ? format(parseISO(r.fecha), "d MMM yyyy", { locale: es }) : '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                        {diasVencido > 0 && <span className="block text-[11px] text-red-500 mt-0.5">hace {diasVencido}d</span>}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">{EUR(r.total || 0)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-3 text-slate-600" colSpan={3}>Total pendiente</td>
                  <td className="p-3 text-right text-slate-800">{EUR(totalPendiente + totalVencido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}