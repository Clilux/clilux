import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { CloudUpload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Genera un backup completo de la empresa y lo sube a Google Drive.
 * Requiere que el conector de Google Drive esté autorizado (solo gerente).
 */
export default function DriveSyncButton({ sessionTechEmail }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('dailyBackupToDrive', {
        technician_email: sessionTechEmail,
      });
      if (res.data?.connector_required) {
        toast.error('Google Drive no está conectado. Pide al administrador de la plataforma que autorice el conector.');
        return;
      }
      toast.success(res.data?.message || 'Backup subido a Google Drive');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || '';
      if (msg.includes('no está conectado') || msg.includes('connector')) {
        toast.error('Google Drive no está conectado todavía.');
      } else {
        toast.error('Error al sincronizar: ' + msg);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={syncing} variant="outline" className="h-9">
      {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
      {syncing ? 'Subiendo...' : 'Sincronizar a Google Drive'}
    </Button>
  );
}