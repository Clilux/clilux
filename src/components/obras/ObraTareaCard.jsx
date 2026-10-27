import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, Loader2, Pencil, Trash2, Calendar, User, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600' },
  en_curso: { label: 'En curso', color: 'bg-amber-100 text-amber-700' },
  realizada: { label: 'Realizado', color: 'bg-emerald-100 text-emerald-700' },
};

/** Un trabajo de la obra, con su check de realizado. */
export default function ObraTareaCard({ tarea, onToggle, onEditar, onBorrar, puedeBorrar, soloLectura = false, mostrarImporte }) {
  const cfg = ESTADOS[tarea.estado] || ESTADOS.pendiente;
  const realizada = tarea.estado === 'realizada';
  const materiales = tarea.materiales || [];

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(tarea)}
          disabled={soloLectura}
          title={soloLectura ? undefined : (realizada ? 'Marcar como pendiente' : 'Marcar como realizado')}
          className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            realizada ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'
          }`}>
          <Check className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${realizada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{tarea.titulo}</span>
            <Badge className={`${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
            {tarea.tipo === 'extra' && (
              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs gap-1"><Zap className="h-3 w-3" />Trabajo extra</Badge>
            )}
          </div>

          {tarea.descripcion && <p className="text-sm text-slate-600 mt-1">{tarea.descripcion}</p>}

          <div className="flex items-center gap-3 flex-wrap mt-2 text-xs text-slate-400">
            {tarea.fecha_prevista && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(tarea.fecha_prevista), "d MMM", { locale: es })}</span>
            )}
            {tarea.asignado_nombre && <span className="flex items-center gap-1"><User className="h-3 w-3" />{tarea.asignado_nombre}</span>}
            {realizada && tarea.fecha_realizada && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" />{format(parseISO(tarea.fecha_realizada), "d MMM yyyy", { locale: es })}
                {tarea.realizada_por && ` · ${tarea.realizada_por}`}
              </span>
            )}
            {tarea.estado === 'en_curso' && <span className="flex items-center gap-1 text-amber-600"><Clock className="h-3 w-3" />En ejecución</span>}
          </div>

          {tarea.tipo === 'extra' && (
            <div className="mt-2 text-xs text-slate-500 bg-purple-50 rounded-lg p-2">
              <span>{Number(tarea.horas || 0).toLocaleString('es-ES')} h × {Number(tarea.precio_hora || 0).toLocaleString('es-ES')} €/h</span>
              {materiales.length > 0 && <span> · {materiales.length} material(es)</span>}
              {mostrarImporte && <span className="font-bold text-purple-700 ml-2">{Number(tarea.importe_extra || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
            </div>
          )}

          {(tarea.fotos || []).length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {tarea.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {!soloLectura && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600" onClick={() => onEditar(tarea)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {puedeBorrar && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-300 hover:text-red-500" onClick={() => onBorrar(tarea)} title="Eliminar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}