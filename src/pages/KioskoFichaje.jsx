import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Delete, Clock, LogIn, LogOut, Coffee, User, Lock, CheckCircle2, AlertTriangle, ArrowLeft, CalendarDays, Briefcase, Hand, DoorOpen, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from '@/components/kiosko/WeatherWidget';
import HoraConfirmModal from '@/components/kiosko/HoraConfirmModal';

const INACTIVITY_MS = 15000; // auto-reset al salvapantallas tras 15s sin tocar

export default function KioskoFichaje() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(() => (localStorage.getItem('kiosko_company') ? 'screensaver' : 'setup')); // setup | screensaver | pin | tech
  const [pin, setPin] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [technician, setTechnician] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const [now, setNow] = useState(new Date());
  const [pendingAction, setPendingAction] = useState(null); // 'entrada' | 'salida'
  const inactivityTimer = useRef(null);

  // ── Kiosko ligado a una empresa (login de gerente) ──
  const [kioskoCompany, setKioskoCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kiosko_company') || 'null'); } catch { return null; }
  });
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [showChangeCompany, setShowChangeCompany] = useState(false);
  const [changeEmail, setChangeEmail] = useState('');
  const [changePassword, setChangePassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');

  const loginGerente = async (email, password) => {
    const res = await base44.functions.invoke('kioskoFichaje', { action: 'setup_login', email, password });
    const c = { company_id: res.data.company_id, name: res.data.company_name, logo_url: res.data.logo_url };
    localStorage.setItem('kiosko_company', JSON.stringify(c));
    setKioskoCompany(c);
    return c;
  };

  const handleSetupLogin = async () => {
    if (!setupEmail || !setupPassword) { setSetupError('Introduce email y contraseña'); return; }
    setSetupLoading(true); setSetupError('');
    try {
      await loginGerente(setupEmail, setupPassword);
      setSetupEmail(''); setSetupPassword('');
      setScreen('screensaver');
    } catch { setSetupError('Gerente no válido o sin permisos'); }
    finally { setSetupLoading(false); }
  };

  const tryChangeCompany = async () => {
    if (!changeEmail || !changePassword) { setChangeError('Introduce email y contraseña'); return; }
    setChangeLoading(true); setChangeError('');
    try {
      await loginGerente(changeEmail, changePassword);
      setChangeEmail(''); setChangePassword('');
      setShowChangeCompany(false);
      setScreen('screensaver');
    } catch { setChangeError('Gerente no válido'); }
    finally { setChangeLoading(false); }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const resetSession = () => {
    setTechnician(null);
    setTodayRecord(null);
    setSummary(null);
    setShowSummary(false);
    setPin('');
    setSessionPin('');
    setError('');
    setLastAction(null);
    setScreen('screensaver');
  };

  // Auto-reset por inactividad cuando hay sesión de técnico abierta
  useEffect(() => {
    if (screen === 'tech') {
      inactivityTimer.current = setTimeout(resetSession, INACTIVITY_MS);
    }
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [screen, showSummary, lastAction]);

  // (El kiosko se asigna a una empresa mediante login de gerente, sin listado público)

  const pressDigit = (d) => { setError(''); setPin(p => (p.length < 6 ? p + d : p)); };
  const pressDelete = () => { setError(''); setPin(p => p.slice(0, -1)); };

  const doLookupWithPin = async (pinToTry) => {
    if (pinToTry.length < 4) { setError('PIN incompleto'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('kioskoFichaje', { pin: pinToTry, action: 'lookup', company_id: kioskoCompany?.company_id });
      setTechnician(res.data.technician);
      setTodayRecord(res.data.todayRecord);
      setSummary(res.data.summary || null);
      setSessionPin(pinToTry);
      setPin('');
      setShowSummary(false);
      setScreen('tech');
    } catch (err) {
      setError('PIN no válido');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const startAction = (action) => {
    if (!technician || !sessionPin) return;
    setPendingAction(action);
  };

  const performAction = async (action, hora = null, motivo = null) => {
    if (!technician || !sessionPin) return;
    setLoading(true);
    setError('');
    try {
      const payload = { pin: sessionPin, action, company_id: kioskoCompany?.company_id };
      if (hora) { payload.hora = hora; payload.motivo = motivo; }
      const res = await base44.functions.invoke('kioskoFichaje', payload);
      setTodayRecord(res.data.todayRecord);
      setSummary(res.data.summary || null);
      setLastAction({ action, hora: res.data.hora });
      setShowSummary(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al fichar');
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const intervalos = todayRecord?.intervalos || [];
  const ultimo = intervalos[intervalos.length - 1];
  const jornadaActiva = !!ultimo && !ultimo.salida;
  const jornadaFinalizada = !!(todayRecord?.finalizada);
  const jornadaPausada = intervalos.length > 0 && !!ultimo?.salida && !jornadaActiva && !jornadaFinalizada;
  const jornadaNoIniciada = !todayRecord || intervalos.length === 0;

  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const timeNoSeconds = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const fmtFecha = (f) => {
    if (!f) return '';
    const d = new Date(f + 'T00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const todayHours = todayRecord?.horas_efectivas || 0;

  // ── Activar kiosko: el gerente se identifica para ligarlo a su empresa ──
  if (screen === 'setup') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Settings className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-white">Activar kiosko</h1>
            <p className="text-white/60 mt-2 text-sm">Introduce las credenciales de gerente. El kiosko quedará asignado a su empresa y solo sus trabajadores podrán fichar aquí.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Email del gerente</label>
              <input
                type="email"
                value={setupEmail}
                onChange={e => setSetupEmail(e.target.value)}
                placeholder="gerente@empresa.com"
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-white text-lg outline-none placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Contraseña</label>
              <input
                type="password"
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSetupLogin(); }}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-white text-lg outline-none placeholder:text-white/30"
              />
            </div>
            {setupError && <p className="text-red-300 text-sm text-center">{setupError}</p>}
            <button
              onClick={handleSetupLogin}
              disabled={setupLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl py-4 text-xl font-bold text-white transition-all flex items-center justify-center gap-2"
            >
              {setupLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-5 w-5" />}
              {setupLoading ? 'Validando...' : 'Activar kiosko'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Salvapantallas: reloj + tiempo grandes. Tocar para entrar ──
  if (screen === 'screensaver') {
    return (
      <div
        onClick={() => setScreen('pin')}
        className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none cursor-pointer"
      >
        <div className="flex flex-col items-center gap-10">
          {kioskoCompany && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2">
              {kioskoCompany.logo_url ? <img src={kioskoCompany.logo_url} alt="" className="h-6 w-6 rounded object-cover" /> : <Briefcase className="h-5 w-5 text-blue-300" />}
              <span className="text-white font-semibold">{kioskoCompany.name}</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-white font-mono text-9xl font-bold tracking-tight leading-none">{timeNoSeconds}</p>
            <p className="text-white/70 capitalize text-3xl mt-4">{dateStr}</p>
          </div>
          <WeatherWidget size="lg" />
        </div>
        <div className="absolute bottom-12 flex items-center gap-2 text-white/40 animate-pulse">
          <Hand className="h-6 w-6" />
          <span className="text-xl">Toca la pantalla para fichar</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowChangeCompany(true); }}
          title="Cambiar empresa"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-white/30 hover:text-white/70 text-sm transition-colors z-10"
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/'); }}
          title="Salir del kiosco"
          className="absolute top-6 right-6 flex items-center gap-1.5 text-white/30 hover:text-white/70 text-sm transition-colors"
        >
          <DoorOpen className="h-5 w-5" /> Salir
        </button>

        {showChangeCompany && (
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-6">
            <div className="bg-slate-800 border border-white/20 rounded-3xl p-8 max-w-sm w-full">
              <h2 className="text-xl font-bold text-white mb-1">Cambiar de empresa</h2>
              <p className="text-white/60 text-sm mb-4">Introduce las credenciales de gerente de la nueva empresa para reasignar este kiosko.</p>
              <div className="space-y-3">
                <input
                  type="email"
                  value={changeEmail}
                  onChange={e => setChangeEmail(e.target.value)}
                  placeholder="Email del gerente"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
                <input
                  type="password"
                  value={changePassword}
                  onChange={e => setChangePassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') tryChangeCompany(); }}
                  placeholder="Contraseña"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/30"
                />
                {changeError && <p className="text-red-300 text-sm text-center">{changeError}</p>}
                <button onClick={tryChangeCompany} disabled={changeLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 font-bold text-white flex items-center justify-center gap-2">
                  {changeLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Reasignar kiosko
                </button>
                <button onClick={() => { setShowChangeCompany(false); setChangeEmail(''); setChangePassword(''); setChangeError(''); }} className="w-full text-white/50 hover:text-white text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Pantalla de acción / resumen (técnico identificado) ─────
  if (screen === 'tech' && technician) {
    const firstName = technician.name?.split(' ')[0] || 'Técnico';
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
        <div className="absolute top-6 right-6 flex items-center gap-2 text-white/40 z-10">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-mono">{timeStr}</span>
        </div>
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5">
          <button onClick={resetSession} className="text-white/40 hover:text-white/80 text-sm underline underline-offset-2">
            Cerrar sesión
          </button>
          <button
            onClick={() => navigate('/')}
            title="Salir del kiosco"
            className="flex items-center gap-1.5 text-white/30 hover:text-white/70 text-sm transition-colors"
          >
            <DoorOpen className="h-4 w-4" /> Salir del kiosco
          </button>
        </div>

        <div className="mt-10 mb-6">
          <WeatherWidget />
        </div>

        {showSummary && summary ? (
          <div className="w-full max-w-2xl space-y-4">
            {lastAction && (
              <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-6 py-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {lastAction.action === 'entrada' ? 'Jornada iniciada' :
                     lastAction.action === 'pausa' ? 'Pausa registrada' : 'Jornada finalizada'}
                  </p>
                  <p className="text-sm text-emerald-300">a las {lastAction.hora}</p>
                </div>
              </div>
            )}

            {summary.missingAlert && (
              <div className="flex items-start gap-3 bg-red-500/20 border-2 border-red-400/60 rounded-2xl px-5 py-4">
                <AlertTriangle className="h-8 w-8 text-red-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xl font-bold text-red-200">Tienes fichajes pendientes</p>
                  <div className="mt-1.5 space-y-1">
                    {summary.missingAlert.map((m, i) => (
                      <p key={i} className="text-sm text-red-100">
                        · {fmtFecha(m.fecha)} — {m.tipo === 'sin_fichaje' ? 'sin fichar' : 'sin cerrar salida'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {summary.vacationCountdown && summary.vacationCountdown.days <= 30 && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/30 to-blue-500/30 border border-purple-300/40 rounded-2xl px-5 py-4">
                <CalendarDays className="h-9 w-9 text-purple-200 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-white">¡{summary.vacationCountdown.days} días para tus vacaciones!</p>
                  <p className="text-sm text-purple-100">Empiezan el {fmtFecha(summary.vacationCountdown.fecha_inicio)}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
                <Clock className="h-7 w-7 text-blue-300 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{todayHours}h</p>
                <p className="text-xs text-white/60 mt-1">Hoy (efectivas)</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
                <Briefcase className="h-7 w-7 text-emerald-300 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{summary.monthHours}h</p>
                <p className="text-xs text-white/60 mt-1">Este mes</p>
              </div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white/80 mb-3">Últimos fichajes</p>
              <div className="space-y-2">
                {summary.recentRecords.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-2">Sin registros previos</p>
                )}
                {summary.recentRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium capitalize">{fmtFecha(r.fecha)}</p>
                      <p className="text-xs text-white/50">
                        {r.hora_entrada || '--'} → {r.hora_salida || (r.finalizada ? '--' : 'abierta')}
                      </p>
                    </div>
                    <span className="text-sm text-emerald-300 font-semibold shrink-0 ml-2">
                      {r.horas_efectivas ? `${r.horas_efectivas}h` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSummary(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all rounded-2xl py-5 flex items-center justify-center gap-3 shadow-lg shadow-blue-900/40"
            >
              <span className="text-xl font-bold text-white">Hecho</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl px-12 py-10 mb-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {firstName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{firstName}</p>
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

            {!jornadaActiva && (
              <button
                onClick={() => startAction('entrada')}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] transition-all rounded-2xl py-10 mb-4 flex items-center justify-center gap-4 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
              >
                {loading ? <div className="w-9 h-9 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="h-10 w-10 text-white" />}
                <span className="text-3xl font-bold text-white">
                  {jornadaPausada || jornadaFinalizada ? 'Reanudar jornada' : 'Fichar entrada'}
                </span>
              </button>
            )}
            {jornadaActiva && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => performAction('pausa')}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-[0.99] transition-all rounded-2xl py-10 flex items-center justify-center gap-3 shadow-lg shadow-amber-900/40 disabled:opacity-50"
                >
                  {loading ? <div className="w-9 h-9 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Coffee className="h-8 w-8 text-white" />}
                  <span className="text-2xl font-bold text-white">Pausa</span>
                </button>
                <button
                  onClick={() => startAction('salida')}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-500 active:scale-[0.99] transition-all rounded-2xl py-10 flex items-center justify-center gap-3 shadow-lg shadow-red-900/40 disabled:opacity-50"
                >
                  {loading ? <div className="w-9 h-9 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogOut className="h-8 w-8 text-white" />}
                  <span className="text-2xl font-bold text-white">Fichar salida</span>
                </button>
              </div>
            )}
            {jornadaNoIniciada && !jornadaFinalizada && (
              <p className="text-center text-white/40 text-sm mt-6">Pulsa para registrar el inicio de tu jornada</p>
            )}
          </div>
        )}

        <p className="absolute bottom-5 text-white/30 text-xs">
          La sesión se cierra automáticamente por inactividad · RD-ley 8/2019
        </p>

        {pendingAction && (
          <HoraConfirmModal
            tipo={pendingAction}
            horaActual={now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            onConfirm={({ hora, motivo }) => performAction(pendingAction, hora, motivo)}
            onClose={() => setPendingAction(null)}
          />
        )}
      </div>
    );
  }

  // ── Pantalla de PIN ───────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none">
      <button onClick={() => setScreen('screensaver')} className="absolute top-6 left-6 flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors z-10">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>
      <div className="absolute top-6 right-6 flex items-center gap-2 text-white/40">
        <Clock className="h-4 w-4" />
        <span className="text-lg font-mono">{timeStr}</span>
      </div>

      <div className="text-center mb-2">
        <h1 className="text-5xl font-bold text-white tracking-tight">Control Horario</h1>
        {kioskoCompany && <p className="text-blue-300 font-semibold mt-1 text-lg">{kioskoCompany.name}</p>}
        <p className="text-white/60 capitalize mt-2 text-xl">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3 my-6">
        <Lock className="h-6 w-6 text-white/50" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full border-2 ${pin.length > i ? 'bg-blue-400 border-blue-400' : 'border-white/30'}`} />
          ))}
          {pin.length > 4 && (
            <div className="flex gap-2 ml-1">
              {[4, 5].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 ${pin.length > i ? 'bg-blue-400 border-blue-400' : 'border-white/30'}`} />
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

      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl py-8 text-4xl font-semibold text-white border border-white/10 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          onClick={pressDelete}
          disabled={loading || !pin}
          className="bg-white/5 hover:bg-white/15 active:scale-95 transition-all rounded-2xl py-8 flex items-center justify-center border border-white/10 disabled:opacity-30"
        >
          <Delete className="h-7 w-7 text-white/70" />
        </button>
        <button
          onClick={() => pressDigit('0')}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl py-8 text-4xl font-semibold text-white border border-white/10 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={() => doLookupWithPin(pin)}
          disabled={loading || pin.length < 4}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl py-8 flex items-center justify-center border border-blue-400/30 disabled:opacity-40 shadow-lg shadow-blue-900/40"
        >
          {loading ? (
            <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      <p className="absolute bottom-6 text-white/40 text-sm flex items-center gap-1.5">
        <User className="h-4 w-4" />Introduce tu PIN personal · Créalo desde tu perfil si no lo tienes
      </p>
      <button
        onClick={() => navigate('/')}
        title="Salir del kiosco"
        className="absolute bottom-6 left-6 flex items-center gap-1.5 text-white/30 hover:text-white/70 text-sm transition-colors"
      >
        <DoorOpen className="h-4 w-4" /> Salir del kiosco
      </button>
    </div>
  );
}