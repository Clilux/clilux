import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Receipt, FileCheck, AlertCircle } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';

export default function Facturacion() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Gestión y Facturación" />

        <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-200 mb-2">Módulo en Desarrollo</h3>
              <p className="text-yellow-100 text-sm leading-relaxed mb-3">
                El módulo de gestión y facturación está actualmente en desarrollo. Incluirá gestión completa de:
              </p>
              <ul className="list-disc list-inside text-yellow-100 text-sm space-y-1 ml-4">
                <li>Presupuestos con numeración automática</li>
                <li>Albaranes de servicios realizados</li>
                <li>Facturas con cumplimiento normativa española</li>
                <li>Integración con VeriFacTu (sistema de facturación AEAT)</li>
                <li>Clientes compartidos con módulo de mantenimiento</li>
                <li>Exportación a PDF con formato profesional</li>
              </ul>
              <p className="text-yellow-100 text-sm mt-3">
                <strong>Próximamente disponible.</strong> Este módulo se integrará perfectamente con la base de clientes existente.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Presupuestos</h3>
                <p className="text-slate-400 text-sm">Próximamente</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              Crea presupuestos profesionales con partidas, IVA y condiciones. Conversión automática a albarán y factura.
            </p>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Receipt className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Albaranes</h3>
                <p className="text-slate-400 text-sm">Próximamente</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              Registra servicios y trabajos realizados. Firma digital del cliente. Vinculación con revisiones de equipos.
            </p>
          </Card>

          <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FileCheck className="h-7 w-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Facturas</h3>
                <p className="text-slate-400 text-sm">Próximamente</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              Facturación conforme a normativa española. Compatible con VeriFacTu de la AEAT. Exportación a contabilidad.
            </p>
          </Card>
        </div>

        <Card className="mt-6 p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Características Planificadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
              <div>
                <p className="text-white font-medium">VeriFacTu Compatible</p>
                <p className="text-slate-400 text-sm">Sistema de facturación electrónica de la AEAT</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2"></div>
              <div>
                <p className="text-white font-medium">Base de Clientes Unificada</p>
                <p className="text-slate-400 text-sm">Mismos clientes para mantenimiento y facturación</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-400 mt-2"></div>
              <div>
                <p className="text-white font-medium">Numeración Automática</p>
                <p className="text-slate-400 text-sm">Series configurables para todos los documentos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2"></div>
              <div>
                <p className="text-white font-medium">Informes y Estadísticas</p>
                <p className="text-slate-400 text-sm">Análisis de facturación y servicios</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Link to={createPageUrl('Clients')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              Ver Clientes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}