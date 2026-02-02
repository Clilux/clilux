import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fieldTypes = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'checkbox', label: 'Casilla Sí/No' },
  { value: 'select', label: 'Selección' },
  { value: 'textarea', label: 'Texto largo' },
];

const defaultField = { key: '', label: '', type: 'text', options: '', required: false };

export default function MaintenanceConfig({ equipment, onUpdate }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(equipment.maintenance_config || {
    monthly_enabled: false,
    monthly_fields: [],
    quarterly_enabled: false,
    quarterly_fields: [],
    biannual_enabled: false,
    biannual_fields: [],
    annual_enabled: false,
    annual_fields: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.update(equipment.id, { maintenance_config: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipment.id] });
      onUpdate?.();
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleToggle = (period) => {
    setConfig(prev => ({ ...prev, [`${period}_enabled`]: !prev[`${period}_enabled`] }));
  };

  const handleAddField = (period) => {
    const fieldsKey = `${period}_fields`;
    setConfig(prev => ({
      ...prev,
      [fieldsKey]: [...(prev[fieldsKey] || []), { ...defaultField, key: `field_${Date.now()}` }],
    }));
  };

  const handleUpdateField = (period, index, field, value) => {
    const fieldsKey = `${period}_fields`;
    setConfig(prev => {
      const updated = [...(prev[fieldsKey] || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [fieldsKey]: updated };
    });
  };

  const handleRemoveField = (period, index) => {
    const fieldsKey = `${period}_fields`;
    setConfig(prev => ({
      ...prev,
      [fieldsKey]: prev[fieldsKey].filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const renderPeriodConfig = (period, label) => {
    const enabled = config[`${period}_enabled`];
    const fields = config[`${period}_fields`] || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-800">Mantenimiento {label}</h4>
            <p className="text-sm text-slate-500">Activa y configura los campos del formulario</p>
          </div>
          <Switch checked={enabled} onCheckedChange={() => handleToggle(period)} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-4 border-t">
            {fields.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No hay campos configurados. Añade campos para personalizar el formulario.
              </p>
            ) : (
              fields.map((field, index) => (
                <div key={index} className="p-4 border rounded-lg bg-slate-50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Nombre interno</Label>
                      <Input
                        value={field.key}
                        onChange={(e) => handleUpdateField(period, index, 'key', e.target.value)}
                        placeholder="temperatura_entrada"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Etiqueta</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateField(period, index, 'label', e.target.value)}
                        placeholder="Temperatura de entrada"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select 
                        value={field.type} 
                        onValueChange={(v) => handleUpdateField(period, index, 'type', v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(v) => handleUpdateField(period, index, 'required', v)}
                        />
                        <Label className="text-xs">Requerido</Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveField(period, index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {field.type === 'select' && (
                    <div>
                      <Label className="text-xs">Opciones (separadas por coma)</Label>
                      <Input
                        value={field.options}
                        onChange={(e) => handleUpdateField(period, index, 'options', e.target.value)}
                        placeholder="Bueno, Regular, Malo"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
            <Button variant="outline" onClick={() => handleAddField(period)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Añadir campo
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Mantenimientos
        </h3>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
          <TabsTrigger value="quarterly">Trimestral</TabsTrigger>
          <TabsTrigger value="biannual">Semestral</TabsTrigger>
          <TabsTrigger value="annual">Anual</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">{renderPeriodConfig('monthly', 'Mensual')}</TabsContent>
        <TabsContent value="quarterly">{renderPeriodConfig('quarterly', 'Trimestral')}</TabsContent>
        <TabsContent value="biannual">{renderPeriodConfig('biannual', 'Semestral')}</TabsContent>
        <TabsContent value="annual">{renderPeriodConfig('annual', 'Anual')}</TabsContent>
      </Tabs>
    </Card>
  );
}