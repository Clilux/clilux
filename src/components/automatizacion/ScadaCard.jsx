import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone, Pencil, Building2, Layers } from 'lucide-react';
import ScadaCanvas from '@/components/automatizacion/ScadaCanvas';

/** Tarjeta de un panel SCADA en el listado. */
export default function ScadaCard({ scada, onOpen }) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden flex flex-col">
      <div className="p-3">
        <ScadaCanvas scada={scada} />
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <p className="font-semibold text-slate-800 flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate">{scada.nombre}</span>
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
          {scada.client_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{scada.client_name}</span>}
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{(scada.elementos || []).length} elementos</span>
        </div>
        {scada.descripcion && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{scada.descripcion}</p>}
        <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => onOpen(scada)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />Abrir panel
        </Button>
      </div>
    </Card>
  );
}