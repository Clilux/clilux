import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, LayoutDashboard, FileText, ShoppingCart, Receipt, Truck } from 'lucide-react';
import ModoSwitchButton from '@/components/modo/ModoSwitchButton';

const NAV = [
  { id: 'inicio', label: 'Inicio', ruta: '/Erp', icon: LayoutDashboard },
  { id: 'presupuestos', label: 'Presupuestos', ruta: '/ErpPresupuestos', icon: FileText },
  { id: 'pedidos', label: 'Pedidos', ruta: '/ErpPedidos', icon: ShoppingCart },
  { id: 'compras', label: 'Compras', ruta: '/ErpCompras', icon: Receipt },
  { id: 'proveedores', label: 'Proveedores', ruta: '/ErpProveedores', icon: Truck },
];

export default function ErpLayout({ active, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Cabecera del módulo */}
      <div className="bg-gradient-to-r from-indigo-800 to-violet-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold leading-tight">ERP</p>
              <p className="text-indigo-200 text-xs truncate">Presupuestos · Pedidos · Compras</p>
            </div>
          </div>
          <ModoSwitchButton destino="servicios" />
        </div>

        {/* Navegación */}
        <div className="max-w-6xl mx-auto px-2 md:px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {NAV.map(({ id, label, ruta, icon: Icon }) => {
            const activo = id === active;
            return (
              <Link
                key={id}
                to={ruta}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activo ? 'border-white text-white' : 'border-transparent text-indigo-200 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">{children}</div>
    </div>
  );
}