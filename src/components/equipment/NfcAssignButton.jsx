import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Nfc, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Botón para asignar una etiqueta NFC a un equipo.
 * Escribe "EQUIP:{equipmentId}" en la etiqueta y guarda nfc_tag_id en el equipo.
 */
export default function NfcAssignButton({ equipmentId, isSessionTech, sessionTechEmail, onAssigned }) {
  const [writing, setWriting] = useState(false);
  const [assigned, setAssigned] = useState(false);

  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const handleAssign = async () => {
    if (!nfcSupported) {
      toast.error('Tu dispositivo no soporta escritura NFC (requiere Chrome en Android)');
      return;
    }
    setWriting(true);
    try {
      const ndef = new window.NDEFReader();
      toast.info('Acerca una etiqueta NFC vacía para escribir...');
      await ndef.write(`EQUIP:${equipmentId}`);

      // Guardar nfc_tag_id en el equipo
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'equipment_update',
          equipment_id: equipmentId,
          updates: { nfc_tag_id: equipmentId },
        });
        if (res.data?.error) throw new Error(res.data.error);
      } else {
        await base44.entities.Equipment.update(equipmentId, { nfc_tag_id: equipmentId });
      }

      setAssigned(true);
      toast.success('Etiqueta NFC asignada correctamente');
      onAssigned?.();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('AbortError') || msg.includes('Abort')) {
        toast.error('Operación cancelada');
      } else {
        toast.error('Error al escribir la etiqueta: ' + msg);
      }
    } finally {
      setWriting(false);
    }
  };

  if (!nfcSupported) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAssign}
      disabled={writing}
      className={assigned ? 'text-green-600 border-green-300 hover:bg-green-50' : ''}
    >
      {writing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : assigned ? (
        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
      ) : (
        <Nfc className="h-4 w-4 mr-2" />
      )}
      {assigned ? 'NFC Asignado' : 'Asignar NFC'}
    </Button>
  );
}