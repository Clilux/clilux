import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Pencil, Download, Send, CheckCircle, HardHat } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO = {
  borrador: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  firmado: { label: 'Firmado', color: 'bg-emerald-100 text-emerald-700' },
};

export default function AlbaranTrabajoCard({ albaran, onEdit, onDelete }) {
  const navigate = useNavigate();
  const est = ESTADO[albaran.estado] || ESTADO.borrador;
  const fecha = albaran.fecha && isValid(parseISO(albaran.fecha))
    ? format(parseISO(albaran.fecha), "d MMM yyyy", { locale: es })
    : albaran.fecha || '—';

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-slate-700 text-sm">{albaran.numero || 'Sin número'}</span>
            <Badge className={`${est.color} border-0 text-xs`}>{est.label}</Badge>
            {albaran.firma_url && <Badge className="bg-emerald-50 text-emerald-600 border-0 text-xs">Firmado</Badge>}
          </div>
          <p className="text-sm font-medium text-slate-800 truncate">{albaran.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fecha} · {albaran.client_name || 'Sin cliente'}
            {albaran.capitulo && ` · ${albaran.capitulo}`}
          </p>
          {albaran.obra_nombre && (
            <button
              onClick={() => navigate(`/ObraDetail?id=${albaran.obra_id}`)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
            >
              <HardHat className="h-3 w-3" />{albaran.obra_nombre}
            </button>
          )}
          <p className="text-sm font-bold text-slate-800 mt-1">{(albaran.total || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600 gap-1" onClick={() => onEdit(albaran)}>
            <Pencil className="h-3.5 w-3.5" />Editar
          </Button>
          {albaran.documento_url && (
            <a href={albaran.documento_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-8 w-full text-xs text-slate-500 gap-1">
                <Download className="h-3.5 w-3.5" />PDF
              </Button>
            </a>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 gap-1" onClick={() => onDelete(albaran)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}