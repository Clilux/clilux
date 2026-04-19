import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Thermometer, Wind, Power, Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff, ChevronRight, Home, ArrowLeft, Search, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MODES = {
  1: { label: 'Frío', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'Calor', color: 'bg-orange-100 text-orange-700' },
  3: { label: 'Ventilación', color: 'bg-gray-100 text-gray-700' },
  4: { label: 'Seco', color: 'bg-yellow-100 text-yellow-700' },
  5: { label: 'Auto', color: 'bg-green-100 text-green-700' },
};

export default function ControlClimatizacion() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [zones, setZones] = useState([]);
  const [installation, setInstallation] = useState(null);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    nombre_referencia: '',
    airzone_email: '',
    airzone_password: '',
    mac: '',
    location: '',
    notas: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Selector de instalaciones
  const [showInstallationPicker, setShowInstallationPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerInstallations, setPickerInstallations] = useState([]);
  const [pickerError, setPickerError] = useState('');
  const [pickerDeviceId, setPickerDeviceId] = useState(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    const list = await base44.entities.AirzoneDevice.list('-created_date', 50);
    setDevices(list);
    setLoadingDevices(false);
  };

  const loadZones = async (device) => {
    setSelectedDevice(device);
    setZones([]);
    setInstallation(null);
    setLoadingZones(true);
    setError('');
    try {
      const res = await base44.functions.invoke('airzoneProxy', {
        action: 'get_status',
        device_id: device.id
      });
      setZones(res.data.zones || []);
      setInstallation(res.data.installation);
    } catch (e) {
      setError(e.message || 'Error al conectar con Airzone');
    }
    setLoadingZones(false);
  };

  const openNew = () => {
    setEditingDevice(null);
    setFormData({ nombre_referencia: '', airzone_email: '', airzone_password: '', mac: '', location: '', notas: '' });
    setShowForm(true);
  };

  const openEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      nombre_referencia: device.nombre_referencia || '',
      airzone_email: device.airzone_email || '',
      airzone_password: device.airzone_password || '',
      mac: device.mac || '',
      location: device.location || '',
      notas: device.notas || ''
    });
    setShowForm(true);
  };

  const saveDevice = async () => {
    if (!formData.nombre_referencia || !formData.airzone_email || !formData.airzone_password || !formData.mac) return;
    setSaving(true);
    if (editingDevice) {
      await base44.entities.AirzoneDevice.update(editingDevice.id, formData);
    } else {
      await base44.entities.AirzoneDevice.create({ ...formData, activo: true });
    }
    setSaving(false);
    setShowForm(false);
    loadDevices();
  };

  const openInstallationPicker = async (device) => {
    setPickerDeviceId(device.id);
    setPickerInstallations([]);
    setPickerError('');
    setPickerLoading(true);
    setShowInstallationPicker(true);
    try {
      const res = await base44.functions.invoke('airzoneProxy', {
        action: 'list_installations',
        device_id: device.id
      });
      setPickerInstallations(res.data.installations || []);
    } catch (e) {
      setPickerError(e.message || 'Error al cargar instalaciones');
    }
    setPickerLoading(false);
  };

  const selectInstallation = async (installation) => {
    const mac = installation.ws_ids?.[0] || '';
    await base44.entities.AirzoneDevice.update(pickerDeviceId, {
      mac,
      installation_id: installation.installation_id,
      nombre_referencia: installation.name
    });
    setShowInstallationPicker(false);
    await loadDevices();
    // Recargar zonas si es el dispositivo seleccionado
    const updatedDevices = await base44.entities.AirzoneDevice.list('-created_date', 50);
    const updated = updatedDevices.find(d => d.id === pickerDeviceId);
    if (updated && selectedDevice?.id === pickerDeviceId) loadZones(updated);
  };

  const deleteDevice = async (device) => {
    if (!confirm(`¿Eliminar "${device.nombre_referencia}"?`)) return;
    await base44.entities.AirzoneDevice.delete(device.id);
    if (selectedDevice?.id === device.id) {
      setSelectedDevice(null);
      setZones([]);
    }
    loadDevices();
  };

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
              <h1 className="text-2xl font-bold text-slate-800">Control Climatización</h1>
              <p className="text-slate-500 text-sm mt-0.5">Gestión de dispositivos Airzone Cloud</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Añadir Dispositivo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Dispositivos</h2>
            {loadingDevices ? (
              <div className="text-slate-500 text-sm">Cargando...</div>
            ) : devices.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="p-4 text-center text-slate-400 text-sm">
                  No hay dispositivos. Añade uno para empezar.
                </CardContent>
              </Card>
            ) : (
              devices.map(device => (
                <Card
                  key={device.id}
                  className={`cursor-pointer transition-all hover:border-blue-400 hover:shadow-md ${selectedDevice?.id === device.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200'}`}
                  onClick={() => loadZones(device)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{device.nombre_referencia}</p>
                        {device.location && <p className="text-xs text-slate-500 mt-0.5">{device.location}</p>}
                        {device.mac && <p className="text-xs text-slate-400 font-mono mt-1">{device.mac}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600"
                          title="Buscar instalaciones en Airzone Cloud"
                          onClick={(e) => { e.stopPropagation(); openInstallationPicker(device); }}>
                          <Search className="w-3 h-3" />
                        </Button>
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

          {/* Zones panel */}
          <div className="lg:col-span-2">
            {!selectedDevice ? (
              <Card className="border-slate-200 h-64 flex items-center justify-center">
                <CardContent className="text-center text-slate-400">
                  <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Selecciona un dispositivo para ver sus zonas</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-slate-800">{selectedDevice.nombre_referencia}</h2>
                    {installation && <p className="text-xs text-slate-500">{installation.name}</p>}
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => loadZones(selectedDevice)} disabled={loadingZones}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingZones ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                {loadingZones ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-slate-100 rounded-xl h-32 animate-pulse" />
                    ))}
                  </div>
                ) : error ? (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-center gap-3 text-red-600">
                      <WifiOff className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Error de conexión</p>
                        <p className="text-xs mt-0.5">{error}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : zones.length === 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="p-4 text-center text-slate-400 text-sm">
                      No se encontraron zonas en esta instalación.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {zones.map((zone, idx) => {
                      const mode = MODES[zone.mode] || { label: `Modo ${zone.mode}`, color: 'bg-slate-100 text-slate-600' };
                      const isOn = zone.on === true || zone.on === 1;
                      return (
                        <Card key={idx} className={`transition-all border ${isOn ? 'border-blue-200 shadow-sm' : 'border-slate-200 opacity-70'}`}>
                          <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base text-slate-800 font-semibold truncate">
                                {zone.name || `Zona ${idx + 1}`}
                              </CardTitle>
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${isOn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                <Power className="w-3 h-3" />
                                {isOn ? 'ON' : 'OFF'}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            <div className="flex items-end gap-4">
                              <div className="flex items-center gap-1.5">
                                <Thermometer className="w-5 h-5 text-blue-500" />
                                <span className="text-2xl font-bold text-slate-800">{zone.local_temp != null ? `${zone.local_temp}°` : '--'}</span>
                                {zone.setpoint_air != null && (
                                  <span className="text-sm text-slate-400 ml-1">→ {zone.setpoint_air}°</span>
                                )}
                              </div>
                              <Badge className={`${mode.color} border-0 text-xs`}>{mode.label}</Badge>
                            </div>
                            {zone.humidity != null && (
                              <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                                <Wind className="w-3 h-3" />
                                <span>Humedad: {zone.humidity}%</span>
                              </div>
                            )}
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

      {/* Installation Picker Dialog */}
      <Dialog open={showInstallationPicker} onOpenChange={setShowInstallationPicker}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar instalación Airzone Cloud</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">Elige la instalación que quieres controlar. Se guardará automáticamente.</p>
          </DialogHeader>
          <div className="py-2">
            {pickerLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : pickerError ? (
              <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">{pickerError}</div>
            ) : pickerInstallations.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-6">No se encontraron instalaciones</div>
            ) : (
              <div className="space-y-2">
                {pickerInstallations.map((inst) => (
                  <button
                    key={inst.installation_id}
                    onClick={() => selectInstallation(inst)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-blue-700">{inst.name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{inst.ws_ids?.join(', ')}</p>
                      </div>
                      <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstallationPicker(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo Airzone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Nombre de referencia *</Label>
              <Input className="mt-1"
                placeholder="Ej: Oficina Principal"
                value={formData.nombre_referencia}
                onChange={e => setFormData({ ...formData, nombre_referencia: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Email Airzone Cloud *</Label>
                <Input className="mt-1"
                  type="email"
                  placeholder="usuario@email.com"
                  value={formData.airzone_email}
                  onChange={e => setFormData({ ...formData, airzone_email: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Contraseña *</Label>
                <Input className="mt-1"
                  type="password"
                  placeholder="••••••••"
                  value={formData.airzone_password}
                  onChange={e => setFormData({ ...formData, airzone_password: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-sm">MAC del WebServer <span className="text-red-500">*</span></Label>
              <Input className="mt-1 font-mono"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={formData.mac}
                onChange={e => setFormData({ ...formData, mac: e.target.value })} />
              <p className="text-xs text-slate-400 mt-1">MAC del WebServer Aidoo en Airzone Cloud</p>
            </div>
            <div>
              <Label className="text-sm">Ubicación</Label>
              <Input className="mt-1"
                placeholder="Ej: Planta 2 - Sala reuniones"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">Notas</Label>
              <Input className="mt-1"
                placeholder="Notas adicionales..."
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveDevice} disabled={saving || !formData.nombre_referencia || !formData.airzone_email || !formData.airzone_password || !formData.mac}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}