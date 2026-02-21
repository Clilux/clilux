import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  firmado: { label: 'Firmado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  facturado: { label: 'Facturado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export default function Albaranes() {
  const { data: albaranes = [] } = useQuery({
    queryKey: ['albaranes'],
    queryFn: () => base44.entities.Albaran.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Albaranes" />

        <div className="flex justify-end mb-6">
          <Link to={createPageUrl('AlbaranForm')}>
            <Button className="bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Albarán
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {albaranes.map(alb => (
            <Link key={alb.id} to={createPageUrl(`AlbaranForm?id=${alb.id}`)}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{alb.numero || `ALB-${alb.id?.substring(0, 8)}`}</h3>
                        <Badge className={`border ${statusConfig[alb.status]?.color}`}>
                          {statusConfig[alb.status]?.label}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">
                        {getClientName(alb.client_id)} • {format(new Date(alb.fecha), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{alb.total?.toFixed(2) || '0.00'}€</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {albaranes.length === 0 && (
            <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <Receipt className="h-16 w-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No hay albaranes</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}