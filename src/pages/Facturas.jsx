import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileCheck } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  emitida: { label: 'Emitida', color: 'bg-blue-100 text-blue-700' },
  pagada: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  anulada: { label: 'Anulada', color: 'bg-slate-100 text-slate-700' },
};

export default function Facturas() {
  const { data: facturas = [] } = useQuery({
    queryKey: ['facturas'],
    queryFn: () => base44.entities.Factura.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Facturas" />

        <div className="flex justify-end mb-6">
          <Link to={createPageUrl('FacturaForm')}>
            <Button className="bg-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {facturas.map(fac => (
            <Link key={fac.id} to={createPageUrl(`FacturaForm?id=${fac.id}`)}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <FileCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{fac.numero}</h3>
                        <Badge className={statusConfig[fac.status]?.color}>
                          {statusConfig[fac.status]?.label}
                        </Badge>
                        {fac.verifactu_enviado && (
                          <Badge className="bg-green-100 text-green-700">✓ VeriFacTu</Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">
                        {getClientName(fac.client_id)} • {format(new Date(fac.fecha), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{fac.total?.toFixed(2) || '0.00'}€</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {facturas.length === 0 && (
            <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <FileCheck className="h-16 w-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No hay facturas</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}