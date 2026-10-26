import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

function formatCrono(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Cuenta de tiempo en vivo de la jornada de hoy.
 * - Cronómetro del tramo abierto (desde su hora de entrada).
 * - Tiempo efectivo acumulado del día (tramos menos pausas).
 */
export default function ContadorJornada({ registro }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const tramos = registro?.intervalos || [];
  if (tramos.length === 0) return null;

  const baseDate = registro?.fecha
    ? new Date(`${registro.fecha}T00:00:00`)
    : new Date();
  const segundosDelDia = Math.max(0, (now - baseDate.getTime()) / 1000);
  const segundosDeHora = (hhmm) => {
    if (!hhmm) return 0;
    const [h, m] = String(hhmm).split(':').map(Number);
    return (h * 60 + m) * 60;
  };

  let totalSeg = 0;
  let tramoActualSeg = 0;
  let ultimoTramoSeg = 0;
  let hayTramoAbierto = false;

  tramos.forEach(t => {
    if (!t.entrada) return;
    const ini = segundosDeHora(t.entrada);
    const fin = t.salida ? segundosDeHora(t.salida) : segundosDelDia;
    const diff = Math.max(0, fin - ini);
    totalSeg += diff;
    ultimoTramoSeg = diff;
    if (!t.salida) {
      hayTramoAbierto = true;
      tramoActualSeg = diff;
    }
  });

  const pausaSeg = (registro?.minutos_pausa || 0) * 60;
  const efectivoSeg = Math.max(0, totalSeg - pausaSeg);

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className={`rounded-xl px-3 py-2.5 ${hayTramoAbierto ? 'bg-emerald-600' : 'bg-amber-500'}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Timer className="h-3 w-3 text-white/70" />
          <span className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">
            {hayTramoAbierto ? 'Tramo en curso' : 'Último tramo'}
          </span>
        </div>
        <p className="font-mono text-xl font-bold text-white leading-none tabular-nums">
          {formatCrono(hayTramoAbierto ? tramoActualSeg : ultimoTramoSeg)}
        </p>
      </div>
      <div className="rounded-xl px-3 py-2.5 bg-slate-100">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Timer className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Efectivo hoy</span>
        </div>
        <p className="font-mono text-xl font-bold text-slate-700 leading-none tabular-nums">{formatCrono(efectivoSeg)}</p>
      </div>
    </div>
  );
}