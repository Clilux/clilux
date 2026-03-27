import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package, Pencil, Check, X, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyPart = { name: '', value: '', photo_url: '' };

export default function SparePartsTab({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [newPart, setNewPart] = useState(emptyPart);
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editPart, setEditPart] = useState(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const spareParts = equipment?.spare_parts || [];

  const handleUploadPhoto = async (file, target) => {
    if (!file) return;
    if (target === 'new') setUploadingNew(true);
    else setUploadingEdit(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (target === 'new') {
      setNewPart(p => ({ ...p, photo_url: file_url }));
      setUploadingNew(false);
    } else {
      setEditPart(p => ({ ...p, photo_url: file_url }));
      setUploadingEdit(false);
    }
  };

  const handleAdd = async () => {
    if (!newPart.name.trim()) return;
    setSaving(true);
    const updated = [...spareParts, { name: newPart.name.trim(), value: newPart.value.trim(), photo_url: newPart.photo_url || '' }];
    await base44.entities.Equipment.update(equipmentId, { spare_parts: updated });
    queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
    setNewPart(emptyPart);
    setSaving(false);
    toast.success('Repuesto añadido');
  };

  const handleDelete = async (idx) => {
    const updated = spareParts.filter((_, i) => i !== idx);
    await base44.entities.Equipment.update(equipmentId, { spare_parts: updated });
    queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
    toast.success('Repuesto eliminado');
  };

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditPart({ ...spareParts[idx] });
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditPart(null);
  };

  const saveEdit = async () => {
    if (!editPart.name.trim()) return;
    const updated = spareParts.map((p, i) => i === editingIdx ? { ...editPart, name: editPart.name.trim(), value: editPart.value.trim() } : p);
    await base44.entities.Equipment.update(equipmentId, { spare_parts: updated });
    queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
    setEditingIdx(null);
    setEditPart(null);
    toast.success('Repuesto actualizado');
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
          editingIdx === idx ? (
            /* EDIT MODE */
            <div key={idx} className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre"
                  value={editPart.name}
                  onChange={(e) => setEditPart(p => ({ ...p, name: e.target.value }))}
                  className="flex-1 bg-white"
                />
                <Input
                  placeholder="Medida / referencia"
                  value={editPart.value}
                  onChange={(e) => setEditPart(p => ({ ...p, value: e.target.value }))}
                  className="flex-1 bg-white"
                />
              </div>
              <div className="flex items-center gap-3">
                {editPart.photo_url ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                    <img src={editPart.photo_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEditPart(p => ({ ...p, photo_url: '' }))}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer hover:bg-blue-100 flex-shrink-0">
                    {uploadingEdit ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : <ImagePlus className="h-4 w-4 text-blue-400" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e.target.files[0], 'edit')} />
                  </label>
                )}
                <span className="text-xs text-slate-500">Foto del repuesto (opcional)</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                    <Check className="h-3.5 w-3.5 mr-1" /> Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE */
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              {part.photo_url ? (
                <img src={part.photo_url} alt={part.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
              ) : (
                <Package className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span className="font-medium text-slate-700 flex-1 text-sm">{part.name}</span>
              {part.value && <span className="text-slate-500 text-sm">{part.value}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-blue-600" onClick={() => startEdit(idx)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        ))}
      </div>

      {/* ADD NEW */}
      <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Añadir nuevo repuesto</p>
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
        </div>
        <div className="flex items-center gap-3">
          {newPart.photo_url ? (
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={newPart.photo_url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setNewPart(p => ({ ...p, photo_url: '' }))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 flex-shrink-0">
              {uploadingNew ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <ImagePlus className="h-4 w-4 text-slate-400" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e.target.files[0], 'new')} />
            </label>
          )}
          <span className="text-xs text-slate-400">Foto (opcional)</span>
          <Button onClick={handleAdd} disabled={saving || !newPart.name.trim()} className="ml-auto bg-slate-800 hover:bg-slate-700">
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </div>
      </div>
    </div>
  );
}