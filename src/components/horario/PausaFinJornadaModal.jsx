import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coffee, Clock } from 'lucide-react';

const QUICK = [15, 30, 45, 60];

export default function PausaFinJornadaModal({ onClose, onConfirm }) {
  const [minutos, setMinutos] = useState(0);
  const [custom, setCustom] = useState('');

  const total = Number(custom || minutos || 0);
  const aplicar = () => onConfirm(Math.max(0, Math.min(480, total)));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-500" /> ¿Has hecho pausa hoy?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-sm text-slate-500">
            Indica los minutos de descanso para descontarlos de la jornada efectiva (Art. 34 ET).
            Si no hiciste pausa, pulsa <span className="font-medium">Sin pausa</span>.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map(m => (
              <Button key={m} type="button"
                variant={minutos === m && !custom ? 'default' : 'outline'}
                onClick={() => { setMinutos(m); setCustom(''); }}
                className={minutos === m && !custom ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}>
                {m}m
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Otra cantidad (minutos)</Label>
            <Input type="number" min={0} max={480} value={custom}
              onChange={e => { setCustom(e.target.value); setMinutos(0); }} placeholder="Ej: 20" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onConfirm(0)} className="flex-1">Sin pausa</Button>
          <Button onClick={aplicar} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
            <Clock className="h-4 w-4 mr-2" /> Descontar {total}m
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}