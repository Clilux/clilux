import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { getLastPosition } from '@/lib/horario-utils';

/**
 * Mapa con la última posición conocida de cada trabajador en jornada.
 * Marcadores: verde = trabajando, ámbar = pausado.
 * Al pulsar un marcador se abre el detalle del trabajador.
 */
export default function MapaEquipo({ rows = [], onSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const markers = rows
    .map(r => ({ ...r, pos: getLastPosition(r.todayRec) }))
    .filter(r => r.pos && r.status.key !== 'inactive' && r.status.key !== 'finalizada' && r.status.key !== 'no_iniciado');

  const depKey = markers.map(m => `${m.tech.id}:${m.pos.hora}:${m.status.key}`).join('|');

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    let cancelled = false;

    const load = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      await new Promise(r => setTimeout(r, 100));
      if (cancelled || !mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const coords = [];
      markers.forEach(r => {
        const isWorking = r.status.key === 'trabajando';
        const color = isWorking ? '#10b981' : '#f59e0b';
        const label = isWorking ? '●' : '◐';
        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const m = L.marker([r.pos.lat, r.pos.lng], { icon }).addTo(map)
          .bindPopup(`<b>${r.tech.name}</b><br/>${r.status.label}<br/>Últ. posición: ${r.pos.hora || '—'}`);
        m.on('click', () => onSelect && onSelect(r.tech));
        coords.push([r.pos.lat, r.pos.lng]);
      });

      if (coords.length === 1) map.setView(coords[0], 13);
      else map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    };

    load();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  if (markers.length === 0) {
    return (
      <div className="h-40 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
        <MapPin className="h-4 w-4" />
        Ningún trabajador con ubicación disponible
      </div>
    );
  }

  return (
    <div ref={mapRef} className="h-72 rounded-xl overflow-hidden border border-slate-200 z-0" />
  );
}