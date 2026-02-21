import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Receipt, FileCheck, Plus, Trash2, Save } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const docTypes = [
  { key: 'factura', label: 'Facturas', icon: FileCheck, color: 'purple' },
  { key: 'albaran', label: 'Albaranes', icon: Receipt, color: 'emerald' },
  { key: 'presupuesto', label: 'Presupuestos', icon: FileText, color: 'blue' }
];

export default function ConfigDocumentos() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState('factura');

  const { data: configs = [] } = useQuery({
    queryKey: ['document-configs'],
    queryFn: () => base44.entities.DocumentConfig.list(),
  });

  const currentConfig = configs.find(c => c.doc_type === selectedDoc) || {
    doc_type: selectedDoc,
    estados_disponibles: [],
    prefijo_numeracion: '',
    siguiente_numero: 1,
    ivas_disponibles: [],
    campos_adicionales: []
  };

  const [formData, setFormData] = useState(currentConfig);

  React.useEffect(() => {
    const config = configs.find(c => c.doc_type === selectedDoc) || {
      doc_type: selectedDoc,
      estados_disponibles: [],
      prefijo_numeracion: '',
      siguiente_numero: 1,
      ivas_disponibles: [],
      campos_adicionales: []
    };
    setFormData(config);
  }, [selectedDoc, configs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = configs.find(c => c.doc_type === selectedDoc);
      if (existing) {
        return base44.entities.DocumentConfig.update(existing.id, data);
      } else {
        return base44.entities.DocumentConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-configs'] });
      toast.success('Configuración guardada');
    },
  });

  const addEstado = () => {
    setFormData(prev => ({
      ...prev,
      estados_disponibles: [
        ...prev.estados_disponibles,
        { codigo: '', nombre: '', color: 'bg-gray-100' }
      ]
    }));
  };

  const removeEstado = (index) => {
    setFormData(prev => ({
      ...prev,
      estados_disponibles: prev.estados_disponibles.filter((_, i) => i !== index)
    }));
  };

  const updateEstado = (index, field, value) => {
    const newEstados = [...formData.estados_disponibles];
    newEstados[index][field] = value;
    setFormData(prev => ({ ...prev, estados_disponibles: newEstados }));
  };

  const addIva = () => {
    setFormData(prev => ({
      ...prev,
      ivas_disponibles: [
        ...prev.ivas_disponibles,
        { porcentaje: 21, descripcion: '' }
      ]
    }));
  };

  const removeIva = (index) => {
    setFormData(prev => ({
      ...prev,
      ivas_disponibles: prev.ivas_disponibles.filter((_, i) => i !== index)
    }));
  };

  const updateIva = (index, field, value) => {
    const newIvas = [...formData.ivas_disponibles];
    newIvas[index][field] = field === 'porcentaje' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, ivas_disponibles: newIvas }));
  };

  const selectedDocType = docTypes.find(d => d.key === selectedDoc);
  const Icon = selectedDocType?.icon || FileText;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <NavHeader title="Configuración de Documentos" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {docTypes.map(doc => (
            <Card
              key={doc.key}
              onClick={() => setSelectedDoc(doc.key)}
              className={`p-6 cursor-pointer transition-all ${
                selectedDoc === doc.key
                  ? `bg-${doc.color}-500/20 border-${doc.color}-500/50`
                  : 'bg-white/10 border-white/20 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-${doc.color}-500/20 flex items-center justify-center`}>
                  <doc.icon className={`h-6 w-6 text-${doc.color}-400`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{doc.label}</h3>
                  <p className="text-sm text-slate-400">Configurar</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <Icon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              Configuración de {selectedDocType?.label}
            </h2>
          </div>

          <div className="space-y-6">
            {/* Numeración */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Numeración</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Prefijo</Label>
                  <Input
                    value={formData.prefijo_numeracion}
                    onChange={(e) => setFormData({ ...formData, prefijo_numeracion: e.target.value })}
                    placeholder="FAC-"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Siguiente Número</Label>
                  <Input
                    type="number"
                    value={formData.siguiente_numero}
                    onChange={(e) => setFormData({ ...formData, siguiente_numero: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Estados */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Estados Disponibles</h3>
                <Button onClick={addEstado} size="sm" className="bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Estado
                </Button>
              </div>
              <div className="space-y-3">
                {formData.estados_disponibles.map((estado, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="col-span-3">
                      <Input
                        placeholder="Código (ej: emitida)"
                        value={estado.codigo}
                        onChange={(e) => updateEstado(idx, 'codigo', e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Nombre visible"
                        value={estado.nombre}
                        onChange={(e) => updateEstado(idx, 'nombre', e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Color (ej: bg-green-100)"
                        value={estado.color}
                        onChange={(e) => updateEstado(idx, 'color', e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeEstado(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IVAs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Tipos de IVA</h3>
                <Button onClick={addIva} size="sm" className="bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir IVA
                </Button>
              </div>
              <div className="space-y-3">
                {formData.ivas_disponibles.map((iva, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="col-span-5">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Porcentaje"
                        value={iva.porcentaje}
                        onChange={(e) => updateIva(idx, 'porcentaje', e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-6">
                      <Input
                        placeholder="Descripción (ej: IVA General)"
                        value={iva.descripcion}
                        onChange={(e) => updateIva(idx, 'descripcion', e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeIva(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
                className="bg-blue-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}