import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import { HardHat, AlertTriangle, ClipboardCheck, ChevronRight } from 'lucide-react';
import { filtrarCompartidos } from '@/lib/comparticion';

/**
 * Resumen principal del inicio: obras abiertas, incidencias y mantenimientos
 * pendientes. Cada usuario ve sus propios números según la compartición de
 * cada registro (por defecto, compartido con todos).
 */
export default function ResumenPrincipal({
  obras = [],
  incidents = [],
  revisions = [],
  loading = false,
  techId = null,
  isAdmin = false,
}) {
  const opts = { techId, isAdmin };

  const misObras = filtrarCompartidos(obras, opts).filter((o) => o.estado !== 'finalizada');
  const misIncidencias = filtrarCompartidos(incidents, opts).filter(
    (i) => i.status === 'pending' || i.status === 'in_progress'
  );
  // Solo mantenimientos del mes en curso y anteriores (no los programados a futuro)
  const hoy = new Date();
  const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const finDeMesStr = `${finDeMes.getFullYear()}-${String(finDeMes.getMonth() + 1).padStart(2, '0')}-${String(finDeMes.getDate()).padStart(2, '0')}`;
  const misMantenimientos = filtrarCompartidos(revisions, opts).filter(
    (r) => r.status === 'pending' && r.scheduled_date && r.scheduled_date <= finDeMesStr
  );

  const enCurso = misIncidencias.filter((i) => i.status === 'in_progress').length;
  const pendientes = misIncidencias.length - enCurso;
  const urgentes = misIncidencias.filter((i) => i.priority === 'urgent' || i.priority === 'high').length;
  const obrasActivas = misObras.filter((o) => o.estado === 'activa').length;

  const tarjetas = [
    {
      key: 'obras',
      label: 'Obras abiertas',
      value: misObras.length,
      detalle: `${obrasActivas} activas · ${misObras.length - obrasActivas} pausadas`,
      icon: HardHat,
      page: 'ControlObras',
      cardCls: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-100',
      iconCls: 'text-amber-600',
      valueCls: 'text-amber-700',
    },
    {
      key: 'incidencias',
      label: 'Incidencias pendientes',
      value: misIncidencias.length,
      detalle: `${pendientes} sin empezar · ${enCurso} en curso${urgentes ? ` · ${urgentes} prioritarias` : ''}`,
      icon: AlertTriangle,
      page: 'Incidents',
      cardCls: 'bg-red-50 border-red-200',
      iconBg: 'bg-red-100',
      iconCls: 'text-red-600',
      valueCls: 'text-red-700',
    },
    {
      key: 'mantenimientos',
      label: 'Mantenimientos pendientes',
      value: misMantenimientos.length,
      detalle: 'Programados hasta este mes sin realizar',
      icon: ClipboardCheck,
      page: 'Calendar',
      cardCls: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
      iconCls: 'text-blue-600',
      valueCls: 'text-blue-700',
    },
  ];

  return (
    <div>
      <h2 className="text-slate-800 font-semibold mb-3">Resumen de trabajo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tarjetas.map(({ key, label, value, detalle, icon: Icon, page, cardCls, iconBg, iconCls, valueCls }) => (
          <Link key={key} to={createPageUrl(page)}>
            <Card className={`${cardCls} border p-4 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer shadow-sm h-full`}>
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${iconCls}`} />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              {loading ? (
                <Skeleton className="h-9 w-14 mt-3" />
              ) : (
                <p className={`text-3xl font-bold mt-3 leading-none ${valueCls}`}>{value}</p>
              )}
              <p className="text-sm text-slate-700 font-semibold mt-1.5">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{detalle}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}