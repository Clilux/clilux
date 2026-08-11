import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Delete, Clock, LogIn, LogOut, Coffee, User, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

const INACTIVITY_MS = 12000; // auto-reset a la pantalla PIN tras 12s sin tocar

export default function KioskoFichaje() {
  const [pin, setPin] = useState('');
  const [sessionPin, setSessionPin] = useState(''); // PIN validado, en memoria durante la sesión
  const [technician, setTechnician] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const [now, setNow] = useState(new Date());
  const inactivityTimer = useRef(null);

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const resetSession = () => {
    setTechnician(null);
    setTodayRecord(null);
    setPin('');
    setSessionPin('');
    setError('');
    setLastAction(null);
  };

  // Auto-reset por inactividad cuando hay sesión abierta
  useEffect(() => {
    if (technician) {
      inactivityTimer.current = setTimeout(resetSession, INACTIVITY_MS);
    }
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [technician]);

  const pressDigit = (d) => {
    setError('');
    setPin(p => (p.length < 6 ? p + d : p));
  };
  const pressDelete = () => { setError(''); setPin(p => p.slice(0, -1)); };

  const doLookupWithPin = async (pinToTry) => {
    if (pinToTry.length < 4) { setError('PIN incompleto'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('kioskoFichaje', { pin: pinToTry, action: 'lookup' });
      setTechnician(res.data.technician);
      setTodayRecord(res.data.todayRecord);
      setSessionPin(pinToTry);
      setPin('');
    } catch (err) {
      setError('PIN no válido');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action) => {
    if (!technician || !sessionPin) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('kioskoFichaje', { pin: sessionPin, action });
      setTodayRecord(res.data.todayRecord);
      setLastAction({ action, hora: res.data.hora });
      setTimeout(() => setLastAction(null), 4000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al fichar');
    } finally {
      setLoading(false);
    }
  };

  const intervalos = todayRecord?.intervalos || [];
  const ultimo = intervalos[intervalos.length - 1];
  const jornadaActiva = !!ultimo && !ultimo.salida;
  const jornadaFinalizada = !!(todayRecord?.finalizada);
  const jornadaPausada = intervalos.length > 0 && !!ultimo?.salida && !jornadaActiva && !jornadaFinalizada;
  const jornadaNoIniciada = !todayRecord || intervalos.length === 0;

  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Pantalla de acción (técnico identificado) ──────────────
  if (technician) {
    const firstName = technician.name?.split(' ')[0] || 'Técnico';
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none">
        <div className="absolute top-6 right-6 flex items-center gap-2 text-white/40">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-mono">{timeStr}</span>
        </div>
        <div className="absolute top-6 left-6">
          <button onClick={resetSession} className="text-white/40 hover:text-white/80 text-sm underline underline-offset-2">
            Cerrar sesión
          </button>
        </div>

        {lastAction && (
          <div className="mb-6 flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-6 py-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-white">
                {lastAction.action === 'entrada' ? 'Jornada iniciada' :
                 lastAction.action === 'pausa' ? 'Pausa registrada' :
                 'Jornada finalizada'}
              </p>
              <p className="text-sm text-emerald-300">a las {lastAction.hora}</p>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl px-10 py-8 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {firstName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{firstName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${jornadaActiva ? 'bg-emerald-400 animate-pulse' : jornadaPausada ? 'bg-amber-400' : jornadaFinalizada ? 'bg-slate-400' : 'bg-red-400'}`} />
              <span className="text-sm text-white/70">
                {jornadaActiva ? `En jornada desde ${ultimo?.entrada}` :
                 jornadaPausada ? 'En pausa' :
                 jornadaFinalizada ? `Finalizada · ${todayRecord?.horas_efectivas || 0}h` :
                 'Sin fichar hoy'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-300 text-sm">
            <AlertTriangle className="h-4 w-4" />{error}
          </div>
        )}

        <div className="w-full max-w-3xl">
          {!jornadaActiva && (
            <button
              onClick={() => performAction('entrada')}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] transition-all rounded-2xl py-8 mb-4 flex items-center justify-center gap-4 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
            >
              <LogIn className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold text-white">
                {jornadaPausada || jornadaFinalizada ? 'Reanudar jornada' : 'Fichar entrada'}
              </span>
            </button>
          )}
          {jornadaActiva && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => performAction('pausa')}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 active:scale-[0.99] transition-all rounded-2xl py-8 flex items-center justify-center gap-3 shadow-lg shadow-amber-900/40 disabled:opacity-50"
              >
                <Coffee className="h-7 w-7 text-white" />
                <span className="text-xl font-bold text-white">Pausa</span>
              </button>
              <button
                onClick={() => performAction('salida')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 active:scale-[0.99] transition-all rounded-2xl py-8 flex items-center justify-center gap-3 shadow-lg shadow-red-900/40 disabled:opacity-50"
              >
                <LogOut className="h-7 w-7 text-white" />
                <span className="text-xl font-bold text-white">Fichar salida</span>
              </button>
            </div>
          )}
          {jornadaNoIniciada && !jornadaFinalizada && (
            <p className="text-center text-white/40 text-sm mt-6">Pulsa para registrar el inicio de tu jornada</p>
          )}
        </div>

        <p className="absolute bottom-5 text-white/30 text-xs">
          La sesión se cierra automáticamente por inactividad · RD-ley 8/2019
        </p>
      </div>
    );
  }

  // ── Pantalla de PIN ───────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none">
      <div className="absolute top-6 right-6 flex items-center gap-2 text-white/40">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-mono">{timeStr}</span>
      </div>

      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Kiosko de Fichaje</h1>
        <p className="text-white/50 capitalize mt-1">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3 my-8">
        <Lock className="h-5 w-5 text-white/40" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-blue-400 border-blue-400' : 'border-white/30'}`} />
          ))}
          {pin.length > 4 && (
            <div className="flex gap-2 ml-1">
              {[4, 5].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-blue-400 border-blue-400' : 'border-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl py-6 text-3xl font-semibold text-white border border-white/10 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          onClick={pressDelete}
          disabled={loading || !pin}
          className="bg-white/5 hover:bg-white/15 active:scale-95 transition-all rounded-2xl py-6 flex items-center justify-center border border-white/10 disabled:opacity-30"
        >
          <Delete className="h-6 w-6 text-white/70" />
        </button>
        <button
          onClick={() => pressDigit('0')}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl py-6 text-3xl font-semibold text-white border border-white/10 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={() => doLookupWithPin(pin)}
          disabled={loading || pin.length < 4}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl py-6 flex items-center justify-center border border-blue-400/30 disabled:opacity-40 shadow-lg shadow-blue-900/40"
        >
          {loading ? (
            <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      <p className="absolute bottom-5 text-white/30 text-xs flex items-center gap-1.5">
        <User className="h-3 w-3" />Introduce tu PIN personal · Pídelo al administrador si no lo recuerdas
      </p>
    </div>
  );
}