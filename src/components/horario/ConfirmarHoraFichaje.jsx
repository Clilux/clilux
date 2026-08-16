import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Check, AlertTriangle } from 'lucide-react';

export default function ConfirmarHoraFichaje({ tipo, horaActual, onConfirm, onClose }) {
  const [ajustar, setAjustar] = useState(false);
  const [hora, setHora] = useState(horaActual);
  const [motivo, setMotivo] = useState('');

  const titulo = tipo === 'entrada' ? 'Fichar entrada' : 'Fichar salida';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" /> {titulo}
          </DialogTitle>
        </DialogHeader>

        {!ajustar ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm mb-2">Hora a la que fichas</p>
              <p className="text-5xl font-bold text-slate-800 font-mono">{horaActual}</p>
              <p className="text-slate-400 text-xs mt-2">Hora actual del sistema</p>
            </div>
            <div className="space-y-2">
              <Button onClick={() => onConfirm({ hora: null, motivo: null, ajustada: false })} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12">
                <Check className="h-4 w-4 mr-2" /> Fichar con esta hora
              </Button>
              <Button variant="outline" onClick={() => setAjustar(true)} className="w-full h-12">
                <Clock className="h-4 w-4 mr-2" /> Modificar la hora
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Hora real de {tipo === 'entrada' ? 'entrada' : 'salida'}</Label>
              <Input type="time" value={hora} onChange={e => setHora(e.target.value)} className="text-2xl font-mono text-center h-12" autoFocus />
            </div>
            <div>
              <Label className="mb-1.5">Motivo del ajuste <span className="text-amber-600">(obligatorio)</span></Label>
              <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: me olvidé de fichar, retraso por tráfico, etc." rows={3} />
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> El ajuste queda registrado en el historial para auditoría (cumplimiento legal).
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAjustar(false)} className="flex-1">Volver</Button>
              <Button
                onClick={() => motivo.trim() && onConfirm({ hora, motivo: motivo.trim(), ajustada: true })}
                disabled={!motivo.trim() || !hora}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Confirmar hora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}