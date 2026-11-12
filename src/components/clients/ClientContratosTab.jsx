import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, CalendarClock, RefreshCw, Wrench, HardHat, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPO_CONF = {
  mantenimiento: { label: 'Mantenimiento', color: 'bg-blue-100 text-blue-700', icon: Wrench },
  instalaciones: { label: 'Instalación', color: 'bg-orange-100 text-orange-700', icon: HardHat },
};

function vigencia(c) {
  if (!c.fecha_fin) return { estado: 'sin_fin', label: 'Sin fecha de fin', color: 'bg-slate-100 text-slate-600' };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(c.fecha_fin + 'T00:00:00');
  const dias = Math.floor((fin.getTime() - hoy.getTime()) / 86400000);
  const auto = c.renovacion_automatica === 'si';
  if (dias < 0) {
    return { estado: 'vencido', label: auto ? 'Vencido (auto-renovable)' : 'Vencido', color: 'bg-red-100 text-red-700', dias, auto };
  }
  if (dias <= 30) {
    return { estado: 'por_vencer', label: auto ? `Vence en ${dias}d (auto)` : `Vence en ${dias}d`, color: 'bg-amber-100 text-amber-700', dias, auto };
  }
  return { estado: 'vigente', label: auto ? 'Vigente (auto-renovable)' : 'Vigente', color: 'bg-emerald-100 text-emerald-700', dias, auto };
}

export default function ClientContratosTab({ clientId, isSessionTech, sessionTechEmail }) {
  const [viewDoc, setViewDoc] = useState(null);

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['client-contratos', clientId, isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      let data;
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'contratos' });
        data = res.data?.data || [];
      } else {
        data = await base44.entities.Contrato.filter({ cliente_id: clientId });
      }
      return data
        .filter(c => c.cliente_id === clientId)
        .sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''));
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <div className="p-4 text-slate-500 text-sm">Cargando contratos...</div>;
  }

  const vigentes = contratos.filter(c => {
    const v = vigencia(c);
    return v.estado === 'vigente' || v.estado === 'por_vencer';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          {contratos.length} contrato{contratos.length !== 1 ? 's' : ''} · {vigentes.length} vigente{vigentes.length !== 1 ? 's' : ''}
        </p>
        <Link to="/ContratoMantenimiento">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <FileText className="h-3.5 w-3.5" />Nuevo contrato
          </Button>
        </Link>
      </div>

      {contratos.length === 0 ? (
        <Card className="p-10 text-center border-0 shadow-sm">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-2">Este cliente aún no tiene contratos</p>
          <p className="text-slate-400 text-sm">Genera un contrato de mantenimiento o instalación para verlo aquí.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contratos.map(c => {
            const v = vigencia(c);
            const TipoConf = TIPO_CONF[c.tipo_contrato] || TIPO_CONF.mantenimiento;
            const TipoIcon = TipoConf.icon;
            return (
              <Card key={c.id} className="p-4 bg-white border-0 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${TipoConf.color}`}>
                      <TipoIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-800 truncate">{c.numero_contrato}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TipoConf.color}`}>{TipoConf.label}</span>
                        <Badge variant="outline" className={v.color + ' border-0'}>{v.label}</Badge>
                        {c.estado === 'firmado' && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 className="h-3 w-3" />Firmado</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{c.fecha_inicio ? format(new Date(c.fecha_inicio), 'dd MMM yyyy', { locale: es }) : '—'} → {c.fecha_fin ? format(new Date(c.fecha_fin), 'dd MMM yyyy', { locale: es }) : '—'}</span>
                        {c.renovacion_automatica === 'si' && <span className="flex items-center gap-1 text-blue-600"><RefreshCw className="h-3 w-3" />Auto-renovable</span>}
                        {c.precio_anual != null && <span className="font-medium text-slate-700">{Number(c.precio_anual).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
                      </div>
                      {v.estado === 'por_vencer' && !v.auto && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Próximo a caducar, revisa su renovación.</p>
                      )}
                      {v.estado === 'vencido' && !v.auto && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Contrato vencido. Sin renovación automática.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.pdf_url && (
                      <a href={c.pdf_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="text-blue-600"><Eye className="h-4 w-4" /></Button>
                      </a>
                    )}
                    {c.pdf_firmado_url ? (
                      <a href={c.pdf_firmado_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="text-emerald-600"><Download className="h-4 w-4" /></Button>
                      </a>
                    ) : c.pdf_url && (
                      <a href={c.pdf_url} target="_blank" rel="noreferrer" download>
                        <Button variant="ghost" size="sm" className="text-slate-600"><Download className="h-4 w-4" /></Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}