import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  aceptado: { label: 'Aceptado', color: 'bg-green-100 text-green-700' },
  rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
};

export default function Presupuestos() {
  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: () => base44.entities.Presupuesto.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Presupuestos" />

        <div className="flex justify-end mb-6">
          <Link to={createPageUrl('PresupuestoForm')}>
            <Button className="bg-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Presupuesto
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {presupuestos.map(pres => (
            <Link key={pres.id} to={createPageUrl(`PresupuestoForm?id=${pres.id}`)}>
              <Card className="p-5 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{pres.numero || `PRES-${pres.id?.substring(0, 8)}`}</h3>
                        <Badge className={statusConfig[pres.status]?.color}>
                          {statusConfig[pres.status]?.label}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">
                        {getClientName(pres.client_id)} • {format(new Date(pres.fecha), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{pres.total?.toFixed(2) || '0.00'}€</p>
                    <p className="text-slate-400 text-xs">IVA incluido</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {presupuestos.length === 0 && (
            <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <FileText className="h-16 w-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-4">No hay presupuestos</p>
              <Link to={createPageUrl('PresupuestoForm')}>
                <Button className="bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Presupuesto
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}