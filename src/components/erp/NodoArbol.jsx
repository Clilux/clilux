import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FolderTree, FileText, Pencil, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { cantidadPartida, esCapitulo, importeNodo } from '@/lib/presto-arbol';
import { euros } from '@/lib/erp-config';

const tipoHijosPermitidos = (nodo) => {
  const hijos = nodo?.hijos || [];
  if (!hijos.length) return ['capitulo', 'partida'];
  return esCapitulo(hijos[0]) ? ['capitulo'] : ['partida'];
};

/** Fila del árbol de presupuesto, con sus hijos indentados. */
export default function NodoArbol({ nodo, profundidad = 0, onEditar, onAnadirHijo, onEliminar, onMover }) {
  const [abierto, setAbierto] = useState(true);
  const esPartida = nodo.tipo === 'partida';
  const hijos = nodo.hijos || [];
  const permitidos = esPartida ? [] : tipoHijosPermitidos(nodo);

  return (
    <div>
      <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${esPartida ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300'}`}>
        <div className="flex items-center gap-1 shrink-0" style={{ width: `${Math.min(profundidad, 6) * 14}px` }} />

        {esPartida ? (
          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <button type="button" onClick={() => setAbierto(a => !a)} className="shrink-0 text-slate-500 hover:text-indigo-700">
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {!esPartida && <FolderTree className="h-4 w-4 text-indigo-500 shrink-0" />}

        <div className="flex-1 min-w-0">
          <p className={`truncate ${esPartida ? 'text-sm font-medium text-slate-800' : 'text-sm md:text-base font-semibold text-slate-800'}`}>
            <span className="font-mono text-xs text-slate-400 mr-2">{nodo.codigo || '—'}</span>
            {nodo.resumen || 'Sin resumen'}
          </p>
          {nodo.texto && <p className="text-[11px] text-slate-400 truncate">{nodo.texto}</p>}
        </div>

        {esPartida && (
          <>
            <div className="hidden md:block w-16 text-right shrink-0">
              <p className="text-[11px] text-slate-400">Unidad</p>
              <p className="text-sm text-slate-600">{nodo.unidad || 'ud'}</p>
            </div>
            <div className="hidden md:block w-24 text-right shrink-0">
              <p className="text-[11px] text-slate-400">Cantidad</p>
              <p className="text-sm text-slate-600">
                {cantidadPartida(nodo)}
                {(nodo.mediciones || []).length > 0 && <span className="text-[10px] text-slate-400 ml-1">({nodo.mediciones.length} líneas)</span>}
              </p>
            </div>
            <div className="hidden md:block w-24 text-right shrink-0">
              <p className="text-[11px] text-slate-400">Precio</p>
              <p className="text-sm text-slate-600">{euros(nodo.precio)}</p>
            </div>
          </>
        )}

        <div className="w-28 text-right shrink-0">
          <p className="text-[11px] text-slate-400">{esPartida ? 'Importe' : 'Subtotal'}</p>
          <p className={`text-sm md:text-base font-semibold ${esPartida ? 'text-slate-800' : 'text-indigo-700'}`}>{euros(importeNodo(nodo))}</p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {permitidos.includes('capitulo') && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Añadir capítulo dentro" onClick={() => onAnadirHijo(nodo, 'capitulo')}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {permitidos.includes('partida') && (
            <Button size="sm" variant="ghost" className="h-8 px-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 gap-1" title="Añadir partida dentro" onClick={() => onAnadirHijo(nodo, 'partida')}>
              <Plus className="h-3.5 w-3.5" /><FileText className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" title="Subir" onClick={() => onMover(nodo.id, -1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" title="Bajar" onClick={() => onMover(nodo.id, 1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Editar" onClick={() => onEditar(nodo)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50" title="Eliminar" onClick={() => onEliminar(nodo)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!esPartida && abierto && hijos.length > 0 && (
        <div className="mt-1 ml-4 pl-2 border-l-2 border-slate-200 space-y-1">
          {hijos.map(h => (
            <NodoArbol
              key={h.id}
              nodo={h}
              profundidad={profundidad + 1}
              onEditar={onEditar}
              onAnadirHijo={onAnadirHijo}
              onEliminar={onEliminar}
              onMover={onMover}
            />
          ))}
        </div>
      )}
    </div>
  );
}