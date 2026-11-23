import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NavHeader from '@/components/navigation/NavHeader';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import CalendarioResumen from '@/components/resumen/CalendarioResumen';
import GraficoVacaciones from '@/components/resumen/GraficoVacaciones';
import GraficoHorario from '@/components/resumen/GraficoHorario';
import { Card } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, Timer, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { diasLaborablesDe } from '@/lib/vacaciones-utils';
import { formatHoras } from '@/lib/horario-utils';

const DIAS_VACACIONES_DEFECTO = 22;

export default function MiResumen() {
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthStr = format(viewMonth, 'yyyy-MM');

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  // Sesión de técnico propio: datos por el proxy de empresa
  const { data: proxyData, isLoading: proxyLoading } = useQuery({
    queryKey: ['mi-resumen-proxy', sessionTechEmail, monthStr],
    queryFn: async () => {
      const [meRes, ausRes, regRes] = await Promise.all([
        base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'me' }),
        base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'ausencias_propias' }),
        base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'registro_horario_mes', mes: monthStr }),
      ]);
      return { tech: meRes.data?.data || null, ausencias: ausRes.data?.data || [], registros: regRes.data?.data || [] };
    },
    enabled: isSessionTech,
  });

  // Usuario Base44 (gerente/administración): lectura directa
  const { data: directData, isLoading: directLoading } = useQuery({
    queryKey: ['mi-resumen-direct', base44User?.email, monthStr],
    queryFn: async () => {
      let techs = await base44.entities.Technician.filter({ user_email: base44User.email });
      if (!techs.length) techs = await base44.entities.Technician.filter({ email: base44User.email });
      const tech = techs[0] || null;
      const ausPage = await base44.entities.Ausencia.filter(
        { technician_email: tech?.email || base44User.email },
        { sort: '-fecha_inicio', limit: 200 }
      );
      const allReg = await base44.entities.RegistroHorario.filter({ technician_email: tech?.email || base44User.email });
      const registros = (allReg || []).filter(r => r.fecha?.startsWith(monthStr));
      return { tech, ausencias: ausPage.items || ausPage, registros };
    },
    enabled: !isSessionTech && !!base44User?.email,
  });

  const tech = isSessionTech ? proxyData?.tech : directData?.tech;
  const ausencias = (isSessionTech ? proxyData?.ausencias : directData?.ausencias) || [];
  const registros = (isSessionTech ? proxyData?.registros : directData?.registros) || [];
  const isLoading = isSessionTech ? proxyLoading : directLoading;

  const email = sessionTechEmail || base44User?.email || tech?.email || '';
  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || tech?.is_admin === true;

  const yearStr = String(new Date().getFullYear());
  const diasAnuales = tech?.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO;
  const diasAnteriores = tech?.vacaciones_dias_usados_anteriores ?? 0;
  const diasLaborables = diasLaborablesDe(tech);
  const jornadaDiaria = tech?.horas_jornada_diaria || 8;

  const diasVac = (estado) => ausencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === estado && (a.fecha_inicio || '').startsWith(yearStr))
    .reduce((s, a) => s + (a.dias_totales || 0), 0);
  const diasDisfrutados = diasVac('aprobada');
  const diasPendientes = diasVac('pendiente');
  const diasDisponibles = Math.max(0, diasAnuales - diasAnteriores - diasDisfrutados);

  const totalNormal = registros.reduce((a, r) => a + (r.horas_efectivas ?? r.horas_normales ?? 0), 0);
  const totalExtra = registros.reduce((a, r) => a + (r.horas_extra || 0), 0);
  const diasTrabajados = new Set(registros.map(r => r.fecha)).size;

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('technician_name');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    if (isSessionTech) navigate(createPageUrl('MenuInicio'));
    else base44.auth.logout(createPageUrl('MenuInicio'));
  };

  const kpis = [
    { label: 'Vac. disponibles', value: `${diasDisponibles}d`, icon: CalendarDays, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Vac. disfrutadas', value: `${diasDisfrutados}d`, icon: CheckCircle2, cls: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Horas del mes', value: formatHoras(totalNormal + totalExtra), icon: Timer, cls: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Días trabajados', value: diasTrabajados, icon: Briefcase, cls: 'text-slate-700', bg: 'bg-slate-100' },
  ];

  const mesLabel = format(viewMonth, 'MMMM yyyy', { locale: es });

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isAdmin} isLoading={false} onLogout={handleLogout} techEmail={email} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <NavHeader title="Mi resumen gráfico" />
          <p className="text-sm text-slate-500 -mt-3">Vista visual de tus vacaciones y horarios · {yearStr}</p>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpis.map(({ label, value, icon: Icon, cls, bg }) => (
                  <Card key={label} className="p-4 bg-white border-0 shadow-sm">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                      <Icon className={`h-5 w-5 ${cls}`} />
                    </div>
                    <p className={`text-xl font-bold ${cls}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GraficoVacaciones
                  diasDisfrutados={diasDisfrutados}
                  diasPendientes={diasPendientes}
                  diasDisponibles={diasDisponibles}
                />
                <GraficoHorario registros={registros} mesLabel={mesLabel} />
              </div>

              <CalendarioResumen
                mes={viewMonth}
                onMesChange={setViewMonth}
                ausencias={ausencias}
                registros={registros}
                diasLaborables={diasLaborables}
                jornadaDiaria={jornadaDiaria}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => navigate('/MisVacaciones')} className="text-xs text-brand-600 hover:underline">Ver mis vacaciones →</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => navigate('/ControlHorario')} className="text-xs text-brand-600 hover:underline">Ver mis fichajes →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}