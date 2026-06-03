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
  Plus, Droplets, AlertTriangle, CheckCircle2, Clock,
  Trash2, Edit, ChevronDown, ChevronUp, FileText, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';

const TIPO_LABELS = {
  puesta_en_marcha: 'Puesta en marcha',
  mantenimiento_mensual: 'Mantenimiento programado',
  tras_averia: 'Tras avería',
  aislamiento_legionella: 'Aislamiento de Legionella',
  medida_correctora: 'Medida correctora',
  brote_casos: 'Brote/Casos',
};

const ESTADO_CONSERVACION = {
  correcto: 'Correcto',
  con_corrosion: 'Con corrosión',
  con_incrustaciones: 'Con incrustaciones',
  biocapa: 'Biocapa',
  algas: 'Algas',
};

const PPM_OPTIONS = [
  { value: 30, label: '30 ppm — Puesta en marcha/Hibernación (estándar)' },
  { value: 20, label: '20 ppm — Mantenimiento programado' },
  { value: 50, label: '50 ppm — Brote/Aislamiento Legionella' },
];

const HIPOCLORITO_OPTIONS = [
  { value: 15, label: '15% — Industrial puro' },
  { value: 10, label: '10% — Industrial semi-degradado' },
  { value: 5, label: '5% — Lejía comercial común' },
  { value: 4, label: '4% — Lejía doméstica' },
];

const emptyForm = {
  fecha: new Date().toISOString().split('T')[0],
  tipo_tratamiento: 'mantenimiento_mensual',
  nombre_circuito: '',
  estado_conservacion: 'correcto',
  plano_hidraulico: 'no',
  hora_inicio: '',
  hora_fin: '',
  hora_inicio_desinfeccion: '',
  hora_fin_desinfeccion: '',
  ph_inicial: '',
  cloro_libre_inicial: '',
  temperatura_inicial: '',
  producto_principal: 'Hipoclorito Sódico',
  dosis_producto_principal: '',
  producto_secundario: 'Tiosulfato Sódico',
  dosis_producto_secundario: '',
  hipoclorito_ml: '',
  tiempo_recirculacion_min: '',
  tiempo_neutralizacion_min: '',
  cloro_durante_desinfeccion: '',
  metabisulfito_g: '',
  ph_final: '',
  cloro_libre_final: '',
  temperatura_final: '',
  check_vaciado: 'no',
  check_limpieza_antes_biocida: 'no',
  check_limpieza_balsa: false,
  check_paneles_celulosa: false,
  check_valvula_vaciado: false,
  partes_tratamiento: '',
  observaciones: '',
  // Responsable técnico
  responsable_tecnico_nombre: '',
  responsable_tecnico_dni: '',
  responsable_tecnico_curso: '',
  responsable_tecnico_cualificacion: '',
  // Aplicador de tratamiento
  aplicador_nombre: '',
  aplicador_dni: '',
  aplicador_curso: '',
  aplicador_cualificacion: '',
  // Cálculos
  ppm_deseadas: 30,
  porcentaje_hipoclorito: 15,
  cloro_a_neutralizar: '',
};

function calcularHipoclorito(litros, ppm, porcentaje) {
  if (!litros || !ppm || !porcentaje) return null;
  return +((litros * ppm) / (porcentaje * 10)).toFixed(2);
}

function calcularMetabisulfito(litros, cloro) {
  if (!litros || cloro === '' || cloro === null || cloro === undefined) return null;
  return +(litros * Number(cloro) * 0.002).toFixed(2);
}

function AlertaValor({ valor, label, min, max }) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const num = Number(valor);
  const ok = num >= min && num <= max;
  return (
    <span className={`ml-1 text-xs font-medium ${!ok ? 'text-red-600' : 'text-emerald-600'}`}>
      {!ok ? `⚠ ${label}: ${num} (rango ${min}–${max})` : `✓ OK`}
    </span>
  );
}

function SiNoSelect({ value, onChange, incluirParcialmente = false }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
      <option value="si">Sí</option>
      <option value="no">No</option>
      {incluirParcialmente && <option value="parcialmente">Parcialmente</option>}
    </select>
  );
}

