import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff,
  ArrowLeft, Home, Zap, ToggleLeft, Blinds, Thermometer,
  Lightbulb, CheckCircle, XCircle, Loader2, ChevronRight,
  AlertTriangle, Info, Radio, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// ─── Material Design tokens ───────────────────────────────────
const MD = {
  primary: '#1565C0',       // Blue 800
  primaryLight: '#1976D2',  // Blue 700
  primarySurface: '#E3F2FD',// Blue 50
  secondary: '#00897B',     // Teal 600
  secondarySurface: '#E0F2F1',
  error: '#C62828',
  errorSurface: '#FFEBEE',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  outline: '#E0E0E0',
  onSurface: '#212121',
  onSurfaceMid: '#616161',
  onSurfaceLow: '#9E9E9E',
};

const CONTROL_ICONS = {
  LightController: Lightbulb,
  Switch: ToggleLeft,
  Jalousie: Blinds,
  IRoomController: Thermometer,
  AalSmartAlarm: Zap,
  default: Zap,
};

const CONTROL_LABELS = {
  LightController: 'Luces',
  Switch: 'Interruptor',
  Jalousie: 'Persianas',
  IRoomController: 'Termostato',
  TimedSwitch: 'Temporizador',
  Pushbutton: 'Pulsador',
  VirtualInput: 'Entrada Virtual',
  AalSmartAlarm: 'Alarma',
};

const COMMANDS = {
  Switch:          [{ label: 'ON', cmd: 'On', bg: '#2E7D32', fg: '#fff' }, { label: 'OFF', cmd: 'Off', bg: '#ECEFF1', fg: '#546E7A' }],
  LightController: [{ label: 'ON', cmd: 'On', bg: '#F57F17', fg: '#fff' }, { label: 'OFF', cmd: 'Off', bg: '#ECEFF1', fg: '#546E7A' }],
  Jalousie:        [{ label: '▲ Subir', cmd: 'Up', bg: '#1565C0', fg: '#fff' }, { label: '▼ Bajar', cmd: 'Down', bg: '#E65100', fg: '#fff' }, { label: '■ Parar', cmd: 'Stop', bg: '#ECEFF1', fg: '#546E7A' }],
  TimedSwitch:     [{ label: 'Pulsar', cmd: 'Pulse', bg: '#6A1B9A', fg: '#fff' }, { label: 'ON', cmd: 'On', bg: '#2E7D32', fg: '#fff' }, { label: 'OFF', cmd: 'Off', bg: '#ECEFF1', fg: '#546E7A' }],
  Pushbutton:      [{ label: 'Pulsar', cmd: 'Pulse', bg: '#6A1B9A', fg: '#fff' }],
  default:         [{ label: 'ON', cmd: 'On', bg: '#2E7D32', fg: '#fff' }, { label: 'OFF', cmd: 'Off', bg: '#ECEFF1', fg: '#546E7A' }],
};

const EMPTY_FORM = { nombre_referencia: '', miniserver_ip: '', puerto: '80', usuario: '', password: '', location: '', notas: '' };

const STEPS = [
  {
    id: 1,
    title: 'Nombre y ubicación',
    subtitle: 'Identifica tu Miniserver',
    icon: '🏷️',
  },
  {
    id: 2,
    title: 'Dirección de red',
    subtitle: 'Dónde está el Miniserver',
    icon: '🌐',
  },
  {
    id: 3,
    title: 'Credenciales',
    subtitle: 'Usuario y contraseña',
    icon: '🔐',
  },
  {
    id: 4,
    title: 'Prueba de conexión',
    subtitle: 'Verifica que todo funciona',
    icon: '✅',
  },
];

// ─── Sub-components ───────────────────────────────────────────

