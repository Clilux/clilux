import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus, Wind, AlertTriangle, CheckCircle2, Clock,
  Droplet, Trash2, Edit, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// GWP values según IPCC AR5 (normativa UE F-Gas 517/2014)
const GWP_TABLE = {
  'R22': 1810,
  'R134a': 1430,
  'R404A': 3922,
  'R407C': 1774,
  'R410A': 2088,
  'R32': 675,
  'R290': 3,
  'R600a': 3,
  'R744': 1,
  'R1234yf': 4,
  'R1234ze': 7,
  'R407F': 1825,
  'R407H': 1495,
  'R448A': 1387,
  'R449A': 1397,
  'R450A': 601,
  'R452A': 2140,
  'R454B': 466,
  'R513A': 631,
};

// Frecuencia de control de fugas según Reglamento UE 517/2014 Art. 4
function getLeakCheckFrequency(tco2eq) {
  if (tco2eq >= 500) return { label: 'Cada 3 meses', months: 3, color: 'bg-red-100 text-red-800' };
  if (tco2eq >= 50) return { label: 'Cada 6 meses', months: 6, color: 'bg-orange-100 text-orange-800' };
  if (tco2eq >= 5) return { label: 'Anual', months: 12, color: 'bg-amber-100 text-amber-800' };
  return { label: 'No obligatorio (< 5 tCO₂eq)', months: null, color: 'bg-green-100 text-green-800' };
}

const TIPO_LABELS = {
  control_fugas: 'Control de Fugas',
  carga_gas: 'Carga de Gas',
  recuperacion_gas: 'Recuperación de Gas',
  mantenimiento: 'Mantenimiento',
  reparacion: 'Reparación',
  instalacion: 'Instalación',
  desguace: 'Desguace',
};

