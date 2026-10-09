import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Gauge, AlertTriangle } from 'lucide-react';
import { calcularPsxV, requiereProyectoTecnico, MENSAJE_PROYECTO } from '@/lib/rep';

/**
 * Campos REP (Reglamento de Equipos a Presión, RD 809/2021) del formulario de equipo.
 */
export default function RepEquipmentFields({ data, onChange }) {
  const psxv = calcularPsxV(data.ps_presion_maxima, data.v_volumen);
  const excede = psxv !== null && requiereProyectoTecnico(psxv);

  return (
    <div className="mt-6 p-4 rounded-xl border-2 border-slate-300 bg-slate-50 space-y-4">
      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <Gauge className="h-4 w-4" /> Equipos a Presión — REP (RD 809/2021)
      </h4>

      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
        <Checkbox
          checked={!!data.es_equipo_presion}
          onCheckedChange={(v) => onChange('es_equipo_presion', !!v)} />
        <span className="text-xs text-slate-700">Este equipo está sujeto al Reglamento de Equipos a Presión</span>
      </label>

      {data.es_equipo_presion && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">PS — Presión máxima (bar)</Label>
              <Input
                type="number" step="0.01"
                value={data.ps_presion_maxima ?? ''}
                onChange={(e) => onChange('ps_presion_maxima', e.target.value)}
                className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">V — Volumen (litros)</Label>
              <Input
                type="number" step="1"
                value={data.v_volumen ?? ''}
                onChange={(e) => onChange('v_volumen', e.target.value)}
                className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">PS × V (calculado)</Label>
              <div className={`h-9 px-3 flex items-center rounded-md border text-sm font-semibold ${excede ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700'}`}>
                {psxv !== null ? psxv.toLocaleString('es-ES') : 'Introduce PS y V'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">Nº de Registro de Industria</Label>
              <Input
                value={data.numero_registro_industria || ''}
                onChange={(e) => onChange('numero_registro_industria', e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
                placeholder="Ej: 12-RI-3456" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">Última inspección Nivel A</Label>
              <Input
                type="date"
                value={data.fecha_ultima_inspeccion_a || ''}
                onChange={(e) => onChange('fecha_ultima_inspeccion_a', e.target.value)}
                className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">Última inspección Nivel B</Label>
              <Input
                type="date"
                value={data.fecha_ultima_inspeccion_b || ''}
                onChange={(e) => onChange('fecha_ultima_inspeccion_b', e.target.value)}
                className="bg-white border-gray-300 text-gray-900" />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-1 block text-xs">Última inspección Nivel C</Label>
              <Input
                type="date"
                value={data.fecha_ultima_inspeccion_c || ''}
                onChange={(e) => onChange('fecha_ultima_inspeccion_c', e.target.value)}
                className="bg-white border-gray-300 text-gray-900" />
            </div>
          </div>

          {excede && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-100 border border-amber-300 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span><strong>{MENSAJE_PROYECTO}.</strong> Este equipo, por sí solo, ya supera el umbral de 25.000.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}