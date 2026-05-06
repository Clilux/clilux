import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Search, FileText, Loader2, Plus, Trash2, ExternalLink, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CrearAlbaranStelModal({ registro, onClose, onCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [creating, setCreating] = useState(false);
  const [albaranCreado, setAlbaranCreado] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [documentStates, setDocumentStates] = useState([]);
  const [documentStateId, setDocumentStateId] = useState(null);
  const [notas, setNotas] = useState(
    [registro.notas, registro.technician_name && `Técnico: ${registro.technician_name}`].filter(Boolean).join(' | ')
  );

  const horasEfectivas = registro.horas_efectivas || registro.horas_normales || 0;
  const horasExtra = registro.horas_extra || 0;

  const buildDefaultLines = () => {
    const lines = [];
    if (horasEfectivas > 0) lines.push({ concepto: 'Mano de obra', cantidad: horasEfectivas, precio: 0, taxId: null, productId: null, productName: null });
    if (horasExtra > 0) lines.push({ concepto: 'Mano de obra extra', cantidad: horasExtra, precio: 0, taxId: null, productId: null, productName: null });
    if (lines.length === 0) lines.push({ concepto: 'Mano de obra', cantidad: 1, precio: 0, taxId: null, productId: null, productName: null });
    return lines;
  };

  const [lineas, setLineas] = useState(buildDefaultLines);

  // Per-line product search state
  const [activeSearchLine, setActiveSearchLine] = useState(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const productTimeout = useRef(null);
  const productDropdownRef = useRef(null);

  useEffect(() => {
    base44.functions.invoke('stelProxy', { action: 'getDocumentStates', payload: {} })
      .then(r => setDocumentStates(r.data?.states || []))
      .catch(() => {});
  }, []);

  // Auto-search clients as user types (debounced)
  const clientSearchTimeout = useRef(null);
  const handleClientQueryChange = (val) => {
    setSearchQuery(val);
    clearTimeout(clientSearchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    clientSearchTimeout.current = setTimeout(() => {
      setSearching(true);
      base44.functions.invoke('stelProxy', { action: 'searchClients', payload: { query: val } })
        .then(r => setSearchResults(r.data?.clients || []))
        .catch(e => toast.error('Error buscando clientes: ' + e.message))
        .finally(() => setSearching(false));
    }, 400);
  };

  // Product search for a specific line
  const handleProductSearch = (lineIndex, query) => {
    setActiveSearchLine(lineIndex);
    setProductQuery(query);
    setProductResults([]);
    clearTimeout(productTimeout.current);
    if (!query.trim()) return;
    productTimeout.current = setTimeout(() => {
      setSearchingProduct(true);
      base44.functions.invoke('stelProxy', { action: 'searchProducts', payload: { query } })
        .then(r => setProductResults(r.data?.products || []))
        .catch(() => {})
        .finally(() => setSearchingProduct(false));
    }, 400);
  };

  const selectProduct = (product) => {
    if (activeSearchLine === null) return;
    setLineas(prev => prev.map((l, idx) => idx === activeSearchLine ? {
      ...l,
      concepto: product.name,
      precio: product.price,
      taxId: product.taxId || null,
      productId: product.id,
      productName: product.name,
      productType: product.type,
    } : l));
    setActiveSearchLine(null);
    setProductQuery('');
    setProductResults([]);
  };

  const clearProduct = (i) => {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, productId: null, productName: null, productType: null } : l));
  };

  const updateLinea = (i, field, value) => {
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const removeLinea = (i) => {
    setLineas(prev => prev.filter((_, idx) => idx !== i));
    if (activeSearchLine === i) { setActiveSearchLine(null); setProductResults([]); }
  };

  const addLinea = () => {
    setLineas(prev => [...prev, { concepto: '', cantidad: 1, precio: 0, taxId: null, productId: null, productName: null }]);
  };

  const createAlbaran = async () => {
    if (!selectedClient) { toast.error('Selecciona un cliente'); return; }
    if (lineas.some(l => !l.concepto.trim())) { toast.error('Completa todos los conceptos'); return; }
    const sinProducto = lineas.filter(l => !l.productId);
    if (sinProducto.length > 0) {
      toast.error(`Línea "${sinProducto[0].concepto}": busca y selecciona un producto/servicio de STEL`);
      return;
    }
    setCreating(true);
    try {
      const r = await base44.functions.invoke('stelProxy', {
        action: 'createAlbaran',
        payload: { clientId: selectedClient.id, fecha: registro.fecha, titulo, lineas, notas, documentStateId }
      });
      const alb = Array.isArray(r.data?.albaran) ? r.data.albaran[0] : r.data?.albaran;
      setAlbaranCreado(alb);
      toast.success('Albarán creado en STEL Order');
      await base44.entities.RegistroHorario.update(registro.id, {
        notas: `${registro.notas || ''}${registro.notas ? ' | ' : ''}STEL Albarán #${alb?.reference || alb?.id}`.trim()
      });
      onCreated?.(alb);
    } catch (e) {
      toast.error('Error creando albarán: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  if (albaranCreado) {
    const pdfUrl = albaranCreado['pdf-path'] || albaranCreado.pdfPath;
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
              Albarán {albaranCreado.reference ? `#${albaranCreado.reference}` : ''} creado en STEL Order
            </p>
            <p className="text-sm text-slate-500">Cliente: {selectedClient?.name}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {pdfUrl && (
                <Button variant="outline" className="gap-2" onClick={() => window.open(pdfUrl, '_blank')}>
                  <FileText className="h-4 w-4" /> Ver PDF
                </Button>
              )}
              <Button variant="outline" className="gap-2" onClick={() => window.open('https://app.stelorder.com', '_blank')}>
                <ExternalLink className="h-4 w-4" /> Abrir STEL Order
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const lineasSinProducto = lineas.filter(l => !l.productId).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
            {horasEfectivas > 0 && <Badge variant="outline">{horasEfectivas}h efectivas</Badge>}
            {horasExtra > 0 && <Badge className="bg-orange-100 text-orange-700 border-0">{horasExtra}h extra</Badge>}
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
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" onClick={() => { setSelectedClient(null); setSearchResults([]); setSearchQuery(''); }}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Escribe para buscar cliente..."
                    value={searchQuery}
                    onChange={e => handleClientQueryChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClientQueryChange(searchQuery)}
                    autoComplete="off"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto shadow-sm">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                        onMouseDown={() => { setSelectedClient(c); setSearchResults([]); setSearchQuery(''); }}
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

          {/* Estado del albarán */}
          {documentStates.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Estado del albarán</Label>
              <Select
                value={documentStateId ? String(documentStateId) : 'none'}
                onValueChange={v => setDocumentStateId(v === 'none' ? null : Number(v))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sin estado (por defecto)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin estado (por defecto)</SelectItem>
                  {documentStates.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Aviso líneas sin producto */}
          {lineasSinProducto > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Cada línea necesita un producto/servicio de STEL vinculado. Escribe en el campo de concepto para buscarlo.</span>
            </div>
          )}

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
                <div key={i} className={`p-3 rounded-lg border space-y-2 ${l.productId ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                  {/* Producto vinculado */}
                  {l.productId ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{l.productName || l.concepto}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge className={`text-xs border-0 py-0 ${l.productType === 'service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {l.productType === 'service' ? 'Servicio' : 'Producto'}
                          </Badge>
                        </div>
                      </div>
                      <button className="text-xs text-slate-400 hover:text-red-500 shrink-0" onClick={() => clearProduct(i)}>
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    /* Buscador de producto */
                    <div className="relative">
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <Input
                            className="text-sm pr-7"
                            placeholder="Buscar producto/servicio en STEL..."
                            value={activeSearchLine === i ? productQuery : l.concepto}
                            onChange={e => {
                              if (activeSearchLine !== i) setActiveSearchLine(i);
                              updateLinea(i, 'concepto', e.target.value);
                              handleProductSearch(i, e.target.value);
                            }}
                            onFocus={() => {
                              setActiveSearchLine(i);
                              setProductQuery(l.concepto);
                              if (l.concepto.trim()) handleProductSearch(i, l.concepto);
                            }}
                          />
                          {searchingProduct && activeSearchLine === i
                            ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
                            : <Package className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                          }
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-9 w-8 text-slate-300 hover:text-red-400 shrink-0"
                          onClick={() => removeLinea(i)}
                          disabled={lineas.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* Dropdown resultados */}
                      {activeSearchLine === i && productResults.length > 0 && (
                        <div
                          ref={productDropdownRef}
                          className="absolute z-[9999] left-0 right-8 mt-1 border border-slate-200 rounded-lg bg-white shadow-xl max-h-52 overflow-y-auto"
                        >
                          {productResults.map(p => (
                            <button
                              key={`${p.type}-${p.id}`}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                              onMouseDown={e => { e.preventDefault(); selectProduct(p); }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-700 truncate">{p.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className={`text-xs border-0 ${p.type === 'service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {p.type === 'service' ? 'Servicio' : 'Producto'}
                                  </Badge>
                                  <span className="text-xs text-slate-500 font-medium">{p.price?.toFixed(2)}€</span>
                                </div>
                              </div>
                              {p.reference && <p className="text-xs text-slate-400">Ref: {p.reference}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cantidad y precio */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        className="text-sm text-center"
                        type="number" min="0" step="0.5"
                        placeholder="Cantidad"
                        value={l.cantidad}
                        onChange={e => updateLinea(i, 'cantidad', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-4 relative">
                      <Input
                        className="text-sm pr-5"
                        type="number" min="0" step="0.01"
                        placeholder="€/ud"
                        value={l.precio}
                        onChange={e => updateLinea(i, 'precio', parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    </div>
                    <div className="col-span-4 text-sm font-semibold text-slate-600 text-right">
                      = {(l.cantidad * l.precio).toFixed(2)}€
                    </div>
                  </div>
                </div>
              ))}

              <div className="text-right text-sm font-bold text-slate-700 border-t pt-2">
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
          <Button
            onClick={createAlbaran}
            disabled={creating || !selectedClient || lineasSinProducto > 0}
            className="gap-2"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Crear albarán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}