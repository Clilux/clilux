import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function SparePartsTab({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [newPart, setNewPart] = useState({ name: '', value: '' });
  const [saving, setSaving] = useState(false);

  const spareParts = equipment?.spare_parts || [];

  const handleAdd = async () => {
    if (!newPart.name.trim()) return;
    setSaving(true);
    const updated = [...spareParts, { name: newPart.name.trim(), value: newPart.value.trim() }];
    await base44.entities.Equipment.update(equipmentId, { spare_parts: updated });
    queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
    setNewPart({ name: '', value: '' });
    setSaving(false);
    toast.success('Repuesto añadido');
  };

  const handleDelete = async (idx) => {
    const updated = spareParts.filter((_, i) => i !== idx);
    await base44.entities.Equipment.update(equipmentId, { spare_parts: updated });
    queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
    toast.success('Repuesto eliminado');
  };

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Package className="h-4 w-4" /> Repuestos y consumibles
      </h3>

      {spareParts.length === 0 && (
        <p className="text-slate-400 text-sm mb-4">No hay repuestos registrados. Añade correas, filtros u otros consumibles.</p>
      )}

      <div className="space-y-2 mb-6">
        {spareParts.map((part, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Package className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700 flex-1 text-sm">{part.name}</span>
            {part.value && <span className="text-slate-500 text-sm">{part.value}</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-600"
              onClick={() => handleDelete(idx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nombre (ej: Correa, Filtro...)"
          value={newPart.name}
          onChange={(e) => setNewPart(p => ({ ...p, name: e.target.value }))}
          className="flex-1"
        />
        <Input
          placeholder="Medida / referencia"
          value={newPart.value}
          onChange={(e) => setNewPart(p => ({ ...p, value: e.target.value }))}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={saving || !newPart.name.trim()} className="bg-slate-800 hover:bg-slate-700 shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
      </div>
    </div>
  );
}