import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { getSessionToken } from '@/lib/passwordHash';
import { puedeAccederErp } from '@/lib/permisos-trabajador';
import { isModuloActivo } from '@/lib/modulos';

/**
 * Puerta del módulo ERP: solo pasa el gerente, el admin de la plataforma
 * y los trabajadores a los que el gerente les haya concedido el acceso.
 * Además, la empresa debe tener el módulo ERP contratado.
 */
export default function ErpAccessGuard({ children }) {
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: myTechRecord, isLoading: loadingTech } = useQuery({
    queryKey: ['tech-me', sessionTechEmail],
    queryFn: () => base44.functions.invoke('getCompanyData', {
      technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'me',
    }).then(r => r.data?.data || null),
    enabled: isSessionTech,
  });

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['company-modulo', sessionTechEmail],
    queryFn: () => base44.functions.invoke('getCompanyData', {
      technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'company',
    }).then(r => r.data?.data || null),
    enabled: isSessionTech,
  });

  const isLoading = isSessionTech ? (loadingTech || loadingCompany) : loadingUser;
  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  const isPlatformAdmin = !isSessionTech && base44User?.role === 'admin';
  const isAdmin = isPlatformAdmin || myTechRecord?.is_admin === true;

  if (!isModuloActivo(company, 'erp')) {
    return (
      <Card className="p-10 text-center border-0 shadow-sm">
        <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Módulo ERP no contratado</p>
        <p className="text-sm text-slate-400 mt-1">Tu empresa no tiene activo el módulo ERP. Contacta con el gerente para contratarlo.</p>
      </Card>
    );
  }

  if (!puedeAccederErp(myTechRecord, { isAdmin, isPlatformAdmin })) {
    return (
      <Card className="p-10 text-center border-0 shadow-sm">
        <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Sin acceso al ERP</p>
        <p className="text-sm text-slate-400 mt-1">Pídele al gerente de tu empresa que te active el acceso al módulo ERP.</p>
      </Card>
    );
  }

  return children;
}