import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Loader2, Sparkles, Trash2, Upload, Edit } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function Catalogo() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFabricante, setFilterFabricante] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterCatalogo, setFilterCatalogo] = useState('all');

  const { data: catalogos = [] } = useQuery({
    queryKey: ['catalogos-importados'],
    queryFn: () => base44.entities.CatalogoImportado.list(),
  });
  const [showDialog, setShowDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadConfig, setUploadConfig] = useState({
    nombre_catalogo: '',
    fabricante: 'Daikin',
    descuento_compra: 30,
    porcentaje_venta: 40,
  });
  const [formData, setFormData] = useState({
    tipo: 'producto',
    fabricante: '',
    codigo: '',
    descripcion: '',
    familia: '',
    pvp: 0,
    descuento_compra: 0,
    porcentaje_venta: 0,
    precio_venta: 0,
    año_tarifa: new Date().getFullYear(),
    unidad: 'ud',
    nombre_catalogo: '',
  });

  const { data: familias = [] } = useQuery({
    queryKey: ['familias'],
    queryFn: () => base44.entities.FamiliaProducto.list(),
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['catalogo'],
    queryFn: () => base44.entities.CatalogoProducto.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const precio_compra = data.pvp * (1 - (data.descuento_compra || 0) / 100);
      const precio_venta = precio_compra * (1 + (data.porcentaje_venta || 0) / 100);
      return base44.entities.CatalogoProducto.create({ ...data, precio_venta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      setShowDialog(false);
      setFormData({
        fabricante: 'Daikin',
        codigo: '',
        descripcion: '',
        categoria: 'equipos',
        pvp: 0,
        descuento_compra: 0,
        porcentaje_venta: 0,
        precio_venta: 0,
        año_tarifa: new Date().getFullYear(),
        unidad: 'ud',
      });
      toast.success('Producto añadido');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CatalogoProducto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      toast.success('Producto eliminado');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const precio_compra = data.pvp * (1 - (data.descuento_compra || 0) / 100);
      const precio_venta = precio_compra * (1 + (data.porcentaje_venta || 0) / 100);
      return base44.entities.CatalogoProducto.update(id, { ...data, precio_venta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      setShowEditDialog(false);
      setEditingProduct(null);
      toast.success('Producto actualizado');
    },
  });

  const handleSearchTarifa = async () => {
    if (!formData.fabricante) {
      toast.error('Selecciona un fabricante');
      return;
    }

    setSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca en las tarifas oficiales ${new Date().getFullYear()} de ${formData.fabricante} productos de climatización (splits, VRV, etc) y dame una lista de productos con código, descripción y PVP. Dame al menos 10 productos variados.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            productos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string" },
                  descripcion: { type: "string" },
                  pvp: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.productos && result.productos.length > 0) {
        const productosAñadir = result.productos.map(p => {
          const precio_compra = p.pvp * (1 - 30 / 100);
          const precio_venta = precio_compra * (1 + 40 / 100);
          return {
            fabricante: formData.fabricante,
            codigo: p.codigo,
            descripcion: p.descripcion,
            categoria: 'equipos',
            pvp: p.pvp,
            descuento_compra: 30,
            porcentaje_venta: 40,
            precio_venta,
            año_tarifa: new Date().getFullYear(),
            unidad: 'ud',
          };
        });

        await base44.entities.CatalogoProducto.bulkCreate(productosAñadir);
        queryClient.invalidateQueries({ queryKey: ['catalogo'] });
        toast.success(`${productosAñadir.length} productos importados`);
        setShowDialog(false);
      } else {
        toast.info('No se encontraron productos');
      }
    } catch (error) {
      toast.error('Error al buscar tarifas');
    } finally {
      setSearching(false);
    }
  };

  const handleUploadTarifa = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadConfig.nombre_catalogo) {
      toast.error('Introduce un nombre para el catálogo');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            productos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string" },
                  nombre: { type: "string" },
                  pvp: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.productos) {
        let productosConDescripcion = result.output.productos;

        const productosConIA = await Promise.all(
          productosConDescripcion.slice(0, 10).map(async (p) => {
            try {
              const desc = await base44.integrations.Core.InvokeLLM({
                prompt: `Genera una descripción técnica breve (max 100 caracteres) para este producto de climatización: ${p.nombre || p.codigo}`,
                response_json_schema: {
                  type: "object",
                  properties: {
                    descripcion: { type: "string" }
                  }
                }
              });
              return { ...p, descripcion: desc.descripcion };
            } catch {
              return { ...p, descripcion: p.nombre || p.codigo };
            }
          })
        );

        const productosRestantes = productosConDescripcion.slice(10).map(p => ({
          ...p,
          descripcion: p.nombre || p.codigo
        }));

        const todosProductos = [...productosConIA, ...productosRestantes];

        // Crear registro del catálogo importado
        const catalogoImportado = await base44.entities.CatalogoImportado.create({
          nombre_catalogo: uploadConfig.nombre_catalogo,
          fabricante: uploadConfig.fabricante,
          fecha_importacion: new Date().toISOString().split('T')[0],
          num_productos: todosProductos.length,
          archivo_url: file_url
        });

        const productosAñadir = todosProductos.map(p => {
          const precio_compra = p.pvp * (1 - uploadConfig.descuento_compra / 100);
          const precio_venta = precio_compra * (1 + uploadConfig.porcentaje_venta / 100);
          return {
            fabricante: uploadConfig.fabricante,
            codigo: p.codigo,
            descripcion: p.descripcion,
            categoria: 'equipos',
            pvp: p.pvp,
            descuento_compra: uploadConfig.descuento_compra,
            porcentaje_venta: uploadConfig.porcentaje_venta,
            precio_venta,
            año_tarifa: new Date().getFullYear(),
            unidad: 'ud',
            catalogo_id: catalogoImportado.id,
          };
        });

        await base44.entities.CatalogoProducto.bulkCreate(productosAñadir);
        queryClient.invalidateQueries({ queryKey: ['catalogo'] });
        toast.success(`${productosAñadir.length} productos importados desde "${uploadConfig.nombre_catalogo}"`);
        setShowUploadDialog(false);
        setUploadConfig({
          nombre_catalogo: '',
          fabricante: 'Daikin',
          descuento_compra: 30,
          porcentaje_venta: 40,
        });
      } else {
        toast.error(result.details || 'Error al procesar el archivo');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al importar tarifa');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredProducts = productos.filter(p => {
    const matchSearch = !searchTerm || 
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFabricante = filterFabricante === 'all' || p.fabricante === filterFabricante;
    const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
    const matchCatalogo = filterCatalogo === 'all' || p.nombre_catalogo === filterCatalogo;
    return matchSearch && matchFabricante && matchTipo && matchCatalogo;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Catálogo de Productos" />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white"
            />
          </div>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipo</SelectItem>
              <SelectItem value="producto">Producto</SelectItem>
              <SelectItem value="servicio">Servicio</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFabricante} onValueChange={setFilterFabricante}>
            <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Fabricante</SelectItem>
              {[...new Set(productos.map(p => p.fabricante).filter(Boolean))].map(fab => (
                <SelectItem key={fab} value={fab}>{fab}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCatalogo} onValueChange={setFilterCatalogo}>
            <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Catálogo</SelectItem>
              {catalogos.map(cat => (
                <SelectItem key={cat.id} value={cat.nombre_catalogo}>{cat.nombre_catalogo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="border-white/20 text-white">
            <Upload className="h-4 w-4 mr-2" />
            Subir Tarifa
          </Button>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Producto
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map(producto => (
            <Card key={producto.id} className="p-4 bg-white/5 backdrop-blur-sm border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-mono">
                      {producto.codigo}
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs">
                      {producto.fabricante}
                    </span>
                    {producto.tipo && (
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">
                        {producto.tipo}
                      </span>
                    )}
                    {producto.familia && (
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs">
                        {producto.familia}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium mt-2">{producto.descripcion}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {producto.nombre_catalogo && `${producto.nombre_catalogo} • `}Año: {producto.año_tarifa}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">PVP Base</p>
                    <p className="text-lg font-semibold text-slate-300">{producto.pvp}€</p>
                  </div>
                  {producto.precio_venta > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Precio Venta</p>
                      <p className="text-2xl font-bold text-green-400">{producto.precio_venta.toFixed(2)}€</p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingProduct(producto);
                      setShowEditDialog(true);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(producto.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filteredProducts.length === 0 && (
            <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <p className="text-slate-400">No hay productos en el catálogo</p>
            </Card>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Añadir Producto al Catálogo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producto">Producto</SelectItem>
                      <SelectItem value="servicio">Servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Fabricante *</Label>
                  <Input
                    value={formData.fabricante}
                    onChange={(e) => setFormData({...formData, fabricante: e.target.value})}
                    placeholder="Marca o fabricante"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Familia</Label>
                  <select
                    value={formData.familia}
                    onChange={(e) => setFormData({...formData, familia: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border bg-white/5 border-white/20 text-white"
                  >
                    <option value="">Seleccionar familia...</option>
                    {familias.map(f => (
                      <option key={f.id} value={f.nombre}>{f.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Descripción *</Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Nombre del Catálogo</Label>
                <Input
                  value={formData.nombre_catalogo}
                  onChange={(e) => setFormData({...formData, nombre_catalogo: e.target.value})}
                  placeholder="Ej: Tarifa 2024"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">PVP (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pvp}
                      onChange={(e) => setFormData({...formData, pvp: Number(e.target.value)})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Descuento Compra (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.descuento_compra}
                      onChange={(e) => setFormData({...formData, descuento_compra: Number(e.target.value)})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Precio de Compra (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(formData.pvp * (1 - formData.descuento_compra / 100)).toFixed(2)}
                      disabled
                      className="bg-white/5 border-white/20 text-blue-400 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">% Margen de Venta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.porcentaje_venta}
                      onChange={(e) => setFormData({...formData, porcentaje_venta: Number(e.target.value)})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Margen (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(formData.pvp * (1 - formData.descuento_compra / 100) * (formData.porcentaje_venta / 100)).toFixed(2)}
                      disabled
                      className="bg-white/5 border-white/20 text-amber-400 font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Precio Final (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(formData.pvp * (1 - formData.descuento_compra / 100) * (1 + formData.porcentaje_venta / 100)).toFixed(2)}
                      disabled
                      className="bg-white/5 border-white/20 text-green-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Unidad</Label>
                  <Input
                    value={formData.unidad}
                    onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Año Tarifa</Label>
                  <Input
                    type="number"
                    value={formData.año_tarifa}
                    onChange={(e) => setFormData({...formData, año_tarifa: Number(e.target.value)})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.codigo || !formData.descripcion || createMutation.isPending}
                className="w-full bg-blue-600"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <>Añadir Producto</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Subir Tarifa de Productos</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Nombre del Catálogo *</Label>
                <Input
                  value={uploadConfig.nombre_catalogo}
                  onChange={(e) => setUploadConfig({...uploadConfig, nombre_catalogo: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="Ej: Tarifa Daikin 2024"
                />
                <p className="text-xs text-slate-400 mt-1">Identificador único para este catálogo</p>
              </div>

              <div>
                <Label className="text-slate-300">Fabricante *</Label>
                <Select value={uploadConfig.fabricante} onValueChange={(v) => setUploadConfig({...uploadConfig, fabricante: v})}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Airzone">Airzone</SelectItem>
                    <SelectItem value="Mitsubishi Electric">Mitsubishi Electric</SelectItem>
                    <SelectItem value="Daikin">Daikin</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Descuento de Compra (%)</Label>
                  <Input
                    type="number"
                    value={uploadConfig.descuento_compra}
                    onChange={(e) => setUploadConfig({...uploadConfig, descuento_compra: Number(e.target.value)})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">Descuento sobre PVP</p>
                </div>
                <div>
                  <Label className="text-slate-300">Margen de Venta (%)</Label>
                  <Input
                    type="number"
                    value={uploadConfig.porcentaje_venta}
                    onChange={(e) => setUploadConfig({...uploadConfig, porcentaje_venta: Number(e.target.value)})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">Sobre precio de compra</p>
                </div>
              </div>

              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-slate-300">
                  <strong>Ejemplo:</strong> PVP 100€ → Compra {100 * (1 - uploadConfig.descuento_compra / 100)}€ → 
                  Venta {(100 * (1 - uploadConfig.descuento_compra / 100) * (1 + uploadConfig.porcentaje_venta / 100)).toFixed(2)}€
                </p>
              </Card>

              <div>
                <Label className="text-slate-300">Archivo de Tarifa (Excel, CSV, PDF)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleUploadTarifa}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full bg-blue-600 mt-2"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando archivo...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Seleccionar Archivo</>
                  )}
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  El sistema extraerá códigos, nombres y PVP. Generará descripciones automáticamente.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edición */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Producto</DialogTitle>
            </DialogHeader>

            {editingProduct && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Fabricante *</Label>
                  <Select 
                    value={editingProduct.fabricante} 
                    onValueChange={(v) => setEditingProduct({...editingProduct, fabricante: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Airzone">Airzone</SelectItem>
                      <SelectItem value="Mitsubishi Electric">Mitsubishi Electric</SelectItem>
                      <SelectItem value="Daikin">Daikin</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Marca</Label>
                    <Input
                      value={editingProduct.marca || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, marca: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Modelo</Label>
                    <Input
                      value={editingProduct.modelo || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, modelo: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Código *</Label>
                    <Input
                      value={editingProduct.codigo}
                      onChange={(e) => setEditingProduct({...editingProduct, codigo: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Código Fabricante</Label>
                    <Input
                      value={editingProduct.codigo_fabricante || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, codigo_fabricante: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Descripción *</Label>
                  <Input
                    value={editingProduct.descripcion}
                    onChange={(e) => setEditingProduct({...editingProduct, descripcion: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Categoría *</Label>
                  <Select 
                    value={editingProduct.categoria} 
                    onValueChange={(v) => setEditingProduct({...editingProduct, categoria: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipos">Equipos</SelectItem>
                      <SelectItem value="repuestos">Repuestos</SelectItem>
                      <SelectItem value="accesorios">Accesorios</SelectItem>
                      <SelectItem value="materiales">Materiales</SelectItem>
                      <SelectItem value="mano_obra">Mano de Obra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">PVP (€) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProduct.pvp}
                        onChange={(e) => setEditingProduct({...editingProduct, pvp: Number(e.target.value)})}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Descuento Compra (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProduct.descuento_compra}
                        onChange={(e) => setEditingProduct({...editingProduct, descuento_compra: Number(e.target.value)})}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Precio de Compra (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(editingProduct.pvp * (1 - editingProduct.descuento_compra / 100)).toFixed(2)}
                        disabled
                        className="bg-white/5 border-white/20 text-blue-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">% Margen de Venta</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProduct.porcentaje_venta}
                        onChange={(e) => setEditingProduct({...editingProduct, porcentaje_venta: Number(e.target.value)})}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Margen (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(editingProduct.pvp * (1 - editingProduct.descuento_compra / 100) * (editingProduct.porcentaje_venta / 100)).toFixed(2)}
                        disabled
                        className="bg-white/5 border-white/20 text-amber-400 font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Precio Final (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(editingProduct.pvp * (1 - editingProduct.descuento_compra / 100) * (1 + editingProduct.porcentaje_venta / 100)).toFixed(2)}
                        disabled
                        className="bg-white/5 border-white/20 text-green-400 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Unidad</Label>
                    <Input
                      value={editingProduct.unidad}
                      onChange={(e) => setEditingProduct({...editingProduct, unidad: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Año Tarifa</Label>
                    <Input
                      type="number"
                      value={editingProduct.año_tarifa}
                      onChange={(e) => setEditingProduct({...editingProduct, año_tarifa: Number(e.target.value)})}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => updateMutation.mutate({ id: editingProduct.id, data: editingProduct })}
                  disabled={!editingProduct.codigo || !editingProduct.descripcion || updateMutation.isPending}
                  className="w-full bg-blue-600"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</>
                  ) : (
                    <>Guardar Cambios</>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}