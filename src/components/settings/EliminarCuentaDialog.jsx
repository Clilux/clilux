import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EliminarCuentaDialog({ techId, onDeleted, disabled, label = 'Eliminar mi cuenta' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!techId) {
      toast.error('No se encontró la cuenta a eliminar');
      return;
    }
    setLoading(true);
    try {
      await base44.entities.Technician.delete(techId);
      toast.success('Cuenta eliminada');
      setOpen(false);
      onDeleted?.();
    } catch (err) {
      toast.error('Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          disabled={disabled || !techId}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es permanente e irreversible. Se borrará tu perfil de técnico y los datos
            asociados. Los registros históricos (horario, incidencias, revisiones) pueden
            conservarse para cumplimiento legal. Deberás volver a registrarte para acceder de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Sí, eliminar mi cuenta'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}