function MdButton({ children, onClick, disabled, variant = 'filled', color = MD.primary, size = 'md', className = '' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
  const base = `inline-flex items-center gap-2 font-medium rounded-full transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${pad} ${className}`;
  if (variant === 'filled') return (
    <button onClick={onClick} disabled={disabled}
      className={base}
      style={{ background: disabled ? '#BDBDBD' : color, color: '#fff', boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,.2)' }}>
      {children}
    </button>
  );
  if (variant === 'tonal') return (
    <button onClick={onClick} disabled={disabled}
      className={base}
      style={{ background: MD.primarySurface, color: MD.primary }}>
      {children}
    </button>
  );
  // outlined
  return (
    <button onClick={onClick} disabled={disabled}
      className={base}
      style={{ border: `1px solid ${MD.outline}`, background: 'transparent', color: MD.onSurfaceMid }}>
      {children}
    </button>
  );
}

function MdInput({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium" style={{ color: MD.onSurfaceMid }}>{label}</label>}
      <input
        {...props}
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2"
        style={{ borderColor: MD.outline, background: MD.surface, color: MD.onSurface, '--tw-ring-color': MD.primary }}
      />
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
      style={{
        background: active ? MD.primary : MD.surface,
        color: active ? '#fff' : MD.onSurfaceMid,
        borderColor: active ? MD.primary : MD.outline,
      }}>
      {label}
    </button>
  );
}

function ControlCard({ ctrl, sendingCmd, onSend }) {
  const Icon = CONTROL_ICONS[ctrl.type] || CONTROL_ICONS.default;
  const cmds = COMMANDS[ctrl.type] || COMMANDS.default;
  const typeLabel = CONTROL_LABELS[ctrl.type] || ctrl.type;

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: MD.surface, borderColor: MD.outline, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: MD.primarySurface }}>
          <Icon size={18} style={{ color: MD.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate" style={{ color: MD.onSurface }}>{ctrl.name}</p>
          {ctrl.room && <p className="text-xs truncate" style={{ color: MD.onSurfaceLow }}>{ctrl.room}</p>}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: MD.surfaceVariant, color: MD.onSurfaceMid }}>
          {typeLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
        {cmds.map(({ label, cmd, bg, fg }) => {
          const key = `${ctrl.uuid}_${cmd}`;
          const busy = sendingCmd[key];
          return (
            <button key={cmd} disabled={busy} onClick={() => onSend(ctrl, cmd)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
              style={{ background: busy ? '#BDBDBD' : bg, color: fg, cursor: busy ? 'wait' : 'pointer' }}>
              {busy && <Loader2 size={12} className="animate-spin" />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function ControlLoxone() {
  const navigate = useNavigate();
  const [devices, setDevices]             = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [controls, setControls]           = useState([]);
  const [rooms, setRooms]                 = useState([]);
  const [selectedRoom, setSelectedRoom]   = useState('all');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingControls, setLoadingControls] = useState(false);
  const [controlsError, setControlsError] = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [testingConn, setTestingConn]     = useState(false);
  const [testResult, setTestResult]       = useState(null);
  const [sendingCmd, setSendingCmd]       = useState({});
  const [wizardStep, setWizardStep]       = useState(1);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copiedUrl, setCopiedUrl]         = useState(false);

  const WEBHOOK_URL = `${window.location.origin}/api/functions/loxoneWebhook`;
  const copyUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    const list = await base44.entities.LoxoneDevice.list('-created_date', 50);
    setDevices(list);
    setLoadingDevices(false);
  };

  const loadControls = async (device) => {
    setSelectedDevice(device);
    setControls([]); setRooms([]); setSelectedRoom('all'); setControlsError('');
    setLoadingControls(true);
    try {
      const res = await base44.functions.invoke('loxoneProxy', { action: 'get_structure', device_id: device.id });
      setControls(res.data.controls || []);
      setRooms(res.data.rooms || []);
    } catch (e) {
      setControlsError(e.message || 'Error al conectar con el Miniserver');
    }
    setLoadingControls(false);
  };

  const sendCommand = async (ctrl, cmd) => {
    const key = `${ctrl.uuid}_${cmd}`;
    setSendingCmd(p => ({ ...p, [key]: true }));
    try {
      await base44.functions.invoke('loxoneProxy', {
        action: 'send_command',
        device_id: selectedDevice.id,
        params: { uuid: ctrl.uuid, command: cmd },
      });
    } catch (e) { alert(e.message || 'Error al enviar comando'); }
    setSendingCmd(p => ({ ...p, [key]: false }));
  };

  const testConnection = async () => {
    if (!formData.miniserver_ip || !formData.usuario || !formData.password) return;
    setTestingConn(true); setTestResult(null);
    try {
      const tmp = await base44.entities.LoxoneDevice.create({ ...formData, nombre_referencia: '__test__', activo: false });
      try {
        await base44.functions.invoke('loxoneProxy', { action: 'test_connection', device_id: tmp.id });
        setTestResult({ ok: true, msg: '¡Conexión exitosa!' });
      } catch (e) {
        setTestResult({ ok: false, msg: e.message || 'No se pudo conectar' });
      }
      await base44.entities.LoxoneDevice.delete(tmp.id);
    } catch (e) { setTestResult({ ok: false, msg: e.message }); }
    setTestingConn(false);
  };

  const saveDevice = async () => {
    if (!formData.nombre_referencia || !formData.miniserver_ip || !formData.usuario || !formData.password) return;
    setSaving(true);
    if (editingDevice) {
      await base44.entities.LoxoneDevice.update(editingDevice.id, formData);
    } else {
      await base44.entities.LoxoneDevice.create({ ...formData, activo: true });
    }
    setSaving(false); setShowForm(false); loadDevices();
  };

  const deleteDevice = async (device) => {
    if (!confirm(`¿Eliminar "${device.nombre_referencia}"?`)) return;
    await base44.entities.LoxoneDevice.delete(device.id);
    if (selectedDevice?.id === device.id) { setSelectedDevice(null); setControls([]); }
    loadDevices();
  };

  const openEdit = (device) => {
    setEditingDevice(device);
    setFormData({ nombre_referencia: device.nombre_referencia || '', miniserver_ip: device.miniserver_ip || '', puerto: device.puerto || '80', usuario: device.usuario || '', password: device.password || '', location: device.location || '', notas: device.notas || '' });
    setTestResult(null); setShowForm(true);
  };

  const openNew = () => { setEditingDevice(null); setFormData(EMPTY_FORM); setTestResult(null); setWizardStep(1); setShowForm(true); };
  const openEditDevice = (device) => { openEdit(device); setWizardStep(1); };

  const filteredControls = selectedRoom === 'all' ? controls : controls.filter(c => c.room === selectedRoom);

  return (
    <div className="min-h-screen" style={{ background: MD.surfaceVariant }}>

      {/* Top App Bar */}
      <div className="sticky top-0 z-30" style={{ background: MD.primary, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => navigate(createPageUrl('HomeTecnico'))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
            <Home size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white leading-tight">Control Loxone</h1>
            <p className="text-xs text-blue-100">Gestión de Miniservers</p>
          </div>
          <MdButton variant="tonal" onClick={openNew} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            className="!rounded-full text-white">
            <Plus size={16} /> Añadir
          </MdButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Private IP warning */}
        <div className="mb-4 p-3 rounded-2xl flex items-start gap-3 text-sm"
          style={{ background: '#FFF8E1', border: '1px solid #FFE082' }}>
          <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#F57F17' }} />
          <p style={{ color: '#795548' }}>
            <strong>Importante:</strong> El Miniserver debe ser accesible desde Internet. Usa la dirección Cloud DNS de Loxone
            <span className="font-mono mx-1 text-xs bg-amber-100 px-1 py-0.5 rounded">https://XXXXXXXX.dns.loxonecloud.com</span>
            o una IP pública con reenvío de puerto. Las IPs locales (192.168.x.x) no funcionarán.
          </p>
        </div>

        {/* Webhook Info Panel */}
        <div className="mb-4 rounded-2xl overflow-hidden border" style={{ borderColor: '#B2DFDB', background: MD.surface }}>
          <button
            onClick={() => setShowWebhookInfo(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: MD.secondarySurface }}>
              <Radio size={16} style={{ color: MD.secondary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: MD.onSurface }}>Recibir señales desde Loxone (Webhook)</p>
              <p className="text-xs" style={{ color: MD.onSurfaceMid }}>Configura Loxone para que envíe alertas y eventos a esta aplicación</p>
            </div>
            {showWebhookInfo ? <ChevronUp size={16} style={{ color: MD.onSurfaceLow }} /> : <ChevronDown size={16} style={{ color: MD.onSurfaceLow }} />}
          </button>

          {showWebhookInfo && (
            <div className="px-4 pb-5 space-y-4 border-t" style={{ borderColor: '#E0F2F1' }}>
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MD.onSurfaceLow }}>1. URL del Webhook</p>
                <p className="text-xs mb-2" style={{ color: MD.onSurfaceMid }}>Copia esta URL y pégala en el bloque <strong>Virtual HTTP Request</strong> de Loxone Config:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs px-3 py-2 rounded-xl font-mono break-all" style={{ background: '#F3F4F6', color: MD.onSurface }}>
                    {WEBHOOK_URL}
                  </code>
                  <button onClick={copyUrl} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: copiedUrl ? '#E8F5E9' : MD.secondarySurface, color: copiedUrl ? '#2E7D32' : MD.secondary }}>
                    {copiedUrl ? <CheckCircle size={13} /> : <Copy size={13} />}
                    {copiedUrl ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MD.onSurfaceLow }}>2. Parámetros de la URL</p>
                <p className="text-xs mb-2" style={{ color: MD.onSurfaceMid }}>Añade estos parámetros en Loxone Config (los valores entre <code className="bg-gray-100 px-1 rounded">&lt; &gt;</code> los define Loxone con variables del Miniserver):</p>
                <div className="rounded-xl overflow-hidden border text-xs font-mono" style={{ borderColor: MD.outline }}>
                  <div className="px-3 py-2" style={{ background: '#F8F9FA', borderBottom: `1px solid ${MD.outline}` }}>
                    <span style={{ color: MD.secondary }}>GET</span> {WEBHOOK_URL}
                  </div>
                  {[
                    { param: 'secret', ejemplo: 'TU_CLAVE_SECRETA', desc: 'Obligatorio. La clave configurada en los secretos de la app.' },
                    { param: 'signal', ejemplo: 'averia | alerta | estado | temperatura', desc: 'Tipo de señal. Determina qué acción se ejecuta.' },
                    { param: 'device', ejemplo: 'Oficina Principal', desc: 'Nombre del Miniserver (igual que en esta app).' },
                    { param: 'room', ejemplo: 'Sala de servidores', desc: 'Habitación o zona (opcional).' },
                    { param: 'value', ejemplo: '<VI_temperatura>', desc: 'Valor numérico o texto. Puede ser una variable Loxone.' },
                    { param: 'description', ejemplo: 'Sensor de humo activado', desc: 'Descripción adicional (opcional).' },
                  ].map(({ param, ejemplo, desc }) => (
                    <div key={param} className="px-3 py-2 flex gap-3 items-start border-b last:border-b-0" style={{ borderColor: MD.outline }}>
                      <span className="w-24 flex-shrink-0" style={{ color: MD.primary }}>?{param}=</span>
                      <div className="flex-1 min-w-0">
                        <span style={{ color: '#E65100' }}>{ejemplo}</span>
                        <p className="text-xs mt-0.5 font-sans" style={{ color: MD.onSurfaceMid }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MD.onSurfaceLow }}>3. Señales disponibles y su efecto</p>
                <div className="space-y-1.5">
                  {[
                    { signal: 'averia', color: '#C62828', bg: '#FFEBEE', label: 'Avería', desc: 'Crea una Incidencia urgente en la app automáticamente.' },
                    { signal: 'alerta', color: '#E65100', bg: '#FFF3E0', label: 'Alerta', desc: 'Crea una Incidencia de prioridad alta.' },
                    { signal: 'estado', color: '#1565C0', bg: '#E3F2FD', label: 'Estado', desc: 'Registra un cambio de estado en los logs.' },
                    { signal: 'temperatura', color: '#00897B', bg: '#E0F2F1', label: 'Temperatura', desc: 'Registra una lectura de temperatura.' },
                  ].map(({ signal, color, bg, label, desc }) => (
                    <div key={signal} className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: bg }}>
                      <span className="font-mono font-bold flex-shrink-0" style={{ color }}>{signal}</span>
                      <span style={{ color: '#37474F' }}>— {desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: '#FFF8E1', border: '1px solid #FFE082', color: '#795548' }}>
                🔐 <strong>Seguridad:</strong> El parámetro <code className="bg-amber-100 px-1 rounded">secret</code> debe coincidir exactamente con el valor de <code className="bg-amber-100 px-1 rounded">LOXONE_WEBHOOK_SECRET</code> configurado en los ajustes de la app. Si no coincide, la petición se rechaza con error 401.
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

          {/* ─ Device list ─────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: MD.onSurfaceLow }}>Miniservers</p>

            {loadingDevices ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#E0E0E0' }} />)}
              </div>
            ) : devices.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: MD.surface, border: `1px dashed ${MD.outline}` }}>
                <Wifi size={32} className="mx-auto mb-2" style={{ color: MD.onSurfaceLow }} />
                <p className="text-sm" style={{ color: MD.onSurfaceLow }}>No hay Miniservers.<br />Añade uno para empezar.</p>
              </div>
            ) : (
              devices.map(device => {
                const isSelected = selectedDevice?.id === device.id;
                return (
                  <div key={device.id}
                    onClick={() => loadControls(device)}
                    className="rounded-2xl p-4 cursor-pointer transition-all"
                    style={{
                      background: MD.surface,
                      border: `2px solid ${isSelected ? MD.primary : MD.outline}`,
                      boxShadow: isSelected ? `0 4px 12px ${MD.primary}30` : '0 1px 3px rgba(0,0,0,.06)',
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: MD.onSurface }}>{device.nombre_referencia}</p>
                        {device.location && <p className="text-xs mt-0.5 truncate" style={{ color: MD.onSurfaceLow }}>{device.location}</p>}
                        <p className="text-xs font-mono mt-1" style={{ color: MD.onSurfaceMid }}>{device.miniserver_ip}:{device.puerto || '80'}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                          onClick={e => { e.stopPropagation(); openEdit(device); }}>
                          <Pencil size={13} style={{ color: MD.onSurfaceMid }} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                          onClick={e => { e.stopPropagation(); deleteDevice(device); }}>
                          <Trash2 size={13} style={{ color: MD.error }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ─ Controls panel ──────────────────────────────── */}
          <div className="lg:col-span-2">
            {!selectedDevice ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: MD.surface, border: `1px dashed ${MD.outline}` }}>
                <Wifi size={48} className="mx-auto mb-3" style={{ color: MD.onSurfaceLow }} />
                <p className="font-medium" style={{ color: MD.onSurfaceMid }}>Selecciona un Miniserver</p>
                <p className="text-sm mt-1" style={{ color: MD.onSurfaceLow }}>para ver sus controles</p>
              </div>
            ) : (
              <div>
                {/* Device header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: MD.onSurface }}>{selectedDevice.nombre_referencia}</p>
                    <p className="text-xs font-mono" style={{ color: MD.onSurfaceLow }}>{selectedDevice.miniserver_ip}:{selectedDevice.puerto || '80'}</p>
                  </div>
                  <button onClick={() => loadControls(selectedDevice)} disabled={loadingControls}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all"
                    style={{ borderColor: MD.outline, background: MD.surface, color: MD.onSurfaceMid }}>
                    <RefreshCw size={14} className={loadingControls ? 'animate-spin' : ''} />
                    Actualizar
                  </button>
                </div>

                {/* Room chips */}
                {rooms.length > 0 && !loadingControls && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Chip label="Todos" active={selectedRoom === 'all'} onClick={() => setSelectedRoom('all')} />
                    {rooms.map(r => <Chip key={r} label={r} active={selectedRoom === r} onClick={() => setSelectedRoom(r)} />)}
                  </div>
                )}

                {/* Content */}
                {loadingControls ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: '#E0E0E0' }} />)}
                  </div>
                ) : controlsError ? (
                  <div className="rounded-2xl p-5 flex items-start gap-4"
                    style={{ background: MD.errorSurface, border: `1px solid #EF9A9A` }}>
                    <WifiOff size={22} style={{ color: MD.error, flexShrink: 0 }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: MD.error }}>Error de conexión</p>
                      <p className="text-sm mt-1" style={{ color: '#B71C1C' }}>{controlsError}</p>
                      <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.6)', color: '#5D4037' }}>
                        <strong>¿Problemas para conectar?</strong><br />
                        • Usa la URL Cloud DNS: <span className="font-mono">https://XXXXXXXX.dns.loxonecloud.com</span><br />
                        • Activa el acceso remoto en Loxone Config → General → Acceso externo<br />
                        • Verifica usuario y contraseña del Miniserver
                      </div>
                    </div>
                  </div>
                ) : filteredControls.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center" style={{ background: MD.surface, border: `1px dashed ${MD.outline}` }}>
                    <p className="text-sm" style={{ color: MD.onSurfaceLow }}>No se encontraron controles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredControls.map(ctrl => (
                      <ControlCard key={ctrl.uuid} ctrl={ctrl} sendingCmd={sendingCmd} onSend={sendCommand} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─ Wizard Dialog ───────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) setWizardStep(1); }}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden" style={{ background: MD.surface }}>

          {/* Header with step indicator */}
          <div className="px-6 pt-6 pb-4" style={{ background: MD.primarySurface }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: MD.primary }}>
              {editingDevice ? 'Editar Miniserver' : 'Nuevo Miniserver Loxone'}
            </p>
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: wizardStep > s.id ? '#2E7D32' : wizardStep === s.id ? MD.primary : '#E0E0E0',
                        color: wizardStep >= s.id ? '#fff' : MD.onSurfaceLow,
                      }}>
                      {wizardStep > s.id ? '✓' : s.id}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 rounded-full transition-all"
                      style={{ background: wizardStep > s.id ? '#2E7D32' : '#E0E0E0' }} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3">
              <p className="font-semibold text-base" style={{ color: MD.onSurface }}>
                {STEPS[wizardStep - 1].icon} {STEPS[wizardStep - 1].title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: MD.onSurfaceMid }}>
                Paso {wizardStep} de {STEPS.length} — {STEPS[wizardStep - 1].subtitle}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="px-6 py-5 space-y-4">

            {/* STEP 1: Nombre y ubicación */}
            {wizardStep === 1 && (
              <>
                <div className="p-3 rounded-xl text-sm" style={{ background: '#F3F4F6', color: MD.onSurfaceMid }}>
                  💡 <strong>¿Qué es esto?</strong> Ponle un nombre fácil de identificar a tu Miniserver Loxone. Si tienes varios (una instalación por planta o edificio), el nombre te ayudará a distinguirlos.
                </div>
                <MdInput label="Nombre de referencia *" placeholder="Ej: Oficina Principal, Nave A, Apartamento 3B..."
                  value={formData.nombre_referencia} onChange={e => setFormData({ ...formData, nombre_referencia: e.target.value })} />
                <MdInput label="Ubicación física (opcional)" placeholder="Ej: Planta 2 – Cuarto técnico"
                  value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </>
            )}

            {/* STEP 2: Dirección de red */}
            {wizardStep === 2 && (
              <>
                <div className="p-3 rounded-xl text-sm" style={{ background: MD.primarySurface, color: MD.primary }}>
                  🌐 <strong>¿Cómo encontrar la dirección?</strong><br />
                  <ol className="list-decimal ml-4 mt-1 space-y-1 text-xs">
                    <li>Abre <strong>Loxone Config</strong> en tu ordenador.</li>
                    <li>Ve a <strong>Miniserver → General → Cloud DNS</strong>.</li>
                    <li>Copia la URL con formato <span className="font-mono bg-blue-100 px-1 rounded">https://XXXXXXXX.dns.loxonecloud.com</span></li>
                    <li>Pégala abajo. <strong>No uses la IP local</strong> (192.168.x.x) porque solo funciona en tu red WiFi.</li>
                  </ol>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <MdInput label="IP / URL Cloud DNS *" placeholder="https://XXXXXXXX.dns.loxonecloud.com"
                      value={formData.miniserver_ip} onChange={e => setFormData({ ...formData, miniserver_ip: e.target.value })} />
                  </div>
                  <MdInput label="Puerto" placeholder="80"
                    value={formData.puerto} onChange={e => setFormData({ ...formData, puerto: e.target.value })} />
                </div>
                <div className="p-3 rounded-xl text-xs" style={{ background: '#FFF8E1', color: '#795548', border: '1px solid #FFE082' }}>
                  ⚠️ Si usas IP pública, asegúrate de tener el <strong>reenvío de puerto</strong> configurado en tu router hacia el Miniserver.
                </div>
              </>
            )}

            {/* STEP 3: Credenciales */}
            {wizardStep === 3 && (
              <>
                <div className="p-3 rounded-xl text-sm" style={{ background: '#F3F4F6', color: MD.onSurfaceMid }}>
                  🔐 <strong>¿Qué credenciales usar?</strong><br />
                  <ol className="list-decimal ml-4 mt-1 space-y-1 text-xs">
                    <li>En <strong>Loxone Config</strong>, ve a <strong>Miniserver → Usuarios</strong>.</li>
                    <li>Usa el usuario <strong>admin</strong> o crea uno específico para la integración.</li>
                    <li>Se recomienda crear un usuario con permisos de solo lectura/control si es posible.</li>
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MdInput label="Usuario *" placeholder="admin"
                    value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
                  <MdInput label="Contraseña *" type="password" placeholder="••••••••"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <MdInput label="Notas internas (opcional)" placeholder="Ej: Credenciales de mantenimiento..."
                  value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} />
              </>
            )}

            {/* STEP 4: Test de conexión */}
            {wizardStep === 4 && (
              <>
                <div className="p-3 rounded-xl text-sm" style={{ background: '#F3F4F6', color: MD.onSurfaceMid }}>
                  ✅ <strong>Último paso:</strong> Verifica que la conexión funciona antes de guardar. Pulsa el botón para que el sistema compruebe que puede comunicarse con tu Miniserver.
                </div>

                {/* Resumen de datos */}
                <div className="rounded-xl border p-4 space-y-2 text-sm" style={{ borderColor: MD.outline }}>
                  <p className="font-semibold text-xs uppercase tracking-wide mb-2" style={{ color: MD.onSurfaceLow }}>Resumen de configuración</p>
                  <div className="flex justify-between"><span style={{ color: MD.onSurfaceMid }}>Nombre</span><span className="font-medium">{formData.nombre_referencia}</span></div>
                  <div className="flex justify-between"><span style={{ color: MD.onSurfaceMid }}>Dirección</span><span className="font-mono text-xs truncate max-w-48">{formData.miniserver_ip}</span></div>
                  <div className="flex justify-between"><span style={{ color: MD.onSurfaceMid }}>Puerto</span><span className="font-medium">{formData.puerto || '80'}</span></div>
                  <div className="flex justify-between"><span style={{ color: MD.onSurfaceMid }}>Usuario</span><span className="font-medium">{formData.usuario}</span></div>
                  {formData.location && <div className="flex justify-between"><span style={{ color: MD.onSurfaceMid }}>Ubicación</span><span className="font-medium">{formData.location}</span></div>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={testingConn}
                    onClick={testConnection}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border transition-all"
                    style={{ borderColor: MD.primary, color: MD.primary, background: 'transparent' }}>
                    {testingConn ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                    {testingConn ? 'Probando...' : 'Probar conexión'}
                  </button>
                </div>

                {testResult && (
                  <div className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: testResult.ok ? '#E8F5E9' : MD.errorSurface, border: `1px solid ${testResult.ok ? '#A5D6A7' : '#EF9A9A'}` }}>
                    {testResult.ok
                      ? <CheckCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />
                      : <XCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: MD.error }} />}
                    <div>
                      <p className="font-semibold text-sm" style={{ color: testResult.ok ? '#2E7D32' : MD.error }}>
                        {testResult.ok ? '¡Conexión exitosa!' : 'No se pudo conectar'}
                      </p>
                      {!testResult.ok && <p className="text-xs mt-1" style={{ color: '#B71C1C' }}>{testResult.msg}</p>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer navigation */}
          <div className="px-6 py-4 flex justify-between items-center border-t" style={{ borderColor: MD.outline }}>
            <button
              onClick={() => wizardStep === 1 ? setShowForm(false) : setWizardStep(s => s - 1)}
              className="px-5 py-2.5 rounded-full text-sm font-medium border transition-all"
              style={{ borderColor: MD.outline, color: MD.onSurfaceMid }}>
              {wizardStep === 1 ? 'Cancelar' : '← Atrás'}
            </button>

            {wizardStep < STEPS.length ? (
              <button
                disabled={
                  (wizardStep === 1 && !formData.nombre_referencia) ||
                  (wizardStep === 2 && !formData.miniserver_ip) ||
                  (wizardStep === 3 && (!formData.usuario || !formData.password))
                }
                onClick={() => setWizardStep(s => s + 1)}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                style={{ background: MD.primary, boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>
                Siguiente →
              </button>
            ) : (
              <button
                onClick={saveDevice}
                disabled={saving}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                style={{ background: saving ? '#BDBDBD' : '#2E7D32', boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>
                {saving ? 'Guardando...' : '✓ Guardar Miniserver'}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}