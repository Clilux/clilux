import React, { useEffect, useRef } from 'react';

// Dibuja el trayecto del día usando la API de Leaflet
export default function MapaTrayecto({ geopoints = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || geopoints.length === 0) return;

    // Cargar Leaflet dinámicamente
    const loadLeaflet = async () => {
      // Añadir CSS de Leaflet si no está
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Esperar a que Leaflet esté disponible
      await new Promise(r => setTimeout(r, 100));

      const L = (await import('leaflet')).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const coords = geopoints.map(p => [p.lat, p.lng]);

      // Dibujar la línea de trayecto
      if (coords.length > 1) {
        L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
      }

      // Markers para cada punto
      geopoints.forEach((p, i) => {
        const isFirst = i === 0;
        const isLast = i === geopoints.length - 1;
        const color = isFirst ? '#10b981' : isLast ? '#ef4444' : '#6366f1';
        const label = p.tipo === 'entrada' ? '▶' : p.tipo === 'salida' ? '■' : '●';

        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${label}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${p.tipo || 'punto'}</b><br/>${p.hora || ''}`);
      });

      // Ajustar vista
      map.fitBounds(coords.length > 1 ? L.latLngBounds(coords) : [[coords[0][0], coords[0][1]]], { padding: [20, 20] });
      if (coords.length === 1) map.setZoom(14);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geopoints]);

  if (geopoints.length === 0) {
    return (
      <div className="h-32 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs">
        Sin puntos GPS registrados
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div ref={mapRef} className="h-52 rounded-lg overflow-hidden border border-slate-200 z-0" />
      <div className="flex gap-3 text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Entrada</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Salida</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Intermedio</span>
        <span className="ml-auto">{geopoints.length} puntos</span>
      </div>
    </div>
  );
}