import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Loader2, FileText, ShoppingCart, Receipt, Truck, ChevronRight, Boxes, Package } from 'lucide-react';
import ErpLayout from '@/components/erp/ErpLayout';
import { useErpData } from '@/hooks/useErpData';
import { euros } from '@/lib/erp-config';

const MODULOS = [
  { id: 'presupuestos', label: 'Presupuestos', ruta: '/ErpPresupuestos', icon: FileText, desc: 'Ofertas a clientes' },
  { id: 'pedidos', label: 'Pedidos', ruta: '/ErpPedidos', icon: ShoppingCart, desc: 'Compras a proveedores' },
  { id: 'compras', label: 'Compras', ruta: '/ErpCompras', icon: Receipt, desc: 'Facturas de proveedor' },
  { id: 'proveedores', label: 'Proveedores', ruta: '/ErpProveedores', icon: Truck, desc: 'Fichas y contactos' },
  { id: 'articulos', label: 'Artículos', ruta: '/ErpArticulos', icon: Package, desc: 'Catálogo y familias' },
];

export default function ErpHome() {
  const { erp, isLoading } = useErpData();

  const presupuestos = erp.presupuestos || [];
  const pedidos = erp.pedidos || [];
  const compras = erp.compras || [];
  const proveedores = erp.proveedores || [];

  const abiertos = (l, estados) => l.filter(d => estados.includes(d.estado || d.status));
  const suma = (l) => l.reduce((s, d) => s + (Number(d.total) || 0), 0);

  const presupuestosAbiertos = abiertos(presupuestos, ['borrador', 'enviado']);
  const pedidosPendientes = abiertos(pedidos, ['borrador', 'enviado', 'recibido_parcial']);
  const comprasPendientes = abiertos(compras, ['pendiente']);

  const resumen = [
    { label: 'Presupuestos abiertos', valor: presupuestosAbiertos.length, importe: suma(presupuestosAbiertos), color: 'text-blue-700', bg: 'bg-blue-100' },
    { label: 'Pedidos en curso', valor: pedidosPendientes.length, importe: suma(pedidosPendientes), color: 'text-indigo-700', bg: 'bg-indigo-100' },
    { label: 'Compras por pagar', valor: comprasPendientes.length, importe: suma(comprasPendientes), color: 'text-amber-700', bg: 'bg-amber-100' },
    { label: 'Proveedores', valor: proveedores.length, importe: null, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    { label: 'Artículos en catálogo', valor: (erp.articulos || []).length, importe: null, color: 'text-violet-700', bg: 'bg-violet-100' },
  ];

  const conteo = {
    presupuestos: presupuestos.length,
    pedidos: pedidos.length,
    compras: compras.length,
    proveedores: proveedores.length,
    articulos: (erp.articulos || []).length,
  };

  return (
    <ErpLayout active="inicio">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Boxes className="h-5 w-5 md:h-7 md:w-7 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-800">Gestión comercial</h1>
          <p className="text-xs md:text-base text-slate-400">Presupuestos, pedidos, compras y proveedores</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {resumen.map(r => (
              <Card key={r.label} className="p-4 border-0 shadow-sm">
                <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl ${r.bg} flex items-center justify-center mb-2`}>
                  <span className={`text-sm md:text-lg font-bold ${r.color}`}>{r.valor}</span>
                </div>
                <p className="text-xs md:text-base text-slate-500">{r.label}</p>
                {r.importe !== null && <p className="text-sm md:text-xl font-semibold text-slate-800 mt-1">{euros(r.importe)}</p>}
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {MODULOS.map(({ id, label, ruta, icon: Icon, desc }) => (
              <Link key={id} to={ruta}>
                <Card className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-indigo-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 md:text-xl">{label}</p>
                        <p className="text-xs md:text-base text-slate-400 truncate">{desc} · {conteo[id]} registros</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </ErpLayout>
  );
}