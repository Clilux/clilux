import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Plug, ExternalLink, Save, BookOpen, ArrowRight, KeyRound, ToggleRight, Users, Package, FileText } from 'lucide-react';
import { toast } from 'sonner';
import NavHeader from '@/components/navigation/NavHeader';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';

const STEPS = [
  { num: 1, title: 'Inicia sesión en STEL Order', desc: 'Ve a app.stelorder.com e inicia sesión con tu cuenta de empresa.', icon: ExternalLink },
  { num: 2, title: 'Accede a la configuración de API', desc: 'Ve a Configuración → Integraciones → API. Allí podrás generar tu API Key personal.', icon: KeyRound },
  { num: 3, title: 'Copia tu API Key', desc: 'Genera una nueva clave (formato sk_xxx) y cópiala. La pegarás abajo en el campo "API Key de STEL Order".', icon: KeyRound },
  { num: 4, title: 'Pega la API Key aquí', desc: 'Pega la clave en el campo de configuración de abajo y pulsa "Probar" para verificar la conexión.', icon: ArrowRight },
  { num: 5, title: 'Activa la integración', desc: 'Activa el interruptor "Activar integración" y guarda los cambios. A partir de ese momento, tus trabajadores verán los clientes, artículos y servicios de STEL Order en "Gestión de Trabajo".', icon: ToggleRight },
  { num: 6, title: 'Tus trabajadores ya pueden usarla', desc: 'En Gestión de Trabajo, al crear un albarán podrán seleccionar clientes de STEL, buscar artículos/servicios del catálogo y el albarán se clonará automáticamente en STEL Order.', icon: Users },
];

export default function Integraciones() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  const { data: base44User } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me(), enabled: !isSessionTech, retry: false });

  const { data: techRecord } = useQuery({
    queryKey: ['me-integraciones', sessionTechEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'me' });
      return res.data?.data || null;
    },
    enabled: isSessionTech,
  });

  const isPlatformAdmin = !isSessionTech && base44User?.role === 'admin';
  const isGerente = isSessionTech && techRecord?.is_admin === true;

  const proxyCall = async (payload) => base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, ...payload });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', isSessionTech ? 'proxy' : 'direct'],
    queryFn: async () => {
      if (isSessionTech) { const res = await proxyCall({ entity: 'settings' }); return res.data?.data || {}; }
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || {};
    },
  });

  const [formData, setFormData] = useState(settings || {});
  React.useEffect(() => { if (settings) setFormData(settings); }, [settings]);

  const stel = formData.integrations?.stel_order || {};

  const updateStel = (field, value) => {
    setFormData(prev => ({
      ...prev,
      integrations: {
        ...(prev.integrations || {}),
        stel_order: { ...stel, [field]: value },
      },
    }));
    setTestResult(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSessionTech) {
        const res = await proxyCall({ entity: 'settings_update', updates: formData });
        return res.data;
      }
      if (settings?.id) return base44.entities.AppSettings.update(settings.id, formData);
      return base44.entities.AppSettings.create({ ...formData, setting_key: 'main' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleTest = async () => {
    if (!stel.api_key) { toast.error('Introduce una API Key antes de probar'); return; }
    // Guardar antes de probar
    await saveMutation.mutateAsync();
    setTesting(true); setTestResult(null);
    try {
      if (isSessionTech) {
        const res = await proxyCall({ entity: 'stel_proxy', action: 'testConnection' });
        if (res.data?.ok) { setTestResult('ok'); toast.success('Conexión con STEL Order correcta'); }
        else { setTestResult('error'); toast.error('No se pudo conectar'); }
      } else {
        const res = await base44.functions.invoke('stelProxy', { action: 'testConnection' });
        if (res.data?.ok) { setTestResult('ok'); toast.success('Conexión con STEL Order correcta'); }
        else { setTestResult('error'); toast.error('No se pudo conectar'); }
      }
    } catch { setTestResult('error'); toast.error('Error al conectar con STEL Order'); }
    finally { setTesting(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    if (isSessionTech) window.location.href = '/'; else base44.auth.logout('/');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  if (!isGerente && !isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm">
          <Plug className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-800 mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-500">Solo el gerente puede configurar integraciones.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-slate-50">
      <div className="hidden md:block"><TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isGerente || isPlatformAdmin} isPlatformAdmin={isPlatformAdmin} isLoading={false} onLogout={handleLogout} techEmail={sessionTechEmail || base44User?.email} /></div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <NavHeader title="Integraciones" />
          <p className="text-sm text-slate-500 mb-6">Conecta servicios externos para potenciar tu gestión. Tus trabajadores no necesitan configurar nada: lo que actives aquí estará disponible automáticamente.</p>

          {/* Tarjeta STEL Order */}
          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Plug className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">STEL Order ERP</h3>
                    {stel.enabled ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activado</Badge> : <Badge variant="secondary" className="text-xs">Desactivado</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Sincroniza clientes, artículos, servicios y albaranes con STEL Order.</p>
                </div>
              </div>
              <a href="https://app.stelorder.com" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0">
                <ExternalLink className="h-3 w-3" /> Abrir STEL
              </a>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-700 text-sm">Activar integración</p>
                  <p className="text-xs text-slate-400 mt-0.5">Al activar, tus trabajadores verán clientes, artículos y servicios de STEL en Gestión de Trabajo.</p>
                </div>
                <button type="button" onClick={() => updateStel('enabled', !stel.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${stel.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${stel.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <Label className="text-sm">API Key de STEL Order</Label>
                <p className="text-xs text-slate-400 mb-2">Encuéntrala en STEL Order → Configuración → API. La clave se guarda de forma segura.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type={showKey ? 'text' : 'password'} value={stel.api_key || ''} onChange={(e) => updateStel('api_key', e.target.value)} placeholder="sk_xxxxxxxxxxxxxxxx" className="pr-10" />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowKey(v => !v)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !stel.api_key} className="shrink-0">
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : testResult === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : testResult === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> : 'Probar'}
                  </Button>
                </div>
                {testResult === 'ok' && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Conexión verificada</p>}
                {testResult === 'error' && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> No se pudo conectar. Verifica la API Key.</p>}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar configuración
                </Button>
              </div>
            </div>
          </Card>

          {/* Tutorial */}
          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Tutorial: Cómo conectar STEL Order</h3>
            </div>
            <div className="space-y-4">
              {STEPS.map(({ num, title, desc, icon: Icon }) => (
                <div key={num} className="flex gap-4">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">{num}</div>
                    {num < STEPS.length && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <p className="font-medium text-slate-800 text-sm">{title}</p>
                    </div>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Qué verán los trabajadores */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">¿Qué verán tus trabajadores?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="font-medium text-slate-800 text-sm">Clientes de STEL</p><p className="text-xs text-slate-500">Los clientes de STEL Order aparecerán junto a los locales al crear albaranes.</p></div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-blue-600" /></div>
                <div><p className="font-medium text-slate-800 text-sm">Artículos y servicios</p><p className="text-xs text-slate-500">Podrán buscar productos y servicios del catálogo de STEL para añadirlos como líneas.</p></div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-purple-600" /></div>
                <div><p className="font-medium text-slate-800 text-sm">Albaranes clonados</p><p className="text-xs text-slate-500">Al crear un albarán con un cliente de STEL, se clonará automáticamente en STEL Order.</p></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}