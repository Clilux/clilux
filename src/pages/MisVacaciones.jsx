import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NavHeader from '@/components/navigation/NavHeader';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import SolicitudAusenciaModal from '@/components/horario/SolicitudAusenciaModal';
import VacacionesResumen from '@/components/vacaciones/VacacionesResumen';
import MisAusenciasLista from '@/components/vacaciones/MisAusenciasLista';

const DIAS_VACACIONES_DEFECTO = 22;

export default function MisVacaciones() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showSolicitud, setShowSolicitud] = useState(false);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  // Sesión de trabajador (login propio): los datos llegan por el proxy de empresa
  const { data: proxyData, isLoading: proxyLoading } = useQuery({
    queryKey: ['mis-vacaciones-proxy', sessionTechEmail],
    queryFn: async () => {
      const [meRes, ausRes] = await Promise.all([
        base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'me' }),
        base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'ausencias_propias' }),
      ]);
      return { tech: meRes.data?.data || null, ausencias: ausRes.data?.data || [] };
    },
    enabled: isSessionTech,
  });

  // Usuario Base44 (gerente/administración): lectura directa de su propia ficha
  const { data: directData, isLoading: directLoading } = useQuery({
    queryKey: ['mis-vacaciones-direct', base44User?.email],
    queryFn: async () => {
      let techs = await base44.entities.Technician.filter({ user_email: base44User.email });
      if (!techs.length) techs = await base44.entities.Technician.filter({ email: base44User.email });
      const tech = techs[0] || null;
      const page = await base44.entities.Ausencia.filter(
        { technician_email: tech?.email || base44User.email },
        { sort: '-fecha_inicio', limit: 200 }
      );
      return { tech, ausencias: page.items || page };
    },
    enabled: !isSessionTech && !!base44User?.email,
  });

  const tech = isSessionTech ? proxyData?.tech : directData?.tech;
  const ausencias = (isSessionTech ? proxyData?.ausencias : directData?.ausencias) || [];
  const isLoading = isSessionTech ? proxyLoading : directLoading;

  const email = sessionTechEmail || base44User?.email || tech?.email || '';
  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || tech?.is_admin === true;

  const yearStr = String(new Date().getFullYear());
  const diasAnuales = tech?.vacaciones_anuales ?? DIAS_VACACIONES_DEFECTO;
  const diasAnteriores = tech?.vacaciones_dias_usados_anteriores ?? 0;

  const diasVacaciones = (estado) => ausencias
    .filter(a => a.tipo === 'vacaciones' && a.estado === estado && (a.fecha_inicio || '').startsWith(yearStr))
    .reduce((sum, a) => sum + (a.dias_totales || 0), 0);

  const diasDisfrutados = diasVacaciones('aprobada');
  const diasPendientes = diasVacaciones('pendiente');
  const diasDisponibles = Math.max(0, diasAnuales - diasAnteriores - diasDisfrutados);

  const currentUser = isSessionTech
    ? { email: sessionTechEmail, full_name: tech?.name || sessionTechEmail }
    : base44User;

  const handleClose = () => {
    setShowSolicitud(false);
    queryClient.invalidateQueries({ queryKey: ['mis-vacaciones-proxy'] });
    queryClient.invalidateQueries({ queryKey: ['mis-vacaciones-direct'] });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    sessionStorage.removeItem('technician_name');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    if (isSessionTech) navigate(createPageUrl('MenuInicio'));
    else base44.auth.logout(createPageUrl('MenuInicio'));
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar
        isSessionTech={isSessionTech}
        isAdmin={isAdmin}
        isLoading={false}
        onLogout={handleLogout}
        techEmail={email}
      />
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <NavHeader title="Mis vacaciones" />

          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <p className="text-sm text-slate-500">
              Control de vacaciones y ausencias · {yearStr}
            </p>
            <Button onClick={() => setShowSolicitud(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Solicitar vacaciones
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : (
            <>
              <VacacionesResumen
                diasAnuales={diasAnuales}
                diasAnteriores={diasAnteriores}
                diasDisfrutados={diasDisfrutados}
                diasPendientes={diasPendientes}
                diasDisponibles={diasDisponibles}
              />
              <MisAusenciasLista ausencias={ausencias} />
            </>
          )}
        </div>
      </div>

      {showSolicitud && (
        <SolicitudAusenciaModal currentUser={currentUser} techRecord={tech} onClose={handleClose} />
      )}
    </div>
  );
}