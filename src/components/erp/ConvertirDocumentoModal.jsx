import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useErpData } from '@/hooks/useErpData';
import { CONVERSIONES, TIPOS_DOC, normalizar, payloadDestino, siguienteNumeroDoc } from '@/lib/documentos-erp';
import { calcTotales, euros } from '@/lib/erp-config';

/** Crea un documento a partir de otro (albarán ↔ presupuesto, pedido ↔ compra). */
export default function ConvertirDocumentoModal({ open, onClose, origenTipo, origen, onConvertido }) {
  const { erp, saveDocumento, effectiveEmail, myTechRecord } = useErpData();
  const [destino, setDestino] = useState('');
  const [creando, setCreando] = useState(false);

  const opciones = CONVERSIONES[origenTipo] || [];

  useEffect(() => {
    if (open) setDestino((CONVERSIONES[origenTipo] || [])[0] || '');
  }, [open, origenTipo]);

  const o = normalizar(origen, origenTipo);
  const cfg = TIPOS_DOC[destino];
  const numero = cfg ? siguienteNumeroDoc(destino, erp[cfg.lista] || []) : '';
  const total = cfg ? calcTotales(o.lineas, o.iva).total : 0;

  const crear = async () => {
    if (!cfg) return;
    setCreando(true);
    try {
      const payload = payloadDestino(origenTipo, origen, destino, numero, {
        tecnicoEmail: effectiveEmail,
        tecnicoNombre: myTechRecord?.name || '',
      });
      await saveDocumento(destino, payload);
      toast.success(`${cfg.label} ${numero} creado desde ${TIPOS_DOC[origenTipo].label.toLowerCase()} ${o.numero}`);
      onConvertido?.(destino);
      onClose();
    } catch (e) {
      toast.error(e.message || 'No se pudo convertir el documento');
    } finally {
      setCreando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />Convertir documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Documento de origen</p>
            <p className="font-semibold text-slate-800">
              {TIPOS_DOC[origenTipo]?.label} {o.numero || '—'}
            </p>
            <p className="text-sm text-slate-500">
              {o.partyNombre || 'Sin ' + (TIPOS_DOC[origenTipo]?.parte || 'parte')} · {o.lineas.length} línea(s) · {euros(total || o.lineas.reduce((s, l) => s + l.total, 0))}
            </p>
          </div>

          {opciones.length === 0 ? (
            <p className="text-sm text-slate-500">Este documento no tiene conversiones disponibles.</p>
          ) : (
            <div className="space-y-2">
              {opciones.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDestino(t)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${destino === t ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">Crear {TIPOS_DOC[t].label.toLowerCase()}</p>
                      <p className="text-xs text-slate-500">
                        Nº {siguienteNumeroDoc(t, erp[TIPOS_DOC[t].lista] || [])} · mismas líneas y totales
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{TIPOS_DOC[t].plural}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            El documento creado queda enlazado al de origen ({TIPOS_DOC[origenTipo]?.label.toLowerCase()} {o.numero || '—'}), para poder
            encadenar presupuesto, albarán y factura.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={crear}
              disabled={!cfg || creando}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Crear {cfg ? cfg.label.toLowerCase() : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}