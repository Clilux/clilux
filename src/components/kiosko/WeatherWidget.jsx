import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Zap, MapPin, X, Search, Loader2 } from 'lucide-react';

const WMO = {
  0: { label: 'Despejado', icon: Sun, color: 'text-amber-300' },
  1: { label: 'Mayormente despejado', icon: Sun, color: 'text-amber-300' },
  2: { label: 'Parcialmente nublado', icon: Cloud, color: 'text-slate-200' },
  3: { label: 'Nublado', icon: Cloud, color: 'text-slate-300' },
  45: { label: 'Niebla', icon: Cloud, color: 'text-slate-300' },
  48: { label: 'Niebla helada', icon: Cloud, color: 'text-slate-300' },
  51: { label: 'Llovizna ligera', icon: CloudRain, color: 'text-blue-300' },
  53: { label: 'Llovizna', icon: CloudRain, color: 'text-blue-300' },
  55: { label: 'Llovizna densa', icon: CloudRain, color: 'text-blue-300' },
  61: { label: 'Lluvia ligera', icon: CloudRain, color: 'text-blue-300' },
  63: { label: 'Lluvia', icon: CloudRain, color: 'text-blue-300' },
  65: { label: 'Lluvia fuerte', icon: CloudRain, color: 'text-blue-400' },
  71: { label: 'Nieve ligera', icon: CloudSnow, color: 'text-cyan-200' },
  73: { label: 'Nieve', icon: CloudSnow, color: 'text-cyan-200' },
  75: { label: 'Nieve fuerte', icon: CloudSnow, color: 'text-cyan-100' },
  80: { label: 'Chubascos', icon: CloudRain, color: 'text-blue-300' },
  81: { label: 'Chubascos fuertes', icon: CloudRain, color: 'text-blue-400' },
  82: { label: 'Chubascos violentos', icon: CloudRain, color: 'text-blue-400' },
  95: { label: 'Tormenta', icon: Zap, color: 'text-yellow-300' },
  96: { label: 'Tormenta con granizo', icon: Zap, color: 'text-yellow-300' },
  99: { label: 'Tormenta severa', icon: Zap, color: 'text-yellow-200' },
};

export default function WeatherWidget() {
  const [city, setCity] = useState(() => localStorage.getItem('kiosko_city') || 'Madrid');
  const [weather, setWeather] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchWeather = async (cityName) => {
    setLoading(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=es&format=json`);
      const geo = await geoRes.json();
      if (!geo.results || !geo.results[0]) { setLoading(false); return; }
      const g = geo.results[0];
      const fcRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max&current=temperature_2m,weathercode&timezone=auto&forecast_days=1`);
      const fc = await fcRes.json();
      setWeather({ name: g.name, current: fc.current, daily: fc.daily });
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchWeather(city); }, [city]);

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=8&language=es&format=json`);
      const j = await r.json();
      setResults(j.results || []);
    } catch (e) {}
    setSearching(false);
  };

  const pickCity = (c) => {
    setCity(c.name);
    localStorage.setItem('kiosko_city', c.name);
    setPickerOpen(false);
    setSearch('');
    setResults([]);
  };

  const code = weather?.current?.weathercode ?? 0;
  const info = WMO[code] || WMO[0];
  const Icon = info.icon;

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-4 py-2.5 transition-all"
      >
        {loading ? (
          <Loader2 className="h-6 w-6 text-white/60 animate-spin" />
        ) : (
          <Icon className={`h-6 w-6 ${info.color}`} />
        )}
        <div className="text-left">
          <p className="text-white text-lg font-bold leading-none">
            {weather?.current?.temperature_2m != null ? `${Math.round(weather.current.temperature_2m)}°` : '--°'}
          </p>
          <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" />{weather?.name || city}
          </p>
        </div>
        {weather?.daily && (
          <div className="text-white/50 text-xs ml-1 border-l border-white/20 pl-3">
            <p>{info.label}</p>
            <p className="mt-0.5">{Math.round(weather.daily.temperature_2m_max[0])}° / {Math.round(weather.daily.temperature_2m_min[0])}°</p>
          </div>
        )}
      </button>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Elige tu ciudad</h3>
              <button onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="Buscar ciudad..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm"
                autoFocus
              />
              <button onClick={doSearch} className="bg-blue-600 text-white px-3 rounded-lg">
                <Search className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {searching && (
                <p className="text-center text-slate-400 text-sm py-4 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                </p>
              )}
              {!searching && results.map(c => (
                <button key={c.id} onClick={() => pickCity(c)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{c.name}{c.country ? `, ${c.country}` : ''}</span>
                </button>
              ))}
              {!searching && results.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Busca tu ciudad para ver el tiempo</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}