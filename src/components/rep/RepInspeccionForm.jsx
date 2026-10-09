import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, Paperclip, AlertTriangle } from 'lucide-react';
import {
  TIPOS_INSPECCION_REP, RESULTADOS_INSPECCION_REP, requiereOca, MENSAJE_PROYECTO, UMBRAL_REP,
} from '@/lib/rep';

const vacio = {
  equipment_id: '', tipo_inspeccion: '', fecha_inspeccion: '',
  tecnico_inspector: '', resultado: '', oca: '', observaciones: '', proxima_inspeccion: '',
};

/**
 * Alta / edición de una inspección REP.
 * El campo OCA es obligatorio en Nivel C y en Nivel B con PS x V >= 25000.
 */
export default function RepInspeccionForm({
  open, onOpenChange, equipos = [], inspeccion = null,
  buildingId, clientId, companyId, registradoPor, onSave,
}) {
  const [form, setForm] = useState(vacio);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError('');
    setForm(inspeccion ? {
      equipment_id: inspeccion.equipment_id || '',
      tipo_inspeccion: inspeccion.tipo_inspeccion || '',
      fecha_inspeccion: inspeccion.fecha_inspeccion || '',
      tecnico_inspector: inspeccion.tecnico_inspector || '',
      resultado: inspeccion.resultado || '',
      oca: inspeccion.oca || '',
      observaciones: inspeccion.observaciones || '',
      proxima_inspeccion: inspeccion.proxima_inspeccion || '',
    } : vacio);
  }, [open, inspeccion]);

  const equipo = equipos.find((e) => e.id === form.equipment_id) || null;
  const psxv = Number(equipo?.ps_x_v) || 0;
  const exigeOca = requiereOca(form.tipo_inspeccion, psxv);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    if (!form.equipment_id || !form.tipo_inspeccion || !form.fecha_inspeccion || !form.tecnico_inspector.trim() || !form.resultado) {
      setError('Completa todos los campos obligatorios');
      return;
    }
    if (exigeOca && !form.oca.trim()) {
      setError('Esta inspección exige indicar el Organismo de Control Autorizado (OCA)');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(inspeccion?.id ? { id: inspeccion.id } : {}),
        equipment_id: form.equipment_id,
        building_id: buildingId,
        client_id: clientId,
        company_id: companyId,
        equipment_name: equipo?.reference_name || '',
        tipo_inspeccion: form.tipo_inspeccion,
        fecha_inspeccion: form.fecha_inspeccion,
        tecnico_inspector: form.tecnico_inspector.trim(),
        resultado: form.resultado,
        oca: form.oca.trim(),
        ps_x_v: psxv || null,
        requiere_oca: exigeOca,
        observaciones: form.observaciones,
        proxima_inspeccion: form.proxima_inspeccion || null,
        registrado_por: registradoPor || '',
      }, file);
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || 'No se pudo guardar la inspección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{inspeccion ? 'Editar inspección REP' : 'Registrar inspección REP'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Equipo a presión *</Label>
            <Select value={form.equipment_id} onValueChange={(v) => set('equipment_id', v)} disabled={!!inspeccion}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
              <SelectContent>
                {equipos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.reference_name} {e.ps_x_v ? `· PS×V ${Number(e.ps_x_v).toLocaleString('es-ES')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {psxv >= UMBRAL_REP && (
              <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {MENSAJE_PROYECTO}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tipo de inspección *</Label>
              <Select value={form.tipo_inspeccion} onValueChange={(v) => set('tipo_inspeccion', v)}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_INSPECCION_REP.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fecha de inspección *</Label>
              <Input type="date" value={form.fecha_inspeccion} onChange={(e) => set('fecha_inspeccion', e.target.value)} className="bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Técnico / Inspector *</Label>
              <Input value={form.tecnico_inspector} onChange={(e) => set('tecnico_inspector', e.target.value)} className="bg-white" />
            </div>
            <div>
              <Label className="text-xs">Resultado *</Label>
              <Select value={form.resultado} onValueChange={(v) => set('resultado', v)}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar resultado" /></SelectTrigger>
                <SelectContent>
                  {RESULTADOS_INSPECCION_REP.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {exigeOca && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
              <p className="text-[11px] text-amber-800">
                Inspección de Nivel C{form.tipo_inspeccion === 'nivel_b' ? ' en equipo con PS × V ≥ 25.000' : ''}:
                es obligatorio registrar el Organismo de Control Autorizado que firma la revisión.
              </p>
              <div>
                <Label className="text-xs">Organismo de Control Autorizado (OCA) *</Label>
                <Input value={form.oca} onChange={(e) => set('oca', e.target.value)} className="bg-white" placeholder="Ej: Bureau Veritas, TÜV, APPLUS..." />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Acta de la OCA o Certificado</Label>
            <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-sm text-slate-600 hover:bg-slate-100">
              <Paperclip className="h-4 w-4" />
              {file ? file.name : (inspeccion?.acta_nombre || 'Adjuntar archivo (PDF, imagen)')}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Próxima inspección (opcional)</Label>
              <Input type="date" value={form.proxima_inspeccion} onChange={(e) => set('proxima_inspeccion', e.target.value)} className="bg-white" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} rows={2} className="bg-white" />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving} className="bg-blue-700 hover:bg-blue-800 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}