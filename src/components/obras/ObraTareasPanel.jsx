import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Zap, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import useObraTareas from '@/hooks/useObraTareas';
import ObraTareaCard from '@/components/obras/ObraTareaCard';
import ObraTareaForm from '@/components/obras/ObraTareaForm';

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'realizada', label: 'Realizados' },
];

/** Trabajos de la obra: altas, avance y check de realizado. */
export default function ObraTareasPanel({ obraId, obraNombre, isSessionTech, effectiveEmail, techName, isAdmin, puedeEditar = true, verEconomia }) {
  const { tareas, isLoading, crear, actualizar, eliminar } = useObraTareas(obraId, isSessionTech, effectiveEmail);
  const [filtro, setFiltro] = useState('todas');
  const [editando, setEditando] = useState(null);
  // null | 'trabajo' | 'extra' — tipo del trabajo que se está creando
  const [nuevo, setNuevo] = useState(null);

  const { data: technicians = [] } = useQuery({
    queryKey: ['obra-tareas-technicians', isSessionTech ? effectiveEmail : 'direct'],
    queryFn: async () => {
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'technicians' });
        return res.data?.data || [];
      }
      return base44.entities.Technician.list();
    },
  });

  const trabajos = tareas.filter(t => t.tipo !== 'extra');
  const extras = tareas.filter(t => t.tipo === 'extra');
  const totalExtras = extras.reduce((s, t) => s + (Number(t.importe_extra) || 0), 0);
  const visibles = (filtro === 'todas' ? trabajos : trabajos.filter(t => t.estado === filtro));
  const cuenta = (estado) => trabajos.filter(t => t.estado === estado).length;
  // El equipo de la obra edita todos los trabajos; un técnico puede con los suyos.
  const puedeTocar = (t) => puedeEditar || (!!t.asignado_email && t.asignado_email === effectiveEmail);

  const toggle = (tarea) => {
    const realizada = tarea.estado === 'realizada';
    actualizar.mutate({
      id: tarea.id,
      updates: realizada
        ? { estado: 'pendiente', fecha_realizada: '', realizada_por: '', realizada_por_email: '' }
        : { estado: 'realizada', fecha_realizada: format(new Date(), 'yyyy-MM-dd'), realizada_por: techName || effectiveEmail || '', realizada_por_email: effectiveEmail || '' },
    }, {
      onSuccess: () => toast.success(realizada ? 'Trabajo reabierto' : 'Trabajo marcado como realizado'),
      onError: () => toast.error('No se pudo actualizar el trabajo'),
    });
  };

  const borrar = (tarea) => {
    if (!window.confirm(`¿Eliminar el trabajo "${tarea.titulo}"?`)) return;
    eliminar.mutate(tarea.id, {
      onSuccess: () => toast.success('Trabajo eliminado'),
      onError: () => toast.error('No se pudo eliminar el trabajo'),
    });
  };

  const guardar = async (record) => {
    if (editando) await actualizar.mutateAsync({ id: editando.id, updates: record });
    else await crear.mutateAsync(record);
  };

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-slate-50 border-0 shadow-sm text-center">
          <p className="text-lg font-bold text-slate-700">{cuenta('pendiente')}</p>
          <p className="text-xs text-slate-500">Pendientes</p>
        </Card>
        <Card className="p-3 bg-amber-50 border-0 shadow-sm text-center">
          <p className="text-lg font-bold text-amber-700 flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{cuenta('en_curso')}</p>
          <p className="text-xs text-slate-500">En curso</p>
        </Card>
        <Card className="p-3 bg-emerald-50 border-0 shadow-sm text-center">
          <p className="text-lg font-bold text-emerald-700 flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4" />{cuenta('realizada')}</p>
          <p className="text-xs text-slate-500">Realizados</p>
        </Card>
      </div>

      {/* Acciones y filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {FILTROS.map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtro === f.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        {puedeEditar && (
          <Button onClick={() => { setEditando(null); setNuevo('trabajo'); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" />Nuevo trabajo
          </Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <Card className="p-8 text-center bg-white border-0 shadow-sm">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Sin trabajos en este estado</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibles.map(t => (
            <ObraTareaCard
              key={t.id}
              tarea={t}
              onToggle={toggle}
              onEditar={(tarea) => { setNuevo(null); setEditando(tarea); }}
              onBorrar={borrar}
              soloLectura={!puedeTocar(t)}
              puedeBorrar={puedeEditar && (isAdmin || t.creado_por_email === effectiveEmail)}
              mostrarImporte={verEconomia} />
          ))}
        </div>
      )}

      {/* Trabajos extras (administración) */}
      {verEconomia && (
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />Trabajos extras ({extras.length})
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-purple-700">{totalExtras.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              {puedeEditar && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditando(null); setNuevo('extra'); }}>
                  <Plus className="h-3.5 w-3.5" />Añadir extra
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">Trabajos no ofertados que se pasan por hora más materiales.</p>
          {extras.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">Sin trabajos extras</p>
          ) : (
            <div className="space-y-3">
              {extras.map(t => (
                <ObraTareaCard
                  key={t.id}
                  tarea={t}
                  onToggle={toggle}
                  onEditar={(tarea) => { setNuevo(null); setEditando(tarea); }}
                  onBorrar={borrar}
                  soloLectura={!puedeTocar(t)}
                  puedeBorrar={puedeEditar && (isAdmin || t.creado_por_email === effectiveEmail)}
                  mostrarImporte={verEconomia} />
              ))}
            </div>
          )}
        </Card>
      )}

      {editando && (
        <ObraTareaForm
          tarea={editando}
          obraId={obraId}
          obraNombre={obraNombre}
          technicians={technicians}
          permitirExtra={verEconomia}
          mostrarImporte={verEconomia}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          techName={techName}
          onSave={guardar}
          onClose={() => setEditando(null)} />
      )}
      {nuevo && (
        <ObraTareaForm
          tarea={{ tipo: nuevo }}
          obraId={obraId}
          obraNombre={obraNombre}
          technicians={technicians}
          permitirExtra={verEconomia}
          mostrarImporte={verEconomia}
          isSessionTech={isSessionTech}
          effectiveEmail={effectiveEmail}
          techName={techName}
          onSave={guardar}
          onClose={() => setNuevo(null)} />
      )}
    </div>
  );
}