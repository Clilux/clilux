import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Plug, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegracionesTab({ formData, onChange }) {
  const stel = formData.integrations?.stel_order || {};
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'

  const updateStel = (field, value) => {
    onChange('integrations', {
      ...formData.integrations,
      stel_order: {
        ...stel,
        [field]: value,
      },
    });
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!stel.api_key) {
      toast.error('Introduce una API Key antes de probar');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('stelProxy', { action: 'listClients', payload: { limit: 1 } });
      if (res.data?.clients !== undefined) {
        setTestResult('ok');
        toast.success('Conexión con STEL Order correcta');
      } else {
        setTestResult('error');
        toast.error('No se pudo conectar con STEL Order');
      }
    } catch {
      setTestResult('error');
      toast.error('Error al conectar con STEL Order');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* STEL Order */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Plug className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">STEL Order ERP</h3>
                {stel.enabled ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activado</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Desactivado</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestión de clientes, albaranes y presupuestos desde STEL Order.
              </p>
            </div>
          </div>
          <a
            href="https://app.stelorder.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="h-3 w-3" /> Abrir STEL
          </a>
        </div>

        <div className="space-y-4">
          {/* Toggle activar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700 text-sm">Activar integración</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Al activar, aparecerá el menú "STEL Order" en la navegación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateStel('enabled', !stel.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                stel.enabled ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  stel.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* API Key */}
          <div>
            <Label className="text-sm">API Key de STEL Order</Label>
            <p className="text-xs text-slate-400 mb-2">
              Encuéntrala en STEL Order → Configuración → API. La clave se guarda de forma segura en el servidor.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={stel.api_key || ''}
                  onChange={(e) => updateStel('api_key', e.target.value)}
                  placeholder="sk_xxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowKey(v => !v)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !stel.api_key}
                className="shrink-0"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : testResult === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  'Probar'
                )}
              </Button>
            </div>
            {testResult === 'ok' && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Conexión verificada correctamente
              </p>
            )}
            {testResult === 'error' && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> No se pudo conectar. Verifica la API Key.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Placeholder futuras integraciones */}
      <Card className="p-6 bg-white border-0 shadow-sm opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Plug className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-500">Más integraciones</h3>
              <Badge variant="outline" className="text-xs">Próximamente</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Google Calendar, facturación electrónica y más.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}