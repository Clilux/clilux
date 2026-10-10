import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { enviarPresupuesto } from '@/lib/presupuesto-envio';
import { euros } from '@/lib/erp-config';

/** Envío de un presupuesto por email, con el destinatario siempre a la vista. */
export default function EnviarPresupuestoModal({ open, onClose, presupuesto, client, empresa, sessionTechEmail, onSent }) {
  const p = presupuesto || {};
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) setEmail(client?.email || '');
  }, [open, client]);

  const enviar = async () => {
    setEnviando(true);
    try {
      const res = await enviarPresupuesto({ presupuesto: p, client, empresa, sessionTechEmail, to: email.trim() });
      toast.success(`Presupuesto enviado a ${res.to}`);
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e.message || 'No se pudo enviar el presupuesto');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Enviar presupuesto {p.numero || ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
            <p className="text-sm text-slate-600">{client?.name || p.cliente_nombre || '—'}</p>
            <p className="text-lg font-bold text-indigo-700">{euros(p.total)}</p>
          </div>

          <div>
            <Label>Email del destinatario</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1"
              placeholder="cliente@email.com"
            />
            {!client?.email && (
              <p className="text-xs text-amber-600 mt-1">
                Este cliente no tiene email en su ficha: escribe uno para poder enviarlo.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={enviar}
              disabled={enviando || !email.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}