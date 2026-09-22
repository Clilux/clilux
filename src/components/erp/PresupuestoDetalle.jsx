import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Send, FileCode2, FileSpreadsheet, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { descargarPresupuestoPDF } from '@/lib/presupuesto-pdf';
import { descargarBC3, presupuestoToBC3 } from '@/lib/bc3';
import { descargarPresupuestoExcel } from '@/lib/presupuesto-excel';
import { enviarPresupuesto } from '@/lib/presupuesto-envio';
import { aplanarArbol, arbolDe, cantidadPartida, esCapitulo, importeNodo, medicionTotal } from '@/lib/presto-arbol';
import { euros } from '@/lib/erp-config';

const fecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-ES'); } catch { return f; }
};

const dimensiones = (m) =>
  [m.unidades, m.longitud, m.ancho, m.alto].map(v => (v === '' || v === undefined ? 1 : v)).join(' × ');

/** Visualización de un presupuesto con acciones de descarga, envío y exportación a Presto. */
export default function PresupuestoDetalle({ open, onClose, presupuesto, client, empresa, sessionTechEmail, onEdit, onSent }) {
  const [enviando, setEnviando] = useState(false);
  const p = presupuesto || {};
  const arbol = arbolDe(p);
  const filas = aplanarArbol(arbol);
  const subtotal = Number(p.subtotal) || 0;
  const ivaPct = Number(p.iva) || 0;

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await enviarPresupuesto({ presupuesto: p, client, empresa, sessionTechEmail });
      toast.success(`Presupuesto enviado a ${res.to}`);
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e.message || 'No se pudo enviar el presupuesto');
    } finally {
      setEnviando(false);
    }
  };

  const exportarBC3 = () => {
    descargarBC3(
      `${(p.numero || 'presupuesto').replace(/\s+/g, '_')}.bc3`,
      presupuestoToBC3({ presupuesto: p, empresa }),
    );
    toast.success('Fichero BC3 generado — compatible con Presto');
  };

  const exportarExcel = () => {
    descargarPresupuestoExcel({ presupuesto: p, client, empresa });
    toast.success('Excel generado con la jerarquía de capítulos y partidas');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Presupuesto {p.numero || ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 grid md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="font-medium text-slate-800">{client?.name || p.cliente_nombre || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha</p>
              <p className="font-medium text-slate-800">{fecha(p.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Título</p>
              <p className="font-medium text-slate-800">{p.titulo || '—'}</p>
            </div>
            {p.fecha_validez && (
              <div>
                <p className="text-xs text-slate-500">Válido hasta</p>
                <p className="font-medium text-slate-800">{fecha(p.fecha_validez)}</p>
              </div>
            )}
            {p.enviado_a && (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Último envío</p>
                <p className="font-medium text-slate-800">{p.enviado_a} · {fecha(p.fecha_envio)}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <span className="col-span-6">Concepto</span>
              <span className="col-span-1 text-right">Ud</span>
              <span className="col-span-1 text-right">Cant.</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-2 text-right">Importe</span>
            </div>

            {filas.length === 0 ? (
              <p className="text-slate-500 p-4 text-sm">Este presupuesto no tiene conceptos.</p>
            ) : filas.map(({ nodo, profundidad }) => (
              <div key={nodo.id} className="border-t border-slate-100">
                <div className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-2 text-sm md:text-base ${esCapitulo(nodo) ? 'bg-slate-50 font-semibold text-slate-800' : ''}`}>
                  <span className="col-span-2 md:col-span-6" style={{ paddingLeft: `${profundidad * 14}px` }}>
                    <span className="font-mono text-xs text-slate-400 mr-2">{nodo.codigo}</span>
                    {nodo.resumen || 'Sin resumen'}
                  </span>
                  <span className="md:col-span-1 md:text-right text-slate-500">{nodo.tipo === 'partida' ? nodo.unidad || 'ud' : ''}</span>
                  <span className="md:col-span-1 md:text-right text-slate-600">{nodo.tipo === 'partida' ? cantidadPartida(nodo) : ''}</span>
                  <span className="md:col-span-2 md:text-right text-slate-600">{nodo.tipo === 'partida' ? euros(nodo.precio) : ''}</span>
                  <span className={`md:col-span-2 md:text-right font-medium ${esCapitulo(nodo) ? 'text-indigo-700' : 'text-slate-800'}`}>{euros(importeNodo(nodo))}</span>
                </div>
                {nodo.tipo === 'partida' && (nodo.mediciones || []).map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 pb-1 text-[11px] text-slate-400">
                    <span className="col-span-8 md:col-span-6" style={{ paddingLeft: `${(profundidad + 1) * 14}px` }}>
                      {m.etiqueta || 'Medición'}
                    </span>
                    <span className="col-span-4 md:col-span-4 md:text-right">{dimensiones(m)}</span>
                    <span className="hidden md:block md:col-span-2 md:text-right">{medicionTotal(m)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-1 text-sm md:text-base">
              <div className="flex justify-between text-slate-500"><span>Base imponible</span><span>{euros(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>IVA {ivaPct} %</span><span>{euros(subtotal * ivaPct / 100)}</span></div>
              <div className="flex justify-between text-lg font-bold text-indigo-700 border-t border-slate-200 pt-1">
                <span>Total</span><span>{euros(p.total)}</span>
              </div>
            </div>
          </div>

          {p.observaciones && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Observaciones</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.observaciones}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" className="gap-2" onClick={exportarBC3}>
              <FileCode2 className="h-4 w-4" />Exportar BC3 (Presto)
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportarExcel}>
              <FileSpreadsheet className="h-4 w-4" />Exportar Excel
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => descargarPresupuestoPDF({ presupuesto: p, client, empresa })}>
              <Download className="h-4 w-4" />Descargar PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => { onClose(); onEdit?.(p); }}>
              <Pencil className="h-4 w-4" />Editar
            </Button>
            <Button onClick={enviar} disabled={enviando} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar al cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}