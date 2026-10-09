import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Wrench, Cpu } from 'lucide-react';
import { setModo, MODOS } from '@/lib/modo';

/**
 * Botón para saltar entre los modos Servicios, ERP y Automatización.
 * `destino` es el modo al que se quiere ir.
 */
const ESTILOS = {
  erp: { Icon: Briefcase, activo: 'bg-indigo-500 hover:bg-indigo-400 text-white ring-1 ring-white/30', inactivo: 'bg-white text-indigo-700 hover:bg-indigo-50' },
  automatizacion: { Icon: Cpu, activo: 'bg-emerald-500 hover:bg-emerald-400 text-white ring-1 ring-white/30', inactivo: 'bg-white text-emerald-700 hover:bg-emerald-50' },
  servicios: { Icon: Wrench, activo: 'bg-white/20 text-white ring-1 ring-white/30', inactivo: 'bg-white text-slate-700 hover:bg-slate-50' },
};

export default function ModoSwitchButton({ destino = 'erp', className = '' }) {
  const navigate = useNavigate();
  const cfg = MODOS[destino] || MODOS.erp;
  const est = ESTILOS[destino] || ESTILOS.erp;
  const Icon = est.Icon;
  const volver = destino === 'servicios';

  const cambiar = () => {
    setModo(destino);
    navigate(cfg.ruta);
  };

  return (
    <button
      onClick={cambiar}
      title={`Cambiar al modo ${cfg.label}`}
      className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-sm md:text-base font-semibold shadow-sm transition-colors shrink-0 ${
        volver ? est.activo : est.inactivo
      } ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{cfg.label}</span>
    </button>
  );
}