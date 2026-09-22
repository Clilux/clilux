import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import MedicionesEditor from '@/components/erp/MedicionesEditor';
import { TIPOS_NODO, sanitizarCodigo } from '@/lib/presto-arbol';
import { UNIDADES } from '@/lib/erp-config';

const inicial = (nodo, codigo) => ({
  codigo: nodo?.codigo ?? codigo ?? '',
  resumen: nodo?.resumen ?? '',
  texto: nodo?.texto ?? '',
  unidad: nodo?.unidad || 'ud',
  precio: nodo?.precio ?? '',
  mediciones: nodo?.mediciones || [],
});

/** Alta/edición de un capítulo, subcapítulo o partida (estructura Presto). */
export default function NodoForm({ open, onClose, nodo, tipo, codigoSugerido, onSave }) {
  const tipoNodo = nodo?.tipo || tipo || 'partida';
  const esPartida = tipoNodo === 'partida';
  const [form, setForm] = useState(inicial(nodo, codigoSugerido));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setForm(inicial(nodo, codigoSugerido));
  }, [open, nodo, codigoSugerido]);

  const set = (campo, valor) => setForm(p => ({ ...p, [campo]: valor }));

  const guardar = async () => {
    setSaving(true);
    try {
      await onSave({
        codigo: sanitizarCodigo(form.codigo),
        resumen: form.resumen.trim(),
        texto: form.texto,
        unidad: esPartida ? form.unidad : '',
        precio: esPartida ? Number(form.precio) || 0 : 0,
        mediciones: esPartida ? form.mediciones : [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {nodo ? `Editar ${TIPOS_NODO[tipoNodo].toLowerCase()}` : `Nuevo ${TIPOS_NODO[tipoNodo].toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={e => set('codigo', e.target.value)} className="mt-1 font-mono" placeholder="01.01.03" />
              <p className="text-[11px] text-slate-400 mt-1">Sin espacios ni acentos (FIEBDC-3).</p>
            </div>
            <div className="col-span-2">
              <Label>Resumen *</Label>
              <Input value={form.resumen} onChange={e => set('resumen', e.target.value)} className="mt-1" placeholder={esPartida ? 'Ej. Suministro y montaje de split' : 'Ej. Climatización'} />
            </div>
          </div>

          {esPartida && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Unidad de medida *</Label>
                <Select value={form.unidad} onValueChange={v => set('unidad', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Precio unitario (€) *</Label>
                <Input type="number" min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          <div>
            <Label>Texto / Pliego de condiciones</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              value={form.texto}
              onChange={e => set('texto', e.target.value)}
              placeholder="Descripción larga del concepto (opcional, registro ~T de Presto)."
            />
          </div>

          {esPartida && <MedicionesEditor mediciones={form.mediciones} onChange={m => set('mediciones', m)} />}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={guardar}
              disabled={!form.codigo.trim() || !form.resumen.trim() || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {nodo ? 'Guardar' : 'Añadir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}