import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, Loader2, Package, Trash2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function ConfigCatalogo() {
  const queryClient = useQueryClient();
  const exportRef = useRef(null);
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [showNewFamiliaDialog, setShowNewFamiliaDialog] = useState(false);
  const [newFamilia, setNewFamilia] = useState({ nombre: '', descripcion: '' });

  const { data: catalogos = [] } = useQuery({
    queryKey: ['catalogos-importados'],
    queryFn: () => base44.entities.CatalogoImportado.list(),
  });

  const { data: familias = [] } = useQuery({
    queryKey: ['familias'],
    queryFn: () => base44.entities.FamiliaProducto.list(),
  });

  const createFamiliaMutation = useMutation({
    mutationFn: (data) => base44.entities.FamiliaProducto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familias'] });
      setShowNewFamiliaDialog(false);
      setNewFamilia({ nombre: '', descripcion: '' });
      toast.success('Familia creada');
    },
  });

  const deleteFamiliaMutation = useMutation({
    mutationFn: (id) => base44.entities.FamiliaProducto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familias'] });
      toast.success('Familia eliminada');
    },
  });

  const deleteCatalogoMutation = useMutation({
    mutationFn: async (catalogoId) => {
      // Eliminar todos los productos del catálogo
      const productos = await base44.entities.CatalogoProducto.filter({ catalogo_id: catalogoId });
      for (const prod of productos) {
        await base44.entities.CatalogoProducto.delete(prod.id);
      }
      // Eliminar el catálogo
      await base44.entities.CatalogoImportado.delete(catalogoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogos-importados'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      toast.success('Catálogo eliminado');
    },
  });

  const handleExportProductos = async () => {
    try {
      const productos = await base44.entities.CatalogoProducto.list();
      
      const exportData = {
        version: '1.0',
        date: new Date().toISOString(),
        productos: productos.map(p => ({
          tipo: p.tipo,
          fabricante: p.fabricante,
          codigo: p.codigo,
          descripcion: p.descripcion,
          familia: p.familia,
          pvp: p.pvp,
          descuento_compra: p.descuento_compra,
          porcentaje_venta: p.porcentaje_venta,
          unidad: p.unidad,
          año_tarifa: p.año_tarifa,
          nombre_catalogo: p.nombre_catalogo,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo_productos_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Catálogo exportado');
    } catch (error) {
      toast.error('Error al exportar catálogo');
    }
  };

  const handleImportProductos = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.productos) {
        throw new Error('Formato de archivo inválido');
      }

      await base44.entities.CatalogoProducto.bulkCreate(data.productos);
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      toast.success(`${data.productos.length} productos importados`);
    } catch (error) {
      toast.error('Error al importar: ' + error.message);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Configuración de Catálogo" />

        {/* Exportar/Importar */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">Importar / Exportar Productos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Button onClick={handleExportProductos} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar Catálogo Completo
              </Button>
              <p className="text-xs text-slate-500 mt-2">Descarga todos los productos en formato JSON</p>
            </div>
            <div>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                onChange={handleImportProductos}
                disabled={importing}
                className="hidden"
              />
              <Button
                onClick={() => importRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="w-full"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Importar Productos</>
                )}
              </Button>
              <p className="text-xs text-slate-500 mt-2">Importa productos desde un archivo JSON</p>
            </div>
          </div>
        </Card>

        {/* Catálogos Importados */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">Catálogos Importados</h3>
          {catalogos.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No hay catálogos importados</p>
          ) : (
            <div className="space-y-3">
              {catalogos.map(catalogo => (
                <div key={catalogo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-800">{catalogo.nombre_catalogo}</p>
                      <p className="text-sm text-slate-500">
                        {catalogo.fabricante} • {catalogo.num_productos} productos • {new Date(catalogo.fecha_importacion).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCatalogoMutation.mutate(catalogo.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Familias de Productos */}
        <Card className="p-6 bg-white border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Familias de Productos</h3>
            <Button onClick={() => setShowNewFamiliaDialog(true)} size="sm">
              Añadir Familia
            </Button>
          </div>
          {familias.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No hay familias configuradas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {familias.map(familia => (
                <div key={familia.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800">{familia.nombre}</p>
                    {familia.descripcion && (
                      <p className="text-sm text-slate-500">{familia.descripcion}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFamiliaMutation.mutate(familia.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dialog Nueva Familia */}
        <Dialog open={showNewFamiliaDialog} onOpenChange={setShowNewFamiliaDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Nueva Familia de Productos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={newFamilia.nombre}
                  onChange={(e) => setNewFamilia({ ...newFamilia, nombre: e.target.value })}
                  placeholder="Ej: Splits, Enfriadoras, Repuestos..."
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  value={newFamilia.descripcion}
                  onChange={(e) => setNewFamilia({ ...newFamilia, descripcion: e.target.value })}
                  placeholder="Descripción opcional"
                />
              </div>
              <Button
                onClick={() => createFamiliaMutation.mutate(newFamilia)}
                disabled={!newFamilia.nombre || createFamiliaMutation.isPending}
                className="w-full"
              >
                {createFamiliaMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                ) : (
                  <>Crear Familia</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}