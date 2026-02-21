import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function FacturaForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const facturaId = urlParams.get('id');
  
  const [formData, setFormData] = useState({
    client_id: '',
    fecha: new Date().toISOString().split('T')[0],
    numero: '',
    lineas: [],
    subtotal: 0,
    iva: 21,
    total: 0,
    forma_pago: 'transferencia',
    observaciones: '',
    status: 'emitida'
  });

  const { data: docConfig } = useQuery({
    queryKey: ['doc-config-factura'],
    queryFn: async () => {
      const configs = await base44.entities.DocumentConfig.filter({ doc_type: 'factura' });
      return configs[0] || null;
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: factura, isLoading } = useQuery({
    queryKey: ['factura', facturaId],
    queryFn: async () => {
      const items = await base44.entities.Factura.filter({ id: facturaId });
      const fac = items[0];
      if (fac) setFormData(fac);
      return fac;
    },
    enabled: !!facturaId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (facturaId) {
        await base44.entities.Factura.update(facturaId, data);
      } else {
        await base44.entities.Factura.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success(facturaId ? 'Factura actualizada' : 'Factura creada');
      navigate(createPageUrl('Facturas'));
    },
    onError: () => toast.error('Error al guardar la factura'),
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addLine = () => {
    const newLine = {
      concepto: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0,
      total: 0
    };
    setFormData(prev => ({
      ...prev,
      lineas: [...prev.lineas, newLine]
    }));
  };

  const removeLine = (index) => {
    setFormData(prev => ({
      ...prev,
      lineas: prev.lineas.filter((_, i) => i !== index)
    }));
    recalculate();
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lineas];
    newLines[index][field] = value;
    
    const cantidad = parseFloat(newLines[index].cantidad) || 0;
    const precioUnitario = parseFloat(newLines[index].precio_unitario) || 0;
    const descuento = parseFloat(newLines[index].descuento) || 0;
    
    newLines[index].total = cantidad * precioUnitario * (1 - descuento / 100);
    
    setFormData(prev => ({ ...prev, lineas: newLines }));
    recalculate(newLines);
  };

  const recalculate = (lines = formData.lineas) => {
    const subtotal = lines.reduce((sum, line) => sum + (parseFloat(line.total) || 0), 0);
    const ivaAmount = subtotal * (formData.iva / 100);
    const total = subtotal + ivaAmount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total
    }));
  };

  const handleSubmit = () => {
    if (!formData.client_id) {
      toast.error('Selecciona un cliente');
      return;
    }
    if (!formData.numero) {
      toast.error('Introduce un número de factura');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title={facturaId ? 'Editar Factura' : 'Nueva Factura'} />

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-slate-300">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(v) => handleChange('client_id', v)}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Número Factura *</Label>
              <div className="flex gap-2">
                <Input
                  value={docConfig?.prefijo_numeracion || 'FAC-'}
                  disabled
                  className="bg-white/5 border-white/20 text-slate-400 w-24"
                />
                <Input
                  type="number"
                  value={formData.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  placeholder={docConfig?.siguiente_numero || '1'}
                  className="bg-white/5 border-white/20 text-white flex-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Fecha *</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-slate-300">Forma de Pago</Label>
              <Select value={formData.forma_pago} onValueChange={(v) => handleChange('forma_pago', v)}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="financiado">Financiado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Estado</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {docConfig?.estados_disponibles?.length > 0 ? (
                    docConfig.estados_disponibles.map(estado => (
                      <SelectItem key={estado.codigo} value={estado.codigo}>
                        {estado.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="emitida">Emitida</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                      <SelectItem value="anulada">Anulada</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-slate-300">Líneas de la Factura</Label>
              <Button type="button" size="sm" onClick={addLine} variant="outline" className="bg-white/5 border-white/20 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Añadir línea
              </Button>
            </div>

            <div className="space-y-3">
              {formData.lineas.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 p-3 rounded-lg bg-white/5">
                  <div className="col-span-4">
                    <Input
                      placeholder="Concepto"
                      value={line.concepto}
                      onChange={(e) => updateLine(idx, 'concepto', e.target.value)}
                      className="bg-white/5 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Cant."
                      value={line.cantidad}
                      onChange={(e) => updateLine(idx, 'cantidad', e.target.value)}
                      className="bg-white/5 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      value={line.precio_unitario}
                      onChange={(e) => updateLine(idx, 'precio_unitario', e.target.value)}
                      className="bg-white/5 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Dto %"
                      value={line.descuento}
                      onChange={(e) => updateLine(idx, 'descuento', e.target.value)}
                      className="bg-white/5 border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <p className="text-white text-sm py-2">{line.total?.toFixed(2)}€</p>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLine(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-slate-300">Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-slate-300">Subtotal:</span>
                <span className="text-white font-medium">{formData.subtotal?.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-slate-300">IVA ({formData.iva}%):</span>
                <span className="text-white font-medium">{(formData.subtotal * formData.iva / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-purple-500/20 border border-purple-500/30">
                <span className="text-white font-semibold">Total:</span>
                <span className="text-white font-bold text-lg">{formData.total?.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-white/5 border-white/20 text-white">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-purple-600">
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Guardar</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}