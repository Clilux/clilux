import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, Wind } from 'lucide-react';
import { toast } from 'sonner';

const SCADA_BRANDS = [
  { id: 'loxone', label: 'Loxone', icon: Cpu, color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'airzone', label: 'Airzone', icon: Wind, color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

export default function ScadaAccessPanel({ client }) {
  const queryClient = useQueryClient();
  const [localEnabled, setLocalEnabled] = useState(client.scada_enabled || false);
  const [localBrands, setLocalBrands] = useState(client.scada_brands || []);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', client.id] });
      toast.success('Acceso SCADA actualizado');
    },
  });

  const handleToggleEnabled = (val) => {
    setLocalEnabled(val);
    saveMutation.mutate({ scada_enabled: val, scada_brands: localBrands });
  };

  const handleToggleBrand = (brandId) => {
    const updated = localBrands.includes(brandId)
      ? localBrands.filter(b => b !== brandId)
      : [...localBrands, brandId];
    setLocalBrands(updated);
    saveMutation.mutate({ scada_enabled: localEnabled, scada_brands: updated });
  };

  return (
    <Card className="p-5 bg-white border-0 shadow-sm mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-100">
          <Activity className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">Acceso SCADA</h3>
          <p className="text-sm text-slate-500">Control de automatización para el cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{localEnabled ? 'Activo' : 'Inactivo'}</span>
          <Switch
            checked={localEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={saveMutation.isPending}
          />
        </div>
      </div>

      {localEnabled && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Sistemas habilitados:</p>
          <div className="flex flex-wrap gap-2">
            {SCADA_BRANDS.map(({ id, label, icon: Icon, color }) => {
              const isActive = localBrands.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => handleToggleBrand(id)}
                  disabled={saveMutation.isPending}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium
                    ${isActive ? color + ' border-current' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {isActive && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
          {localBrands.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Activa al menos una marca para que el cliente pueda acceder al SCADA
            </p>
          )}
        </div>
      )}

      {!localEnabled && (
        <p className="text-sm text-slate-400 italic">
          Activa el acceso SCADA para que este cliente pueda ver los sistemas de automatización
        </p>
      )}
    </Card>
  );
}