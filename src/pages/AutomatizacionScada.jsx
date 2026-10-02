import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, MonitorSmartphone } from 'lucide-react';
import AutomatizacionLayout from '@/components/automatizacion/AutomatizacionLayout';
import ScadaCard from '@/components/automatizacion/ScadaCard';
import ScadaEditor from '@/components/automatizacion/ScadaEditor';
import { useAutomatizacion } from '@/hooks/useAutomatizacion';

export default function AutomatizacionScada() {
  const { scadas, clients, isLoading, saveScada, deleteScada } = useAutomatizacion();
  const [editing, setEditing] = useState(null); // null = listado | {} = nuevo | scada = editar

  return (
    <AutomatizacionLayout active="scada">
      {editing ? (
        <ScadaEditor
          scada={editing.id ? editing : null}
          clients={clients}
          onSave={saveScada}
          onDelete={deleteScada}
          onBack={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-violet-100 flex items-center justify-center">
                <MonitorSmartphone className="h-5 w-5 md:h-7 md:w-7 text-violet-700" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-slate-800">Paneles SCADA</h1>
                <p className="text-xs md:text-base text-slate-400">Crea paneles con tu propia imagen y personalízalos</p>
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-2" />Nuevo panel
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : scadas.length === 0 ? (
            <Card className="p-10 text-center border-0 shadow-sm">
              <MonitorSmartphone className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Todavía no hay paneles</p>
              <p className="text-sm text-slate-400 mt-1">Crea el primero: sube una imagen (plano, esquema o foto) y coloca encima los dispositivos.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
              {scadas.map(s => <ScadaCard key={s.id} scada={s} onOpen={setEditing} />)}
            </div>
          )}
        </>
      )}
    </AutomatizacionLayout>
  );
}