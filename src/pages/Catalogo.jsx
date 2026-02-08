import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function Catalogo() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFabricante, setFilterFabricante] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [searching, setSearching] = useState(false);
  const [formData, setFormData] = useState({
    fabricante: 'Daikin',
    codigo: '',
    descripcion: '',
    categoria: 'equipos',
    pvp: 0,
    año_tarifa: new Date().getFullYear(),
    unidad: 'ud',
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['catalogo'],
    queryFn: () => base44.entities.CatalogoProducto.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CatalogoProducto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      setShowDialog(false);
      setFormData({
        fabricante: 'Daikin',
        codigo: '',
        descripcion: '',
        categoria: 'equipos',
        pvp: 0,
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
        const productosAñadir = result.productos.map(p => ({
          fabricante: formData.fabricante,
          codigo: p.codigo,
          descripcion: p.descripcion,
          categoria: 'equipos',
          pvp: p.pvp,
          año_tarifa: new Date().getFullYear(),
          unidad: 'ud',
        }));

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

  const filteredProducts = productos.filter(p => {
    const matchSearch = !searchTerm || 
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFabricante = filterFabricante === 'all' || p.fabricante === filterFabricante;
    return matchSearch && matchFabricante;
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

          <Select value={filterFabricante} onValueChange={setFilterFabricante}>
            <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los fabricantes</SelectItem>
              <SelectItem value="Airzone">Airzone</SelectItem>
              <SelectItem value="Mitsubishi Electric">Mitsubishi Electric</SelectItem>
              <SelectItem value="Daikin">Daikin</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>

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
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-mono">
                      {producto.codigo}
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs">
                      {producto.fabricante}
                    </span>
                  </div>
                  <p className="text-white font-medium mt-2">{producto.descripcion}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Categoría: {producto.categoria} • Año: {producto.año_tarifa}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{producto.pvp}€</p>
                    <p className="text-slate-400 text-xs">/{producto.unidad}</p>
                  </div>
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
              <div>
                <Label className="text-slate-300">Fabricante *</Label>
                <Select value={formData.fabricante} onValueChange={(v) => setFormData({...formData, fabricante: v})}>
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

              <Button
                onClick={handleSearchTarifa}
                disabled={searching}
                className="w-full bg-purple-600"
              >
                {searching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando tarifas...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Importar desde Tarifa {new Date().getFullYear()}</>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400">o añadir manualmente</span>
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
                  <Label className="text-slate-300">Categoría *</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
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
              </div>

              <div>
                <Label className="text-slate-300">Descripción *</Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

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
      </div>
    </div>
  );
}