import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus, Droplets, AlertTriangle, CheckCircle2, Clock,
  Trash2, Edit, ChevronDown, ChevronUp, FileText, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';

const TIPO_LABELS = {
  puesta_en_marcha: 'Puesta en marcha estacional',
  mantenimiento_mensual: 'Mantenimiento mensual',
  tras_averia: 'Tras avería',
};

const PPM_OPTIONS = [
  { value: 5, label: '5 ppm — Mantenimiento' },
  { value: 20, label: '20 ppm — Choque' },
  { value: 50, label: '50 ppm — Positivo Legionella' },
];

const HIPOCLORITO_OPTIONS = [
  { value: 15, label: '15% — Industrial puro' },
  { value: 10, label: '10% — Industrial semi-degradado' },
  { value: 5, label: '5% — Lejía comercial común' },
  { value: 4, label: '4% — Lejía doméstica (apta agua potable)' },
];

const emptyForm = {
  fecha: new Date().toISOString().split('T')[0],
  tipo_tratamiento: 'mantenimiento_mensual',
  tecnico_nombre: '',
  ph_inicial: '',
  cloro_libre_inicial: '',
  temperatura_inicial: '',
  hipoclorito_ml: '',
  tiempo_recirculacion_min: '',
  cloro_durante_desinfeccion: '',
  metabisulfito_g: '',
  ph_final: '',
  cloro_libre_final: '',
  temperatura_final: '',
  check_vaciado: false,
  check_limpieza_balsa: false,
  check_paneles_celulosa: false,
  check_valvula_vaciado: false,
  observaciones: '',
  // nuevos campos de cálculo
  ppm_deseadas: 5,
  porcentaje_hipoclorito: 15,
  cloro_a_neutralizar: '',
};

// Fórmula oficial: (volumen * ppm) / (% * 10)
function calcularHipoclorito(litros, ppm, porcentaje) {
  if (!litros || !ppm || !porcentaje) return null;
  return +((litros * ppm) / (porcentaje * 10)).toFixed(2);
}

// Fórmula oficial: volumen * cloro_a_neutralizar * 0.002
function calcularMetabisulfito(litros, cloro) {
  if (!litros || cloro === '' || cloro === null || cloro === undefined) return null;
  return +(litros * Number(cloro) * 0.002).toFixed(2);
}

function AlertaValor({ valor, label, min, max, invertir = false }) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const num = Number(valor);
  const ok = num >= min && num <= max;
  const warn = !ok;
  return (
    <span className={`ml-1 text-xs font-medium ${warn ? 'text-red-600' : 'text-emerald-600'}`}>
      {warn ? `⚠ ${label}: ${num} (rango ${min}–${max})` : `✓ OK`}
    </span>
  );
}

