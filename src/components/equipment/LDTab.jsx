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
  Trash2, Edit, ChevronDown, ChevronUp, FileText, Loader2,
  ChevronRight, ChevronLeft, Info
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
  const margin = 14;
  const usable = W - margin * 2;
  let y = 12;

  const lineH = 6;
  const cellPad = 2;

  const drawCell = (x, cy, w, h, text, bold = false, fillRGB = null, fontSize = 8, align = 'left') => {
    if (fillRGB) { doc.setFillColor(...fillRGB); doc.rect(x, cy, w, h, 'F'); }
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

  const drawRow = (cy, label, value, labelW = 60) => {
    const valueW = usable - labelW;
    drawCell(margin, cy, labelW, lineH, label, false, [240, 240, 240]);
    drawCell(margin + labelW, cy, valueW, lineH, value || '—');
    return cy + lineH;
  };

  const drawSectionTitle = (cy, title, rgb = [25, 55, 90]) => {
    doc.setFillColor(...rgb);
    doc.rect(margin, cy, usable, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + cellPad, cy + 4.8);
    doc.setTextColor(0, 0, 0);
    return cy + 7;
  };

  const checkNewPage = (neededSpace = 30) => {
    if (y + neededSpace > 282) { doc.addPage(); y = 12; }
  };

  const eqName = equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim();
  const circuito = r.nombre_circuito || eqName;
  const fechaFmt = r.fecha ? format(new Date(r.fecha), 'dd/MM/yyyy') : '—';
  const fechaEmision = format(new Date(), 'dd/MM/yyyy');

  // ══════════════════════════════════════════════════
  // TÍTULO
  // ══════════════════════════════════════════════════
  doc.setFillColor(25, 55, 90);
  doc.rect(margin, y, usable, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICADO DE LIMPIEZA Y DESINFECCIÓN', W / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Equipos de Enfriamiento Evaporativo / Adiabáticos  ·  RD 487/2022', W / 2, y + 8.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 13;

  // Subtítulo: fecha emisión
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de emisión: ${fechaEmision}`, W - margin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 5;

  // ══════════════════════════════════════════════════
  // 1. DATOS DEL CLIENTE E INSTALACIÓN
  // ══════════════════════════════════════════════════
  y = drawSectionTitle(y, '1. Datos del cliente e instalación');
  const clientName = client?.name || '';
  const clientAddress = [client?.address, client?.city, client?.postal_code, client?.province].filter(Boolean).join(', ');
  y = drawRow(y, 'Cliente:', clientName);
  y = drawRow(y, 'Domicilio:', clientAddress);
  y = drawRow(y, 'N.I.F./C.I.F.:', client?.cif || '');
  y = drawRow(y, 'Teléfono:', client?.phone || '');
  y = drawRow(y, 'Email:', client?.email || '');
  y = drawRow(y, 'Instalación / Equipo:', eqName);
  y = drawRow(y, 'Nombre del circuito:', circuito);
  y = drawRow(y, 'Volumen de la balsa (L):', r.balsa_litros ? `${r.balsa_litros} L` : '—');
  y += 3;

  // ══════════════════════════════════════════════════
  // 2. IDENTIFICACIÓN DEL TRATAMIENTO
  // ══════════════════════════════════════════════════
  checkNewPage(50);
  y = drawSectionTitle(y, '2. Identificación del tratamiento');
  y = drawRow(y, 'Fecha del tratamiento:', fechaFmt);
  y = drawRow(y, 'Tipo de tratamiento:', TIPO_LABELS[r.tipo_tratamiento] || r.tipo_tratamiento);
  const horaStr = (r.hora_inicio && r.hora_fin) ? `${r.hora_inicio} h – ${r.hora_fin} h` : (r.hora_inicio || '—');
  y = drawRow(y, 'Hora inicio / fin actuación:', horaStr);
  const tActuacion = (r.hora_inicio && r.hora_fin) ? (() => {
    const [h1, m1] = (r.hora_inicio || '0:0').split(':').map(Number);
    const [h2, m2] = (r.hora_fin || '0:0').split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? `${diff} min` : '—';
  })() : '—';
  y = drawRow(y, 'Duración total actuación:', tActuacion);
  y = drawRow(y, 'Estado de conservación:', ESTADO_CONSERVACION[r.estado_conservacion] || r.estado_conservacion || '—');
  y = drawRow(y, 'Plano hidráulico actualizado:', r.plano_hidraulico === 'si' ? 'SÍ' : 'NO');

  // Checkboxes tipo tratamiento
  y += 1;
  drawCell(margin, y, usable, 7, '', false, [248, 248, 248]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const tipos = ['puesta_en_marcha', 'mantenimiento_mensual', 'aislamiento_legionella', 'medida_correctora', 'brote_casos'];
  const tiposLabel = ['Puesta en marcha', 'Mant. programado', 'Aisl. Legionella', 'Medida correctora', 'Brote/Casos'];
  let cx = margin + 4;
  tipos.forEach((t, i) => {
    const checked = r.tipo_tratamiento === t;
    if (checked) { doc.setFillColor(25, 55, 90); doc.rect(cx, y + 1.8, 3.5, 3.5, 'F'); }
    doc.setDrawColor(100, 100, 100);
    doc.rect(cx, y + 1.8, 3.5, 3.5, 'S');
    doc.setFillColor(0, 0, 0);
    doc.text(tiposLabel[i], cx + 5, y + 4.8);
    cx += 36;
  });
  y += 9;

  // ══════════════════════════════════════════════════
  // 3. MEDICIONES INICIALES
  // ══════════════════════════════════════════════════
  checkNewPage(40);
  y = drawSectionTitle(y, '3. Mediciones iniciales (antes de dosificar)');
  // 3 columnas
  const c3w = usable / 3;
  drawCell(margin, y, c3w, lineH, 'PARÁMETRO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w, y, c3w, lineH, 'VALOR MEDIDO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w * 2, y, c3w, lineH, 'RANGO CORRECTO', true, [220, 225, 235], 7.5, 'center');
  y += lineH;
  const phIniOk = r.ph_inicial !== null && r.ph_inicial >= 7.2 && r.ph_inicial <= 7.8;
  const tempIniRisk = r.temperatura_inicial !== null && r.temperatura_inicial > 20;
  [[`pH inicial`, r.ph_inicial !== null ? `${r.ph_inicial}${phIniOk ? ' ✓' : ' ⚠'}` : '—', '7,2 – 7,8'],
   [`Cloro libre inicial (ppm)`, r.cloro_libre_inicial !== null ? `${r.cloro_libre_inicial} ppm` : '—', '0 – 0,5 (agua de red)'],
   [`Temperatura inicial (°C)`, r.temperatura_inicial !== null ? `${r.temperatura_inicial}°C${tempIniRisk ? ' ⚠' : ''}` : '—', '≤ 20°C'],
  ].forEach(([p, v, rng]) => {
    drawCell(margin, y, c3w, lineH, p, false, null, 7.5);
    drawCell(margin + c3w, y, c3w, lineH, v, true, null, 7.5, 'center');
    drawCell(margin + c3w * 2, y, c3w, lineH, rng, false, [248, 252, 248], 7.5, 'center');
    y += lineH;
  });
  y += 3;

  // ══════════════════════════════════════════════════
  // 4. PRODUCTOS Y DOSIFICACIÓN
  // ══════════════════════════════════════════════════
  checkNewPage(40);
  y = drawSectionTitle(y, '4. Productos utilizados y dosificación');

  // Tabla productos
  const pw = [50, 45, 30, 57];
  drawCell(margin, y, pw[0], lineH, 'PRODUCTO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + pw[0], y, pw[1], lineH, 'NOMBRE COMERCIAL', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + pw[0] + pw[1], y, pw[2], lineH, 'CANTIDAD AÑADIDA', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + pw[0] + pw[1] + pw[2], y, pw[3], lineH, 'DOSIS (por volumen)', true, [220, 225, 235], 7.5, 'center');
  y += lineH;
  drawCell(margin, y, pw[0], lineH, 'Biocida principal', false, null, 7.5);
  drawCell(margin + pw[0], y, pw[1], lineH, r.producto_principal || 'Hipoclorito Sódico', false, null, 7.5);
  drawCell(margin + pw[0] + pw[1], y, pw[2], lineH, r.hipoclorito_ml !== null ? `${r.hipoclorito_ml} ml` : '—', false, null, 7.5, 'center');
  drawCell(margin + pw[0] + pw[1] + pw[2], y, pw[3], lineH, r.dosis_producto_principal || '—', false, null, 7.5, 'center');
  y += lineH;
  drawCell(margin, y, pw[0], lineH, 'Neutralizante', false, null, 7.5);
  drawCell(margin + pw[0], y, pw[1], lineH, r.producto_secundario || 'Tiosulfato Sódico', false, null, 7.5);
  drawCell(margin + pw[0] + pw[1], y, pw[2], lineH, r.metabisulfito_g !== null ? `${r.metabisulfito_g} g` : '—', false, null, 7.5, 'center');
  drawCell(margin + pw[0] + pw[1] + pw[2], y, pw[3], lineH, r.dosis_producto_secundario || '—', false, null, 7.5, 'center');
  y += lineH + 1;
  y = drawRow(y, 'Concentración hipoclorito:', r.porcentaje_hipoclorito ? `${r.porcentaje_hipoclorito}%` : '—', 60);
  y = drawRow(y, 'Concentración objetivo (ppm):', r.ppm_deseadas ? `${r.ppm_deseadas} ppm Cl residual libre` : '—', 60);
  y += 3;

  // ══════════════════════════════════════════════════
  // 5. LIMPIEZA PREVIA
  // ══════════════════════════════════════════════════
  checkNewPage(25);
  y = drawSectionTitle(y, '5. Acciones previas a la desinfección');
  const drawTres = (cy, label, val) => {
    drawCell(margin, cy, 95, lineH, label, false, [240, 240, 240], 7.5);
    ['si', 'no', 'parcialmente'].forEach((opt, i) => {
      const checked = val === opt;
      const bx = margin + 95 + i * 31;
      if (checked) { doc.setFillColor(25, 55, 90); doc.rect(bx, cy + 1.5, 3.5, 3.5, 'F'); }
      doc.setDrawColor(100, 100, 100);
      doc.rect(bx, cy + 1.5, 3.5, 3.5, 'S');
      doc.setFillColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.text({ si: 'SÍ', no: 'NO', parcialmente: 'Parcialmente' }[opt], bx + 5, cy + 4.5);
    });
    return cy + lineH;
  };
  y = drawTres(y, 'Vaciado previo de la balsa:', r.check_vaciado || 'no');
  y = drawTres(y, 'Limpieza mecánica antes de añadir biocida:', r.check_limpieza_antes_biocida || 'no');
  y += 3;

  // ══════════════════════════════════════════════════
  // 6. PROCESO DE DESINFECCIÓN
  // ══════════════════════════════════════════════════
  checkNewPage(55);
  y = drawSectionTitle(y, '6. Proceso de desinfección y recirculación');
  const desinfStr = (r.hora_inicio_desinfeccion && r.hora_fin_desinfeccion)
    ? `${r.hora_inicio_desinfeccion} h – ${r.hora_fin_desinfeccion} h` : (r.hora_inicio_desinfeccion || '—');
  y = drawRow(y, 'Hora inicio / fin desinfección:', desinfStr);
  y = drawRow(y, 'Tiempo de recirculación:', r.tiempo_recirculacion_min ? `${r.tiempo_recirculacion_min} min (mín. requerido: 120 min)` : '—');
  y = drawRow(y, 'Cl libre mínimo durante proceso:', r.cloro_durante_desinfeccion !== null ? `${r.cloro_durante_desinfeccion} ppm (mín. 30 ppm en todo momento)` : '—');
  y += 2;

  // Tabla controles intermedios
  drawCell(margin, y, usable / 3, lineH, 'CONTROL min 30', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + usable / 3, y, usable / 3, lineH, 'CONTROL min 60', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + usable / 3 * 2, y, usable / 3, lineH, 'CONTROL min 90/120', true, [220, 225, 235], 7.5, 'center');
  y += lineH;
  const clStr = r.cloro_durante_desinfeccion !== null ? `${r.cloro_durante_desinfeccion} ppm` : '—';
  const clFin = r.cloro_a_neutralizar !== null ? `${r.cloro_a_neutralizar} ppm` : '—';
  drawCell(margin, y, usable / 3, lineH, '≥ 30 ppm (ver obs.)', false, null, 7.5, 'center');
  drawCell(margin + usable / 3, y, usable / 3, lineH, '≥ 30 ppm (ver obs.)', false, null, 7.5, 'center');
  drawCell(margin + usable / 3 * 2, y, usable / 3, lineH, `Cl residual final: ${clFin}`, false, null, 7.5, 'center');
  y += lineH + 1;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('* Los ventiladores permanecieron APAGADOS durante todo el proceso de recirculación para evitar generación de aerosoles.', margin, y + 3);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 7;

  // ══════════════════════════════════════════════════
  // 7. NEUTRALIZACIÓN
  // ══════════════════════════════════════════════════
  checkNewPage(30);
  y = drawSectionTitle(y, '7. Neutralización del cloro residual (previo al vertido)');
  y = drawRow(y, 'Cl residual antes de neutralizar:', r.cloro_a_neutralizar !== null ? `${r.cloro_a_neutralizar} ppm` : '—');
  y = drawRow(y, 'Neutralizante utilizado:', r.producto_secundario || 'Tiosulfato Sódico');
  y = drawRow(y, 'Cantidad de neutralizante añadida:', r.metabisulfito_g !== null ? `${r.metabisulfito_g} g` : '—');
  y = drawRow(y, 'Tiempo de neutralización:', r.tiempo_neutralizacion_min ? `${r.tiempo_neutralizacion_min} min` : '—');
  y += 1;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('* Obligatorio neutralizar hasta 0 ppm antes de verter al alcantarillado (normativa de vertidos).', margin, y + 2);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 6;

  // ══════════════════════════════════════════════════
  // 8. MEDICIONES FINALES
  // ══════════════════════════════════════════════════
  checkNewPage(35);
  y = drawSectionTitle(y, '8. Mediciones finales del agua de servicio');
  drawCell(margin, y, c3w, lineH, 'PARÁMETRO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w, y, c3w, lineH, 'VALOR MEDIDO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w * 2, y, c3w, lineH, 'RANGO CORRECTO', true, [220, 225, 235], 7.5, 'center');
  y += lineH;
  const phFinOk = r.ph_final !== null && r.ph_final >= 7.2 && r.ph_final <= 7.8;
  const clFinOk = r.cloro_libre_final !== null && r.cloro_libre_final >= 0.2 && r.cloro_libre_final <= 1.0;
  [[`pH final`, r.ph_final !== null ? `${r.ph_final}${phFinOk ? ' ✓' : ' ⚠'}` : '—', '7,2 – 7,8'],
   [`Cloro libre final (ppm)`, r.cloro_libre_final !== null ? `${r.cloro_libre_final} ppm${clFinOk ? ' ✓' : ' ⚠'}` : '—', '0,2 – 1,0 ppm'],
   [`Temperatura final (°C)`, r.temperatura_final !== null ? `${r.temperatura_final}°C` : '—', '≤ 20°C'],
  ].forEach(([p, v, rng]) => {
    drawCell(margin, y, c3w, lineH, p, false, null, 7.5);
    drawCell(margin + c3w, y, c3w, lineH, v, true, null, 7.5, 'center');
    drawCell(margin + c3w * 2, y, c3w, lineH, rng, false, [248, 252, 248], 7.5, 'center');
    y += lineH;
  });
  y += 3;

  // ══════════════════════════════════════════════════
  // 9. PARTES Y OBSERVACIONES
  // ══════════════════════════════════════════════════
  checkNewPage(25);
  y = drawSectionTitle(y, '9. Partes tratadas y observaciones');
  if (r.partes_tratamiento) {
    drawCell(margin, y, usable, lineH * 0.75, 'Partes donde se realiza el tratamiento / medidas correctoras:', false, [240, 240, 240], 7);
    y += lineH * 0.75;
    const partLines = doc.splitTextToSize(r.partes_tratamiento, usable - 4);
    const partH = Math.max(lineH * 1.5, partLines.length * 5 + 4);
    drawCell(margin, y, usable, partH, '', false, null, 8);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(partLines, margin + cellPad, y + 4);
    y += partH;
  }
  drawCell(margin, y, usable, lineH * 0.75, 'Observaciones:', false, [240, 240, 240], 7);
  y += lineH * 0.75;
  const obsLines = doc.splitTextToSize(r.observaciones || '', usable - 4);
  const obsH = Math.max(lineH * 2, obsLines.length * 5 + 4);
  drawCell(margin, y, usable, obsH, '', false, null, 8);
  if (obsLines.length) { doc.setFontSize(8); doc.text(obsLines, margin + cellPad, y + 4); }
  y += obsH + 3;

  // ══════════════════════════════════════════════════
  // 10. RESPONSABLE TÉCNICO
  // ══════════════════════════════════════════════════
  checkNewPage(45);
  y = drawSectionTitle(y, '10. Responsable técnico');
  y = drawRow(y, 'Empresa:', appSettings?.company_name || '—');
  y = drawRow(y, 'Nombre:', r.responsable_tecnico_nombre || '—');
  y = drawRow(y, 'D.N.I.:', r.responsable_tecnico_dni || '—');
  y = drawRow(y, 'Lugar/fecha del curso:', r.responsable_tecnico_curso || '—');
  y = drawRow(y, 'Cualificación/Titulación:', r.responsable_tecnico_cualificacion || '—');
  y += 3;

  // ══════════════════════════════════════════════════
  // 11. APLICADOR DE TRATAMIENTO
  // ══════════════════════════════════════════════════
  checkNewPage(45);
  y = drawSectionTitle(y, '11. Aplicador del tratamiento');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('(a cumplimentar tanto si es una empresa de servicios como si es personal propio de la empresa)', margin, y + 2.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 5;
  y = drawRow(y, 'Empresa:', appSettings?.company_name || '—');
  y = drawRow(y, 'Nombre:', r.aplicador_nombre || r.responsable_tecnico_nombre || '—');
  y = drawRow(y, 'D.N.I.:', r.aplicador_dni || r.responsable_tecnico_dni || '—');
  y = drawRow(y, 'Lugar/fecha del curso:', r.aplicador_curso || r.responsable_tecnico_curso || '—');
  y = drawRow(y, 'Cualificaciones:', r.aplicador_cualificacion || r.responsable_tecnico_cualificacion || '—');
  y += 3;

  // ══════════════════════════════════════════════════
  // FECHAS Y FIRMAS
  // ══════════════════════════════════════════════════
  checkNewPage(40);
  y = drawRow(y, 'Fecha de la realización:', fechaFmt);
  y = drawRow(y, 'Fecha de emisión del certificado:', fechaEmision);
  y += 6;

  const firmaW = (usable - 10) / 2;
  // Firma responsable
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y + 18, margin + firmaW, y + 18);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Firma y sello del responsable técnico', margin, y + 22);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(r.responsable_tecnico_nombre || '', margin, y + 27);
  // Firma cliente
  doc.rect(margin + firmaW + 10, y, firmaW, 30, 'S');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Conformidad del cliente / titular:', margin + firmaW + 12, y + 6);
  doc.text('Firma:', margin + firmaW + 12, y + 20);
  y += 35;

  // Pie
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('TELÉFONO INSTITUTO NACIONAL DE TOXICOLOGÍA: 954 371 233  ·  El Libro de Registro debe conservarse 5 años disponible para inspección sanitaria.', W / 2, y + 3, { align: 'center', maxWidth: usable });
  doc.setTextColor(0, 0, 0);

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
  const [step, setStep] = useState(0);

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
    setStep(0);
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

  const eqDisplayName = equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim() || '';

  const openNewForm = () => {
    setForm({ ...emptyForm, nombre_circuito: eqDisplayName });
    setEditingId(null); setStep(0); setShowForm(true);
  };

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

      {/* ── PANEL EXPLICATIVO TÉCNICO ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span className="text-white text-xs font-semibold uppercase tracking-wide">Guía de procedimiento L+D — Equipos evaporativos/adiabáticos (RD 487/2022)</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          {/* Columna 1 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              <div>
                <p className="font-semibold text-slate-800">Limpieza previa con pistola a presión</p>
                <p className="text-slate-500 mt-0.5">Vaciado completo de la balsa. Eliminación de suciedad, incrustaciones y biocapa mediante presión. Aclarado con agua limpia.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              <div>
                <p className="font-semibold text-slate-800">Llenado y ajuste de pH (7,2–7,8)</p>
                <p className="text-slate-500 mt-0.5">Llenar con agua limpia de red. Medir pH. Si es <strong>&gt;8</strong>, añadir reductor de pH: por encima de 8 el hipoclorito pierde más del 70% de su eficacia biocida.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">3</span>
              <div>
                <p className="font-semibold text-slate-800">Dosificación de hipoclorito sódico</p>
                <p className="text-slate-500 mt-0.5">
                  <strong>Puesta en marcha / hibernación:</strong> 30 ppm Cl residual libre.<br />
                  <strong>Mantenimiento mensual:</strong> 20 ppm.<br />
                  <strong>Brote/aislamiento:</strong> 50 ppm.<br />
                  Fórmula: <code className="bg-slate-100 px-1 rounded">ml = (Litros × ppm) / (% × 10)</code>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">4</span>
              <div>
                <p className="font-semibold text-slate-800">Recirculación — ventiladores <span className="text-red-600">APAGADOS</span></p>
                <p className="text-slate-500 mt-0.5">
                  <strong>Puesta en marcha:</strong> mínimo <strong>120 min</strong>.<br />
                  <strong>Mantenimiento:</strong> mínimo 60 min.<br />
                  Arrancar solo la bomba de agua. Los ventiladores apagados evitan la generación de aerosoles con Legionella.
                </p>
              </div>
            </div>
          </div>
          {/* Columna 2 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">5</span>
              <div>
                <p className="font-semibold text-slate-800">Controles intermedios obligatorios</p>
                <p className="text-slate-500 mt-0.5">Medir Cl libre a los <strong>30, 60 y 90 minutos</strong>. Si baja de 30 ppm, reponer hipoclorito hasta recuperar el nivel. Sin este control el proceso no es válido para el Libro de Registro.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">6</span>
              <div>
                <p className="font-semibold text-slate-800">Verificación al minuto 120</p>
                <p className="text-slate-500 mt-0.5">Medir Cl residual libre. Debe ser <strong>≥30 ppm</strong>. Si es menor, el tratamiento no ha sido eficaz: repetir dosificación y tiempo.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">7</span>
              <div>
                <p className="font-semibold text-slate-800">Neutralización con tiosulfato sódico</p>
                <p className="text-slate-500 mt-0.5">
                  Añadir tiosulfato sódico para reducir el Cl a <strong>0 ppm</strong> antes del vertido. Obligatorio por normativa medioambiental. No usar metabisulfito en vertidos a alcantarillado.<br />
                  Fórmula: <code className="bg-slate-100 px-1 rounded">g = Litros × ppm × 0,002</code>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">8</span>
              <div>
                <p className="font-semibold text-slate-800">Vaciado, enjuague y llenado final</p>
                <p className="text-slate-500 mt-0.5">Vaciar la balsa, enjuagar con agua limpia y llenar para la puesta en servicio. Verificar pH final 7,2–7,8 y Cl libre 0,2–1,0 ppm en agua de servicio.</p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <strong>⚠ Recuerda:</strong> Registrar horas exactas, ppm medidas en cada control y cantidades reales añadidas. El Libro de Registro debe estar disponible para inspección sanitaria 5 años.
            </div>
          </div>
        </div>
      </div>

      {!showForm && (
        <Button size="sm" onClick={openNewForm} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo Registro L+D
        </Button>
      )}

      {/* ── FORMULARIO WIZARD ── */}
      {showForm && (
        <Card className="border border-cyan-200 overflow-hidden">
          {/* Cabecera con pasos */}
          <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-400" />
              <span className="text-white text-sm font-semibold">{editingId ? 'Editar Registro L+D' : 'Nuevo Registro L+D'}</span>
            </div>
            <div className="flex items-center gap-1">
              {['Inicio', 'Medición inicial', 'Dosificación', 'Desinfección', 'Final y firmas'].map((s, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={`text-xs px-2 py-1 rounded transition-all ${step === i ? 'bg-cyan-500 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}>
                  <span className="hidden sm:inline">{s}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-1 bg-slate-200">
            <div className="h-1 bg-cyan-500 transition-all duration-300" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>

          <div className="p-5">

            {/* ── PASO 0: Datos generales ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 mb-1">📋 Paso 1 — Datos de la intervención</p>
                    <p>Registra los datos básicos de hoy: fecha, tipo de tratamiento y estado del equipo antes de empezar. Estos datos identifican el registro en el Libro de Mantenimiento.</p>
                    <p className="mt-1 text-slate-500">El <strong>plano hidráulico</strong> es el esquema de tuberías y componentes del circuito. Debe estar actualizado antes de cada intervención.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      {form.tipo_tratamiento === 'puesta_en_marcha' && '→ Primer arranque de temporada o tras hibernación. Requiere 30 ppm y 120 min.'}
                      {form.tipo_tratamiento === 'mantenimiento_mensual' && '→ Revisión mensual obligatoria. 20 ppm y 60 min mínimo.'}
                      {form.tipo_tratamiento === 'aislamiento_legionella' && '→ Detección positiva en analítica. 50 ppm y 60 min mínimo. Notificar a Sanidad.'}
                      {form.tipo_tratamiento === 'brote_casos' && '→ Brote confirmado. 50 ppm. Requiere notificación inmediata a autoridad sanitaria.'}
                    </p>
                  </div>
                  <div>
                    <Label>Nombre del circuito / instalación</Label>
                    <Input value={form.nombre_circuito} onChange={e => f('nombre_circuito', e.target.value)} className="h-8 text-sm" placeholder="Ej: Torre evaporativa planta cubierta" />
                    <p className="text-xs text-slate-400 mt-0.5">Nombre con el que identificas este equipo en tu empresa.</p>
                  </div>
                  <div>
                    <Label>Estado de conservación (inspección visual)</Label>
                    <select value={form.estado_conservacion} onChange={e => f('estado_conservacion', e.target.value)}
                      className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                      {Object.entries(ESTADO_CONSERVACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <p className="text-xs text-slate-400 mt-0.5">Revisa visualmente balsa, paneles, toberas y estructura.</p>
                  </div>
                  <div>
                    <Label>¿Plano hidráulico actualizado disponible?</Label>
                    <SiNoSelect value={form.plano_hidraulico} onChange={v => f('plano_hidraulico', v)} />
                    <p className="text-xs text-slate-400 mt-0.5">Obligatorio tenerlo disponible para la inspección.</p>
                  </div>
                  <div>
                    <Label>¿Se ha vaciado la balsa previamente?</Label>
                    <SiNoSelect value={form.check_vaciado} onChange={v => f('check_vaciado', v)} incluirParcialmente />
                    <p className="text-xs text-slate-400 mt-0.5">Para puesta en marcha/hibernación es obligatorio vaciar y limpiar antes de añadir biocida.</p>
                  </div>
                  <div>
                    <Label>¿Se ha limpiado antes de añadir el biocida?</Label>
                    <SiNoSelect value={form.check_limpieza_antes_biocida} onChange={v => f('check_limpieza_antes_biocida', v)} incluirParcialmente />
                    <p className="text-xs text-slate-400 mt-0.5">Limpieza mecánica con pistola a presión, eliminando incrustaciones y biocapa.</p>
                  </div>
                  <div>
                    <Label>Hora inicio actuación</Label>
                    <Input type="time" value={form.hora_inicio} onChange={e => f('hora_inicio', e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-slate-400 mt-0.5">Hora en que comienzas la intervención (antes de vaciar).</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Partes donde se realiza el tratamiento / medidas correctoras</Label>
                    <textarea value={form.partes_tratamiento} onChange={e => f('partes_tratamiento', e.target.value)}
                      className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2}
                      placeholder="Ej: Tratamiento total. Se han sustituido los paneles de celulosa con signos de biocapa..." />
                    <p className="text-xs text-slate-400 mt-0.5">Indica si el tratamiento es total o parcial y qué medidas correctoras has aplicado.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 1: Mediciones iniciales ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 mb-1">📊 Paso 2 — Mediciones iniciales del agua</p>
                    <p>Antes de añadir ningún producto, mide el agua de la balsa <strong>ya limpia y llena con agua de red</strong>. Estas mediciones son el punto de partida del proceso.</p>
                    <ul className="mt-1.5 space-y-1 text-slate-600">
                      <li>• <strong>pH:</strong> El rango óptimo es 7,2–7,8. Si el pH es &gt;8, el hipoclorito pierde más del 70% de eficacia. Añade reductor de pH antes de dosificar el biocida.</li>
                      <li>• <strong>Cloro libre:</strong> Normalmente será 0 o muy bajo en agua de red recién llenada.</li>
                      <li>• <strong>Temperatura:</strong> Por encima de 20°C hay riesgo de proliferación de Legionella. Registra siempre.</li>
                    </ul>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>pH inicial</Label>
                    <Input type="number" step="0.1" value={form.ph_inicial} onChange={e => f('ph_inicial', e.target.value)} className="h-8 text-sm" placeholder="7.2 – 7.8" />
                    <AlertaValor valor={form.ph_inicial} label="pH" min={7.2} max={7.8} />
                    {form.ph_inicial !== '' && Number(form.ph_inicial) > 8 && (
                      <span className="text-xs text-red-600 font-medium block mt-0.5">⛔ pH &gt;8: añade reductor de pH antes de continuar. El cloro no actuará correctamente.</span>
                    )}
                    {form.ph_inicial !== '' && Number(form.ph_inicial) >= 7.2 && Number(form.ph_inicial) <= 7.8 && (
                      <span className="text-xs text-emerald-600 font-medium block mt-0.5">✓ Rango óptimo. Puedes continuar con la dosificación.</span>
                    )}
                  </div>
                  <div>
                    <Label>Cloro libre inicial (ppm)</Label>
                    <Input type="number" step="0.1" value={form.cloro_libre_inicial} onChange={e => f('cloro_libre_inicial', e.target.value)} className="h-8 text-sm" placeholder="0 – 0.5 esperado" />
                    <p className="text-xs text-slate-400 mt-0.5">En agua de red limpia suele ser 0 o &lt;0,5 ppm.</p>
                  </div>
                  <div>
                    <Label>Temperatura inicial (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperatura_inicial} onChange={e => f('temperatura_inicial', e.target.value)} className="h-8 text-sm" placeholder="ej: 18" />
                    {form.temperatura_inicial !== '' && Number(form.temperatura_inicial) > 20 && (
                      <span className="text-xs text-red-600 font-medium mt-0.5 block">⚠ &gt;20°C: riesgo Legionella. Registrar y notificar si persiste.</span>
                    )}
                    {form.temperatura_inicial !== '' && Number(form.temperatura_inicial) <= 20 && (
                      <span className="text-xs text-emerald-600 font-medium mt-0.5 block">✓ Temperatura dentro del rango seguro.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 2: Productos y dosificación ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 mb-1">🧪 Paso 3 — Selección de productos y cálculo de dosis</p>
                    <p>Selecciona el biocida y su concentración. La herramienta calcula automáticamente la cantidad exacta a añadir según el volumen de la balsa.</p>
                    <ul className="mt-1.5 space-y-1 text-slate-600">
                      <li>• <strong>Hipoclorito sódico:</strong> Añádelo con la bomba de agua ya en marcha pero los <span className="text-red-700 font-semibold">ventiladores APAGADOS</span> para evitar aerosoles.</li>
                      <li>• <strong>Dosis para informe:</strong> La "dosis" es la cantidad en relación al volumen (ej: 0,41 L/m³). Puedes calcularla dividiendo los ml entre el volumen en m³.</li>
                      <li>• <strong>Tiosulfato sódico:</strong> Neutralizante obligatorio antes del vertido. No usar metabisulfito en vertidos a alcantarillado.</li>
                    </ul>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Producto biocida principal</Label>
                    <Input value={form.producto_principal} onChange={e => f('producto_principal', e.target.value)} className="h-8 text-sm" placeholder="Hipoclorito Sódico Brenntquisan Legionella" />
                    <p className="text-xs text-slate-400 mt-0.5">Nombre comercial completo del producto tal como aparece en la ficha de seguridad.</p>
                  </div>
                  <div>
                    <Label>Producto neutralizante</Label>
                    <Input value={form.producto_secundario} onChange={e => f('producto_secundario', e.target.value)} className="h-8 text-sm" placeholder="Tiosulfato Sódico PWG Brenntag" />
                    <p className="text-xs text-slate-400 mt-0.5">Se añade al final del proceso para eliminar el cloro antes del vertido.</p>
                  </div>
                  <div>
                    <Label>Concentración del hipoclorito disponible</Label>
                    <select value={form.porcentaje_hipoclorito} onChange={e => f('porcentaje_hipoclorito', Number(e.target.value))}
                      className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                      {HIPOCLORITO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <p className="text-xs text-slate-400 mt-0.5">Mira la etiqueta del bidón. El hipoclorito industrial suele ser 15%. Si es lejía comercial, elige 5%.</p>
                  </div>
                  <div>
                    <Label>Concentración objetivo (ppm Cl residual libre)</Label>
                    <select value={form.ppm_deseadas} onChange={e => f('ppm_deseadas', Number(e.target.value))}
                      className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                      {PPM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <p className="text-xs text-slate-400 mt-0.5">Las ppm son la concentración de cloro activo que debe haber en el agua durante la recirculación.</p>
                  </div>
                </div>

                {balsaLitros && hipocloritoCalculado !== null && (
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Cantidad a añadir (calculada automáticamente):</p>
                    <p className="text-3xl font-bold text-emerald-700">{hipocloritoCalculado} ml</p>
                    <p className="text-xs text-slate-500 mt-1">Fórmula: ({balsaLitros} L × {form.ppm_deseadas} ppm) ÷ ({form.porcentaje_hipoclorito}% × 10)</p>
                    <p className="text-xs text-amber-700 mt-1.5 font-medium">→ Añade esta cantidad con la bomba en marcha y ventiladores APAGADOS.</p>
                  </div>
                )}
                {!balsaLitros && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    ⚠ El volumen de la balsa no está definido en este equipo. Edita el equipo para activar el cálculo automático.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Hipoclorito sódico añadido realmente (ml)</Label>
                    <Input type="number" step="0.1" value={form.hipoclorito_ml} onChange={e => f('hipoclorito_ml', e.target.value)} className="h-8 text-sm"
                      placeholder={hipocloritoCalculado !== null ? `Calculado: ${hipocloritoCalculado} ml` : 'ml añadidos'} />
                    <p className="text-xs text-slate-400 mt-0.5">Registra la cantidad real añadida (puede diferir ligeramente del cálculo).</p>
                  </div>
                  <div>
                    <Label>Dosis producto principal (para el informe)</Label>
                    <Input value={form.dosis_producto_principal} onChange={e => f('dosis_producto_principal', e.target.value)} className="h-8 text-sm" placeholder="Ej: 0,41 L/m³" />
                    <p className="text-xs text-slate-400 mt-0.5">ml añadidos ÷ m³ de balsa = L/m³. Aparece en el certificado.</p>
                  </div>
                  <div>
                    <Label>Dosis neutralizante (para el informe)</Label>
                    <Input value={form.dosis_producto_secundario} onChange={e => f('dosis_producto_secundario', e.target.value)} className="h-8 text-sm" placeholder="Ej: 0,20 g/m³" />
                    <p className="text-xs text-slate-400 mt-0.5">Gramos de tiosulfato añadidos ÷ m³ de balsa.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 3: Desinfección y neutralización ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 mb-1">⏱ Paso 4 — Recirculación, controles y neutralización</p>
                    <p>Esta es la parte más crítica. Debes mantener ≥30 ppm durante todo el tiempo de recirculación con los ventiladores apagados.</p>
                    <ul className="mt-1.5 space-y-1 text-slate-600">
                      <li>• <strong>Hora inicio desinfección:</strong> Momento en que terminas de añadir el hipoclorito y arrancas la recirculación.</li>
                      <li>• <strong>Cloro durante la desinfección:</strong> Mide a los 30, 60 y 90 min. Si baja de 30 ppm, repón hipoclorito. El valor que registras aquí es el mínimo medido.</li>
                      <li>• <strong>Tiempo de recirculación:</strong> Mínimo 120 min para puesta en marcha. Mínimo 60 min para mantenimiento mensual.</li>
                      <li>• <strong>Neutralización:</strong> Al acabar la recirculación, antes de vaciar o verter, añade tiosulfato hasta 0 ppm.</li>
                    </ul>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Hora inicio desinfección</Label>
                    <Input type="time" value={form.hora_inicio_desinfeccion} onChange={e => f('hora_inicio_desinfeccion', e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-slate-400 mt-0.5">Hora en que has añadido el hipoclorito y arrancas el contador de 120 min.</p>
                  </div>
                  <div>
                    <Label>Hora fin desinfección</Label>
                    <Input type="time" value={form.hora_fin_desinfeccion} onChange={e => f('hora_fin_desinfeccion', e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-slate-400 mt-0.5">Hora en que han pasado los 120 min y paras la bomba.</p>
                  </div>
                  <div>
                    <Label>Cloro durante la desinfección — valor mínimo medido (ppm)</Label>
                    <Input type="number" step="0.1" value={form.cloro_durante_desinfeccion} onChange={e => f('cloro_durante_desinfeccion', e.target.value)} className="h-8 text-sm" placeholder="≥30 ppm" />
                    <p className="text-xs text-slate-400 mt-0.5">El valor más bajo que hayas medido en los controles a min 30, 60 y 90. Debe ser ≥30 ppm en todo momento.</p>
                    {form.cloro_durante_desinfeccion !== '' && Number(form.cloro_durante_desinfeccion) < 30 && (
                      <span className="text-xs text-red-600 font-medium mt-0.5 block">⛔ Bajó de 30 ppm: debiste reponer hipoclorito. El proceso puede no ser válido.</span>
                    )}
                  </div>
                  <div>
                    <Label>Tiempo de recirculación total (min)</Label>
                    <Input type="number" value={form.tiempo_recirculacion_min} onChange={e => f('tiempo_recirculacion_min', e.target.value)} className="h-8 text-sm" placeholder="120" />
                    {form.tiempo_recirculacion_min !== '' && Number(form.tiempo_recirculacion_min) < 120 && (
                      <span className="text-xs text-red-600 mt-0.5 block">⚠ Mínimo 120 min para puesta en marcha/hibernación. El registro no tendrá validez legal con menos tiempo.</span>
                    )}
                    {form.tiempo_recirculacion_min !== '' && Number(form.tiempo_recirculacion_min) >= 120 && (
                      <span className="text-xs text-emerald-600 font-medium mt-0.5 block">✓ Tiempo correcto.</span>
                    )}
                  </div>

                  {/* Neutralización */}
                  <div className="sm:col-span-2 border-t pt-3 mt-1">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-emerald-700">🔵 Neutralización con tiosulfato sódico</p>
                  </div>
                  <div>
                    <Label>Cloro residual libre al minuto 120 (antes de añadir tiosulfato)</Label>
                    <Input type="number" step="0.1" value={form.cloro_a_neutralizar}
                      onChange={e => f('cloro_a_neutralizar', e.target.value)}
                      className={`h-8 text-sm ${cloroNeutralizarError ? 'border-red-500' : ''}`}
                      placeholder="≥30 ppm confirma proceso correcto" />
                    <p className="text-xs text-slate-400 mt-0.5">Esta medida confirma que el proceso fue correcto. Debe ser ≥30 ppm. Si no lo es, el tratamiento no fue eficaz.</p>
                    {cloroNeutralizarError && <p className="text-xs text-red-600 font-medium mt-0.5">⛔ Valor &gt;60 ppm imposible. Revisa la medición.</p>}
                    {form.cloro_a_neutralizar !== '' && Number(form.cloro_a_neutralizar) < 30 && !cloroNeutralizarError && (
                      <span className="text-xs text-amber-600 font-medium mt-0.5 block">⚠ Menor de 30 ppm: proceso posiblemente inválido. Contacta con el responsable técnico.</span>
                    )}
                    {form.cloro_a_neutralizar !== '' && Number(form.cloro_a_neutralizar) >= 30 && !cloroNeutralizarError && (
                      <span className="text-xs text-emerald-600 font-medium mt-0.5 block">✓ Proceso correcto. Ahora añade el tiosulfato para neutralizar.</span>
                    )}
                  </div>
                  {balsaLitros && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-medium">Tiosulfato sódico necesario (calculado):</p>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-2xl font-bold text-blue-700">{metabisulfitoCalculado !== null ? `${metabisulfitoCalculado} g` : '—'}</p>
                        {metabisulfitoCalculado !== null && <p className="text-xs text-slate-400 mt-0.5">Fórmula: {balsaLitros} L × {form.cloro_a_neutralizar} ppm × 0,002</p>}
                        <p className="text-xs text-slate-500 mt-1">Añade esta cantidad y espera hasta que el cloro llegue a 0 ppm antes de vaciar.</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Tiosulfato sódico añadido realmente (g)</Label>
                    <Input type="number" step="0.01" value={form.metabisulfito_g} onChange={e => f('metabisulfito_g', e.target.value)} className="h-8 text-sm"
                      placeholder={metabisulfitoCalculado !== null ? `Calculado: ${metabisulfitoCalculado} g` : ''} />
                    <p className="text-xs text-slate-400 mt-0.5">Registra la cantidad real añadida.</p>
                  </div>
                  <div>
                    <Label>Tiempo de neutralización (min)</Label>
                    <Input type="number" value={form.tiempo_neutralizacion_min} onChange={e => f('tiempo_neutralizacion_min', e.target.value)} className="h-8 text-sm" placeholder="15" />
                    <p className="text-xs text-slate-400 mt-0.5">Tiempo desde que añades el tiosulfato hasta que el cloro llega a 0 ppm.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 4: Mediciones finales y firmas ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-slate-700">
                  <Info className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 mb-1">✅ Paso 5 — Mediciones finales y datos del técnico</p>
                    <p>Tras neutralizar y vaciar, llena la balsa con agua limpia y mide los parámetros finales del agua de servicio. Después completa los datos de los firmantes del certificado.</p>
                    <ul className="mt-1.5 space-y-1 text-slate-600">
                      <li>• <strong>pH final:</strong> Rango 7,2–7,8 para el agua de servicio.</li>
                      <li>• <strong>Cloro libre final:</strong> Debe quedar entre 0,2 y 1,0 ppm en el agua de servicio (tratamiento de agua de red).</li>
                      <li>• <strong>Responsable técnico:</strong> Persona con titulación que avala el proceso (puede ser el aplicador u otra persona de la empresa).</li>
                      <li>• <strong>Aplicador:</strong> Persona que físicamente ha realizado el tratamiento en campo. Puede coincidir con el responsable técnico.</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 border-t pt-2">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-emerald-700">Mediciones finales del agua de servicio</p>
                  </div>
                  <div>
                    <Label>pH final</Label>
                    <Input type="number" step="0.1" value={form.ph_final} onChange={e => f('ph_final', e.target.value)} className="h-8 text-sm" placeholder="7.2 – 7.8" />
                    <AlertaValor valor={form.ph_final} label="pH" min={7.2} max={7.8} />
                    <p className="text-xs text-slate-400 mt-0.5">Agua de servicio tras el llenado final con agua de red.</p>
                  </div>
                  <div>
                    <Label>Cloro libre final (ppm)</Label>
                    <Input type="number" step="0.1" value={form.cloro_libre_final} onChange={e => f('cloro_libre_final', e.target.value)} className="h-8 text-sm" placeholder="0.2 – 1.0" />
                    <AlertaValor valor={form.cloro_libre_final} label="Cl final" min={0.2} max={1.0} />
                    <p className="text-xs text-slate-400 mt-0.5">El agua de red en España suele llevar 0,2–1,0 ppm. Valores &gt;1 ppm indican que no se neutralizó bien.</p>
                  </div>
                  <div>
                    <Label>Temperatura final (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperatura_final} onChange={e => f('temperatura_final', e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-slate-400 mt-0.5">Temperatura del agua de servicio tras el llenado.</p>
                  </div>
                  <div>
                    <Label>Hora fin actuación total</Label>
                    <Input type="time" value={form.hora_fin} onChange={e => f('hora_fin', e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-slate-400 mt-0.5">Hora en que abandonas la instalación.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Observaciones</Label>
                    <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
                      className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2}
                      placeholder="Incidencias, anomalías observadas, acciones pendientes..." />
                  </div>

                  {/* Responsable técnico */}
                  <div className="sm:col-span-2 border-t pt-2 mt-1">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-indigo-700">👤 Responsable técnico</p>
                    <p className="text-xs text-slate-500 mb-2">Persona que avala técnicamente el proceso. Firma el certificado. Debe tener titulación en mantenimiento higiénico-sanitario.</p>
                  </div>
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input value={form.responsable_tecnico_nombre} onChange={e => f('responsable_tecnico_nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre y apellidos" />
                  </div>
                  <div>
                    <Label>D.N.I.</Label>
                    <Input value={form.responsable_tecnico_dni} onChange={e => f('responsable_tecnico_dni', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label>Lugar y fecha del curso de Legionella</Label>
                    <Input value={form.responsable_tecnico_curso} onChange={e => f('responsable_tecnico_curso', e.target.value)} className="h-8 text-sm" placeholder="Ej: Madrid, desde 01/01/2022 hasta 05/01/2022" />
                    <p className="text-xs text-slate-400 mt-0.5">Datos del curso homologado de mantenimiento higiénico-sanitario.</p>
                  </div>
                  <div>
                    <Label>Titulación / Cualificación</Label>
                    <Input value={form.responsable_tecnico_cualificacion} onChange={e => f('responsable_tecnico_cualificacion', e.target.value)} className="h-8 text-sm" placeholder="Ej: Técnico en instalaciones térmicas, curso Legionella 40h" />
                  </div>

                  {/* Aplicador */}
                  <div className="sm:col-span-2 border-t pt-2 mt-1">
                    <p className="text-xs font-semibold mb-1 uppercase tracking-wide text-cyan-700">🔧 Aplicador del tratamiento</p>
                    <p className="text-xs text-slate-500 mb-2">Persona que ha estado físicamente en la instalación realizando el tratamiento. Puede ser el mismo que el responsable técnico o diferente (empresa subcontratada).</p>
                  </div>
                  <div>
                    <Label>Nombre completo</Label>
                    <Input value={form.aplicador_nombre} onChange={e => f('aplicador_nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre y apellidos (o 'Ídem responsable técnico')" />
                  </div>
                  <div>
                    <Label>D.N.I.</Label>
                    <Input value={form.aplicador_dni} onChange={e => f('aplicador_dni', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label>Lugar y fecha del curso</Label>
                    <Input value={form.aplicador_curso} onChange={e => f('aplicador_curso', e.target.value)} className="h-8 text-sm" placeholder="Ej: Barcelona, desde 10/03/2023 hasta 14/03/2023" />
                  </div>
                  <div>
                    <Label>Cualificaciones</Label>
                    <Input value={form.aplicador_cualificacion} onChange={e => f('aplicador_cualificacion', e.target.value)} className="h-8 text-sm" placeholder="Ej: Curso mantenimiento higiénico-sanitario 20h" />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Navegación */}
          <div className="px-5 pb-4 flex items-center justify-between gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : (setShowForm(false), setEditingId(null))}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            <span className="text-xs text-slate-400">Paso {step + 1} de 5</span>
            {step < 4 ? (
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setStep(s => s + 1)}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.responsable_tecnico_nombre || !form.fecha || cloroNeutralizarError}
                className="bg-emerald-600 hover:bg-emerald-700">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Guardar Registro
              </Button>
            )}
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