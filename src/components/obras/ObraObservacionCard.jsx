import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Eye, Trash2, Pencil, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const GRAVEDAD = {
  baja: { label: 'Gravedad baja', color: 'bg-slate-100 text-slate-600' },
  media: { label: 'Gravedad media', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Gravedad alta', color: 'bg-red-100 text-red-700' },
};

/** Observación o incidencia registrada en la obra, con sus fotos. */
export default function ObraObservacionCard({ observacion, onResolver, onEditar, onBorrar, puedeBorrar }) {
  const esIncidencia = observacion.tipo === 'incidencia';
  const resuelta = observacion.estado === 'resuelta';
  const [resolviendo, setResolviendo] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const g = GRAVEDAD[observacion.gravedad] || GRAVEDAD.media;

  const confirmarResolucion = async () => {
    setGuardando(true);
    try {
      await onResolver(observacion, texto);
      setResolviendo(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${esIncidencia ? 'bg-red-50' : 'bg-blue-50'}`}>
          {esIncidencia ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Eye className="h-4 w-4 text-blue-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-800">{observacion.titulo}</span>
            <Badge className={`border-0 text-xs ${esIncidencia ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {esIncidencia ? 'Incidencia' : 'Observación'}
            </Badge>
            {esIncidencia && <Badge className={`${g.color} border-0 text-xs`}>{g.label}</Badge>}
            {resuelta && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Resuelta</Badge>}
          </div>

          {observacion.descripcion && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{observacion.descripcion}</p>}

          <p className="text-xs text-slate-400 mt-2">
            {observacion.fecha && format(parseISO(observacion.fecha), "d MMM yyyy", { locale: es })}
            {observacion.registrado_por && ` · ${observacion.registrado_por}`}
          </p>

          {(observacion.fotos || []).length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {observacion.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}

          {resuelta && observacion.resolucion && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
              <span className="font-medium">Resolución:</span> {observacion.resolucion}
              {observacion.resuelta_por && <span className="text-emerald-600"> · {observacion.resuelta_por}</span>}
            </div>
          )}

          {resolviendo && !resuelta && (
            <div className="mt-3 space-y-2">
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Cómo se ha resuelto..."
                value={texto}
                onChange={e => setTexto(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setResolviendo(false)}>Cancelar</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmarResolucion} disabled={guardando}>
                  {guardando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Marcar resuelta
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {!resuelta && !resolviendo && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-600 gap-1" onClick={() => setResolviendo(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" />Resolver
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600" onClick={() => onEditar(observacion)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {puedeBorrar && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-300 hover:text-red-500" onClick={() => onBorrar(observacion)} title="Eliminar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}