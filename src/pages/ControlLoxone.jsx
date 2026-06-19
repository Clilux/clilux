import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff,
  ArrowLeft, Home, Zap, ToggleLeft, Blinds, Thermometer,
  Lightbulb, CheckCircle, XCircle, Loader2, ChevronRight,
  AlertTriangle, Info
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

  const openNew = () => { setEditingDevice(null); setFormData(EMPTY_FORM); setTestResult(null); setShowForm(true); };

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

      {/* ─ Form Dialog ─────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg rounded-3xl" style={{ background: MD.surface }}>
          <DialogHeader>
            <DialogTitle style={{ color: MD.onSurface }}>
              {editingDevice ? 'Editar Miniserver' : 'Nuevo Miniserver Loxone'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <MdInput label="Nombre de referencia *" placeholder="Ej: Oficina Principal"
              value={formData.nombre_referencia} onChange={e => setFormData({ ...formData, nombre_referencia: e.target.value })} />

            {/* Cloud DNS hint */}
            <div className="p-3 rounded-xl text-xs" style={{ background: MD.primarySurface, color: MD.primary }}>
              <strong>Dirección del Miniserver:</strong> Usa la URL Cloud DNS de Loxone para acceso remoto:<br />
              <span className="font-mono">https://XXXXXXXX.dns.loxonecloud.com</span><br />
              (el serial de 8 caracteres está en la etiqueta del Miniserver)
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <MdInput label="IP / URL / Cloud DNS *" placeholder="https://XXXXXXXX.dns.loxonecloud.com"
                  value={formData.miniserver_ip} onChange={e => setFormData({ ...formData, miniserver_ip: e.target.value })} />
              </div>
              <MdInput label="Puerto" placeholder="80"
                value={formData.puerto} onChange={e => setFormData({ ...formData, puerto: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MdInput label="Usuario *" placeholder="admin"
                value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
              <MdInput label="Contraseña *" type="password" placeholder="••••••••"
                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>

            <MdInput label="Ubicación" placeholder="Ej: Planta 1 - Nave A"
              value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />

            {/* Test connection */}
            <div className="flex items-center gap-3 pt-1">
              <button
                disabled={testingConn || !formData.miniserver_ip || !formData.usuario || !formData.password}
                onClick={testConnection}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all"
                style={{ borderColor: MD.primary, color: MD.primary, background: 'transparent' }}>
                {testingConn ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                Probar conexión
              </button>

              {testResult && (
                <div className="flex items-start gap-2 text-sm flex-1 min-w-0">
                  {testResult.ok
                    ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />
                    : <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: MD.error }} />}
                  <span className="text-xs leading-snug" style={{ color: testResult.ok ? '#2E7D32' : MD.error }}>
                    {testResult.msg}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-full text-sm font-medium border"
              style={{ borderColor: MD.outline, color: MD.onSurfaceMid }}>
              Cancelar
            </button>
            <button onClick={saveDevice}
              disabled={saving || !formData.nombre_referencia || !formData.miniserver_ip || !formData.usuario || !formData.password}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all"
              style={{ background: saving ? '#BDBDBD' : MD.primary, boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}