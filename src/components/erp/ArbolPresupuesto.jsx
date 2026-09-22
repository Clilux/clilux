import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, FileSpreadsheet, AlertTriangle, Info, FolderTree, FileText } from 'lucide-react';
import { toast } from 'sonner';
import NodoArbol from '@/components/erp/NodoArbol';
import NodoForm from '@/components/erp/NodoForm';
import { descargarBC3, parseBC3, presupuestoToBC3 } from '@/lib/bc3';
import { descargarPresupuestoExcel } from '@/lib/presupuesto-excel';
import {
  actualizarNodo,
  eliminarNodo,
  esCapitulo,
  insertarNodo,
  moverNodo,
  nuevoNodo,
  partidasArbol,
  sanitizarCodigo,
  siguienteCodigo,
  totalArbol,
  validarArbol,
} from '@/lib/presto-arbol';
import { euros } from '@/lib/erp-config';

/** Editor del árbol de presupuesto (capítulos, subcapítulos y partidas) e intercambio con Presto. */
export default function ArbolPresupuesto({ arbol = [], onChange, iva = 21, cliente, meta = {}, empresa, onTitulo }) {
  const [editor, setEditor] = useState({ open: false, nodo: null, tipo: 'capitulo', padreId: null, codigo: '' });
  const fileRef = useRef(null);

  const avisos = validarArbol(arbol);
  const errores = avisos.filter(a => a.nivel === 'error');
  const base = totalArbol(arbol);
  const total = Math.round(base * (1 + (Number(iva) || 0) / 100) * 100) / 100;
  const partidas = partidasArbol(arbol).length;

  // Regla de oro de Presto: el primer nivel tampoco puede mezclar capítulos y partidas
  const raizPermite = (tipo) => {
    if (!arbol.length) return true;
    const hayCapitulos = esCapitulo(arbol[0]);
    return tipo === 'capitulo' ? hayCapitulos : !hayCapitulos;
  };

  const abrirNuevo = (padre, tipo) => {
    const codigo = siguienteCodigo(arbol, padre);
    setEditor({ open: true, nodo: null, tipo, padreId: padre?.id || null, codigo });
  };

  const guardarNodo = (datos) => {
    if (editor.nodo) {
      onChange(actualizarNodo(arbol, editor.nodo.id, datos));
      return;
    }
    onChange(insertarNodo(arbol, editor.padreId, { ...nuevoNodo(editor.tipo, sanitizarCodigo(datos.codigo)), ...datos }));
  };

  const borrar = (nodo) => {
    const hijos = (nodo.hijos || []).length;
    const mensaje = hijos
      ? `¿Eliminar «${nodo.resumen || nodo.codigo}» y los ${hijos} conceptos que contiene?`
      : `¿Eliminar «${nodo.resumen || nodo.codigo}»?`;
    if (!window.confirm(mensaje)) return;
    onChange(eliminarNodo(arbol, nodo.id));
  };

  const exportarBC3 = () => {
    const contenido = presupuestoToBC3({
      presupuesto: { ...meta, arbol, subtotal: base, iva: Number(iva) || 0, total },
      empresa,
    });
    descargarBC3(`Presupuesto_${(meta.numero || 'borrador').replace(/\s+/g, '_')}.bc3`, contenido);
    toast.success('Fichero BC3 generado — listo para abrir en Presto');
  };

  const exportarExcel = () => {
    descargarPresupuestoExcel({
      presupuesto: { ...meta, arbol, subtotal: base, iva: Number(iva) || 0, total },
      client: cliente,
      empresa,
    });
    toast.success('Excel generado con la jerarquía de capítulos y partidas');
  };

  const importarBC3 = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { arbol: nuevo, titulo, partidas: nPartidas } = parseBC3(await file.text());
      if (!nuevo.length) {
        toast.error('El fichero no contiene conceptos BC3 reconocibles');
        return;
      }
      onChange(nuevo);
      if (titulo) onTitulo?.(titulo);
      toast.success(`Importado de Presto: ${nuevo.length} capítulos y ${nPartidas} partidas`);
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el fichero BC3');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm md:text-base font-semibold text-slate-700">Estructura del presupuesto</p>
          <p className="text-xs text-slate-400">
            {arbol.length} capítulos · {partidas} partidas · jerarquía Presto (capítulos o partidas, nunca mezclados)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".bc3,text/plain" onChange={importarBC3} className="hidden" />
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />Importar BC3
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={exportarBC3} disabled={!arbol.length}>
            <Download className="h-3.5 w-3.5" />Exportar BC3
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={exportarExcel} disabled={!arbol.length}>
            <FileSpreadsheet className="h-3.5 w-3.5" />Exportar Excel
          </Button>
        </div>
      </div>

      {avisos.length > 0 && (
        <div className={`rounded-lg border p-3 text-xs space-y-1 ${errores.length ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          {avisos.slice(0, 6).map((a, i) => (
            <p key={i} className={`flex items-start gap-1.5 ${a.nivel === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
              {a.nivel === 'error' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
              {a.mensaje}
            </p>
          ))}
          {avisos.length > 6 && <p className="text-slate-500">y {avisos.length - 6} avisos más…</p>}
        </div>
      )}

      <div className="space-y-1">
        {arbol.map(n => (
          <NodoArbol
            key={n.id}
            nodo={n}
            onEditar={(nodo) => setEditor({ open: true, nodo, tipo: nodo.tipo, padreId: null, codigo: nodo.codigo })}
            onAnadirHijo={abrirNuevo}
            onEliminar={borrar}
            onMover={(id, dir) => onChange(moverNodo(arbol, id, dir))}
          />
        ))}
      </div>

      {arbol.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center space-y-3">
          <p className="text-sm text-slate-500">Empieza creando el primer capítulo, o importa un fichero BC3 existente.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" onClick={() => abrirNuevo(null, 'capitulo')}>
              <FolderTree className="h-3.5 w-3.5" />Nuevo capítulo
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => abrirNuevo(null, 'partida')}>
              <FileText className="h-3.5 w-3.5" />Nueva partida suelta
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {raizPermite('capitulo') && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => abrirNuevo(null, 'capitulo')}>
              <Plus className="h-3.5 w-3.5" />Capítulo
            </Button>
          )}
          {raizPermite('partida') && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => abrirNuevo(null, 'partida')}>
              <Plus className="h-3.5 w-3.5" />Partida
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end gap-6 pt-1 text-sm md:text-base">
        <span className="text-slate-500">Base imponible: <strong className="text-slate-800">{euros(base)}</strong></span>
        <span className="text-slate-500">IVA {iva} %: <strong className="text-slate-800">{euros(base * (Number(iva) || 0) / 100)}</strong></span>
        <span className="text-slate-500">Total: <strong className="text-indigo-700">{euros(total)}</strong></span>
      </div>

      <NodoForm
        open={editor.open}
        onClose={() => setEditor(e => ({ ...e, open: false }))}
        nodo={editor.nodo}
        tipo={editor.tipo}
        codigoSugerido={editor.codigo}
        onSave={guardarNodo}
      />
    </div>
  );
}