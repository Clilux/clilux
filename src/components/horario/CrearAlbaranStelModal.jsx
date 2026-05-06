import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Search, FileText, Loader2, Plus, Trash2, ExternalLink, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CrearAlbaranStelModal({ registro, onClose, onCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [creating, setCreating] = useState(false);
  const [albaranCreado, setAlbaranCreado] = useState(null);
  const [titulo, setTitulo] = useState('');

  // Product search per line
  const [productSearch, setProductSearch] = useState({});
  const [productResults, setProductResults] = useState({});
  const [searchingProduct, setSearchingProduct] = useState({});
  const productSearchTimeout = useRef({});

  // Lines default: mano de obra con las horas del registro
  const horasEfectivas = registro.horas_efectivas || registro.horas_normales || 0;
  const horasExtra = registro.horas_extra || 0;

  const [lineas, setLineas] = useState([
    ...(horasEfectivas > 0 ? [{ concepto: 'Mano de obra', cantidad: horasEfectivas, precio: 0, taxId: null }] : []),
    ...(horasExtra > 0 ? [{ concepto: 'Mano de obra extra', cantidad: horasExtra, precio: 0, taxId: null }] : []),
  ].filter(Boolean).length > 0 ? [
    ...(horasEfectivas > 0 ? [{ concepto: 'Mano de obra', cantidad: horasEfectivas, precio: 0, taxId: null }] : []),
    ...(horasExtra > 0 ? [{ concepto: 'Mano de obra extra', cantidad: horasExtra, precio: 0, taxId: null }] : []),
  ] : [{ concepto: 'Mano de obra', cantidad: 1, precio: 0, taxId: null }]);

  const [notas, setNotas] = useState(
    [registro.notas, registro.technician_name && `Técnico: ${registro.technician_name}`].filter(Boolean).join(' | ')
  );

  useEffect(() => {
    // Load taxes
    base44.functions.invoke('stelProxy', { action: 'getTaxes', payload: {} })
      .then(r => setTaxes(r.data?.taxes || []))
      .catch(() => {});
  }, []);

  const searchClients = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await base44.functions.invoke('stelProxy', { action: 'searchClients', payload: { query: searchQuery } });
      setSearchResults(r.data?.clients || []);
    } catch (e) {
      toast.error('Error buscando clientes: ' + e.message);
    } finally {
      setSearching(false);
    }
  };

  const updateLinea = (i, field, value) => {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const removeLinea = (i) => setLineas(prev => prev.filter((_, idx) => idx !== i));

  const addLinea = () => setLineas(prev => [...prev, { concepto: '', cantidad: 1, precio: 0, taxId: null }]);

  const searchProducts = async (lineIndex, query) => {
    setProductSearch(prev => ({ ...prev, [lineIndex]: query }));
    if (!query.trim()) { setProductResults(prev => ({ ...prev, [lineIndex]: [] })); return; }
    clearTimeout(productSearchTimeout.current[lineIndex]);
    productSearchTimeout.current[lineIndex] = setTimeout(async () => {
      setSearchingProduct(prev => ({ ...prev, [lineIndex]: true }));
      try {
        const r = await base44.functions.invoke('stelProxy', { action: 'searchProducts', payload: { query } });
        setProductResults(prev => ({ ...prev, [lineIndex]: r.data?.products || [] }));
      } catch (_) {}
      finally { setSearchingProduct(prev => ({ ...prev, [lineIndex]: false })); }
    }, 400);
  };

  const selectProduct = (lineIndex, product) => {
    updateLinea(lineIndex, 'concepto', product.name);
    updateLinea(lineIndex, 'precio', product.price);
    if (product.taxId) updateLinea(lineIndex, 'taxId', product.taxId);
    setProductSearch(prev => ({ ...prev, [lineIndex]: '' }));
    setProductResults(prev => ({ ...prev, [lineIndex]: [] }));
  };

  const createAlbaran = async () => {
    if (!selectedClient) { toast.error('Selecciona un cliente'); return; }
    if (lineas.some(l => !l.concepto.trim())) { toast.error('Completa todos los conceptos'); return; }
    setCreating(true);
    try {
      const fecha = registro.fecha; // yyyy-MM-dd
      const r = await base44.functions.invoke('stelProxy', {
        action: 'createAlbaran',
        payload: {
          clientId: selectedClient.id,
          fecha,
          titulo,
          lineas,
          notas,
          technicianName: registro.technician_name,
        }
      });
      const alb = r.data?.albaran;
      setAlbaranCreado(alb);
      toast.success('Albarán creado en STEL Order');
      // Save the STEL albaran ID on the registro
      await base44.entities.RegistroHorario.update(registro.id, {
        notas: `${registro.notas || ''}${registro.notas ? ' | ' : ''}STEL Albarán #${alb?.number || alb?.id}`.trim()
      });
      onCreated?.(alb);
    } catch (e) {
      toast.error('Error creando albarán: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  if (albaranCreado) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <FileText className="h-5 w-5" /> Albarán creado
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-slate-700">
              Albarán #{albaranCreado.number || albaranCreado.id} creado en STEL Order
            </p>
            <p className="text-sm text-slate-500">Cliente: {selectedClient?.name}</p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open('https://app.stelorder.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4" /> Abrir STEL Order
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Crear albarán en STEL Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info registro */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 flex flex-wrap gap-3">
            <span className="font-medium">{registro.technician_name || registro.technician_email}</span>
            <span>📅 {registro.fecha ? format(parseISO(registro.fecha), "d 'de' MMMM yyyy", { locale: es }) : registro.fecha}</span>
            {registro.horas_efectivas > 0 && <Badge variant="outline">{registro.horas_efectivas}h efectivas</Badge>}
            {registro.horas_extra > 0 && <Badge className="bg-orange-100 text-orange-700 border-0">{registro.horas_extra}h extra</Badge>}
          </div>

          {/* Buscar cliente */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-2 block">Cliente en STEL Order *</Label>
            {selectedClient ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <p className="font-medium text-blue-800 text-sm">{selectedClient.name}</p>
                  {selectedClient.fiscalId && <p className="text-xs text-blue-600">{selectedClient.fiscalId}</p>}
                </div>
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" onClick={() => { setSelectedClient(null); setSearchResults([]); }}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchClients()}
                  />
                  <Button variant="outline" onClick={searchClients} disabled={searching} className="px-3">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                        onClick={() => { setSelectedClient(c); setSearchResults([]); }}
                      >
                        <p className="font-medium text-slate-700">{c.name}</p>
                        {c.fiscalId && <p className="text-xs text-slate-400">{c.fiscalId}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-xs text-slate-400 text-center py-2">Sin resultados. Prueba con otro nombre.</p>
                )}
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Título del albarán</Label>
            <Input
              placeholder="Ej: Mantenimiento climatización junio..."
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-slate-600">Líneas del albarán</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addLinea}>
                <Plus className="h-3 w-3" /> Añadir línea
              </Button>
            </div>
            <div className="space-y-3">
              {lineas.map((l, i) => (
                <div key={i} className="space-y-1">
                  {/* Concepto con buscador de producto */}
                  <div className="relative">
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Input
                          className="text-sm pr-7"
                          placeholder="Concepto (escribe para buscar producto...)"
                          value={productSearch[i] !== undefined ? productSearch[i] : l.concepto}
                          onChange={e => {
                            updateLinea(i, 'concepto', e.target.value);
                            searchProducts(i, e.target.value);
                          }}
                          onFocus={() => setProductSearch(prev => ({ ...prev, [i]: l.concepto }))}
                          onBlur={() => setTimeout(() => {
                            setProductSearch(prev => ({ ...prev, [i]: undefined }));
                            setProductResults(prev => ({ ...prev, [i]: [] }));
                          }, 200)}
                        />
                        {searchingProduct[i] && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
                        )}
                        {!searchingProduct[i] && (
                          <Package className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-8 text-slate-300 hover:text-red-400 shrink-0"
                        onClick={() => removeLinea(i)}
                        disabled={lineas.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Dropdown productos */}
                    {productResults[i]?.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-8 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                        {productResults[i].map(p => (
                          <button
                            key={p.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                            onMouseDown={() => selectProduct(i, p)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-700 truncate">{p.name}</span>
                              <span className="text-xs text-slate-400 ml-2 shrink-0">{p.price?.toFixed(2)}€</span>
                            </div>
                            {p.reference && <span className="text-xs text-slate-400">Ref: {p.reference}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Cantidad y precio */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-3 text-sm text-center"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Ud."
                      value={l.cantidad}
                      onChange={e => updateLinea(i, 'cantidad', parseFloat(e.target.value) || 0)}
                    />
                    <div className="col-span-4 relative">
                      <Input
                        className="text-sm pr-6"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="€/ud"
                        value={l.precio}
                        onChange={e => updateLinea(i, 'precio', parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    </div>
                    <div className="col-span-5 text-sm font-medium text-slate-600 text-right pr-1">
                      = {(l.cantidad * l.precio).toFixed(2)}€
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-right text-sm font-semibold text-slate-700 border-t pt-2">
                Total: {lineas.reduce((a, l) => a + l.cantidad * l.precio, 0).toFixed(2)}€
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Notas del albarán</Label>
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={createAlbaran} disabled={creating || !selectedClient} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Crear albarán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}