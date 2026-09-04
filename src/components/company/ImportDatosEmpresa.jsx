import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Importa una copia JSON (exportada por el gerente) recreando los datos en la
 * empresa del gerente actual. Permite migrar/copiar datos a otra empresa: el
 * gerente de destino inicia sesión en su empresa y sube el archivo.
 * Remepea los IDs antiguos a los nuevos respetando dependencias.
 */
export default function ImportDatosEmpresa({ sessionTechEmail }) {
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let dump;
      try {
        dump = JSON.parse(text);
      } catch {
        throw new Error('El archivo no es un JSON válido');
      }
      if (!dump || typeof dump !== 'object' || (!dump.clients && !dump.buildings && !dump.equipment && !dump.incidents && !dump.revisions)) {
        throw new Error('El JSON no contiene datos exportados (clientes, edificios, equipos, incidencias o revisiones)');
      }
      const res = await base44.functions.invoke('importDatosEmpresa', {
        technician_email: sessionTechEmail,
        dump,
      });
      const c = res.data?.counts || {};
      const total = (c.clients || 0) + (c.buildings || 0) + (c.equipment || 0) + (c.incidents || 0) + (c.revisions || 0);
      if (total === 0) {
        toast.info('No se encontraron registros para importar');
      } else {
        toast.success(`Importados: ${c.clients||0} clientes, ${c.buildings||0} edificios, ${c.equipment||0} equipos, ${c.incidents||0} incidencias, ${c.revisions||0} revisiones`);
      }
      queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    } catch (err) {
      toast.error('Error al importar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        variant="outline"
        className="h-9"
      >
        {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        {importing ? 'Importando...' : 'Importar datos (JSON)'}
      </Button>
    </>
  );
}