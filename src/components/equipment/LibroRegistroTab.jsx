import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus, BookOpen, CheckCircle2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Shield, Wrench
} from 'lucide-react';

const TIPO_LABELS = {
  instalacion: 'Instalación inicial',
  control_fugas: 'Control de fugas',
  carga_gas: 'Carga de gas',
  recuperacion_gas: 'Recuperación de gas',
  reparacion: 'Reparación',
  inspeccion_oca: 'Inspección OCA',
  revision_frigorista: 'Revisión frigorista',
  subsanacion_fuga: 'Subsanación de fuga',
};

const RESULTADO_CONFIG = {
  pasa: { label: 'Pasa ✓', color: 'bg-emerald-100 text-emerald-800' },
  no_pasa: { label: 'No pasa ✗', color: 'bg-red-100 text-red-800' },
  no_aplica: { label: 'No aplica', color: 'bg-slate-100 text-slate-600' },
};

const emptyForm = {
  fecha_intervencion: new Date().toISOString().split('T')[0],
  tipo_intervencion: 'control_fugas',
  tecnico_nombre: '',
  tecnico_cert_num: '',
  empresa_nombre: '',
  empresa_cert_num: '',
  refrigerante_tipo: '',
  gas_cargado_kg: '',
  gas_recuperado_kg: '',
  control_fugas_resultado: 'no_aplica',
  fuga_ubicacion: '',
  fuga_subsanada: false,
  inspeccion_nivel: 'nivel_1',
  observaciones: '',
};

