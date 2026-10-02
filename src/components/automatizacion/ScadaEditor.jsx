import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Trash2, Plus, Eye, Pencil, ArrowLeft, Cpu, Wind, Zap, MonitorSmartphone, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploader from '@/components/ui/ImageUploader';
import ScadaCanvas from '@/components/automatizacion/ScadaCanvas';
import ScadaElementPanel from '@/components/automatizacion/ScadaElementPanel';
import { nuevoElemento, TIPOS_ELEMENTO } from '@/lib/scada';

const PALETA = [
  { tipo: 'dispositivo', label: 'Dispositivo', icon: Cpu },
  { tipo: 'estado', label: 'Estado / Sensor', icon: Wind },
  { tipo: 'etiqueta', label: 'Etiqueta', icon: Zap },
  { tipo: 'enlace', label: 'Acceso directo', icon: Link2 },
];

/** Editor de un panel SCADA: imagen de fondo y elementos personalizables. */
export default function ScadaEditor({ scada, clients = [], onSave, onDelete, onBack }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    nombre: scada?.nombre || '',
    descripcion: scada?.descripcion || '',
    client_id: scada?.client_id || '',
    building_name: scada?.building_name || '',
    imagen_url: scada?.imagen_url || '',
    imagen_opacidad: scada?.imagen_opacidad ?? 1,
    fondo_color: scada?.fondo_color || '#0F172A',
    elementos: scada?.elementos || [],
  }));
  const [selectedId, setSelectedId] = useState(null);
  const [modo, setModo] = useState('editar');
  const [saving, setSaving] = useState(false);

  const seleccionado = form.elementos.find(e => e.id === selectedId) || null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addElemento = (tipo) => {
    const el = nuevoElemento({ tipo, etiqueta: TIPOS_ELEMENTO.find(t => t.value === tipo)?.label || 'Elemento' });
    setForm(f => ({ ...f, elementos: [...f.elementos, el] }));
    setSelectedId(el.id);
    setModo('editar');
  };

  const updateElemento = (actualizado) => {
    setForm(f => ({ ...f, elementos: f.elementos.map(e => (e.id === actualizado.id ? actualizado : e)) }));
  };

  const moveElemento = (id, x, y) => {
    setForm(f => ({ ...f, elementos: f.elementos.map(e => (e.id === id ? { ...e, x, y } : e)) }));
  };

  const borrarElemento = () => {
    setForm(f => ({ ...f, elementos: f.elementos.filter(e => e.id !== selectedId) }));
    setSelectedId(null);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('Ponle un nombre al panel'); return; }
    setSaving(true);
    try {
      const cliente = clients.find(c => c.id === form.client_id);
      await onSave({
        ...form,
        client_name: cliente?.name || scada?.client_name || '',
      }, scada?.id);
      toast.success(scada ? 'Panel actualizado' : 'Panel creado');
      onBack();
    } catch (e) {
      toast.error(e.message || 'No se pudo guardar el panel');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!scada?.id) return;
    setSaving(true);
    try {
      await onDelete(scada.id);
      toast.success('Panel eliminado');
      onBack();
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar el panel');
    } finally {
      setSaving(false);
    }
  };

  const abrirEnlace = (el) => {
    if (el.pagina) navigate(`/${el.pagina}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
        <div className="flex items-center gap-2">
          <Button variant={modo === 'editar' ? 'default' : 'outline'} onClick={() => setModo('editar')} className={modo === 'editar' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
            <Pencil className="h-4 w-4 mr-2" />Editar
          </Button>
          <Button variant={modo === 'vista' ? 'default' : 'outline'} onClick={() => setModo('vista')} className={modo === 'vista' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
            <Eye className="h-4 w-4 mr-2" />Vista
          </Button>
        </div>
      </div>

      <Card className="p-5 border-0 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-slate-600 mb-1">Nombre del panel *</Label>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Planta baja - Oficinas" />
          </div>
          <div>
            <Label className="text-slate-600 mb-1">Cliente</Label>
            <Select value={form.client_id || 'ninguno'} onValueChange={v => set('client_id', v === 'ninguno' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin cliente</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-600 mb-1">Edificio / zona</Label>
            <Input value={form.building_name} onChange={e => set('building_name', e.target.value)} placeholder="Ej. Edificio Norte" />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-slate-600 mb-1">Descripción</Label>
          <Textarea rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Qué representa este panel" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          {modo === 'editar' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 mr-1">Añadir:</span>
              {PALETA.map(({ tipo, label, icon: Icon }) => (
                <Button key={tipo} size="sm" variant="outline" onClick={() => addElemento(tipo)}>
                  <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
                </Button>
              ))}
            </div>
          )}
          <ScadaCanvas
            scada={form}
            editable={modo === 'editar'}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveElemento}
            onDoubleClick={abrirEnlace}
          />
          <p className="text-xs text-slate-400">
            {modo === 'editar' ? 'Arrastra los elementos para colocarlos sobre la imagen. Doble clic abre su acceso directo.' : 'Doble clic sobre un elemento para abrir su acceso directo.'}
          </p>
        </div>

        <div className="space-y-5">
          {modo === 'editar' && (
            <Card className="p-5 border-0 shadow-sm">
              <p className="font-semibold text-slate-700 mb-3">Imagen de fondo</p>
              <ImageUploader label="" value={form.imagen_url} onChange={url => set('imagen_url', url)} />
              <div className="mt-4">
                <Label className="text-slate-600 mb-1">Opacidad de la imagen</Label>
                <input
                  type="range" min="0.2" max="1" step="0.05"
                  value={form.imagen_opacidad}
                  onChange={e => set('imagen_opacidad', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="mt-4">
                <Label className="text-slate-600 mb-1">Color de fondo</Label>
                <input
                  type="color"
                  value={form.fondo_color}
                  onChange={e => set('fondo_color', e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 cursor-pointer"
                />
              </div>
            </Card>
          )}

          <Card className="p-5 border-0 shadow-sm">
            <p className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-emerald-600" />
              Elementos ({form.elementos.length})
            </p>
            {modo === 'editar' ? (
              <ScadaElementPanel elemento={seleccionado} onChange={updateElemento} onDelete={borrarElemento} />
            ) : (
              <p className="text-sm text-slate-400">Cambia a modo Editar para personalizar los elementos.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {scada?.id ? (
          <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={eliminar} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-2" />Eliminar panel
          </Button>
        ) : <span />}
        <Button onClick={guardar} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar panel</>}
        </Button>
      </div>
    </div>
  );
}