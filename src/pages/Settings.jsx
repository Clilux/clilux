import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Upload, Palette, Building, FileText, Thermometer, Plus, Trash2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || {
        setting_key: 'main',
        primary_color: '#1e293b',
        secondary_color: '#3b82f6',
        accent_color: '#10b981',
        logo_url: '',
        company_name: 'Clilux M',
        equipment_types: [],
        revision_fields: [],
        client_fields: [],
      };
    },
  });

  const [formData, setFormData] = useState(settings || {});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.AppSettings.update(settings.id, data);
      }
      return base44.entities.AppSettings.create({ ...data, setting_key: 'main' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configuración guardada');
    },
    onError: () => {
      toast.error('Error al guardar');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('logo_url', result.file_url);
      toast.success('Logo subido');
    } catch (error) {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Gestión de tipos de equipos personalizados
  const addEquipmentType = () => {
    const newType = prompt('Nombre del nuevo tipo de equipo:');
    if (newType) {
      handleChange('equipment_types', [...(formData.equipment_types || []), newType]);
    }
  };

  const removeEquipmentType = (index) => {
    handleChange('equipment_types', formData.equipment_types.filter((_, i) => i !== index));
  };

  // Gestión de campos personalizados de revisión
  const addRevisionField = () => {
    handleChange('revision_fields', [
      ...(formData.revision_fields || []),
      { field_name: '', field_label: '', field_type: 'text', required: false }
    ]);
  };

  const updateRevisionField = (index, field, value) => {
    const updated = [...(formData.revision_fields || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('revision_fields', updated);
  };

  const removeRevisionField = (index) => {
    handleChange('revision_fields', formData.revision_fields.filter((_, i) => i !== index));
  };

  // Gestión de campos personalizados de cliente
  const addClientField = () => {
    handleChange('client_fields', [
      ...(formData.client_fields || []),
      { field_name: '', field_label: '', field_type: 'text', required: false }
    ]);
  };

  const updateClientField = (index, field, value) => {
    const updated = [...(formData.client_fields || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('client_fields', updated);
  };

  const removeClientField = (index) => {
    handleChange('client_fields', formData.client_fields.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Configuración" />

        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="revisions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revisiones
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Clientes
            </TabsTrigger>
          </TabsList>

          {/* Link a configuración avanzada de campos de revisión */}
          <div className="flex justify-end">
            <Link to={createPageUrl('RevisionFieldSettings')}>
              <Button variant="outline" size="sm">
                Configurar campos por tipo de equipo →
              </Button>
            </Link>
          </div>

          <TabsContent value="appearance">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">Apariencia y Marca</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Nombre de la Empresa</Label>
                  <Input
                    value={formData.company_name || ''}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Logo</Label>
                  <div className="mt-1 flex items-center gap-4">
                    {formData.logo_url && (
                      <img 
                        src={formData.logo_url} 
                        alt="Logo" 
                        className="h-12 w-12 object-contain rounded-lg border"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button type="button" variant="outline" asChild disabled={uploading}>
                        <span>
                          {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Subir logo
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div>
                  <Label>Color Primario</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color || '#1e293b'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color || '#1e293b'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color Secundario</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color || '#3b82f6'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color || '#3b82f6'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color de Acento</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.accent_color || '#10b981'}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.accent_color || '#10b981'}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-600 mb-2">Vista previa de colores:</p>
                <div className="flex gap-4">
                  <div 
                    className="w-24 h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Primario
                  </div>
                  <div 
                    className="w-24 h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    Secundario
                  </div>
                  <div 
                    className="w-24 h-12 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: formData.accent_color }}
                  >
                    Acento
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800">Tipos de Equipos Personalizados</h3>
                <Button onClick={addEquipmentType} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir tipo
                </Button>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">
                Además de los tipos predefinidos, puedes añadir tipos personalizados de equipos.
              </p>

              {formData.equipment_types?.length > 0 ? (
                <div className="space-y-2">
                  {formData.equipment_types.map((type, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span>{type}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeEquipmentType(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400">
                  No hay tipos personalizados. Usa los tipos predefinidos del sistema.
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="revisions">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800">Campos Personalizados de Revisión</h3>
                <Button onClick={addRevisionField} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir campo
                </Button>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">
                Añade campos adicionales al formulario de revisión según tus necesidades.
              </p>

              {formData.revision_fields?.length > 0 ? (
                <div className="space-y-4">
                  {formData.revision_fields.map((field, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Nombre interno</Label>
                          <Input
                            value={field.field_name}
                            onChange={(e) => updateRevisionField(index, 'field_name', e.target.value)}
                            placeholder="campo_ejemplo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Etiqueta</Label>
                          <Input
                            value={field.field_label}
                            onChange={(e) => updateRevisionField(index, 'field_label', e.target.value)}
                            placeholder="Campo de ejemplo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <select
                            value={field.field_type}
                            onChange={(e) => updateRevisionField(index, 'field_type', e.target.value)}
                            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="select">Selección</option>
                            <option value="checkbox">Casilla</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeRevisionField(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400">
                  No hay campos personalizados. Usa los campos IT3 RITE predefinidos.
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800">Campos Personalizados de Cliente</h3>
                <Button onClick={addClientField} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir campo
                </Button>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">
                Añade campos adicionales a la ficha de cliente.
              </p>

              {formData.client_fields?.length > 0 ? (
                <div className="space-y-4">
                  {formData.client_fields.map((field, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Nombre interno</Label>
                          <Input
                            value={field.field_name}
                            onChange={(e) => updateClientField(index, 'field_name', e.target.value)}
                            placeholder="campo_ejemplo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Etiqueta</Label>
                          <Input
                            value={field.field_label}
                            onChange={(e) => updateClientField(index, 'field_label', e.target.value)}
                            placeholder="Campo de ejemplo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <select
                            value={field.field_type}
                            onChange={(e) => updateClientField(index, 'field_type', e.target.value)}
                            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="select">Selección</option>
                            <option value="checkbox">Casilla</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeClientField(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400">
                  No hay campos personalizados para clientes.
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}