export default function LDTab({ equipment, equipmentId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const balsaLitros = equipment?.balsa_litros || null;

  // Cálculos en tiempo real
  const hipocloritoCal = calcularHipoclorito(
    Number(form.hipoclorito_ml) || balsaLitros,
    form.ppm_deseadas,
    form.porcentaje_hipoclorito
  );
  const hipocloritoCalculado = calcularHipoclorito(balsaLitros, form.ppm_deseadas, form.porcentaje_hipoclorito);
  const metabisulfitoCalculado = calcularMetabisulfito(balsaLitros, form.cloro_a_neutralizar);

  // Validación: cloro a neutralizar > 60 ppm bloquea guardar
  const cloroNeutralizarError = form.cloro_a_neutralizar !== '' && Number(form.cloro_a_neutralizar) > 60;

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-ld'],
    queryFn: () => base44.entities.Technician.filter({ status: 'active' }),
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['ld-registros', equipmentId],
    queryFn: () => base44.entities.RegistroLD.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId,
  });

  const registrosOrdenados = [...registros].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const proxima = data.tipo_tratamiento === 'mantenimiento_mensual'
        ? addDays(new Date(data.fecha), 30).toISOString().split('T')[0]
        : null;
      const payload = {
        ...data,
        equipment_id: equipmentId,
        client_id: equipment.client_id,
        balsa_litros: balsaLitros,
        ph_inicial: data.ph_inicial !== '' ? Number(data.ph_inicial) : null,
        cloro_libre_inicial: data.cloro_libre_inicial !== '' ? Number(data.cloro_libre_inicial) : null,
        temperatura_inicial: data.temperatura_inicial !== '' ? Number(data.temperatura_inicial) : null,
        hipoclorito_ml: data.hipoclorito_ml !== '' ? Number(data.hipoclorito_ml) : null,
        tiempo_recirculacion_min: data.tiempo_recirculacion_min !== '' ? Number(data.tiempo_recirculacion_min) : null,
        cloro_durante_desinfeccion: data.cloro_durante_desinfeccion !== '' ? Number(data.cloro_durante_desinfeccion) : null,
        metabisulfito_g: data.metabisulfito_g !== '' ? Number(data.metabisulfito_g) : null,
        ph_final: data.ph_final !== '' ? Number(data.ph_final) : null,
        cloro_libre_final: data.cloro_libre_final !== '' ? Number(data.cloro_libre_final) : null,
        temperatura_final: data.temperatura_final !== '' ? Number(data.temperatura_final) : null,
        ppm_deseadas: data.ppm_deseadas || null,
        porcentaje_hipoclorito: data.porcentaje_hipoclorito || null,
        cloro_a_neutralizar: data.cloro_a_neutralizar !== '' ? Number(data.cloro_a_neutralizar) : null,
        proxima_revision_fecha: proxima,
      };
      if (editingId) return base44.entities.RegistroLD.update(editingId, payload);
      return base44.entities.RegistroLD.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ld-registros', equipmentId] });
      toast.success(editingId ? 'Registro actualizado' : 'Registro L+D creado');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroLD.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ld-registros', equipmentId] });
      toast.success('Registro eliminado');
    },
  });

  const handleEdit = (r) => {
    setForm({
      fecha: r.fecha || '',
      tipo_tratamiento: r.tipo_tratamiento || 'mantenimiento_mensual',
      tecnico_nombre: r.tecnico_nombre || '',
      ph_inicial: r.ph_inicial ?? '',
      cloro_libre_inicial: r.cloro_libre_inicial ?? '',
      temperatura_inicial: r.temperatura_inicial ?? '',
      hipoclorito_ml: r.hipoclorito_ml ?? '',
      tiempo_recirculacion_min: r.tiempo_recirculacion_min ?? '',
      cloro_durante_desinfeccion: r.cloro_durante_desinfeccion ?? '',
      metabisulfito_g: r.metabisulfito_g ?? '',
      ph_final: r.ph_final ?? '',
      cloro_libre_final: r.cloro_libre_final ?? '',
      temperatura_final: r.temperatura_final ?? '',
      check_vaciado: r.check_vaciado || false,
      check_limpieza_balsa: r.check_limpieza_balsa || false,
      check_paneles_celulosa: r.check_paneles_celulosa || false,
      check_valvula_vaciado: r.check_valvula_vaciado || false,
      observaciones: r.observaciones || '',
      ppm_deseadas: r.ppm_deseadas || 5,
      porcentaje_hipoclorito: r.porcentaje_hipoclorito || 15,
      cloro_a_neutralizar: r.cloro_a_neutralizar ?? '',
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const generatePDF = async (r) => {
    setGeneratingPdf(r.id);
    try {
      const doc = new jsPDF();
      const eqName = equipment?.reference_name || `${equipment?.brand} ${equipment?.model}`;
      const margin = 20;
      let y = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICADO DE LIMPIEZA Y DESINFECCIÓN', margin, y);
      doc.text('SISTEMA DE ENFRIAMIENTO ADIABÁTICO', margin, y + 8);
      y += 22;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(240, 248, 255);
      doc.rect(margin, y, 170, 28, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL EQUIPO', margin + 2, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Equipo: ${eqName}`, margin + 2, y + 13);
      doc.text(`Volumen balsa: ${r.balsa_litros || balsaLitros || '—'} L`, margin + 2, y + 20);
      doc.text(`Fecha: ${format(new Date(r.fecha), 'dd/MM/yyyy')}`, margin + 90, y + 13);
      doc.text(`Técnico: ${r.tecnico_nombre}`, margin + 90, y + 20);
      y += 34;

      doc.setFont('helvetica', 'bold');
      doc.text(`Tipo de tratamiento: ${TIPO_LABELS[r.tipo_tratamiento] || r.tipo_tratamiento}`, margin, y);
      y += 10;

      // Mediciones iniciales
      doc.setFillColor(230, 244, 255);
      doc.rect(margin, y, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICIONES INICIALES', margin + 2, y + 5);
      y += 10;
      doc.setFont('helvetica', 'normal');
      const iniciales = [
        ['pH inicial', r.ph_inicial, '7.0 – 8.0'],
        ['Cloro libre inicial (ppm)', r.cloro_libre_inicial, '—'],
        ['Temperatura inicial (°C)', r.temperatura_inicial, '< 20°C'],
      ];
      iniciales.forEach(([label, val, rango]) => {
        doc.text(`${label}: ${val ?? '—'}  (Rango: ${rango})`, margin + 2, y);
        y += 6;
      });
      y += 3;

      // Fase química
      doc.setFillColor(255, 248, 230);
      doc.rect(margin, y, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('FASE QUÍMICA (DOSIFICACIÓN)', margin + 2, y + 5);
      y += 10;
      doc.setFont('helvetica', 'normal');
      [
        ['Hipoclorito sódico añadido (ml)', r.hipoclorito_ml],
        ['Tiempo de recirculación (min)', r.tiempo_recirculacion_min],
        ['Cloro durante desinfección (ppm)', r.cloro_durante_desinfeccion],
      ].forEach(([label, val]) => {
        doc.text(`${label}: ${val ?? '—'}`, margin + 2, y);
        y += 6;
      });
      y += 3;

      // Mediciones finales
      doc.setFillColor(230, 255, 240);
      doc.rect(margin, y, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICIONES FINALES', margin + 2, y + 5);
      y += 10;
      doc.setFont('helvetica', 'normal');
      [
        ['Metabisulfito sódico (g)', r.metabisulfito_g, '—'],
        ['pH final', r.ph_final, '6.5 – 8.5'],
        ['Cloro libre final (ppm)', r.cloro_libre_final, '0.2 – 1.0'],
        ['Temperatura final (°C)', r.temperatura_final, '—'],
      ].forEach(([label, val, rango]) => {
        doc.text(`${label}: ${val ?? '—'}  ${rango ? `(Rango: ${rango})` : ''}`, margin + 2, y);
        y += 6;
      });
      y += 3;

      // Checklist
      doc.setFillColor(245, 240, 255);
      doc.rect(margin, y, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('ACCIONES FÍSICAS REALIZADAS', margin + 2, y + 5);
      y += 10;
      doc.setFont('helvetica', 'normal');
      [
        ['Vaciado completo inicial', r.check_vaciado],
        ['Limpieza mecánica de la balsa', r.check_limpieza_balsa],
        ['Revisión/limpieza paneles de celulosa', r.check_paneles_celulosa],
        ['Verificación válvula de vaciado automático', r.check_valvula_vaciado],
      ].forEach(([label, val]) => {
        doc.text(`${val ? '✓' : '✗'}  ${label}`, margin + 2, y);
        y += 6;
      });
      y += 3;

      if (r.observaciones) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(r.observaciones, 165);
        doc.text(lines, margin + 2, y);
        y += lines.length * 6 + 3;
      }

      if (r.proxima_revision_fecha) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 80, 0);
        doc.text(`Próxima revisión obligatoria: ${format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
      }

      // Firma
      y += 10;
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, y, margin + 60, y);
      doc.setFontSize(8);
      doc.text('Firma del técnico', margin, y + 4);
      doc.text(r.tecnico_nombre, margin, y + 9);

      doc.save(`LD_${eqName.replace(/\s+/g, '_')}_${r.fecha}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (err) {
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const openNewForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">

      {/* Cabecera con info del equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-0 bg-cyan-50">
          <p className="text-xs text-cyan-600 font-medium mb-1 flex items-center gap-1">
            <Droplets className="h-3 w-3" />Volumen balsa
          </p>
          <p className="text-lg font-bold text-slate-800">{balsaLitros ? `${balsaLitros} L` : 'No definido'}</p>
          {!balsaLitros && <p className="text-xs text-amber-600 mt-0.5">Edita el equipo para definirlo</p>}
        </Card>
        <Card className="p-4 border-0 bg-blue-50">
          <p className="text-xs text-blue-600 font-medium mb-1">Hipoclorito mantenimiento (5 ppm / 15%)</p>
          {balsaLitros ? (
            <>
              <p className="text-sm font-semibold text-slate-800">{calcularHipoclorito(balsaLitros, 5, 15)} ml</p>
              <p className="text-xs text-slate-500">({balsaLitros}L × 5) / (15 × 10)</p>
            </>
          ) : <p className="text-sm text-slate-400">—</p>}
        </Card>
        <Card className="p-4 border-0 bg-amber-50">
          <p className="text-xs text-amber-600 font-medium mb-1">Hipoclorito choque (20 ppm / 15%)</p>
          {balsaLitros ? (
            <>
              <p className="text-sm font-semibold text-slate-800">{calcularHipoclorito(balsaLitros, 20, 15)} ml</p>
              <p className="text-xs text-slate-500">({balsaLitros}L × 20) / (15 × 10)</p>
            </>
          ) : <p className="text-sm text-slate-400">—</p>}
        </Card>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Normativa Legionella (RD 487/2022):</strong> pH óptimo 7.0–8.0 · Cloro libre residual 0.2–1.0 ppm ·
          Temperatura &lt;20°C (por encima la Legionella se multiplica activamente) · Revisión mensual obligatoria.
        </span>
      </div>

      {!showForm && (
        <Button size="sm" onClick={openNewForm} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo Registro L+D
        </Button>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="p-5 border border-cyan-200 bg-cyan-50/30">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-600" />
            {editingId ? 'Editar Registro L+D' : 'Nuevo Registro L+D'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha *</label>
              <Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tipo de tratamiento *</label>
              <select value={form.tipo_tratamiento} onChange={e => f('tipo_tratamiento', e.target.value)}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Técnico responsable *</label>
              <select value={form.tecnico_nombre} onChange={e => f('tecnico_nombre', e.target.value)}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                <option value="">— Seleccionar técnico —</option>
                {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                <option value="__manual__">✏ Introducir manualmente</option>
              </select>
              {(form.tecnico_nombre === '__manual__' || (form.tecnico_nombre && !technicians.find(t => t.name === form.tecnico_nombre))) && (
                <Input value={form.tecnico_nombre === '__manual__' ? '' : form.tecnico_nombre}
                  onChange={e => f('tecnico_nombre', e.target.value)} className="h-8 text-sm mt-1" placeholder="Nombre completo" />
              )}
            </div>

            {/* MEDICIONES INICIALES */}
            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">📋 Mediciones Iniciales</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">pH inicial</label>
              <Input type="number" step="0.1" value={form.ph_inicial} onChange={e => f('ph_inicial', e.target.value)} className="h-8 text-sm" placeholder="7.0 – 8.0" />
              <AlertaValor valor={form.ph_inicial} label="pH" min={7.0} max={8.0} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cloro libre inicial (ppm)</label>
              <Input type="number" step="0.1" value={form.cloro_libre_inicial} onChange={e => f('cloro_libre_inicial', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Temperatura inicial del agua (°C)</label>
              <Input type="number" step="0.1" value={form.temperatura_inicial} onChange={e => f('temperatura_inicial', e.target.value)} className="h-8 text-sm" />
              {form.temperatura_inicial !== '' && Number(form.temperatura_inicial) > 20 && (
                <span className="text-xs text-red-600 font-medium">⚠ Temperatura &gt;20°C: riesgo de Legionella</span>
              )}
            </div>

            {/* FASE QUÍMICA */}
            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">🧪 Fase Química (Dosificación)</p>
            </div>

            {/* Selector ppm */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">PPM deseadas *</label>
              <select value={form.ppm_deseadas} onChange={e => f('ppm_deseadas', Number(e.target.value))}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {PPM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Selector % hipoclorito */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Concentración hipoclorito *</label>
              <select value={form.porcentaje_hipoclorito} onChange={e => f('porcentaje_hipoclorito', Number(e.target.value))}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {HIPOCLORITO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Resultado calculado hipoclorito */}
            {balsaLitros && (
              <div className="sm:col-span-2">
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${hipocloritoCalculado !== null && hipocloritoCalculado < 5 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Dosis calculada de hipoclorito sódico</p>
                    <p className="text-xl font-bold text-slate-800">
                      {hipocloritoCalculado !== null ? `${hipocloritoCalculado} ml` : '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ({balsaLitros} L × {form.ppm_deseadas} ppm) / ({form.porcentaje_hipoclorito}% × 10)
                    </p>
                  </div>
                </div>
                {hipocloritoCalculado !== null && hipocloritoCalculado < 5 && (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    ⚠️ Cantidad muy baja. Utilizar jeringuilla de precisión para la medición.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hipoclorito sódico añadido (ml)</label>
              <Input type="number" step="0.1" value={form.hipoclorito_ml} onChange={e => f('hipoclorito_ml', e.target.value)} className="h-8 text-sm"
                placeholder={hipocloritoCalculado !== null ? `Calc: ${hipocloritoCalculado} ml` : ''} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tiempo de recirculación (min, mín. 60)</label>
              <Input type="number" value={form.tiempo_recirculacion_min} onChange={e => f('tiempo_recirculacion_min', e.target.value)} className="h-8 text-sm" placeholder="60" />
              {form.tiempo_recirculacion_min !== '' && Number(form.tiempo_recirculacion_min) < 60 && (
                <span className="text-xs text-red-600">⚠ Mínimo recomendado: 60 min</span>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cloro durante desinfección (ppm)</label>
              <Input type="number" step="0.1" value={form.cloro_durante_desinfeccion} onChange={e => f('cloro_durante_desinfeccion', e.target.value)} className="h-8 text-sm" placeholder="~5 ppm" />
            </div>

            {/* MEDICIONES FINALES */}
            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">✅ Mediciones Finales (Neutralización)</p>
            </div>

            {/* Cloro a neutralizar + cálculo metabisulfito */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cloro libre a neutralizar (ppm medido)</label>
              <Input type="number" step="0.1" value={form.cloro_a_neutralizar}
                onChange={e => f('cloro_a_neutralizar', e.target.value)}
                className={`h-8 text-sm ${cloroNeutralizarError ? 'border-red-500' : ''}`}
                placeholder="Medir antes de añadir metabisulfito" />
              {cloroNeutralizarError && (
                <p className="text-xs text-red-600 font-medium mt-0.5">⛔ Valor &gt;60 ppm imposible. Revisa el análisis antes de guardar.</p>
              )}
            </div>

            {/* Resultado calculado metabisulfito */}
            {balsaLitros && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Dosis calculada de metabisulfito</p>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 min-h-[2rem]">
                  <p className="text-lg font-bold text-slate-800">
                    {metabisulfitoCalculado !== null ? `${metabisulfitoCalculado} g` : '—'}
                  </p>
                  {metabisulfitoCalculado !== null && (
                    <p className="text-xs text-slate-400">
                      ({balsaLitros} L × {form.cloro_a_neutralizar} ppm × 0.002)
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Metabisulfito sódico añadido (g)</label>
              <Input type="number" step="0.01" value={form.metabisulfito_g} onChange={e => f('metabisulfito_g', e.target.value)} className="h-8 text-sm"
                placeholder={metabisulfitoCalculado !== null ? `Calc: ${metabisulfitoCalculado} g` : ''} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">pH final</label>
              <Input type="number" step="0.1" value={form.ph_final} onChange={e => f('ph_final', e.target.value)} className="h-8 text-sm" placeholder="6.5 – 8.5" />
              <AlertaValor valor={form.ph_final} label="pH" min={6.5} max={8.5} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cloro libre final (ppm)</label>
              <Input type="number" step="0.1" value={form.cloro_libre_final} onChange={e => f('cloro_libre_final', e.target.value)} className="h-8 text-sm" placeholder="0.2 – 1.0" />
              <AlertaValor valor={form.cloro_libre_final} label="Cl final" min={0.2} max={1.0} />
              {form.cloro_libre_final !== '' && Number(form.cloro_libre_final) > 2 && (
                <span className="text-xs text-red-600 block">⚠ &gt;2 ppm: NO encender el ventilador</span>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Temperatura final del agua (°C)</label>
              <Input type="number" step="0.1" value={form.temperatura_final} onChange={e => f('temperatura_final', e.target.value)} className="h-8 text-sm" />
            </div>

            {/* CHECKLIST */}
            <div className="sm:col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">☑ Acciones Físicas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['check_vaciado', '¿Vaciado completo inicial realizado?'],
                  ['check_limpieza_balsa', '¿Limpieza mecánica de la balsa (lodos)?'],
                  ['check_paneles_celulosa', '¿Paneles de celulosa revisados/limpiados?'],
                  ['check_valvula_vaciado', '¿Válvula de vaciado automático verificada?'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                    <Checkbox checked={form[key]} onCheckedChange={v => f(key, !!v)} />
                    <label className="text-xs text-slate-700 cursor-pointer" onClick={() => f(key, !form[key])}>{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Observaciones</label>
              <Input value={form.observaciones} onChange={e => f('observaciones', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.tecnico_nombre || !form.fecha || cloroNeutralizarError}
              className="bg-cyan-600 hover:bg-cyan-700">
              {cloroNeutralizarError && <span className="text-xs mr-1">⛔</span>}
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Registro
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Historial */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Historial L+D ({registrosOrdenados.length} registros)
        </h4>
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : registrosOrdenados.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-xl">
            <Droplets className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No hay registros L+D. Añade el primero.
          </div>
        ) : (
          <div className="space-y-3">
            {registrosOrdenados.map(r => {
              const expanded = expandedId === r.id;
              const clFinalOk = r.cloro_libre_final !== null && r.cloro_libre_final >= 0.2 && r.cloro_libre_final <= 1.0;
              const clFinalWarn = r.cloro_libre_final !== null && (r.cloro_libre_final < 0.2 || r.cloro_libre_final > 2);
              return (
                <Card key={r.id} className="border border-slate-200 overflow-hidden">
                  <div className="p-4 cursor-pointer flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(expanded ? null : r.id)}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {format(new Date(r.fecha), 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="outline" className="text-xs">{TIPO_LABELS[r.tipo_tratamiento]}</Badge>
                          {clFinalOk && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 inline mr-1" />Cloro OK</span>}
                          {clFinalWarn && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 inline mr-1" />Cloro fuera rango</span>}
                          {r.proxima_revision_fecha && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Próx: {format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.tecnico_nombre}
                          {r.ph_final !== null && ` · pH final: ${r.ph_final}`}
                          {r.cloro_libre_final !== null && ` · Cl: ${r.cloro_libre_final} ppm`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); generatePDF(r); }}
                        title="Generar PDF" disabled={generatingPdf === r.id}>
                        {generatingPdf === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-blue-500" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); handleEdit(r); }}>
                        <Edit className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                      {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {r.balsa_litros && <div><p className="text-slate-400">Volumen balsa</p><p className="font-medium text-slate-700">{r.balsa_litros} L</p></div>}
                        {r.ph_inicial !== null && <div><p className="text-slate-400">pH inicial</p><p className={`font-medium ${r.ph_inicial >= 7 && r.ph_inicial <= 8 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_inicial}</p></div>}
                        {r.cloro_libre_inicial !== null && <div><p className="text-slate-400">Cl libre inicial</p><p className="font-medium text-slate-700">{r.cloro_libre_inicial} ppm</p></div>}
                        {r.temperatura_inicial !== null && <div><p className="text-slate-400">Tª inicial</p><p className={`font-medium ${r.temperatura_inicial > 20 ? 'text-red-600' : 'text-slate-700'}`}>{r.temperatura_inicial} °C</p></div>}
                        {r.hipoclorito_ml !== null && <div><p className="text-slate-400">Hipoclorito añadido</p><p className="font-medium text-slate-700">{r.hipoclorito_ml} ml</p></div>}
                        {r.tiempo_recirculacion_min !== null && <div><p className="text-slate-400">Tiempo recirculación</p><p className={`font-medium ${r.tiempo_recirculacion_min < 60 ? 'text-amber-600' : 'text-slate-700'}`}>{r.tiempo_recirculacion_min} min</p></div>}
                        {r.cloro_durante_desinfeccion !== null && <div><p className="text-slate-400">Cl durante desinfección</p><p className="font-medium text-slate-700">{r.cloro_durante_desinfeccion} ppm</p></div>}
                        {r.metabisulfito_g !== null && <div><p className="text-slate-400">Metabisulfito</p><p className="font-medium text-slate-700">{r.metabisulfito_g} g</p></div>}
                        {r.ph_final !== null && <div><p className="text-slate-400">pH final</p><p className={`font-medium ${r.ph_final >= 6.5 && r.ph_final <= 8.5 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_final}</p></div>}
                        {r.cloro_libre_final !== null && <div><p className="text-slate-400">Cl libre final</p><p className={`font-medium ${r.cloro_libre_final >= 0.2 && r.cloro_libre_final <= 1.0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.cloro_libre_final} ppm</p></div>}
                        {r.temperatura_final !== null && <div><p className="text-slate-400">Tª final</p><p className="font-medium text-slate-700">{r.temperatura_final} °C</p></div>}
                        <div className="col-span-full">
                          <p className="text-slate-400 mb-1">Acciones físicas</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              ['check_vaciado', 'Vaciado'],
                              ['check_limpieza_balsa', 'Limpieza balsa'],
                              ['check_paneles_celulosa', 'Paneles celulosa'],
                              ['check_valvula_vaciado', 'Válvula vaciado'],
                            ].map(([key, label]) => (
                              <span key={key} className={`text-xs px-2 py-0.5 rounded-full ${r[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                {r[key] ? '✓' : '✗'} {label}
                              </span>
                            ))}
                          </div>
                        </div>
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