// ─── Generación del PDF según plantilla ───────────────────────────────────────
function generatePDFFromTemplate(r, equipment, client, appSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 15;
  const usable = W - margin * 2;
  let y = 10;

  const lineH = 6;
  const cellPad = 2;

  const setHeader = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
  };

  const drawCell = (x, cy, w, h, text, bold = false, fillRGB = null, fontSize = 8, align = 'left') => {
    if (fillRGB) {
      doc.setFillColor(...fillRGB);
      doc.rect(x, cy, w, h, 'F');
    }
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, cy, w, h, 'S');
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    if (align === 'center') {
      doc.text(text || '', x + w / 2, cy + h / 2 + fontSize * 0.18, { align: 'center' });
    } else {
      const lines = doc.splitTextToSize(text || '', w - cellPad * 2);
      doc.text(lines, x + cellPad, cy + cellPad + fontSize * 0.35);
    }
  };

  const drawRow = (cy, label, value, labelW = 55) => {
    const valueW = usable - labelW;
    drawCell(margin, cy, labelW, lineH, label, false, [240, 240, 240]);
    drawCell(margin + labelW, cy, valueW, lineH, value || '');
    return cy + lineH;
  };

  const drawSectionTitle = (cy, title) => {
    doc.setFillColor(30, 50, 80);
    doc.rect(margin, cy, usable, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + cellPad, cy + 4.8);
    doc.setTextColor(0, 0, 0);
    return cy + 7;
  };

  const eqName = equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim();
  const companyName = appSettings?.company_name || '';
  const companyReg = appSettings?.company_cif || '';
  const companyAddress = [appSettings?.company_address, appSettings?.company_city, appSettings?.company_postal_code].filter(Boolean).join(', ');
  const companyPhone = appSettings?.company_phone || '';
  const companyEmail = appSettings?.company_email || '';

  // ── CABECERA EMPRESA (logo + dirección) ──
  if (appSettings?.logo_url) {
    try { doc.addImage(appSettings.logo_url, 'JPEG', margin, y, 40, 14); } catch (e) {}
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const offX = margin + 120;
  doc.setFont('helvetica', 'bold');
  doc.text('OFICINAS Y ALMACÉN', offX, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(companyAddress || '—', offX, y + 7, { maxWidth: 60 });
  doc.text(companyPhone, offX, y + 13);
  doc.setTextColor(0, 0, 0);
  y += 18;

  // ── TÍTULO CERTIFICADO ──
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, usable, 9, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, usable, 9, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CERTIFICADO LIMPIEZA Y DESINFECCIÓN DE INSTALACIONES DE EQUIPOS DE ENFRIAMIENTO EVAPORATIVO',
    W / 2, y + 5.5, { align: 'center', maxWidth: usable - 4 });
  y += 12;

  // ── DATOS DE LA EMPRESA ──
  y = drawSectionTitle(y, 'DATOS DE LA EMPRESA');
  y = drawRow(y, 'Nombre:', companyName);
  y = drawRow(y, 'Número de registro:', companyReg);
  y = drawRow(y, 'Domicilio:', companyAddress);
  y = drawRow(y, 'C.I.F.:', appSettings?.company_cif || '');
  y = drawRow(y, 'Teléfono / Fax:', companyPhone);
  y = drawRow(y, 'Mail:', companyEmail);
  y += 3;

  // ── DATOS DEL CLIENTE ──
  y = drawSectionTitle(y, 'DATOS DEL CLIENTE');
  const clientName = client?.name || '';
  const clientAddress = [client?.address, client?.city, client?.postal_code, client?.province].filter(Boolean).join(', ');
  y = drawRow(y, 'Nombre:', clientName);
  y = drawRow(y, 'Domicilio:', clientAddress);
  y = drawRow(y, 'N.I.F./C.I.F.:', client?.cif || '');
  y = drawRow(y, 'Teléfono:', client?.phone || '');
  y = drawRow(y, 'Instalación tratada:', eqName);
  y = drawRow(y, 'Correo electrónico:', client?.email || '');
  y = drawRow(y, 'Nombre del circuito:', r.nombre_circuito || eqName);
  y = drawRow(y, 'Motivo del tratamiento:', TIPO_LABELS[r.tipo_tratamiento] || r.tipo_tratamiento);

  // Checkboxes motivo
  const motivoY = y;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const tipos = ['puesta_en_marcha', 'mantenimiento_mensual', 'aislamiento_legionella', 'medida_correctora', 'brote_casos'];
  const tiposLabel = ['Puesta en marcha', 'Mant. programado', 'Aisl. Legionella', 'Medida correctora', 'Brote/Casos'];
  let cx = margin + 2;
  tipos.forEach((t, i) => {
    const checked = r.tipo_tratamiento === t;
    doc.rect(cx, motivoY + 1, 3.5, 3.5, checked ? 'F' : 'S');
    if (checked) { doc.setFillColor(30, 50, 80); doc.rect(cx, motivoY + 1, 3.5, 3.5, 'F'); doc.setFillColor(0); }
    doc.text(tiposLabel[i], cx + 5, motivoY + 4);
    cx += 33;
  });
  y = motivoY + lineH;

  y = drawRow(y, 'Estado de conservación:', ESTADO_CONSERVACION[r.estado_conservacion] || r.estado_conservacion || 'Correcto');
  y = drawRow(y, 'Plano hidráulico actualizado:', r.plano_hidraulico === 'si' ? 'SÍ' : 'NO');
  y += 3;

  // Nueva página si queda poco espacio
  if (y > 200) { doc.addPage(); y = 15; }

  // ── TRATAMIENTO LIMPIEZA Y DESINFECCIÓN ──
  y = drawSectionTitle(y, 'TRATAMIENTO LIMPIEZA Y DESINFECCIÓN');

  // Protocolo
  const protocolos = {
    puesta_en_marcha: 'Limpieza previa con pistola a presión. Llenado con agua limpia de red. Ajuste de pH a rango 7,2-7,8 (pH >8 reduce eficacia del cloro >70%). Dosificación de hipoclorito sódico al 15% para alcanzar 30 mg/l (ppm) de cloro residual libre. Encendido de bomba de agua con ventiladores APAGADOS. Recirculación durante 120 minutos manteniendo >30 ppm (controles a min 30, 60 y 90; reponer hipoclorito si baja de 30 ppm). Neutralización con tiosulfato sódico hasta 0 ppm de cloro (cumplimiento normativa de vertidos). Vaciado, enjuague final con agua limpia y llenado para puesta en servicio.',
    mantenimiento_mensual: 'Mantenimiento higiénico-sanitario programado mensual. Revisión del estado general de la instalación. Medición y corrección de parámetros fisicoquímicos (pH 7,2-7,8). Dosificación de hipoclorito sódico para 20 ppm de cloro residual libre. Recirculación mínima 60 minutos con ventiladores apagados. Neutralización con tiosulfato sódico y medición final. Verificación de todos los parámetros conforme RD 487/2022.',
    tras_averia: 'Tratamiento de limpieza y desinfección tras avería o parada no programada. Vaciado, limpieza mecánica, desinfección con hipoclorito sódico y verificación de parámetros.',
    aislamiento_legionella: 'Tratamiento de choque por aislamiento de Legionella. Dosificación de biocida a concentración de choque (20-50 ppm). Tiempo de recirculación mínimo 60 minutos. Verificación de todos los puntos finales.',
    medida_correctora: 'Tratamiento correctivo por detección de parámetros fuera de rango. Limpieza, desinfección y verificación de parámetros.',
    brote_casos: 'Tratamiento urgente por brote/casos de legionelosis. Desinfección intensiva y toma de muestras.',
  };
  const protocolo = protocolos[r.tipo_tratamiento] || '';
  drawCell(margin, y, 35, lineH, 'Protocolo seguido:', false, [240, 240, 240]);
  drawCell(margin, y + lineH, 35, lineH, TIPO_LABELS[r.tipo_tratamiento] || '', false, [240, 240, 240]);
  const protLines = doc.splitTextToSize(protocolo, usable - 37);
  const protH = Math.max(lineH * 2, protLines.length * 4.5 + 4);
  drawCell(margin + 35, y, usable - 35, protH, '', false, null);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(protLines, margin + 37, y + 4);
  y += protH + 2;

  // Tabla productos
  const colW = [45, 50, 25, 50, 20];
  const colX = [margin, margin + 45, margin + 95, margin + 120, margin + 170];
  drawCell(colX[0], y, colW[0], lineH, 'SISTEMA TRATADO', true, [220, 220, 220], 7, 'center');
  drawCell(colX[1], y, colW[1], lineH, 'PRODUCTOS UTILIZADOS', true, [220, 220, 220], 7, 'center');
  drawCell(colX[2], y, colW[2], lineH, 'DOSIS', true, [220, 220, 220], 7, 'center');
  drawCell(colX[3], y, colW[3], lineH, 'OTROS PRODUCTOS', true, [220, 220, 220], 7, 'center');
  drawCell(colX[4], y, colW[4], lineH, 'DOSIS', true, [220, 220, 220], 7, 'center');
  y += lineH;
  ['EVAPORATIVOS', 'ACCESORIOS'].forEach(sistema => {
    drawCell(colX[0], y, colW[0], lineH, sistema, false, null, 7, 'center');
    drawCell(colX[1], y, colW[1], lineH, r.producto_principal || 'Hipoclorito Sódico', false, null, 7);
    drawCell(colX[2], y, colW[2], lineH, r.dosis_producto_principal || '', false, null, 7, 'center');
    drawCell(colX[3], y, colW[3], lineH, r.producto_secundario || 'Metabisulfito Sódico', false, null, 7);
    drawCell(colX[4], y, colW[4], lineH, r.dosis_producto_secundario || '', false, null, 7, 'center');
    y += lineH;
  });
  y += 2;

  const fechaFmt = r.fecha ? format(new Date(r.fecha), 'dd/MM/yyyy') : '—';
  const horaStr = (r.hora_inicio && r.hora_fin) ? `${r.hora_inicio} – ${r.hora_fin}` : '—';
  drawCell(margin, y, 30, lineH, 'FECHA:', true, [240, 240, 240], 8);
  drawCell(margin + 30, y, 50, lineH, fechaFmt, false, null, 8);
  drawCell(margin + 80, y, 50, lineH, `Hora inicio/final: ${horaStr}`, false, null, 8);
  y += lineH;

  const tActuacion = (r.hora_inicio && r.hora_fin) ? (() => {
    const [h1, m1] = (r.hora_inicio || '0:0').split(':').map(Number);
    const [h2, m2] = (r.hora_fin || '0:0').split(':').map(Number);
    return `${((h2 * 60 + m2) - (h1 * 60 + m1))} min`;
  })() : '—';
  drawCell(margin, y, usable, lineH, `Tiempo de actuación total: ${tActuacion}`, false, null, 8);
  y += lineH + 2;

  // Vaciado / limpieza antes biocida
  const drawTres = (cy, label, val) => {
    drawCell(margin, cy, 80, lineH, label, false, [240, 240, 240], 7.5);
    ['si', 'no', 'parcialmente'].forEach((opt, i) => {
      const checked = val === opt;
      const bx = margin + 80 + i * 30;
      doc.setFillColor(checked ? 30 : 255, checked ? 50 : 255, checked ? 80 : 255);
      doc.rect(bx, cy + 1.5, 3.5, 3.5, 'F');
      doc.setFillColor(0, 0, 0);
      doc.setDrawColor(100, 100, 100);
      doc.rect(bx, cy + 1.5, 3.5, 3.5, 'S');
      doc.setFontSize(7.5);
      doc.text({ si: 'SÍ', no: 'NO', parcialmente: 'Parcialmente' }[opt], bx + 5, cy + 4.5);
    });
    return cy + lineH;
  };
  y = drawTres(y, 'Se ha vaciado previamente a la limpieza:', r.check_vaciado || 'no');
  y = drawTres(y, 'Se han limpiado antes de añadir el Biocida:', r.check_limpieza_antes_biocida || 'no');
  y += 2;

  // Hora inicio/fin desinfección
  const desinfStr = (r.hora_inicio_desinfeccion && r.hora_fin_desinfeccion)
    ? `${r.hora_inicio_desinfeccion}-${r.hora_fin_desinfeccion}` : '—';
  y = drawRow(y, 'Hora de inicio y fin desinfección', desinfStr);
  y = drawRow(y, 'Concentración Cl residual libre durante proceso', r.cloro_durante_desinfeccion ? `${r.cloro_durante_desinfeccion} ppm (mín. 30 ppm)` : 'Se adjunta tabla');
  y = drawRow(y, 'Tiempo de recirculación del Biocida (mín. 120 min)', r.tiempo_recirculacion_min ? `${r.tiempo_recirculacion_min} min` : '—');
  y = drawRow(y, 'Neutralizante utilizado', r.producto_secundario || 'Tiosulfato Sódico');
  y = drawRow(y, 'Tiempo de neutralización', r.tiempo_neutralizacion_min ? `${r.tiempo_neutralizacion_min} min` : '—');

  // Partes tratamiento
  drawCell(margin, y, usable, lineH * 0.8, 'Especificar las partes donde se realiza el tratamiento (total o parcial), medidas correctoras:', false, [240, 240, 240], 7);
  y += lineH * 0.8;
  const partLines = doc.splitTextToSize(r.partes_tratamiento || '', usable - 4);
  const partH = Math.max(lineH * 2, partLines.length * 5 + 4);
  drawCell(margin, y, usable, partH, '', false, null, 8);
  if (partLines.length) doc.text(partLines, margin + cellPad, y + 4);
  y += partH;

  // Observaciones
  drawCell(margin, y, usable, lineH * 0.8, 'OBSERVACIONES:', false, [240, 240, 240], 7);
  y += lineH * 0.8;
  const obsLines = doc.splitTextToSize(r.observaciones || '', usable - 4);
  const obsH = Math.max(lineH * 2.5, obsLines.length * 5 + 4);
  drawCell(margin, y, usable, obsH, '', false, null, 8);
  if (obsLines.length) doc.text(obsLines, margin + cellPad, y + 4);
  y += obsH + 3;

  // Nueva página si hace falta
  if (y > 220) { doc.addPage(); y = 15; }

  // ── RESPONSABLE TÉCNICO ──
  y = drawSectionTitle(y, 'RESPONSABLE TÉCNICO');
  y = drawRow(y, 'Nombre:', r.responsable_tecnico_nombre || '');
  y = drawRow(y, 'D.N.I.:', r.responsable_tecnico_dni || '');
  y = drawRow(y, 'Lugar/fecha del curso:', r.responsable_tecnico_curso || '');
  y = drawRow(y, 'Cualificación/Titulación:', r.responsable_tecnico_cualificacion || '');
  y += 3;

  // ── APLICADOR DE TRATAMIENTO ──
  y = drawSectionTitle(y, 'APLICADOR DE TRATAMIENTO');
  y = drawRow(y, 'Nombre:', r.aplicador_nombre || '');
  y = drawRow(y, 'D.N.I.:', r.aplicador_dni || '');
  y = drawRow(y, 'Lugar/fecha del curso:', r.aplicador_curso || '');
  y = drawRow(y, 'Cualificaciones:', r.aplicador_cualificacion || '');
  y += 3;

  // Fechas y firmas
  y = drawRow(y, 'Fecha de la realización:', fechaFmt);
  y = drawRow(y, 'Fecha de emisión del certificado:', format(new Date(), 'dd/MM/yyyy'));
  y += 5;

  // Líneas de firma
  const firmaW = 80;
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y + 18, margin + firmaW, y + 18);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del responsable técnico', margin, y + 22);
  doc.text(r.responsable_tecnico_nombre || '', margin, y + 27);

  const firmaClienteX = margin + firmaW + 20;
  doc.rect(firmaClienteX, y, usable - firmaW - 20, 30, 'S');
  doc.text('Cliente:', firmaClienteX + 2, y + 6);
  doc.text('Firma:', firmaClienteX + 2, y + 18);
  y += 35;

  // Nota pie
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Nota: a cumplimentar tanto si es una empresa de servicios como si es personal propio de la empresa.', margin, y);
  y += 8;

  // Pie empresa
  if (companyName) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`${companyName} · ${companyAddress}`, W / 2, y, { align: 'center' });
    doc.text('TELÉFONO INSTITUTO NACIONAL DE TOXICOLOGÍA 954 371 233', W / 2, y + 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LDTab({ equipment, equipmentId, client }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const balsaLitros = equipment?.balsa_litros || null;

  const hipocloritoCalculado = calcularHipoclorito(balsaLitros, form.ppm_deseadas, form.porcentaje_hipoclorito);
  const metabisulfitoCalculado = calcularMetabisulfito(balsaLitros, form.cloro_a_neutralizar);
  const cloroNeutralizarError = form.cloro_a_neutralizar !== '' && Number(form.cloro_a_neutralizar) > 60;

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-ld'],
    queryFn: () => base44.entities.Technician.filter({ status: 'active' }),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings-ld'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' }),
  });
  const appSettings = settings[0] || null;

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['ld-registros', equipmentId],
    queryFn: () => base44.entities.RegistroLD.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId,
  });

  const registrosOrdenados = [...registros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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
        tecnico_nombre: data.responsable_tecnico_nombre || data.aplicador_nombre || '',
        ph_inicial: data.ph_inicial !== '' ? Number(data.ph_inicial) : null,
        cloro_libre_inicial: data.cloro_libre_inicial !== '' ? Number(data.cloro_libre_inicial) : null,
        temperatura_inicial: data.temperatura_inicial !== '' ? Number(data.temperatura_inicial) : null,
        hipoclorito_ml: data.hipoclorito_ml !== '' ? Number(data.hipoclorito_ml) : null,
        tiempo_recirculacion_min: data.tiempo_recirculacion_min !== '' ? Number(data.tiempo_recirculacion_min) : null,
        tiempo_neutralizacion_min: data.tiempo_neutralizacion_min !== '' ? Number(data.tiempo_neutralizacion_min) : null,
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
      setShowForm(false); setEditingId(null); setForm(emptyForm);
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
      nombre_circuito: r.nombre_circuito || '',
      estado_conservacion: r.estado_conservacion || 'correcto',
      plano_hidraulico: r.plano_hidraulico || 'no',
      hora_inicio: r.hora_inicio || '',
      hora_fin: r.hora_fin || '',
      hora_inicio_desinfeccion: r.hora_inicio_desinfeccion || '',
      hora_fin_desinfeccion: r.hora_fin_desinfeccion || '',
      ph_inicial: r.ph_inicial ?? '',
      cloro_libre_inicial: r.cloro_libre_inicial ?? '',
      temperatura_inicial: r.temperatura_inicial ?? '',
      producto_principal: r.producto_principal || 'Hipoclorito Sódico',
      dosis_producto_principal: r.dosis_producto_principal || '',
      producto_secundario: r.producto_secundario || 'Tiosulfato Sódico',
      dosis_producto_secundario: r.dosis_producto_secundario || '',
      hipoclorito_ml: r.hipoclorito_ml ?? '',
      tiempo_recirculacion_min: r.tiempo_recirculacion_min ?? '',
      tiempo_neutralizacion_min: r.tiempo_neutralizacion_min ?? '',
      cloro_durante_desinfeccion: r.cloro_durante_desinfeccion ?? '',
      metabisulfito_g: r.metabisulfito_g ?? '',
      ph_final: r.ph_final ?? '',
      cloro_libre_final: r.cloro_libre_final ?? '',
      temperatura_final: r.temperatura_final ?? '',
      check_vaciado: r.check_vaciado || 'no',
      check_limpieza_antes_biocida: r.check_limpieza_antes_biocida || 'no',
      check_limpieza_balsa: r.check_limpieza_balsa || false,
      check_paneles_celulosa: r.check_paneles_celulosa || false,
      check_valvula_vaciado: r.check_valvula_vaciado || false,
      partes_tratamiento: r.partes_tratamiento || '',
      observaciones: r.observaciones || '',
      responsable_tecnico_nombre: r.responsable_tecnico_nombre || '',
      responsable_tecnico_dni: r.responsable_tecnico_dni || '',
      responsable_tecnico_curso: r.responsable_tecnico_curso || '',
      responsable_tecnico_cualificacion: r.responsable_tecnico_cualificacion || '',
      aplicador_nombre: r.aplicador_nombre || '',
      aplicador_dni: r.aplicador_dni || '',
      aplicador_curso: r.aplicador_curso || '',
      aplicador_cualificacion: r.aplicador_cualificacion || '',
      ppm_deseadas: r.ppm_deseadas || 30,
      porcentaje_hipoclorito: r.porcentaje_hipoclorito || 15,
      cloro_a_neutralizar: r.cloro_a_neutralizar ?? '',
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const generatePDF = async (r) => {
    setGeneratingPdf(r.id);
    try {
      const doc = generatePDFFromTemplate(r, equipment, client, appSettings);
      const eqName = equipment?.reference_name || `${equipment?.brand}_${equipment?.model}`;
      doc.save(`LD_${eqName.replace(/\s+/g, '_')}_${r.fecha}.pdf`);
      toast.success('PDF generado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const openNewForm = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); };

  const Label = ({ children }) => <label className="text-xs text-slate-500 mb-1 block">{children}</label>;
  const Section = ({ icon, title, color }) => (
    <div className="sm:col-span-2 border-t pt-3 mt-1">
      <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${color}`}>{icon} {title}</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Info equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 border-0 bg-cyan-50">
          <p className="text-xs text-cyan-600 font-medium mb-1 flex items-center gap-1">
            <Droplets className="h-3 w-3" />Volumen balsa
          </p>
          <p className="text-lg font-bold text-slate-800">{balsaLitros ? `${balsaLitros} L` : 'No definido'}</p>
          {!balsaLitros && <p className="text-xs text-amber-600 mt-0.5">Edita el equipo para definirlo</p>}
        </Card>
        <Card className="p-3 border-0 bg-blue-50">
          <p className="text-xs text-blue-600 font-medium mb-1">Dosis puesta en marcha (30 ppm / 15%)</p>
          {balsaLitros ? (
            <>
              <p className="text-sm font-bold text-slate-800">{calcularHipoclorito(balsaLitros, 30, 15)} ml</p>
              <p className="text-xs text-slate-400">({balsaLitros}L × 30) / (15 × 10)</p>
            </>
          ) : <p className="text-sm text-slate-400">—</p>}
        </Card>
        <Card className="p-3 border-0 bg-amber-50">
          <p className="text-xs text-amber-600 font-medium mb-1">Dosis mantenimiento (20 ppm / 15%)</p>
          {balsaLitros ? (
            <>
              <p className="text-sm font-bold text-slate-800">{calcularHipoclorito(balsaLitros, 20, 15)} ml</p>
              <p className="text-xs text-slate-400">({balsaLitros}L × 20) / (15 × 10)</p>
            </>
          ) : <p className="text-sm text-slate-400">—</p>}
        </Card>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700">
        <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Protocolo puesta en marcha / hibernación (RD 487/2022):</strong>{' '}
          Limpieza previa con pistola a presión → Llenado con agua limpia de red → Ajuste de pH 7,2–7,8 (agua alcalina pierde &gt;70% eficacia del cloro) →
          Dosificación a <strong>30 ppm</strong> de Cl residual libre → Recirculación <strong>120 min</strong> con ventiladores apagados →
          Control a min 30, 60 y 90 (reponer si baja de 30 ppm) → Neutralización con tiosulfato sódico hasta 0 ppm → Vaciado + enjuague.
        </span>
      </div>

      {!showForm && (
        <Button size="sm" onClick={openNewForm} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo Registro L+D
        </Button>
      )}

      {/* ── FORMULARIO ── */}
      {showForm && (
        <Card className="p-5 border border-cyan-200 bg-cyan-50/20">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-600" />
            {editingId ? 'Editar Registro L+D' : 'Nuevo Registro L+D'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* ─ Datos generales ─ */}
            <Section icon="📋" title="Datos Generales" color="text-slate-700" />
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Tipo de tratamiento *</Label>
              <select value={form.tipo_tratamiento} onChange={e => f('tipo_tratamiento', e.target.value)}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Nombre del circuito / instalación</Label>
              <Input value={form.nombre_circuito} onChange={e => f('nombre_circuito', e.target.value)} className="h-8 text-sm" placeholder="Ej: Equipo Adiabático planta 2" />
            </div>
            <div>
              <Label>Estado de conservación</Label>
              <select value={form.estado_conservacion} onChange={e => f('estado_conservacion', e.target.value)}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {Object.entries(ESTADO_CONSERVACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Plano hidráulico actualizado</Label>
              <SiNoSelect value={form.plano_hidraulico} onChange={v => f('plano_hidraulico', v)} />
            </div>
            <div>
              <Label>Hora inicio actuación</Label>
              <Input type="time" value={form.hora_inicio} onChange={e => f('hora_inicio', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Hora fin actuación</Label>
              <Input type="time" value={form.hora_fin} onChange={e => f('hora_fin', e.target.value)} className="h-8 text-sm" />
            </div>

            {/* ─ Mediciones iniciales ─ */}
            <Section icon="📊" title="Mediciones Iniciales" color="text-blue-700" />
            <div>
              <Label>pH inicial</Label>
              <Input type="number" step="0.1" value={form.ph_inicial} onChange={e => f('ph_inicial', e.target.value)} className="h-8 text-sm" placeholder="7.2 – 7.8 (óptimo)" />
              <AlertaValor valor={form.ph_inicial} label="pH" min={7.2} max={7.8} />
              {form.ph_inicial !== '' && Number(form.ph_inicial) > 8 && (
                <span className="text-xs text-red-600 font-medium block">⚠ pH &gt;8: el cloro pierde &gt;70% de eficacia. Añadir reductor de pH.</span>
              )}
            </div>
            <div>
              <Label>Cloro libre inicial (ppm)</Label>
              <Input type="number" step="0.1" value={form.cloro_libre_inicial} onChange={e => f('cloro_libre_inicial', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Temperatura inicial (°C)</Label>
              <Input type="number" step="0.1" value={form.temperatura_inicial} onChange={e => f('temperatura_inicial', e.target.value)} className="h-8 text-sm" />
              {form.temperatura_inicial !== '' && Number(form.temperatura_inicial) > 20 && (
                <span className="text-xs text-red-600 font-medium">⚠ &gt;20°C: riesgo Legionella</span>
              )}
            </div>

            {/* ─ Productos y dosificación ─ */}
            <Section icon="🧪" title="Productos y Dosificación" color="text-amber-700" />
            <div>
              <Label>Producto principal (biocida)</Label>
              <Input value={form.producto_principal} onChange={e => f('producto_principal', e.target.value)} className="h-8 text-sm" placeholder="Hipoclorito Sódico..." />
            </div>
            <div>
              <Label>Dosis producto principal</Label>
              <Input value={form.dosis_producto_principal} onChange={e => f('dosis_producto_principal', e.target.value)} className="h-8 text-sm" placeholder="Ej: 0,41 L/m³" />
            </div>
            <div>
              <Label>Producto secundario (neutralizante)</Label>
              <Input value={form.producto_secundario} onChange={e => f('producto_secundario', e.target.value)} className="h-8 text-sm" placeholder="Metabisulfito Sódico..." />
            </div>
            <div>
              <Label>Dosis producto secundario</Label>
              <Input value={form.dosis_producto_secundario} onChange={e => f('dosis_producto_secundario', e.target.value)} className="h-8 text-sm" placeholder="Ej: 0,11 g/L" />
            </div>

            <div>
              <Label>PPM deseadas</Label>
              <select value={form.ppm_deseadas} onChange={e => f('ppm_deseadas', Number(e.target.value))}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {PPM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Concentración hipoclorito</Label>
              <select value={form.porcentaje_hipoclorito} onChange={e => f('porcentaje_hipoclorito', Number(e.target.value))}
                className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                {HIPOCLORITO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {balsaLitros && hipocloritoCalculado !== null && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-slate-500">Dosis calculada hipoclorito:</p>
                <p className="text-xl font-bold text-slate-800">{hipocloritoCalculado} ml</p>
                <p className="text-xs text-slate-400">({balsaLitros} L × {form.ppm_deseadas} ppm) / ({form.porcentaje_hipoclorito}% × 10)</p>
              </div>
            )}

            <div>
              <Label>Hipoclorito sódico añadido realmente (ml)</Label>
              <Input type="number" step="0.1" value={form.hipoclorito_ml} onChange={e => f('hipoclorito_ml', e.target.value)} className="h-8 text-sm"
                placeholder={hipocloritoCalculado !== null ? `Calc: ${hipocloritoCalculado} ml` : ''} />
            </div>
            <div>
              <Label>Tiempo de recirculación (min, mín. 60)</Label>
              <Input type="number" value={form.tiempo_recirculacion_min} onChange={e => f('tiempo_recirculacion_min', e.target.value)} className="h-8 text-sm" placeholder="120" />
              {form.tiempo_recirculacion_min !== '' && Number(form.tiempo_recirculacion_min) < 120 && (
                <span className="text-xs text-red-600">⚠ Mínimo requerido: 120 min para validez del Libro de Registro</span>
              )}
            </div>
            <div>
              <Label>Hora inicio desinfección</Label>
              <Input type="time" value={form.hora_inicio_desinfeccion} onChange={e => f('hora_inicio_desinfeccion', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Hora fin desinfección</Label>
              <Input type="time" value={form.hora_fin_desinfeccion} onChange={e => f('hora_fin_desinfeccion', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Cloro durante desinfección (ppm)</Label>
              <Input type="number" step="0.1" value={form.cloro_durante_desinfeccion} onChange={e => f('cloro_durante_desinfeccion', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Tiempo de neutralización (min)</Label>
              <Input type="number" value={form.tiempo_neutralizacion_min} onChange={e => f('tiempo_neutralizacion_min', e.target.value)} className="h-8 text-sm" placeholder="10" />
            </div>

            {/* ─ Mediciones finales ─ */}
            <Section icon="✅" title="Mediciones Finales" color="text-emerald-700" />
            <div>
              <Label>Cloro libre a neutralizar (ppm medido al minuto 120, antes de tiosulfato)</Label>
              <Input type="number" step="0.1" value={form.cloro_a_neutralizar}
                onChange={e => f('cloro_a_neutralizar', e.target.value)}
                className={`h-8 text-sm ${cloroNeutralizarError ? 'border-red-500' : ''}`}
                placeholder="≥30 ppm confirma proceso correcto" />
              {cloroNeutralizarError && <p className="text-xs text-red-600 font-medium">⛔ Valor &gt;60 ppm imposible.</p>}
              {form.cloro_a_neutralizar !== '' && Number(form.cloro_a_neutralizar) < 30 && !cloroNeutralizarError && (
                <span className="text-xs text-amber-600 font-medium">⚠ Menor de 30 ppm: el proceso puede no ser válido. Se debió reponer hipoclorito durante el proceso.</span>
              )}
            </div>
            {balsaLitros && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Dosis calculada tiosulfato sódico (neutralización):</p>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 min-h-[2rem]">
                  <p className="text-lg font-bold text-slate-800">{metabisulfitoCalculado !== null ? `${metabisulfitoCalculado} g` : '—'}</p>
                  {metabisulfitoCalculado !== null && <p className="text-xs text-slate-400">hasta 0 ppm Cl</p>}
                </div>
              </div>
            )}
            <div>
              <Label>Tiosulfato sódico añadido (g) — hasta 0 ppm Cl</Label>
              <Input type="number" step="0.01" value={form.metabisulfito_g} onChange={e => f('metabisulfito_g', e.target.value)} className="h-8 text-sm"
                placeholder={metabisulfitoCalculado !== null ? `Calc: ${metabisulfitoCalculado} g` : ''} />
            </div>
            <div>
              <Label>pH final</Label>
              <Input type="number" step="0.1" value={form.ph_final} onChange={e => f('ph_final', e.target.value)} className="h-8 text-sm" placeholder="7.2 – 7.8" />
              <AlertaValor valor={form.ph_final} label="pH" min={7.2} max={7.8} />
            </div>
            <div>
              <Label>Cloro libre final (ppm)</Label>
              <Input type="number" step="0.1" value={form.cloro_libre_final} onChange={e => f('cloro_libre_final', e.target.value)} className="h-8 text-sm" placeholder="0.2 – 1.0" />
              <AlertaValor valor={form.cloro_libre_final} label="Cl final" min={0.2} max={1.0} />
            </div>
            <div>
              <Label>Temperatura final (°C)</Label>
              <Input type="number" step="0.1" value={form.temperatura_final} onChange={e => f('temperatura_final', e.target.value)} className="h-8 text-sm" />
            </div>

            {/* ─ Acciones físicas ─ */}
            <Section icon="☑" title="Acciones Físicas" color="text-slate-700" />
            <div>
              <Label>¿Se ha vaciado previamente?</Label>
              <SiNoSelect value={form.check_vaciado} onChange={v => f('check_vaciado', v)} incluirParcialmente />
            </div>
            <div>
              <Label>¿Se ha limpiado antes de añadir el biocida?</Label>
              <SiNoSelect value={form.check_limpieza_antes_biocida} onChange={v => f('check_limpieza_antes_biocida', v)} incluirParcialmente />
            </div>

            <div className="sm:col-span-2">
              <Label>Partes donde se realiza el tratamiento / medidas correctoras</Label>
              <textarea value={form.partes_tratamiento} onChange={e => f('partes_tratamiento', e.target.value)}
                className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2}
                placeholder="Total / Parcial (especificar). Medidas correctoras realizadas..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Observaciones</Label>
              <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
                className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2} />
            </div>

            {/* ─ Responsable técnico ─ */}
            <Section icon="👤" title="Responsable Técnico" color="text-indigo-700" />
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.responsable_tecnico_nombre} onChange={e => f('responsable_tecnico_nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre y apellidos" />
            </div>
            <div>
              <Label>D.N.I.</Label>
              <Input value={form.responsable_tecnico_dni} onChange={e => f('responsable_tecnico_dni', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Lugar/fecha del curso</Label>
              <Input value={form.responsable_tecnico_curso} onChange={e => f('responsable_tecnico_curso', e.target.value)} className="h-8 text-sm" placeholder="Desde dd/mm/aaaa hasta dd/mm/aaaa" />
            </div>
            <div>
              <Label>Cualificación/Titulación</Label>
              <Input value={form.responsable_tecnico_cualificacion} onChange={e => f('responsable_tecnico_cualificacion', e.target.value)} className="h-8 text-sm" placeholder="Legionella, mantenimiento higiénico-sanitario..." />
            </div>

            {/* ─ Aplicador de tratamiento ─ */}
            <Section icon="🔧" title="Aplicador de Tratamiento" color="text-cyan-700" />
            <div className="sm:col-span-2 text-xs text-slate-500 bg-cyan-50 p-2 rounded-lg border border-cyan-100">
              El aplicador puede ser una persona o empresa diferente al responsable técnico.
            </div>
            <div>
              <Label>Nombre completo</Label>
              <Input value={form.aplicador_nombre} onChange={e => f('aplicador_nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre y apellidos" />
            </div>
            <div>
              <Label>D.N.I.</Label>
              <Input value={form.aplicador_dni} onChange={e => f('aplicador_dni', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label>Lugar/fecha del curso</Label>
              <Input value={form.aplicador_curso} onChange={e => f('aplicador_curso', e.target.value)} className="h-8 text-sm" placeholder="Desde dd/mm/aaaa hasta dd/mm/aaaa" />
            </div>
            <div>
              <Label>Cualificaciones</Label>
              <Input value={form.aplicador_cualificacion} onChange={e => f('aplicador_cualificacion', e.target.value)} className="h-8 text-sm" placeholder="Curso mantenimiento higiénico sanitario..." />
            </div>

          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.responsable_tecnico_nombre || !form.fecha || cloroNeutralizarError}
              className="bg-cyan-600 hover:bg-cyan-700">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Registro
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* ── HISTORIAL ── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Historial L+D ({registrosOrdenados.length} registros)</h4>
        {isLoading ? <p className="text-sm text-slate-500">Cargando...</p>
          : registrosOrdenados.length === 0 ? (
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
                const responsable = r.responsable_tecnico_nombre || r.tecnico_nombre || '—';
                const aplicador = r.aplicador_nombre;
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
                                <Clock className="h-3 w-3" />Próx: {format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Resp.: {responsable}
                            {aplicador && ` · Aplicador: ${aplicador}`}
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
                          {r.nombre_circuito && <div><p className="text-slate-400">Circuito</p><p className="font-medium text-slate-700">{r.nombre_circuito}</p></div>}
                          {r.ph_inicial !== null && <div><p className="text-slate-400">pH inicial</p><p className={`font-medium ${r.ph_inicial >= 7 && r.ph_inicial <= 8 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_inicial}</p></div>}
                          {r.cloro_libre_inicial !== null && <div><p className="text-slate-400">Cl inicial</p><p className="font-medium text-slate-700">{r.cloro_libre_inicial} ppm</p></div>}
                          {r.temperatura_inicial !== null && <div><p className="text-slate-400">Tª inicial</p><p className={`font-medium ${r.temperatura_inicial > 20 ? 'text-red-600' : 'text-slate-700'}`}>{r.temperatura_inicial}°C</p></div>}
                          {r.hipoclorito_ml !== null && <div><p className="text-slate-400">Hipoclorito</p><p className="font-medium text-slate-700">{r.hipoclorito_ml} ml</p></div>}
                          {r.tiempo_recirculacion_min !== null && <div><p className="text-slate-400">Recirculación</p><p className={`font-medium ${r.tiempo_recirculacion_min < 60 ? 'text-amber-600' : 'text-slate-700'}`}>{r.tiempo_recirculacion_min} min</p></div>}
                          {r.metabisulfito_g !== null && <div><p className="text-slate-400">Metabisulfito</p><p className="font-medium text-slate-700">{r.metabisulfito_g} g</p></div>}
                          {r.ph_final !== null && <div><p className="text-slate-400">pH final</p><p className={`font-medium ${r.ph_final >= 6.5 && r.ph_final <= 8.5 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_final}</p></div>}
                          {r.cloro_libre_final !== null && <div><p className="text-slate-400">Cl final</p><p className={`font-medium ${r.cloro_libre_final >= 0.2 && r.cloro_libre_final <= 1.0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.cloro_libre_final} ppm</p></div>}
                          {r.responsable_tecnico_nombre && <div><p className="text-slate-400">Resp. técnico</p><p className="font-medium text-slate-700">{r.responsable_tecnico_nombre}</p></div>}
                          {r.aplicador_nombre && <div><p className="text-slate-400">Aplicador</p><p className="font-medium text-slate-700">{r.aplicador_nombre}</p></div>}
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