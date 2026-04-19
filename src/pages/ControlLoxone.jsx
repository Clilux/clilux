import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff,
  ArrowLeft, Home, ChevronRight, Zap, ToggleLeft, ToggleRight,
  Lightbulb, Thermometer, Wind, Blinds, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CONTROL_TYPE_ICONS = {
  LightController: Lightbulb,
  Switch: ToggleLeft,
  Jalousie: Blinds,
  IRoomController: Thermometer,
  AalSmartAlarm: Zap,
  default: Zap,
};

const CONTROL_TYPE_LABELS = {
  LightController: 'Luces',
  Switch: 'Interruptor',
  Jalousie: 'Persianas',
  IRoomController: 'Termostato',
  TimedSwitch: 'Temporizador',
  Pushbutton: 'Pulsador',
  AalSmartAlarm: 'Alarma',
};

const COMMANDS_BY_TYPE = {
  Switch: [{ label: 'Encender', cmd: 'On', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Apagar', cmd: 'Off', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' }],
  LightController: [{ label: 'Encender', cmd: 'On', color: 'bg-yellow-400 hover:bg-yellow-500 text-white' }, { label: 'Apagar', cmd: 'Off', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' }],
  Jalousie: [{ label: 'Subir', cmd: 'Up', color: 'bg-blue-500 hover:bg-blue-600 text-white' }, { label: 'Bajar', cmd: 'Down', color: 'bg-orange-400 hover:bg-orange-500 text-white' }, { label: 'Parar', cmd: 'Stop', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' }],
  TimedSwitch: [{ label: 'Pulsar', cmd: 'Pulse', color: 'bg-purple-500 hover:bg-purple-600 text-white' }, { label: 'Encender', cmd: 'On', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Apagar', cmd: 'Off', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' }],
  Pushbutton: [{ label: 'Pulsar', cmd: 'Pulse', color: 'bg-purple-500 hover:bg-purple-600 text-white' }],
  default: [{ label: 'On', cmd: 'On', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Off', cmd: 'Off', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' }],
};

const EMPTY_FORM = { nombre_referencia: '', miniserver_ip: '', puerto: '80', usuario: '', password: '', location: '', notas: '' };

export default function ControlLoxone() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [controls, setControls] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingControls, setLoadingControls] = useState(false);
  const [controlsError, setControlsError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [sendingCmd, setSendingCmd] = useState({});

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    const list = await base44.entities.LoxoneDevice.list('-created_date', 50);
    setDevices(list);
    setLoadingDevices(false);
  };

  const loadControls = async (device) => {
    setSelectedDevice(device);
    setControls([]);
    setRooms([]);
    setSelectedRoom('all');
    setControlsError('');
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

  const sendCommand = async (control, cmd) => {
    const key = `${control.uuid}_${cmd}`;
    setSendingCmd(prev => ({ ...prev, [key]: true }));
    try {
      await base44.functions.invoke('loxoneProxy', {
        action: 'send_command',
        device_id: selectedDevice.id,
        params: { uuid: control.uuid, command: cmd }
      });
    } catch (e) {
      alert(e.message || 'Error al enviar comando');
    }
    setSendingCmd(prev => ({ ...prev, [key]: false }));
  };

  const testConnection = async () => {
    if (!formData.miniserver_ip || !formData.usuario || !formData.password) return;
    setTestingConn(true);
    setTestResult(null);
    // Save temp device to test
    try {
      const tmp = await base44.entities.LoxoneDevice.create({ ...formData, nombre_referencia: '__test__', activo: false });
      try {
        const res = await base44.functions.invoke('loxoneProxy', { action: 'test_connection', device_id: tmp.id });
        setTestResult({ ok: true, msg: 'Conexión exitosa' });
      } catch (e) {
        setTestResult({ ok: false, msg: e.message || 'No se pudo conectar' });
      }
      await base44.entities.LoxoneDevice.delete(tmp.id);
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    }
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
    setSaving(false);
    setShowForm(false);
    loadDevices();
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
    setTestResult(null);
    setShowForm(true);
  };

  const openNew = () => {
    setEditingDevice(null);
    setFormData(EMPTY_FORM);
    setTestResult(null);
    setShowForm(true);
  };

  const filteredControls = selectedRoom === 'all'
    ? controls
    : controls.filter(c => c.room === selectedRoom);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)} className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => navigate(createPageUrl('HomeTecnico'))} className="h-9 w-9">
              <Home className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Control Loxone</h1>
              <p className="text-slate-500 text-sm mt-0.5">Gestión de Miniservers Loxone</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" /> Añadir Miniserver
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Device list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Miniservers</h2>
            {loadingDevices ? (
              <div className="text-slate-500 text-sm">Cargando...</div>
            ) : devices.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="p-4 text-center text-slate-400 text-sm">
                  No hay Miniservers. Añade uno para empezar.
                </CardContent>
              </Card>
            ) : (
              devices.map(device => (
                <Card
                  key={device.id}
                  className={`cursor-pointer transition-all hover:border-green-400 hover:shadow-md ${selectedDevice?.id === device.id ? 'border-green-500 ring-1 ring-green-500 shadow-md' : 'border-slate-200'}`}
                  onClick={() => loadControls(device)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{device.nombre_referencia}</p>
                        {device.location && <p className="text-xs text-slate-500 mt-0.5">{device.location}</p>}
                        <p className="text-xs text-slate-400 font-mono mt-1">{device.miniserver_ip}:{device.puerto || '80'}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700"
                          onClick={(e) => { e.stopPropagation(); openEdit(device); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); deleteDevice(device); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Controls panel */}
          <div className="lg:col-span-2">
            {!selectedDevice ? (
              <Card className="border-slate-200 h-64 flex items-center justify-center">
                <CardContent className="text-center text-slate-400">
                  <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Selecciona un Miniserver para ver sus controles</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-slate-800">{selectedDevice.nombre_referencia}</h2>
                    <p className="text-xs text-slate-500">{selectedDevice.miniserver_ip}:{selectedDevice.puerto || '80'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => loadControls(selectedDevice)} disabled={loadingControls}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingControls ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                {/* Room filter */}
                {rooms.length > 0 && !loadingControls && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedRoom('all')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedRoom === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white border-slate-200 text-slate-600 hover:border-green-400'}`}>
                      Todos
                    </button>
                    {rooms.map(r => (
                      <button key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedRoom === r ? 'bg-green-600 text-white border-green-600' : 'bg-white border-slate-200 text-slate-600 hover:border-green-400'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {loadingControls ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-slate-100 rounded-xl h-28 animate-pulse" />)}
                  </div>
                ) : controlsError ? (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-center gap-3 text-red-600">
                      <WifiOff className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Error de conexión</p>
                        <p className="text-xs mt-0.5">{controlsError}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredControls.length === 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="p-4 text-center text-slate-400 text-sm">
                      No se encontraron controles.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredControls.map((ctrl) => {
                      const Icon = CONTROL_TYPE_ICONS[ctrl.type] || CONTROL_TYPE_ICONS.default;
                      const cmds = COMMANDS_BY_TYPE[ctrl.type] || COMMANDS_BY_TYPE.default;
                      const typeLabel = CONTROL_TYPE_LABELS[ctrl.type] || ctrl.type;
                      return (
                        <Card key={ctrl.uuid} className="border-slate-200 hover:shadow-sm transition-all">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-sm text-slate-800 truncate">{ctrl.name}</CardTitle>
                                  {ctrl.room && <p className="text-xs text-slate-400 truncate">{ctrl.room}</p>}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">{typeLabel}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            <div className="flex flex-wrap gap-2">
                              {cmds.map(({ label, cmd, color }) => {
                                const key = `${ctrl.uuid}_${cmd}`;
                                const busy = sendingCmd[key];
                                return (
                                  <button key={cmd} disabled={busy}
                                    onClick={() => sendCommand(ctrl, cmd)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${color} ${busy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Editar Miniserver' : 'Nuevo Miniserver Loxone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Nombre de referencia *</Label>
              <Input className="mt-1" placeholder="Ej: Oficina Principal"
                value={formData.nombre_referencia} onChange={e => setFormData({ ...formData, nombre_referencia: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-sm">IP o URL del Miniserver *</Label>
                <Input className="mt-1 font-mono" placeholder="192.168.1.100"
                  value={formData.miniserver_ip} onChange={e => setFormData({ ...formData, miniserver_ip: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Puerto</Label>
                <Input className="mt-1 font-mono" placeholder="80"
                  value={formData.puerto} onChange={e => setFormData({ ...formData, puerto: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Usuario *</Label>
                <Input className="mt-1" placeholder="admin"
                  value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Contraseña *</Label>
                <Input className="mt-1" type="password" placeholder="••••••••"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Ubicación</Label>
              <Input className="mt-1" placeholder="Ej: Planta 1 - Nave A"
                value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-3 pt-1">
              <Button type="button" size="sm" variant="outline" disabled={testingConn || !formData.miniserver_ip || !formData.usuario || !formData.password}
                onClick={testConnection}>
                {testingConn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Probar conexión
              </Button>
              {testResult && (
                <div className={`flex items-center gap-1.5 text-sm ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={saveDevice}
              disabled={saving || !formData.nombre_referencia || !formData.miniserver_ip || !formData.usuario || !formData.password}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}