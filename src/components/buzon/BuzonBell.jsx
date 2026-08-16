import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { listarNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from '@/lib/buzon';

export default function BuzonBell({ email, className, iconClassName, label }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifs = [] } = useQuery({
    queryKey: ['buzon', email],
    queryFn: () => listarNotificaciones(email),
    enabled: !!email,
    refetchInterval: 30000,
  });
  const noLeidas = notifs.filter(n => !n.leida).length;

  const abrir = async (n) => {
    if (!n.leida) await marcarNotificacionLeida(email, n.id);
    queryClient.invalidateQueries({ queryKey: ['buzon', email] });
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const todas = async () => {
    await marcarTodasLeidas(email);
    queryClient.invalidateQueries({ queryKey: ['buzon', email] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('relative', className)} title="Buzón de notificaciones">
          <Bell className={iconClassName} />
          {label && <span className="text-[10px] leading-none">{label}</span>}
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center border border-white">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <p className="font-semibold text-sm text-slate-700">Buzón</p>
          {noLeidas > 0 && (
            <button onClick={todas} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" />Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              Sin notificaciones
            </div>
          ) : notifs.slice(0, 30).map(n => (
            <button key={n.id} onClick={() => abrir(n)}
              className={cn('w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-2', !n.leida && 'bg-blue-50/40')}>
              <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.leida ? 'bg-transparent' : 'bg-blue-500')} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700">{n.titulo}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{n.mensaje}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: es }) : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}