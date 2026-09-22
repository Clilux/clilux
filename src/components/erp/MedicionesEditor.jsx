import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';
import { medicionTotal, redondear } from '@/lib/presto-arbol';

export const lineaVacia = () => ({ etiqueta: '', unidades: 1, longitud: 1, ancho: 1, alto: 1 });

/** Líneas de medición de una partida: etiqueta, unidades, longitud, ancho y alto. */
export default function MedicionesEditor({ mediciones = [], onChange }) {
  const set = (i, campo, valor) => onChange(mediciones.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)));
  const total = redondear(mediciones.reduce((s, m) => s + medicionTotal(m), 0));

  const campos = [
    { campo: 'unidades', label: 'Unidades' },
    { campo: 'longitud', label: 'Longitud' },
    { campo: 'ancho', label: 'Ancho' },
    { campo: 'alto', label: 'Alto' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Líneas de medición</p>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => onChange([...mediciones, lineaVacia()])}>
          <Plus className="h-3.5 w-3.5" />Añadir línea
        </Button>
      </div>

      {mediciones.length === 0 && (
        <p className="text-xs text-slate-400">
          Sin líneas de medición: la cantidad de la partida será 1. Añade líneas para medir por dimensiones.
        </p>
      )}

      {mediciones.map((m, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-2">
          <div className="flex gap-2">
            <Input
              value={m.etiqueta || ''}
              onChange={e => set(i, 'etiqueta', e.target.value)}
              placeholder="Etiqueta / comentario (ej. Fachada Norte)"
              className="h-9 text-sm"
            />
            <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-slate-400 hover:text-red-500" onClick={() => onChange(mediciones.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {campos.map(({ campo, label }) => (
              <div key={campo}>
                <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
                <Input
                  type="number"
                  step="0.01"
                  value={m[campo] ?? ''}
                  onChange={e => set(i, campo, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Total</p>
              <p className="h-8 flex items-center text-sm font-medium text-slate-700">{medicionTotal(m)}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end text-sm">
        <span className="text-slate-500">
          Cantidad de la partida (Σ unidades × longitud × ancho × alto):{' '}
          <strong className="text-indigo-700">{mediciones.length ? total : 1}</strong>
        </span>
      </div>
    </div>
  );
}