export default function LibroRegistroTab({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-libro'],
    queryFn: () => base44.entities.Technician.filter({ status: 'active' }),
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['libro-registros', equipmentId],
    queryFn: () => base44.entities.RegistroInstalador.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId,
    staleTime: 0,
  });

  const registrosOrdenados = [...registros].sort(
    (a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion)
  );

  // Detectar equipos en estado "No conforme" (fuga no subsanada con plazo vencido)
  const alertaFuga = registros.find(r =>
    r.control_fugas_resultado === 'no_pasa' &&
    !r.fuga_subsanada &&
    r.fuga_plazo_subsanacion &&
    new Date(r.fuga_plazo_subsanacion) < new Date()
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let fuga_plazo_subsanacion = null;
      if (data.control_fugas_resultado === 'no_pasa' && !data.fuga_subsanada) {
        fuga_plazo_subsanacion = addDays(new Date(data.fecha_intervencion), 30).toISOString().split('T')[0];
      }

      let proxima_inspeccion_oca_fecha = null;
      let proxima_revision_frigorista_fecha = null;
      if (data.tipo_intervencion === 'inspeccion_oca') {
        const years = data.inspeccion_nivel === 'nivel_1' ? 10 : 5;
        const d = new Date(data.fecha_intervencion);
        d.setFullYear(d.getFullYear() + years);
        proxima_inspeccion_oca_fecha = d.toISOString().split('T')[0];
      }
      if (data.tipo_intervencion === 'revision_frigorista') {
        const years = data.inspeccion_nivel === 'nivel_1' ? 5 : 1;
        const d = new Date(data.fecha_intervencion);
        d.setFullYear(d.getFullYear() + years);
        proxima_revision_frigorista_fecha = d.toISOString().split('T')[0];
      }

      const payload = {
        ...data,
        equipment_id: equipmentId,
        client_id: equipment.client_id,
        gas_cargado_kg: Number(data.gas_cargado_kg) || 0,
        gas_recuperado_kg: Number(data.gas_recuperado_kg) || 0,
        fuga_plazo_subsanacion,
        proxima_inspeccion_oca_fecha,
        proxima_revision_frigorista_fecha,
      };

      // Si hay fuga no subsanada → marcar equipo como no conforme
      if (data.control_fugas_resultado === 'no_pasa' && !data.fuga_subsanada) {
        await base44.entities.Equipment.update(equipmentId, { status: 'maintenance_needed' });
      }

      return base44.entities.RegistroInstalador.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libro-registros', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      toast.success('Entrada registrada en el Libro');
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="space-y-5">

      {/* Alerta de no conformidad */}
      {alertaFuga && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-400 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">⛔ EQUIPO NO CONFORME — Fuga sin subsanar</p>
            <p className="text-xs text-red-700 mt-0.5">
              Se detectó una fuga el {format(new Date(alertaFuga.fecha_intervencion), 'dd/MM/yyyy')} con plazo límite de subsanación el{' '}
              {format(new Date(alertaFuga.fuga_plazo_subsanacion), 'dd/MM/yyyy')}. El plazo de 30 días ha vencido.
              Registra una intervención de tipo "Subsanación de fuga" para levantar el bloqueo.
            </p>
          </div>
        </div>
      )}

      {/* Info normativa */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <span>
          <strong>RSIF (RD 552/2019) — Libro de Registro obligatorio:</strong> Toda instalación frigorífica debe mantener un registro histórico de intervenciones.
          En caso de fuga, la subsanación es obligatoria en <strong>máximo 30 días</strong>. Inspecciones OCA cada 5 o 10 años según nivel.
        </span>
      </div>

      {/* Plan normativo resumido */}
      {registros.length > 0 && (() => {
        const lastOCA = [...registros].filter(r => r.proxima_inspeccion_oca_fecha).sort((a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion))[0];
        const lastFrigorista = [...registros].filter(r => r.proxima_revision_frigorista_fecha).sort((a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion))[0];
        if (!lastOCA && !lastFrigorista) return null;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lastOCA && (
              <Card className="p-3 bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-semibold text-purple-800">Próxima Inspección OCA</p>
                </div>
                <p className="text-base font-bold text-slate-800">{format(new Date(lastOCA.proxima_inspeccion_oca_fecha), 'dd/MM/yyyy')}</p>
                <p className="text-xs text-slate-500">Organismo de Control Autorizado</p>
              </Card>
            )}
            {lastFrigorista && (
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-800">Próxima Revisión Frigorista</p>
                </div>
                <p className="text-base font-bold text-slate-800">{format(new Date(lastFrigorista.proxima_revision_frigorista_fecha), 'dd/MM/yyyy')}</p>
                <p className="text-xs text-slate-500">Empresa frigorista habilitada</p>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Botón nuevo registro */}
      {!showForm && (
        <Button size="sm" onClick={() => {
          setForm({ ...emptyForm, refrigerante_tipo: equipment?.refrigerant_type || '' });
          setShowForm(true);
        }} className="bg-blue-700 hover:bg-blue-800">
          <Plus className="h-4 w-4 mr-2" />Nueva entrada en el Libro
        </Button>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="p-5 border border-blue-200 bg-blue-50/30">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Nueva entrada — Libro de Registro del Instalador
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
              <label className="text-xs text-slate-500 mb-1 block">Técnico frigorista *</label>
              <select value={form.tecnico_nombre} onChange={e => {
                const name = e.target.value;
                const tech = technicians.find(t => t.name === name);
                f('tecnico_nombre', name);
                if (tech) {
                  if (tech.fgas_cert_num) f('tecnico_cert_num', tech.fgas_cert_num);
                  if (tech.company_name) f('empresa_nombre', tech.company_name);
                  if (tech.empresa_fgas_cert_num) f('empresa_cert_num', tech.empresa_fgas_cert_num);
                }
              }} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                <option value="">— Seleccionar —</option>
                {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                <option value="__manual__">✏ Introducir manualmente</option>
              </select>
              {(form.tecnico_nombre === '__manual__' || (form.tecnico_nombre && !technicians.find(t => t.name === form.tecnico_nombre))) && (
                <Input value={form.tecnico_nombre === '__manual__' ? '' : form.tecnico_nombre} onChange={e => f('tecnico_nombre', e.target.value)} className="h-8 text-sm mt-1" placeholder="Nombre completo" />
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nº Certificado Frigorista</label>
              <Input value={form.tecnico_cert_num} onChange={e => f('tecnico_cert_num', e.target.value)} className="h-8 text-sm" placeholder="Nº carné habilitación" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Empresa</label>
              <Input value={form.empresa_nombre} onChange={e => f('empresa_nombre', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nº Cert. Empresa habilitada</label>
              <Input value={form.empresa_cert_num} onChange={e => f('empresa_cert_num', e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Refrigerante</p>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tipo refrigerante</label>
              <Input value={form.refrigerante_tipo} onChange={e => f('refrigerante_tipo', e.target.value)} className="h-8 text-sm" placeholder="R290, R744, R404A..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Gas cargado (kg)</label>
              <Input type="number" value={form.gas_cargado_kg} onChange={e => f('gas_cargado_kg', e.target.value)} className="h-8 text-sm" placeholder="0" />
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
                <option value="pasa">Pasa ✓ — Sin fugas</option>
                <option value="no_pasa">No pasa ✗ — Fuga detectada</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </div>
            {form.control_fugas_resultado === 'no_pasa' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Localización de la fuga</label>
                  <Input value={form.fuga_ubicacion} onChange={e => f('fuga_ubicacion', e.target.value)} className="h-8 text-sm" placeholder="Descripción de la localización" />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.fuga_subsanada} onChange={e => f('fuga_subsanada', e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-slate-700">La fuga ha sido subsanada en esta misma intervención</span>
                  </label>
                </div>
                {!form.fuga_subsanada && (
                  <div className="sm:col-span-2">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      ⚠ El equipo quedará marcado como <strong>No conforme</strong>. Plazo máximo de subsanación: <strong>30 días</strong> desde la detección. Registra después una intervención de "Subsanación de fuga" para levantar la alerta.
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Nivel de inspección (solo para OCA / frigorista) */}
            {(form.tipo_intervencion === 'inspeccion_oca' || form.tipo_intervencion === 'revision_frigorista') && (
              <>
                <div className="sm:col-span-2 border-t pt-3 mt-1">
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Inspección RSIF</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Nivel de instalación (RSIF)</label>
                  <select value={form.inspeccion_nivel} onChange={e => f('inspeccion_nivel', e.target.value)} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                    <option value="nivel_1">Nivel 1 — OCA: 10 años / Frigorista: 5 años</option>
                    <option value="nivel_2">Nivel 2 — OCA: 5 años / Frigorista: 1 año</option>
                  </select>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800">
                  {form.tipo_intervencion === 'inspeccion_oca'
                    ? `Se programará la próxima inspección OCA en ${form.inspeccion_nivel === 'nivel_1' ? '10' : '5'} años.`
                    : `Se programará la próxima revisión por frigorista en ${form.inspeccion_nivel === 'nivel_1' ? '5 años' : '1 año'}.`}
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Observaciones</label>
              <Input value={form.observaciones} onChange={e => f('observaciones', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.tecnico_nombre} className="bg-blue-700 hover:bg-blue-800">
              {saveMutation.isPending ? 'Guardando...' : 'Registrar entrada'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Historial */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          Libro de Registro ({registrosOrdenados.length} entradas)
        </h4>
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : registrosOrdenados.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-xl">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No hay entradas registradas. Añade la primera intervención.
          </div>
        ) : (
          <div className="space-y-3">
            {registrosOrdenados.map(r => {
              const expanded = expandedId === r.id;
              const res = RESULTADO_CONFIG[r.control_fugas_resultado] || RESULTADO_CONFIG.no_aplica;
              const noConforme = r.control_fugas_resultado === 'no_pasa' && !r.fuga_subsanada;
              return (
                <Card key={r.id} className={`border overflow-hidden ${noConforme ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
                  <div className="p-4 cursor-pointer flex items-start justify-between gap-3" onClick={() => setExpandedId(expanded ? null : r.id)}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${noConforme ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {noConforme ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <BookOpen className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{format(new Date(r.fecha_intervencion), 'dd/MM/yyyy')}</span>
                          <Badge variant="outline" className="text-xs">{TIPO_LABELS[r.tipo_intervencion]}</Badge>
                          {r.control_fugas_resultado !== 'no_aplica' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${res.color}`}>{res.label}</span>
                          )}
                          {noConforme && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-900">⛔ No conforme</span>}
                          {r.fuga_subsanada && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">✓ Subsanada</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.tecnico_nombre}
                          {r.tecnico_cert_num && ` · Nº ${r.tecnico_cert_num}`}
                          {r.gas_cargado_kg > 0 && ` · +${r.gas_cargado_kg} kg cargado`}
                          {r.gas_recuperado_kg > 0 && ` · −${r.gas_recuperado_kg} kg recuperado`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {r.empresa_nombre && <div><p className="text-slate-400">Empresa</p><p className="font-medium text-slate-700">{r.empresa_nombre}</p></div>}
                        {r.empresa_cert_num && <div><p className="text-slate-400">Cert. Empresa</p><p className="font-medium text-slate-700">{r.empresa_cert_num}</p></div>}
                        {r.refrigerante_tipo && <div><p className="text-slate-400">Refrigerante</p><p className="font-medium text-slate-700">{r.refrigerante_tipo}</p></div>}
                        {r.gas_cargado_kg > 0 && <div><p className="text-slate-400">Gas cargado</p><p className="font-medium text-slate-700">{r.gas_cargado_kg} kg</p></div>}
                        {r.gas_recuperado_kg > 0 && <div><p className="text-slate-400">Gas recuperado</p><p className="font-medium text-slate-700">{r.gas_recuperado_kg} kg</p></div>}
                        {r.fuga_ubicacion && <div><p className="text-slate-400">Localización fuga</p><p className="font-medium text-red-700">{r.fuga_ubicacion}</p></div>}
                        {r.fuga_plazo_subsanacion && <div><p className="text-slate-400">Plazo subsanación</p><p className={`font-medium ${new Date(r.fuga_plazo_subsanacion) < new Date() && !r.fuga_subsanada ? 'text-red-700' : 'text-slate-700'}`}>{format(new Date(r.fuga_plazo_subsanacion), 'dd/MM/yyyy')}</p></div>}
                        {r.proxima_inspeccion_oca_fecha && <div><p className="text-slate-400">Próx. Inspección OCA</p><p className="font-medium text-purple-700">{format(new Date(r.proxima_inspeccion_oca_fecha), 'dd/MM/yyyy')}</p></div>}
                        {r.proxima_revision_frigorista_fecha && <div><p className="text-slate-400">Próx. Revisión Frigorista</p><p className="font-medium text-blue-700">{format(new Date(r.proxima_revision_frigorista_fecha), 'dd/MM/yyyy')}</p></div>}
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