import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckSquare, Square, FileJson, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ENTITY_OPTIONS } from './ExportDatosGerente';

/**
 * Importa una copia JSON (exportada por el gerente) recreando los datos en la
 * empresa del gerente actual. Permite elegir qué entidades importar.
 * Remapea los IDs antiguos a los nuevos respetando dependencias.
 */
export default function ImportDatosEmpresa({ sessionTechEmail }) {
  const [importing, setImporting] = useState(false);
  const [dump, setDump] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const availableEntities = ENTITY_OPTIONS.filter(opt => dump && dump[opt.key]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('El archivo no es un JSON válido');
      }
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('El JSON no contiene datos exportados');
      }
      const found = ENTITY_OPTIONS.filter(opt => parsed[opt.key]);
      if (found.length === 0) {
        throw new Error('El JSON no contiene entidades reconocidas');
      }
      setDump(parsed);
      setFileName(file.name);
      setSelected(new Set(found.map(e => e.key)));
    } catch (err) {
      toast.error('Error: ' + (err?.message || ''));
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const toggleEntity = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(availableEntities.map(e => e.key)));
  const selectNone = () => setSelected(new Set());

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos una categoría');
      return;
    }
    setImporting(true);
    try {
      const filteredDump = {};
      for (const key of selected) {
        if (dump[key]) filteredDump[key] = dump[key];
      }
      const res = await base44.functions.invoke('importDatosEmpresa', {
        technician_email: sessionTechEmail,
        dump: filteredDump,
      });
      const c = res.data?.counts || {};
      const parts = Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
      if (parts.length === 0) {
        toast.info('No se encontraron registros para importar');
      } else {
        toast.success(`Importados: ${parts.join(', ')}`);
      }
      queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      // Reset
      setDump(null);
      setFileName('');
      setSelected(new Set());
    } catch (err) {
      toast.error('Error al importar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setDump(null);
    setFileName('');
    setSelected(new Set());
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />

      {!dump ? (
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          variant="outline"
          className="h-9"
        >
          {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {importing ? 'Importando...' : 'Importar datos (JSON)'}
        </Button>
      ) : (
        <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-slate-700 truncate">{fileName}</span>
            <button onClick={handleCancel} className="ml-auto text-xs text-slate-400 hover:text-red-500">Cancelar</button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-600">Selecciona qué importar</p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[11px] text-blue-600 hover:underline">Todas</button>
                <span className="text-slate-300">·</span>
                <button onClick={selectNone} className="text-[11px] text-slate-500 hover:underline">Ninguna</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {availableEntities.map(opt => {
                const checked = selected.has(opt.key);
                const count = dump[opt.key]?.length ?? 0;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleEntity(opt.key)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition border ${
                      checked
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {checked
                      ? <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />
                      : <Square className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                Se importarán {selected.size} categoría(s) en la empresa actual. Los datos existentes no se sobrescriben, se añaden como nuevos registros.
              </p>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9"
          >
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {importing ? 'Importando...' : `Importar ${selected.size} categoría(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}