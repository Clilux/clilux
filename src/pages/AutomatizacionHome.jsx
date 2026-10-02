import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2, Cpu, Zap, Wind, MonitorSmartphone, ChevronRight } from 'lucide-react';
import AutomatizacionLayout from '@/components/automatizacion/AutomatizacionLayout';
import { useAutomatizacion } from '@/hooks/useAutomatizacion';

const BLOQUES = [
  { id: 'loxone', label: 'Loxone', ruta: '/AutomatizacionLoxone', icon: Zap, desc: 'Miniservers y controles de domótica', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  { id: 'airzone', label: 'Airzone', ruta: '/AutomatizacionAirzone', icon: Wind, desc: 'Climatización y confort por zonas', bg: 'bg-cyan-100', color: 'text-cyan-700' },
  { id: 'scada', label: 'SCADA', ruta: '/AutomatizacionScada', icon: MonitorSmartphone, desc: 'Paneles con imagen propia y elementos', bg: 'bg-violet-100', color: 'text-violet-700' },
];

export default function AutomatizacionHome() {
  const { scadas, isLoading } = useAutomatizacion();
  const totalElementos = scadas.reduce((s, p) => s + (p.elementos || []).length, 0);

  return (
    <AutomatizacionLayout active="inicio">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Cpu className="h-5 w-5 md:h-7 md:w-7 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-800">Automatización</h1>
          <p className="text-xs md:text-base text-slate-400">Control de instalaciones, climatización y paneles SCADA</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-lg">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-400">Paneles SCADA</p>
          <p className="text-2xl font-bold text-slate-800">{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300" /> : scadas.length}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-400">Elementos colocados</p>
          <p className="text-2xl font-bold text-slate-800">{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300" /> : totalElementos}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {BLOQUES.map(({ id, label, ruta, icon: Icon, desc, bg, color }) => (
          <Link key={id} to={ruta}>
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {label}<ChevronRight className="h-4 w-4 text-slate-300" />
              </p>
              <p className="text-sm text-slate-500 mt-1">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </AutomatizacionLayout>
  );
}