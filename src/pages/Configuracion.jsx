import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Settings, Building2, Boxes, Plug, Database } from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import EmpresaDatosTab from '@/components/config/EmpresaDatosTab';
import ModulosPanel from '@/components/company/ModulosPanel';
import IntegracionesStelTab from '@/components/config/IntegracionesStelTab';
import CopiasSeguridadTab from '@/components/config/CopiasSeguridadTab';

export default function Configuracion() {
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  // Datos del técnico + empresa (gerente vía proxy)
  const { data: techRecord, isLoading: techLoading } = useQuery({
    queryKey: ['me-config', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'me' });
      return res.data?.data || null;
    },
    enabled: isSessionTech,
  });

  const { data: company } = useQuery({
    queryKey: ['company-config', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'company' });
      return res.data?.data || null;
    },
    enabled: isSessionTech,
  });

  const isPlatformAdmin = !isSessionTech && base44User?.role === 'admin';
  const isGerente = isSessionTech && techRecord?.is_admin === true;

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    if (isSessionTech) window.location.href = '/';
    else base44.auth.logout('/');
  };

  if (isSessionTech && techLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  if (!isGerente && !isPlatformAdmin) {
    return (
      <div className="md:flex min-h-screen bg-slate-50">
        <div className="hidden md:block"><TechnicianSidebar isSessionTech={isSessionTech} isAdmin={false} isPlatformAdmin={false} isLoading={false} onLogout={handleLogout} techEmail={sessionTechEmail} /></div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 text-center max-w-sm">
            <Settings className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="font-semibold text-slate-800 mb-1">Acceso restringido</h2>
            <p className="text-sm text-slate-500">Solo el gerente puede acceder a la configuración de la empresa.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-slate-50">
      <div className="hidden md:block">
        <TechnicianSidebar
          isSessionTech={isSessionTech}
          isAdmin={isGerente || isPlatformAdmin}
          isPlatformAdmin={isPlatformAdmin}
          isLoading={false}
          onLogout={handleLogout}
          techEmail={sessionTechEmail || base44User?.email}
          isGerente={isGerente}
          sessionTechEmail={sessionTechEmail}
          company={company}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <NavHeader title="Configuración" />
          <p className="text-sm text-slate-500 mb-6">Gestiona los datos de tu empresa, los módulos contratados, las integraciones y las copias de seguridad. Los cambios se aplican a todos tus trabajadores.</p>

          <Tabs defaultValue="empresa" className="space-y-6">
            <TabsList className="bg-white flex-wrap h-auto">
              <TabsTrigger value="empresa" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Empresa
              </TabsTrigger>
              <TabsTrigger value="modulos" className="flex items-center gap-2">
                <Boxes className="h-4 w-4" /> Módulos
              </TabsTrigger>
              <TabsTrigger value="integraciones" className="flex items-center gap-2">
                <Plug className="h-4 w-4" /> Integraciones
              </TabsTrigger>
              <TabsTrigger value="copias" className="flex items-center gap-2">
                <Database className="h-4 w-4" /> Copias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="empresa">
              {company ? (
                <EmpresaDatosTab company={company} sessionTechEmail={sessionTechEmail} />
              ) : (
                <Card className="p-8 text-center text-slate-400">No hay datos de empresa.</Card>
              )}
            </TabsContent>

            <TabsContent value="modulos">
              {company ? (
                <ModulosPanel company={company} sessionTechEmail={sessionTechEmail} />
              ) : (
                <Card className="p-8 text-center text-slate-400">No hay datos de empresa.</Card>
              )}
            </TabsContent>

            <TabsContent value="integraciones">
              <IntegracionesStelTab sessionTechEmail={sessionTechEmail} isSessionTech={isSessionTech} />
            </TabsContent>

            <TabsContent value="copias">
              <CopiasSeguridadTab sessionTechEmail={sessionTechEmail} companyName={company?.name} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}