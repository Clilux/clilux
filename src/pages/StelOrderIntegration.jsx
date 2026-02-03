import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';

export default function StelOrderIntegration() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Integración Stel Order" />

        <Card className="p-8 bg-white border-0 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Funciones de Backend Requeridas
          </h2>
          
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Para integrar con <strong>Stel Order</strong> y <strong>Google Calendar</strong>, 
            necesitas habilitar las funciones de backend en tu aplicación. Esto te permitirá:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
            <Card className="p-4 bg-slate-50">
              <h3 className="font-medium text-slate-800 mb-2">Stel Order</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Crear órdenes de servicio automáticamente</li>
                <li>• Sincronizar estado de equipos</li>
                <li>• Gestionar técnicos asignados</li>
                <li>• Webhooks para actualizaciones en tiempo real</li>
              </ul>
            </Card>

            <Card className="p-4 bg-slate-50">
              <h3 className="font-medium text-slate-800 mb-2">Google Calendar</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Sincronizar revisiones programadas</li>
                <li>• Notificaciones automáticas</li>
                <li>• Calendario compartido del equipo</li>
                <li>• Recordatorios de mantenimiento</li>
              </ul>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Las funciones de backend te permitirán crear funciones personalizadas, 
              conectar con APIs externas, y configurar webhooks para mantener tus datos sincronizados.
            </p>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ir a Configuración para Habilitar Backend
          </Button>

          <p className="text-xs text-slate-500 mt-4">
            Una vez habilitadas las funciones de backend, podrás configurar las integraciones desde aquí.
          </p>
        </Card>
      </div>
    </div>
  );
}