import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { REFRIGERANTES, gwpDe, tco2eq } from '@/lib/refrigerantes';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';

const TIPO_OPTIONS = [
  { value: 'carga_gas', label: 'Carga de Gas' },
  { value: 'recuperacion_gas', label: 'Recuperación de Gas' },
  { value: 'trasvase', label: 'Trasvase entre recipientes' },
  { value: 'eliminacion', label: 'Eliminación en gestor autorizado' },
  { value: 'control_fugas', label: 'Control de Fugas' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'desguace', label: 'Desguace' },
];

const emptyForm = {
  fecha_intervencion: new Date().toISOString().split('T')[0],
  tipo_intervencion: 'carga_gas',
  tecnico_nombre: '',
  tecnico_cert_num: '',
  empresa_mantenedora: '',
  empresa_cert_num: '',
  refrigerante_tipo: '',
  carga_total_kg: '',
  gas_anyadido_kg: '',
  tipo_gas_anyadido: 'virgen',
  gas_recuperado_kg: '',
  cilindro_origen: '',
  cilindro_destino: '',
  destino_gas_recuperado: '',
  gestor_residuos: '',
  gestor_residuos_num: '',
  observaciones: '',
};

export default function LibroFGasForm({ open, onClose, onSave, technicians, companyInfo, editingRecord }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setForm({ ...emptyForm, ...editingRecord });
    } else {
      setForm(emptyForm);
    }
  }, [editingRecord, open]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectTechnician = (name) => {
    const tech = technicians?.find(t => t.name === name);
    f('tecnico_nombre', name);
    if (tech) {
      if (tech.fgas_cert_num) f('tecnico_cert_num', tech.fgas_cert_num);
      if (tech.company_name) f('empresa_mantenedora', tech.company_name);
      if (tech.empresa_fgas_cert_num) f('empresa_cert_num', tech.empresa_fgas_cert_num);
    }
  };

  const handleSave = async () => {
    if (!form.fecha_intervencion || !form.tipo_intervencion || !form.tecnico_nombre || !form.refrigerante_tipo) {
      toast.error('Completa fecha, tipo de operación, técnico y refrigerante');
      return;
    }
    setSaving(true);
    const gwpVal = gwpDe(form.refrigerante_tipo) || 0;
    const cargaKg = Number(form.carga_total_kg) || Number(form.gas_anyadido_kg) || 0;
    const tco2 = tco2eq(form.refrigerante_tipo, cargaKg) || 0;
    const payload = {
      ...form,
      gas_anyadido_kg: Number(form.gas_anyadido_kg) || 0,
      gas_recuperado_kg: Number(form.gas_recuperado_kg) || 0,
      carga_total_kg: form.carga_total_kg ? Number(form.carga_total_kg) : null,
      gwp: gwpVal,
      co2_equivalent_tons: tco2,
      company_id: companyInfo?.company_id || null,
    };
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isTrasvase = form.tipo_intervencion === 'trasvase';
  const isEliminacion = form.tipo_intervencion === 'eliminacion';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="p-5 bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            {editingRecord ? 'Editar operación' : 'Nueva operación — Libro de Registro F-Gas'}
          </h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fecha *</label>
            <Input type="date" value={form.fecha_intervencion} onChange={e => f('fecha_intervencion', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de operación *</label>
            <select value={form.tipo_intervencion} onChange={e => f('tipo_intervencion', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
              {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Técnico *</label>
            <select value={form.tecnico_nombre} onChange={e => selectTechnician(e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
              <option value="">— Seleccionar —</option>
              {technicians?.map(t => <option key={t.id} value={t.name}>{t.name}{t.fgas_cert_num ? ` · F-Gas: ${t.fgas_cert_num}` : ''}</option>)}
              <option value="__manual__">✏ Manual</option>
            </select>
            {(form.tecnico_nombre === '__manual__' || (form.tecnico_nombre && !technicians?.find(t => t.name === form.tecnico_nombre))) && (
              <Input value={form.tecnico_nombre === '__manual__' ? '' : form.tecnico_nombre} onChange={e => f('tecnico_nombre', e.target.value)} className="h-8 text-sm mt-1" placeholder="Nombre completo" />
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nº Certificado Técnico</label>
            <Input value={form.tecnico_cert_num} onChange={e => f('tecnico_cert_num', e.target.value)} className="h-8 text-sm" placeholder="Nº carné F-Gas" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Empresa mantenedora</label>
            <Input value={form.empresa_mantenedora} onChange={e => f('empresa_mantenedora', e.target.value)} className="h-8 text-sm" placeholder="Autorellenado desde técnico" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nº Cert. Empresa</label>
            <Input value={form.empresa_cert_num} onChange={e => f('empresa_cert_num', e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="sm:col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Datos del Gas</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo refrigerante *</label>
            <Input value={form.refrigerante_tipo} onChange={e => f('refrigerante_tipo', e.target.value)} className="h-8 text-sm" list="fgas-refrigerant-list" placeholder="R410A, R32..." />
            <datalist id="fgas-refrigerant-list">
              {REFRIGERANTES.map(r => <option key={r.value} value={r.value} />)}
            </datalist>
            {form.refrigerante_tipo && gwpDe(form.refrigerante_tipo) !== undefined && (
              <p className="text-xs text-blue-600 mt-0.5">GWP: {gwpDe(form.refrigerante_tipo)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Carga total equipo (kg)</label>
            <Input type="number" value={form.carga_total_kg} onChange={e => f('carga_total_kg', e.target.value)} className="h-8 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Gas añadido (kg)</label>
            <Input type="number" value={form.gas_anyadido_kg} onChange={e => f('gas_anyadido_kg', e.target.value)} className="h-8 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de gas añadido</label>
            <select value={form.tipo_gas_anyadido} onChange={e => f('tipo_gas_anyadido', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
              <option value="virgen">Virgen</option>
              <option value="reciclado">Reciclado</option>
              <option value="regenerado">Regenerado</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Gas recuperado (kg)</label>
            <Input type="number" value={form.gas_recuperado_kg} onChange={e => f('gas_recuperado_kg', e.target.value)} className="h-8 text-sm" placeholder="0" />
          </div>

          {/* Campos específicos para trasvases */}
          {isTrasvase && (
            <>
              <div className="sm:col-span-2 border-t pt-3 mt-1">
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Trasvase entre recipientes</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Cilindro/Recipiente origen</label>
                <Input value={form.cilindro_origen} onChange={e => f('cilindro_origen', e.target.value)} className="h-8 text-sm" placeholder="ID del cilindro de origen" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Cilindro/Recipiente destino</label>
                <Input value={form.cilindro_destino} onChange={e => f('cilindro_destino', e.target.value)} className="h-8 text-sm" placeholder="ID del cilindro de destino" />
              </div>
            </>
          )}

          {/* Campos específicos para eliminaciones */}
          {isEliminacion && (
            <>
              <div className="sm:col-span-2 border-t pt-3 mt-1">
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Eliminación en gestor autorizado</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Gestor de residuos</label>
                <Input value={form.gestor_residuos} onChange={e => f('gestor_residuos', e.target.value)} className="h-8 text-sm" placeholder="Centro autorizado" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nº identificación gestor</label>
                <Input value={form.gestor_residuos_num} onChange={e => f('gestor_residuos_num', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Destino del gas recuperado</label>
                <select value={form.destino_gas_recuperado} onChange={e => f('destino_gas_recuperado', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                  <option value="">— Seleccionar —</option>
                  <option value="reciclado">Reciclado</option>
                  <option value="regenerado">Regenerado</option>
                  <option value="destruido">Destruido</option>
                  <option value="reutilizado">Reutilizado en otro equipo</option>
                </select>
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Observaciones</label>
            <Input value={form.observaciones} onChange={e => f('observaciones', e.target.value)} className="h-8 text-sm" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700">
            {saving ? 'Guardando...' : <><Save className="h-3.5 w-3.5 mr-1" />Guardar operación</>}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </Card>
    </div>
  );
}