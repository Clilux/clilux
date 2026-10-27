import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import useObraObservaciones from '@/hooks/useObraObservaciones';
import ObraObservacionCard from '@/components/obras/ObraObservacionCard';
import ObraObservacionForm from '@/components/obras/ObraObservacionForm';

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'observacion', label: 'Observaciones' },
  { value: 'incidencia', label: 'Incidencias' },
];

/** Observaciones e incidencias registradas durante la jornada. */
export default function ObraObservacionesPanel({ obraId, obraNombre, isSessionTech, effectiveEmail, techName, isAdmin, puedeEditar = true }) {
  const { observaciones, isLoading, crear, actualizar, eliminar } = useObraObservaciones(obraId, isSessionTech, effectiveEmail);
  const [filtro, setFiltro] = useState('todas');
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);

  const visibles = filtro === 'todas' ? observaciones : observaciones.filter(o => o.tipo === filtro);
  const incidenciasAbiertas = observaciones.filter(o => o.tipo === 'incidencia' && o.estado !== 'resuelta').length;

  const resolver = async (observacion, texto) => {
    try {
      await actualizar.mutateAsync({
        id: observacion.id,
        updates: {
          estado: 'resuelta',
          resolucion: texto,
          resuelta_por: techName || effectiveEmail || '',
          fecha_resolucion: format(new Date(), 'yyyy-MM-dd'),
        },
      });
      toast.success('Incidencia resuelta');
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const borrar = (observacion) => {
    if (!window.confirm(`¿Eliminar "${observacion.titulo}"?`)) return;
    eliminar.mutate(observacion.id, {
      onSuccess: () => toast.success('Registro eliminado'),
      onError: () => toast.error('No se pudo eliminar'),
    });
  };

  const guardar = async (record) => {
    if (editando) await actualizar.mutateAsync({ id: editando.id, updates: record });
    else await crear.mutateAsync(record);
  };

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap items-center">
          {FILTROS.map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtro === f.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
          {incidenciasAbiertas > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium ml-1">
              <AlertTriangle className="h-3.5 w-3.5" />{incidenciasAbiertas} incidencia(s) sin resolver
            </span>
          )}
        </div>
        {puedeEditar && (
          <Button onClick={() => { setEditando(null); setCreando(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" />Nuevo registro
          </Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <Card className="p-8 text-center bg-white border-0 shadow-sm">
          <Eye className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Sin observaciones ni incidencias registradas</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibles.map(o => (
            <ObraObservacionCard
              key={o.id}
              observacion={o}
              onResolver={resolver}
              onEditar={(obs) => { setCreando(false); setEditando(obs); }}
              onBorrar={borrar}
              soloLectura={!puedeEditar}
              puedeBorrar={puedeEditar && (isAdmin || o.registrado_por_email === effectiveEmail)} />
          ))}
        </div>
      )}

      {editando && (
        <ObraObservacionForm
          observacion={editando}
          obraId={obraId}
          obraNombre={obraNombre}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          techName={techName}
          onSave={guardar}
          onClose={() => setEditando(null)} />
      )}
      {creando && (
        <ObraObservacionForm
          obraId={obraId}
          obraNombre={obraNombre}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          techName={techName}
          onSave={guardar}
          onClose={() => setCreando(false)} />
      )}
    </div>
  );
}