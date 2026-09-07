import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { getGeoLocation } from '@/lib/horario-utils';

const INTERVAL_MIN = 10;

/**
 * Captura y envía la ubicación GPS del trabajador a intervalos regulares
 * mientras su jornada está activa (intervalo abierto). Solo funciona con
 * la app en primer plano — en iOS la captura se pausa al pasar a background.
 *
 * @param {Object} opts
 * @param {boolean} opts.activo - si la jornada está en curso (intervalo abierto)
 * @param {Object} opts.record - registro horario del día (todayRecord)
 * @param {Function} opts.onUpdate - (id, updates) => Promise
 * @param {number} [opts.intervalMin] - intervalo en minutos (defecto 10)
 */
export function useSeguimientoJornada({ activo, record, onUpdate, intervalMin = INTERVAL_MIN }) {
  const recordRef = useRef(record);
  recordRef.current = record;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!activo) return;
    const intervalMs = Math.max(1, intervalMin) * 60 * 1000;
    let cancelled = false;

    const capturar = async () => {
      if (cancelled) return;
      const rec = recordRef.current;
      if (!rec || !rec.id) return;
      const geo = await getGeoLocation().catch(() => null);
      if (!geo || cancelled) return;
      const hora = format(new Date(), 'HH:mm');
      const geopoints = [...(rec.geopoints || []), { lat: geo.lat, lng: geo.lng, hora, tipo: 'seguimiento' }];
      try {
        await onUpdateRef.current(rec.id, { geopoints });
      } catch { /* silencioso: no interrumpir la jornada por un fallo de seguimiento */ }
    };

    const id = setInterval(capturar, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [activo, intervalMin]);
}