const RESULTADO_CONFIG = {
  apto: { label: 'Apto', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  no_apto: { label: 'No Apto', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  no_aplica: { label: 'No aplica', color: 'bg-slate-100 text-slate-600', icon: null },
};

const emptyForm = {
  fecha_intervencion: new Date().toISOString().split('T')[0],
  tipo_intervencion: 'control_fugas',
  tecnico_nombre: '',
  tecnico_cert_num: '',
  empresa_mantenedora: '',
  empresa_cert_num: '',
  refrigerante_tipo: '',
  carga_total_kg: '',
  gas_anyadido_kg: '',
  tipo_gas_anyadido: 'virgen',
  gas_recuperado_kg: '',
  control_fugas_resultado: 'apto',
  fuga_localizada: false,
  fuga_ubicacion: '',
  fuga_fecha_reparacion: '',
  gestor_residuos: '',
  gestor_residuos_num: '',
  observaciones: '',
};

export default function FGasTab({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);

  // Calcular tCO2eq
  const gwp = GWP_TABLE[equipment?.refrigerant_type] || equipment?.gwp || 0;
  const cargaKg = equipment?.refrigerant_charge_kg || 0;
  const tco2eq = (cargaKg * gwp) / 1000;
  const freq = getLeakCheckFrequency(tco2eq);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['fgas-registros', equipmentId],
    queryFn: () => base44.entities.RegistroFGas.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId,
  });

  const registrosOrdenados = [...registros].sort(
    (a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion)
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const gwpVal = GWP_TABLE[data.refrigerante_tipo] || equipment?.gwp || 0;
      const tco2 = data.carga_total_kg ? (Number(data.carga_total_kg) * gwpVal) / 1000 : tco2eq;
      const freqData = getLeakCheckFrequency(tco2);
      let proxima = null;
      if (freqData.months) {
        const base = new Date(data.fecha_intervencion);
        proxima = freqData.months === 12
          ? addYears(base, 1).toISOString().split('T')[0]
          : addMonths(base, freqData.months).toISOString().split('T')[0];
      }
      const payload = {
        ...data,
        equipment_id: equipmentId,
        client_id: equipment.client_id,
        gas_anyadido_kg: Number(data.gas_anyadido_kg) || 0,
        gas_recuperado_kg: Number(data.gas_recuperado_kg) || 0,
        carga_total_kg: data.carga_total_kg ? Number(data.carga_total_kg) : null,
        gwp: gwpVal,
        co2_equivalent_tons: tco2,
        proxima_revision_fecha: proxima,
      };
      if (editingId) {
        return base44.entities.RegistroFGas.update(editingId, payload);
      }
      return base44.entities.RegistroFGas.create(payload);
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['fgas-registros', equipmentId] });
      // Actualizar next_leak_check_date en el equipo
      if (result?.proxima_revision_fecha) {
        await base44.entities.Equipment.update(equipmentId, {
          next_leak_check_date: result.proxima_revision_fecha,
          gwp: result.gwp,
          co2_equivalent_tons: result.co2_equivalent_tons,
        });
        queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      }
      toast.success(editingId ? 'Registro actualizado' : 'Registro creado');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Error al guardar el registro'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroFGas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fgas-registros', equipmentId] });
      toast.success('Registro eliminado');
    },
  });

  const handleEdit = (r) => {
    setForm({
      fecha_intervencion: r.fecha_intervencion || '',
      tipo_intervencion: r.tipo_intervencion || 'control_fugas',
      tecnico_nombre: r.tecnico_nombre || '',
      tecnico_cert_num: r.tecnico_cert_num || '',
      empresa_mantenedora: r.empresa_mantenedora || '',
      empresa_cert_num: r.empresa_cert_num || '',
      refrigerante_tipo: r.refrigerante_tipo || '',
      carga_total_kg: r.carga_total_kg || '',
      gas_anyadido_kg: r.gas_anyadido_kg || '',
      tipo_gas_anyadido: r.tipo_gas_anyadido || 'virgen',
      gas_recuperado_kg: r.gas_recuperado_kg || '',
      control_fugas_resultado: r.control_fugas_resultado || 'apto',
      fuga_localizada: r.fuga_localizada || false,
      fuga_ubicacion: r.fuga_ubicacion || '',
      fuga_fecha_reparacion: r.fuga_fecha_reparacion || '',
      gestor_residuos: r.gestor_residuos || '',
      gestor_residuos_num: r.gestor_residuos_num || '',
      observaciones: r.observaciones || '',
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-5">

      {/* Cabecera con datos del equipo F-Gas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-0 bg-blue-50">
          <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1"><Wind className="h-3 w-3" />Refrigerante</p>
          <p className="text-lg font-bold text-slate-800">{equipment?.refrigerant_type || '—'}</p>
          <p className="text-xs text-slate-500">GWP: {gwp || '—'}</p>
        </Card>
        <Card className="p-4 border-0 bg-cyan-50">
          <p className="text-xs text-cyan-600 font-medium mb-1 flex items-center gap-1"><Droplet className="h-3 w-3" />Carga / tCO₂eq</p>
          <p className="text-lg font-bold text-slate-800">{cargaKg} kg</p>
          <p className="text-xs text-slate-500">{tco2eq.toFixed(3)} tCO₂eq</p>
        </Card>
        <Card className="p-4 border-0 bg-amber-50">
          <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Control de fugas</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${freq.color}`}>{freq.label}</span>
          {equipment?.next_leak_check_date && (
            <p className="text-xs text-slate-500 mt-1">
              Próxima: {format(new Date(equipment.next_leak_check_date), 'dd/MM/yyyy')}
            </p>
          )}
        </Card>
      </div>

      {/* Info normativa */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Reglamento UE 517/2014 (F-Gas):</strong> ≥5 tCO₂eq → revisión anual · ≥50 tCO₂eq → cada 6 meses · ≥500 tCO₂eq → cada 3 meses.
          Documentación obligatoria durante <strong>mínimo 5 años</strong>.
        </span>
      </div>

      {/* Botón nuevo registro */}
      {!showForm && (
        <Button size="sm" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo Registro F-Gas
        </Button>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="p-5 border border-blue-200 bg-blue-50/30">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-600" />
            {editingId ? 'Editar Registro' : 'Nuevo Registro F-Gas'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha intervención *</label>
              <Input type="date" value={form.fecha_intervencion} onChange={e => f('fecha_intervencion', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tipo de intervención *</label>
              <select value={form.tipo_intervencion} onChange={e => f('tipo_intervencion', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Técnico (nombre) *</label>
              <Input value={form.tecnico_nombre} onChange={e => f('tecnico_nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nº Certificado Técnico F-Gas</label>
              <Input value={form.tecnico_cert_num} onChange={e => f('tecnico_cert_num', e.target.value)} className="h-8 text-sm" placeholder="Nº carné F-Gas" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Empresa mantenedora habilitada</label>
              <Input value={form.empresa_mantenedora} onChange={e => f('empresa_mantenedora', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nº Certificado Empresa F-Gas</label>
              <Input value={form.empresa_cert_num} onChange={e => f('empresa_cert_num', e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Datos del Gas</p>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tipo de refrigerante *</label>
              <Input value={form.refrigerante_tipo} onChange={e => f('refrigerante_tipo', e.target.value)} className="h-8 text-sm" placeholder="ej: R410A, R32..." list="refrigerant-list" />
              <datalist id="refrigerant-list">
                {Object.keys(GWP_TABLE).map(r => <option key={r} value={r} />)}
              </datalist>
              {form.refrigerante_tipo && GWP_TABLE[form.refrigerante_tipo] && (
                <p className="text-xs text-blue-600 mt-0.5">GWP: {GWP_TABLE[form.refrigerante_tipo]}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Carga total del equipo (kg)</label>
              <Input type="number" value={form.carga_total_kg} onChange={e => f('carga_total_kg', e.target.value)} className="h-8 text-sm" />
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

            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Control de Fugas</p>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Resultado control de fugas</label>
              <select value={form.control_fugas_resultado} onChange={e => f('control_fugas_resultado', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                <option value="apto">Apto — Sin fugas detectadas</option>
                <option value="no_apto">No Apto — Fuga detectada</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </div>
            {form.control_fugas_resultado === 'no_apto' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Localización de la fuga</label>
                  <Input value={form.fuga_ubicacion} onChange={e => f('fuga_ubicacion', e.target.value)} className="h-8 text-sm" placeholder="ej: Conexión válvula de expansión" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha reparación de la fuga</label>
                  <Input type="date" value={form.fuga_fecha_reparacion} onChange={e => f('fuga_fecha_reparacion', e.target.value)} className="h-8 text-sm" />
                </div>
              </>
            )}

            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Gestión de Residuos</p>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Gestor de residuos / Centro reciclaje</label>
              <Input value={form.gestor_residuos} onChange={e => f('gestor_residuos', e.target.value)} className="h-8 text-sm" placeholder="Nombre del gestor autorizado" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nº identificación gestor</label>
              <Input value={form.gestor_residuos_num} onChange={e => f('gestor_residuos_num', e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Observaciones</label>
              <Input value={form.observaciones} onChange={e => f('observaciones', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? 'Guardando...' : 'Guardar Registro'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Historial de registros */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Libro de Registro F-Gas ({registrosOrdenados.length} entradas)
        </h4>
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : registrosOrdenados.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-xl">
            <Wind className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No hay registros F-Gas. Añade el primer registro para iniciar el libro.
          </div>
        ) : (
          <div className="space-y-3">
            {registrosOrdenados.map(r => {
              const res = RESULTADO_CONFIG[r.control_fugas_resultado] || RESULTADO_CONFIG.no_aplica;
              const ResIcon = res.icon;
              const expanded = expandedId === r.id;
              return (
                <Card key={r.id} className="border border-slate-200 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Wind className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {format(new Date(r.fecha_intervencion), 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="outline" className="text-xs">{TIPO_LABELS[r.tipo_intervencion]}</Badge>
                          {r.control_fugas_resultado && r.control_fugas_resultado !== 'no_aplica' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${res.color}`}>
                              {ResIcon && <ResIcon className="h-3 w-3 inline mr-1" />}{res.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.tecnico_nombre} · {r.refrigerante_tipo}
                          {r.gas_anyadido_kg > 0 && ` · +${r.gas_anyadido_kg} kg`}
                          {r.gas_recuperado_kg > 0 && ` · −${r.gas_recuperado_kg} kg recuperado`}
                          {r.co2_equivalent_tons && ` · ${r.co2_equivalent_tons.toFixed(3)} tCO₂eq`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEdit(r); }}>
                        <Edit className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteMutation.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                      {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {r.empresa_mantenedora && <div><p className="text-slate-400">Empresa mantenedora</p><p className="font-medium text-slate-700">{r.empresa_mantenedora}</p></div>}
                        {r.tecnico_cert_num && <div><p className="text-slate-400">Cert. Técnico F-Gas</p><p className="font-medium text-slate-700">{r.tecnico_cert_num}</p></div>}
                        {r.empresa_cert_num && <div><p className="text-slate-400">Cert. Empresa F-Gas</p><p className="font-medium text-slate-700">{r.empresa_cert_num}</p></div>}
                        {r.carga_total_kg && <div><p className="text-slate-400">Carga total equipo</p><p className="font-medium text-slate-700">{r.carga_total_kg} kg</p></div>}
                        {r.gas_anyadido_kg > 0 && <div><p className="text-slate-400">Gas añadido</p><p className="font-medium text-slate-700">{r.gas_anyadido_kg} kg ({r.tipo_gas_anyadido})</p></div>}
                        {r.gas_recuperado_kg > 0 && <div><p className="text-slate-400">Gas recuperado</p><p className="font-medium text-slate-700">{r.gas_recuperado_kg} kg</p></div>}
                        {r.gwp && <div><p className="text-slate-400">GWP</p><p className="font-medium text-slate-700">{r.gwp}</p></div>}
                        {r.co2_equivalent_tons && <div><p className="text-slate-400">tCO₂eq</p><p className="font-medium text-slate-700">{r.co2_equivalent_tons.toFixed(3)}</p></div>}
                        {r.fuga_localizada && r.fuga_ubicacion && <div><p className="text-slate-400">Localización fuga</p><p className="font-medium text-red-700">{r.fuga_ubicacion}</p></div>}
                        {r.fuga_fecha_reparacion && <div><p className="text-slate-400">Fecha reparación fuga</p><p className="font-medium text-slate-700">{format(new Date(r.fuga_fecha_reparacion), 'dd/MM/yyyy')}</p></div>}
                        {r.gestor_residuos && <div><p className="text-slate-400">Gestor residuos</p><p className="font-medium text-slate-700">{r.gestor_residuos} {r.gestor_residuos_num && `(${r.gestor_residuos_num})`}</p></div>}
                        {r.proxima_revision_fecha && <div><p className="text-slate-400">Próxima revisión</p><p className="font-medium text-amber-700">{format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}</p></div>}
                        {r.observaciones && <div className="col-span-full"><p className="text-slate-400">Observaciones</p><p className="font-medium text-slate-700">{r.observaciones}</p></div>}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}