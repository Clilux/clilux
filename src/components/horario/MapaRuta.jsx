import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const entradaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const salidaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

export default function MapaRuta({ registro }) {
  const points = useMemo(() => {
    const pts = [];
    if (registro.ubicacion_entrada) {
      const [lat, lng] = registro.ubicacion_entrada.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) pts.push({ lat, lng, tipo: 'entrada', hora: registro.hora_entrada });
    }
    if (registro.geopoints?.length) {
      registro.geopoints.forEach(g => {
        if (g.lat && g.lng && g.tipo !== 'entrada' && g.tipo !== 'salida') {
          pts.push(g);
        }
      });
    }
    if (registro.ubicacion_salida) {
      const [lat, lng] = registro.ubicacion_salida.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) pts.push({ lat, lng, tipo: 'salida', hora: registro.hora_salida });
    }
    return pts;
  }, [registro]);

  if (points.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-4">Sin datos de ubicación</p>;
  }

  const center = [points[0].lat, points[0].lng];
  const polyline = points.map(p => [p.lat, p.lng]);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: 220 }}>
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {polyline.length > 1 && <Polyline positions={polyline} color="#3b82f6" weight={3} />}
        {points.map((p, i) => (
          <Marker
            key={i}
            position={[p.lat, p.lng]}
            icon={p.tipo === 'entrada' ? entradaIcon : p.tipo === 'salida' ? salidaIcon : new L.Icon.Default()}
          >
            <Popup>{p.tipo} {p.hora ? `· ${p.hora}` : ''}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}