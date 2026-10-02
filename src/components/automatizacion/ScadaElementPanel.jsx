import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { ICONOS, ICONOS_LISTA, COLORES, TIPOS_ELEMENTO } from '@/lib/scada';

const PAGINAS = [
  { value: 'ninguna', label: 'Sin acceso directo' },
  { value: 'ControlLoxone', label: 'Control Loxone' },
  { value: 'ControlClimatizacion', label: 'Control Airzone' },
  { value: 'AutomatizacionScada', label: 'Paneles SCADA' },
];

/** Propiedades del elemento seleccionado en el panel SCADA. */
export default function ScadaElementPanel({ elemento, onChange, onDelete }) {
  if (!elemento) {
    return <p className="text-sm text-slate-400 py-6 text-center">Selecciona un elemento del panel para personalizarlo.</p>;
  }

  const set = (k, v) => onChange({ ...elemento, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-600 mb-1">Etiqueta</Label>
        <Input value={elemento.etiqueta || ''} onChange={e => set('etiqueta', e.target.value)} />
      </div>

      <div>
        <Label className="text-slate-600 mb-1">Tipo</Label>
        <Select value={elemento.tipo} onValueChange={v => set('tipo', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS_ELEMENTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {elemento.tipo !== 'etiqueta' && (
        <div>
          <Label className="text-slate-600 mb-1">Icono</Label>
          <div className="grid grid-cols-8 gap-1">
            {ICONOS_LISTA.map(k => {
              const I = ICONOS[k];
              const activo = elemento.icono === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('icono', k)}
                  className={`h-8 flex items-center justify-center rounded-lg border ${activo ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  <I className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <Label className="text-slate-600 mb-1">Color</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={`w-8 h-8 rounded-full border-2 ${elemento.color === c ? 'border-emerald-500' : 'border-slate-200'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <Label className="text-slate-600 mb-1">Tamaño</Label>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => set('tamano', n)}
              className={`flex-1 h-9 rounded-lg border text-sm font-medium ${Number(elemento.tamano) === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              {n + 1}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-slate-600 mb-1">Acceso directo</Label>
        <Select value={elemento.pagina || 'ninguna'} onValueChange={v => set('pagina', v === 'ninguna' ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGINAS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" /> Eliminar elemento
      </Button>
    </div>
  );
}