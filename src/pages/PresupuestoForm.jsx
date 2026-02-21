import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, Plus, Trash2, Search, FileDown } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PresupuestoForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const presupuestoId = urlParams.get('id');
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [searchCatalogo, setSearchCatalogo] = useState('');

  const [formData, setFormData] = useState({
    numero: '',
    client_id: '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_validez: '',
    lineas: [],
    observaciones: '',
    status: 'borrador',
    iva: 21,
  });

  const { data: docConfig } = useQuery({
    queryKey: ['doc-config-presupuesto'],
    queryFn: async () => {
      const configs = await base44.entities.DocumentConfig.filter({ doc_type: 'presupuesto' });
      return configs[0] || null;
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ['catalogo'],
    queryFn: () => base44.entities.CatalogoProducto.filter({ activo: true }),
  });

  useEffect(() => {
    if (presupuestoId) {
      base44.entities.Presupuesto.filter({ id: presupuestoId }).then(data => {
        if (data[0]) setFormData(data[0]);
      });
    } else {
      base44.entities.Presupuesto.list().then(all => {
        const nextNum = `PRES-${new Date().getFullYear()}-${String(all.length + 1).padStart(4, '0')}`;
        setFormData(prev => ({ ...prev, numero: nextNum }));
      });
    }
  }, [presupuestoId]);

  const calculateTotals = () => {
    const subtotal = formData.lineas.reduce((sum, linea) => {
      const lineTotal = (linea.cantidad * linea.precio_unitario) * (1 - (linea.descuento || 0) / 100);
      return sum + lineTotal;
    }, 0);
    const total = subtotal * (1 + formData.iva / 100);
    return { subtotal, total };
  };

  const addLinea = () => {
    setFormData(prev => ({
      ...prev,
      lineas: [...prev.lineas, { concepto: '', cantidad: 1, precio_unitario: 0, descuento: 0 }]
    }));
  };

  const addFromCatalogo = (producto) => {
    setFormData(prev => ({
      ...prev,
      lineas: [...prev.lineas, {
        concepto: `${producto.descripcion} (${producto.codigo})`,
        cantidad: 1,
        precio_unitario: producto.pvp,
        descuento: 0
      }]
    }));
    setShowCatalogo(false);
    toast.success('Producto añadido');
  };

  const removeLinea = (index) => {
    setFormData(prev => ({
      ...prev,
      lineas: prev.lineas.filter((_, i) => i !== index)
    }));
  };

  const updateLinea = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineas: prev.lineas.map((linea, i) => 
        i === index ? { ...linea, [field]: value } : linea
      )
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { subtotal, total } = calculateTotals();
      const saveData = { ...data, subtotal, total };
      
      if (presupuestoId) {
        return base44.entities.Presupuesto.update(presupuestoId, saveData);
      }
      return base44.entities.Presupuesto.create(saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto guardado');
      navigate(createPageUrl('Presupuestos'));
    },
  });

  const handleExportPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF();
      const client = clients.find(c => c.id === formData.client_id);
      
      pdf.setFontSize(20);
      pdf.text('PRESUPUESTO', 105, 20, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(formData.numero, 105, 28, { align: 'center' });
      
      let y = 50;
      pdf.setFontSize(11);
      pdf.text(`Cliente: ${client?.name}`, 20, y);
      y += 7;
      pdf.text(`Fecha: ${format(new Date(formData.fecha), 'dd/MM/yyyy')}`, 20, y);
      y += 15;

      formData.lineas.forEach((linea, i) => {
        const lineTotal = linea.cantidad * linea.precio_unitario * (1 - (linea.descuento || 0) / 100);
        pdf.text(linea.concepto, 20, y);
        pdf.text(`${linea.cantidad} x ${linea.precio_unitario}€`, 120, y);
        pdf.text(`${lineTotal.toFixed(2)}€`, 180, y);
        y += 7;
      });

      const { subtotal, total } = calculateTotals();
      y += 10;
      pdf.text(`Subtotal: ${subtotal.toFixed(2)}€`, 140, y);
      y += 7;
      pdf.text(`IVA (${formData.iva}%): ${(subtotal * formData.iva / 100).toFixed(2)}€`, 140, y);
      y += 7;
      pdf.setFontSize(13);
      pdf.text(`TOTAL: ${total.toFixed(2)}€`, 140, y);

      pdf.save(`presupuesto-${formData.numero}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al generar PDF');
    }
  };

  const { subtotal, total } = calculateTotals();
  const catalogoFiltered = catalogo.filter(p => 
    !searchCatalogo || 
    p.descripcion?.toLowerCase().includes(searchCatalogo.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchCatalogo.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={presupuestoId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} />

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-slate-300">Número Presupuesto</Label>
              <div className="flex gap-2">
                <Input
                  value={docConfig?.prefijo_numeracion || 'PRES-'}
                  disabled
                  className="bg-white/5 border-white/20 text-slate-400 w-24"
                />
                <Input
                  type="number"
                  value={formData.numero}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                  placeholder={docConfig?.siguiente_numero || '1'}
                  className="bg-white/5 border-white/20 text-white flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({...formData, client_id: v})}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
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
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="aceptado">Aceptado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Líneas</h3>
            <div className="flex gap-2">
              <Button onClick={() => setShowCatalogo(true)} variant="outline" className="border-white/20 text-white">
                <Search className="h-4 w-4 mr-2" />
                Catálogo
              </Button>
              <Button onClick={addLinea} className="bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Añadir
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {formData.lineas.map((linea, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-white/5">
                <div className="col-span-5">
                  <Label className="text-slate-300 text-xs">Concepto</Label>
                  <Input
                    value={linea.concepto}
                    onChange={(e) => updateLinea(index, 'concepto', e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-300 text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    value={linea.cantidad}
                    onChange={(e) => updateLinea(index, 'cantidad', Number(e.target.value))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-300 text-xs">Precio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={linea.precio_unitario}
                    onChange={(e) => updateLinea(index, 'precio_unitario', Number(e.target.value))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-300 text-xs">Dto %</Label>
                  <Input
                    type="number"
                    value={linea.descuento || 0}
                    onChange={(e) => updateLinea(index, 'descuento', Number(e.target.value))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLinea(index)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {formData.lineas.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No hay líneas. Añade productos desde el catálogo o manualmente.
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>{subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>IVA ({formData.iva}%):</span>
                <span>{(subtotal * formData.iva / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-white text-xl font-bold pt-2 border-t border-white/20">
                <span>TOTAL:</span>
                <span>{total.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-slate-300">Observaciones</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              className="bg-white/5 border-white/20 text-white"
              rows={3}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-white/20 text-white">
            Cancelar
          </Button>
          {presupuestoId && (
            <Button onClick={handleExportPDF} variant="outline" className="border-white/20 text-white">
              <FileDown className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          )}
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.client_id || formData.lineas.length === 0 || saveMutation.isPending}
            className="bg-blue-600"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Guardar</>
            )}
          </Button>
        </div>

        <Dialog open={showCatalogo} onOpenChange={setShowCatalogo}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-white">Seleccionar del Catálogo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Buscar producto..."
                value={searchCatalogo}
                onChange={(e) => setSearchCatalogo(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {catalogoFiltered.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => addFromCatalogo(prod)}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{prod.descripcion}</p>
                        <p className="text-slate-400 text-xs">{prod.codigo} • {prod.fabricante}</p>
                      </div>
                      <p className="text-white font-bold">{prod.pvp}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}