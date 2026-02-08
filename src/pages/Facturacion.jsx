import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Receipt, FileCheck, ShoppingCart, TrendingUp, ArrowLeft } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';

export default function Facturacion() {
  const navigate = useNavigate();
  
  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date'),
  });

  const { data: albaranes = [] } = useQuery({
    queryKey: ['albaranes'],
    queryFn: () => base44.entities.Albaran.list('-created_date'),
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['facturas'],
    queryFn: () => base44.entities.Factura.list('-created_date'),
  });

  const totalFacturado = facturas
    .filter(f => f.status === 'pagada')
    .reduce((sum, f) => sum + (f.total || 0), 0);

  const presupuestosPendientes = presupuestos.filter(p => p.status === 'enviado').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Administración y Facturación</h1>
          <Button
            onClick={() => navigate(createPageUrl('HomeTecnico'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Mantenimiento
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{presupuestos.length}</p>
                <p className="text-sm text-slate-400">Presupuestos</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{albaranes.length}</p>
                <p className="text-sm text-slate-400">Albaranes</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{facturas.length}</p>
                <p className="text-sm text-slate-400">Facturas</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalFacturado.toFixed(0)}€</p>
                <p className="text-sm text-slate-400">Facturado</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Módulos principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Link to={createPageUrl('Presupuestos')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Presupuestos</h3>
                  <p className="text-slate-400 text-sm mt-1">{presupuestosPendientes} pendientes</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl('Albaranes')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Albaranes</h3>
                  <p className="text-slate-400 text-sm mt-1">Servicios realizados</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl('Facturas')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCheck className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Facturas</h3>
                  <p className="text-slate-400 text-sm mt-1">Emisión y gestión</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to={createPageUrl('Catalogo')}>
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-8 w-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Catálogo</h3>
                  <p className="text-slate-400 text-sm mt-1">Productos y tarifas</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Info VeriFacTu */}
        <Card className="p-6 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <FileCheck className="h-6 w-6 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Compatible con VeriFacTu</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Sistema preparado para cumplir con VeriFacTu de la AEAT. Las facturas incluyen 
                hash de verificación y se pueden enviar al sistema de la Agencia Tributaria para 
                garantizar su autenticidad y cumplimiento normativo.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}