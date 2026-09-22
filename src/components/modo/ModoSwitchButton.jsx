import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Wrench } from 'lucide-react';
import { setModo, MODOS } from '@/lib/modo';

/**
 * Botón para saltar entre los modos Servicios y ERP.
 * `destino` es el modo al que se quiere ir.
 */
export default function ModoSwitchButton({ destino = 'erp', className = '' }) {
  const navigate = useNavigate();
  const cfg = MODOS[destino] || MODOS.erp;
  const esErp = destino === 'erp';
  const Icon = esErp ? Briefcase : Wrench;

  const cambiar = () => {
    setModo(destino);
    navigate(cfg.ruta);
  };

  return (
    <button
      onClick={cambiar}
      title={`Cambiar al modo ${cfg.label}`}
      className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-sm md:text-base font-semibold shadow-sm transition-colors shrink-0 ${
        esErp
          ? 'bg-indigo-500 hover:bg-indigo-400 text-white ring-1 ring-white/30'
          : 'bg-white text-indigo-700 hover:bg-indigo-50'
      } ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">Modo {cfg.label}</span>
    </button>
  );
}