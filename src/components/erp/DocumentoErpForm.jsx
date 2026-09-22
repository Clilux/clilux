import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import LineasEditor from '@/components/erp/LineasEditor';
import { DOCS, ESTADOS, FORMAS_PAGO, IVA_DEFECTO, calcTotales } from '@/lib/erp-config';

const hoy = () => new Date().toISOString().slice(0, 10);

const inicial = (tipo, numero) => ({
  numero,
  fecha: hoy(),
  fecha_validez: '',
  fecha_entrega: '',
  num_factura: '',
  forma_pago: 'transferencia',
  estado: tipo === 'compra' ? 'pendiente' : 'borrador',
  iva: IVA_DEFECTO,
  notas: '',
  lineas: [],
  _partyId: '',
});

/** Formulario de alta/edición de presupuestos, pedidos y compras. */
export default function DocumentoErpForm({ tipo, open, onClose, registro, numero, clients = [], proveedores = [], onSave }) {
  const cfg = DOCS[tipo];
  const esPresupuesto = tipo === 'presupuesto';
  const [form, setForm] = useState(inicial(tipo, numero));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (registro) {
      setForm({
        ...inicial(tipo, registro.numero || numero),
        ...registro,
        estado: registro.estado || registro.status || (tipo === 'compra' ? 'pendiente' : 'borrador'),
        iva: registro.iva ?? IVA_DEFECTO,
        lineas: registro.lineas || [],
        _partyId: esPresupuesto ? registro.client_id : registro.proveedor_id,
      });
    } else {
      setForm(inicial(tipo, numero));
    }
  }, [open, registro, tipo, numero, esPresupuesto]);

  const partido = esPresupuesto
    ? clients.find(c => c.id === form._partyId)
    : proveedores.find(p => p.id === form._partyId);
  const partidoNombre = esPresupuesto
    ? (partido?.name || '')
    : (partido?.nombre || '');

  const lineasOk = form.lineas.some(l => (l.concepto || '').trim());
  const puedeGuardar = !!form._partyId && lineasOk;

  const guardar = async () => {
    setSaving(true);
    try {
      const t = calcTotales(form.lineas, form.iva);
      const base = {
        numero: form.numero,
        fecha: form.fecha,
        lineas: form.lineas.map(l => ({ ...l, cantidad: Number(l.cantidad) || 0, precio_unitario: Number(l.precio_unitario) || 0, descuento: Number(l.descuento) || 0, total: Math.round((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0) * (1 - (Number(l.descuento) || 0) / 100) * 100) / 100 })),
        subtotal: t.subtotal,
        iva: Number(form.iva) || 0,
        total: t.total,
      };

      const record = esPresupuesto
        ? {
            ...base,
            client_id: form._partyId,
            cliente_nombre: partidoNombre,
            fecha_validez: form.fecha_validez || null,
            status: form.estado,
            observaciones: form.notas,
          }
        : tipo === 'pedido'
        ? {
            ...base,
            proveedor_id: form._partyId,
            proveedor_nombre: partidoNombre,
            fecha_entrega: form.fecha_entrega || null,
            estado: form.estado,
            notas: form.notas,
          }
        : {
            ...base,
            proveedor_id: form._partyId,
            proveedor_nombre: partidoNombre,
            num_factura: form.num_factura,
            forma_pago: form.forma_pago,
            estado: form.estado,
            notas: form.notas,
          };

      await onSave(record, registro?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{registro ? `Editar ${cfg.label.toLowerCase()}` : `Nuevo ${cfg.label.toLowerCase()}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número</Label>
              <Input value={form.numero || ''} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha || ''} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>{esPresupuesto ? 'Cliente *' : 'Proveedor *'}</Label>
            <Select value={form._partyId || ''} onValueChange={v => setForm(p => ({ ...p, _partyId: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={esPresupuesto ? 'Seleccionar cliente...' : 'Seleccionar proveedor...'} />
              </SelectTrigger>
              <SelectContent>
                {(esPresupuesto ? clients : proveedores).map(p => (
                  <SelectItem key={p.id} value={p.id}>{esPresupuesto ? p.name : p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!esPresupuesto && proveedores.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Crea primero un proveedor en el módulo Proveedores.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm(p => ({ ...p, estado: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADOS[tipo]).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{esPresupuesto ? 'Válido hasta' : tipo === 'pedido' ? 'Entrega prevista' : 'Nº factura proveedor'}</Label>
              {tipo === 'compra' ? (
                <Input value={form.num_factura || ''} onChange={e => setForm(p => ({ ...p, num_factura: e.target.value }))} className="mt-1" />
              ) : (
                <Input
                  type="date"
                  value={(esPresupuesto ? form.fecha_validez : form.fecha_entrega) || ''}
                  onChange={e => setForm(p => ({ ...p, [esPresupuesto ? 'fecha_validez' : 'fecha_entrega']: e.target.value }))}
                  className="mt-1"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>IVA (%)</Label>
              <Input type="number" min="0" step="0.5" value={form.iva} onChange={e => setForm(p => ({ ...p, iva: e.target.value }))} className="mt-1" />
            </div>
            {tipo === 'compra' && (
              <div>
                <Label>Forma de pago</Label>
                <Select value={form.forma_pago} onValueChange={v => setForm(p => ({ ...p, forma_pago: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAS_PAGO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <LineasEditor lineas={form.lineas} onChange={l => setForm(p => ({ ...p, lineas: l }))} iva={form.iva} />

          <div>
            <Label>Notas</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none"
              value={form.notas || ''}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={!puedeGuardar || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {registro ? 'Guardar cambios' : `Crear ${cfg.label.toLowerCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}