import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tantml:parameter>
<parameter name="content">import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EditableNotes({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(equipment?.notes || '');

  const updateMutation = useMutation({
    mutationFn: (newNotes) => base44.entities.Equipment.update(equipmentId, { notes: newNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      setIsEditing(false);
      toast.success('Observaciones actualizadas');
    },
    onError: () => {
      toast.error('Error al guardar');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(notes);
  };

  const handleCancel = () => {
    setNotes(equipment?.notes || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Observaciones</h3>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe observaciones sobre el equipo..."
            rows={6}
            className="bg-white border-slate-300 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
            <Button
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          {notes ? (
            <p className="text-slate-700 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-slate-400 italic">No hay observaciones</p>
          )}
        </div>
      )}
    </div>
  );
}