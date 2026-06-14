import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight, ChevronLeft, Info, Timer, AlertCircle, Copy
} from 'lucide-react';
import jsPDF from 'jspdf';

// ─── Constantes ───────────────────────────────────────────────────────────────

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

// Los 3 únicos protocolos cerrados
const PROTOCOLOS = [
  {
    id: 'A',
    label: 'Opción A — Puesta en Marcha / Mantenimiento',
    sublabel: 'Recomendado por el fabricante · Protege la celulosa',
    ppm: 5,
    factor_hipoclorito: 0.033,
    factor_tiosulfato: 0.035,
    tiempo_min: 180,
    color: 'emerald',
    alerta: null,
    bgClass: 'bg-emerald-50 border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    timerLabel: '3 horas',
  },
  {
    id: 'B',
    label: 'Opción B — Choque Estándar',
    sublabel: 'Normativa RD 487/2022 · 20 ppm',
    ppm: 20,
    factor_hipoclorito: 0.133,
    factor_tiosulfato: 0.14,
    tiempo_min: 180,
    color: 'amber',
    alerta: '⚠ Dosis agresiva para la celulosa. Aumenta la frecuencia de inspección del panel tras este tratamiento.',
    bgClass: 'bg-amber-50 border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800',
    timerLabel: '3 horas',
  },
  {
    id: 'C',
    label: 'Opción C — Choque Rápido',
    sublabel: 'Normativa RD 487/2022 · 50 ppm',
    ppm: 50,
    factor_hipoclorito: 0.333,
    factor_tiosulfato: 0.35,
    tiempo_min: 60,
    color: 'red',
    alerta: '🚨 Riesgo crítico de corrosión del panel celulósico. Usar solo en caso de detección positiva o brote. Inspeccionar panel antes de la próxima temporada.',
    bgClass: 'bg-red-50 border-red-300',
    badgeClass: 'bg-red-100 text-red-800',
    timerLabel: '1 hora',
  },
];

const emptyForm = {
  fecha: new Date().toISOString().split('T')[0],
  tipo_tratamiento: 'mantenimiento_mensual',
  protocolo_id: 'A',
  ppm_personalizada: '',  // PPM definida por el usuario (opcional, anula la del protocolo)
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
  producto_principal: 'Hipoclorito Sódico Comercial 15%',
  producto_secundario: 'Tiosulfato Sódico Pentahidratado',
  hipoclorito_ml: '',
  tiempo_recirculacion_min: '',
  cloro_durante_desinfeccion: '',
  metabisulfito_g: '',
  ph_final: '',
  cloro_libre_final: '',
  temperatura_final: '',
  check_vaciado: 'si',
  check_limpieza_mecanica: false,
  check_epi: false,
  check_llenado_limpio: false,
  check_bombas_on_ventiladores_off: false,
  check_neutralizado_ok: false,
  // buenas prácticas fabricante
  bp_cepillo_suave: false,
  bp_secado_diario: false,
  bp_purga_sales: false,
  partes_tratamiento: '',
  observaciones: '',
  responsable_tecnico_nombre: '',
  responsable_tecnico_dni: '',
  responsable_tecnico_curso: '',
  responsable_tecnico_cualificacion: '',
  aplicador_nombre: '',
  aplicador_dni: '',
  aplicador_empresa: '',
  aplicador_curso: '',
  responsable_tecnico_empresa: '',
  cloro_a_neutralizar: '',
  cloro_objetivo: '',
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────

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

function CheckItem({ checked, onChange, children, required = false }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-emerald-600 flex-shrink-0" />
      <span className="text-sm text-slate-700">
        {required && <span className="text-red-500 mr-1">*</span>}
        {children}
      </span>
    </label>
  );
}

// Temporizador visual
function Temporizador({ minutos, onComplete }) {
  const totalSeg = minutos * 60;
  const [restante, setRestante] = useState(totalSeg);
  const [activo, setActivo] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (activo && restante > 0) {
      intervalRef.current = setInterval(() => {
        setRestante(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setActivo(false); onComplete && onComplete(); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [activo]);

  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');
  const pct = ((totalSeg - restante) / totalSeg) * 100;
  const completo = restante === 0;

  return (
    <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-center space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center justify-center gap-1">
        <Timer className="h-3.5 w-3.5" /> Temporizador de recirculación — {minutos} min bloqueados
      </p>
      <p className={`text-5xl font-mono font-bold ${completo ? 'text-emerald-600' : activo ? 'text-blue-700' : 'text-slate-700'}`}>
        {mm}:{ss}
      </p>
      <div className="w-full bg-blue-100 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      {completo ? (
        <p className="text-emerald-700 font-semibold text-sm">✅ Tiempo completado. Puedes continuar al siguiente paso.</p>
      ) : (
        <div className="flex gap-2 justify-center">
          {!activo ? (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setActivo(true)}>
              ▶ Iniciar tratamiento
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setActivo(false); clearInterval(intervalRef.current); }}>
              ⏸ Pausar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setActivo(false); setRestante(totalSeg); }}>↺ Reiniciar</Button>
        </div>
      )}
      {activo && (
        <p className="text-xs text-slate-500">Cada 30 min: verifica que el cloro sigue estable con el medidor de campo.</p>
      )}
    </div>
  );
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
function generatePDFFromTemplate(r, equipment, client, appSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const margin = 14; const usable = W - margin * 2;
  let y = 12;
  const lineH = 6; const cellPad = 2;

  const drawCell = (x, cy, w, h, text, bold = false, fillRGB = null, fontSize = 8, align = 'left') => {
    if (fillRGB) { doc.setFillColor(...fillRGB); doc.rect(x, cy, w, h, 'F'); }
    doc.setDrawColor(180, 180, 180); doc.rect(x, cy, w, h, 'S');
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(fontSize);
    if (align === 'center') {
      doc.text(text || '', x + w / 2, cy + h / 2 + fontSize * 0.18, { align: 'center' });
    } else {
      const lines = doc.splitTextToSize(text || '', w - cellPad * 2);
      doc.text(lines, x + cellPad, cy + cellPad + fontSize * 0.35);
    }
  };
  const drawRow = (cy, label, value, labelW = 60) => {
    drawCell(margin, cy, labelW, lineH, label, false, [240, 240, 240]);
    drawCell(margin + labelW, cy, usable - labelW, lineH, value || '—');
    return cy + lineH;
  };
  const drawSectionTitle = (cy, title) => {
    doc.setFillColor(25, 55, 90); doc.rect(margin, cy, usable, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + cellPad, cy + 4.8);
    doc.setTextColor(0, 0, 0); return cy + 7;
  };
  const checkNewPage = (n = 30) => { if (y + n > 282) { doc.addPage(); y = 12; } };

  const eqName = equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim();
  const fechaFmt = r.fecha ? format(new Date(r.fecha), 'dd/MM/yyyy') : '—';
  const fechaEmision = format(new Date(), 'dd/MM/yyyy');
  const protocolo = PROTOCOLOS.find(p => p.id === r.protocolo_id) || PROTOCOLOS[0];

  // Título
  doc.setFillColor(25, 55, 90); doc.rect(margin, y, usable, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICADO DE LIMPIEZA Y DESINFECCIÓN', W / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Equipos de Enfriamiento Evaporativo / Adiabáticos  ·  RD 487/2022 · RD 614/2024', W / 2, y + 8.5, { align: 'center' });
  doc.setTextColor(0, 0, 0); y += 13;
  doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de emisión: ${fechaEmision}`, W - margin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0); y += 5;

  y = drawSectionTitle(y, '1. Datos del cliente e instalación');
  const addr = [client?.address, client?.city, client?.postal_code, client?.province].filter(Boolean).join(', ');
  y = drawRow(y, 'Cliente:', client?.name || ''); y = drawRow(y, 'Domicilio:', addr);
  y = drawRow(y, 'N.I.F./C.I.F.:', client?.cif || ''); y = drawRow(y, 'Instalación:', eqName);
  y = drawRow(y, 'Circuito:', r.nombre_circuito || eqName);
  y = drawRow(y, 'Volumen balsa (L):', r.balsa_litros ? `${r.balsa_litros} L` : '—'); y += 3;

  checkNewPage(40);
  y = drawSectionTitle(y, '2. Protocolo de desinfección aplicado');
  y = drawRow(y, 'Tipo tratamiento:', TIPO_LABELS[r.tipo_tratamiento] || r.tipo_tratamiento);
  const ppmUsadas = r.ppm_personalizada || r.ppm_deseadas || protocolo.ppm;
  const labelPpm = r.ppm_personalizada ? `${ppmUsadas} ppm (personalizado por criterio técnico)` : `${protocolo.label} — ${ppmUsadas} ppm`;
  y = drawRow(y, 'Protocolo / PPM:', labelPpm);
  y = drawRow(y, 'Tiempo recirculación:', `${protocolo.tiempo_min} min (bloqueado normativamente)`);
  y = drawRow(y, 'Fecha:', fechaFmt);
  const horaStr = r.hora_inicio && r.hora_fin ? `${r.hora_inicio} – ${r.hora_fin}` : r.hora_inicio || '—';
  y = drawRow(y, 'Hora actuación:', horaStr); y += 3;

  checkNewPage(35);
  y = drawSectionTitle(y, '3. Mediciones iniciales');
  const c3w = usable / 3;
  drawCell(margin, y, c3w, lineH, 'PARÁMETRO', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w, y, c3w, lineH, 'VALOR', true, [220, 225, 235], 7.5, 'center');
  drawCell(margin + c3w * 2, y, c3w, lineH, 'RANGO', true, [220, 225, 235], 7.5, 'center');
  y += lineH;
  [['pH inicial', r.ph_inicial != null ? `${r.ph_inicial}` : '—', '7,2 – 7,8'],
   ['Cloro libre (ppm)', r.cloro_libre_inicial != null ? `${r.cloro_libre_inicial}` : '—', '0 – 0,5'],
   ['Temperatura (°C)', r.temperatura_inicial != null ? `${r.temperatura_inicial}` : '—', '≤ 20°C']
  ].forEach(([p, v, rng]) => {
    drawCell(margin, y, c3w, lineH, p, false, null, 7.5);
    drawCell(margin + c3w, y, c3w, lineH, v, true, null, 7.5, 'center');
    drawCell(margin + c3w * 2, y, c3w, lineH, rng, false, [248, 252, 248], 7.5, 'center');
    y += lineH;
  }); y += 3;

  checkNewPage(30);
  y = drawSectionTitle(y, '4. Dosificación aplicada');
  y = drawRow(y, 'Biocida:', `${r.producto_principal || 'Hipoclorito Sódico 15%'}`);
  y = drawRow(y, 'Cantidad hipoclorito:', r.hipoclorito_ml != null ? `${r.hipoclorito_ml} ml` : '—');
  y = drawRow(y, 'Neutralizante:', `${r.producto_secundario || 'Tiosulfato Sódico Pentahidratado'}`);
  y = drawRow(y, 'Cantidad tiosulfato:', r.metabisulfito_g != null ? `${r.metabisulfito_g} g` : '—');
  y = drawRow(y, 'Cl residual mínimo durante proceso:', r.cloro_durante_desinfeccion != null ? `${r.cloro_durante_desinfeccion} ppm` : '—'); y += 3;

  checkNewPage(30);
  y = drawSectionTitle(y, '5. Mediciones finales');
  [['pH final', r.ph_final != null ? `${r.ph_final}` : '—', '7,2 – 7,8'],
   ['Cloro libre post-neutralización (ppm)', r.cloro_libre_final != null ? `${r.cloro_libre_final}` : '—', '0,0 ppm (obligatorio)'],
   ['Temperatura final (°C)', r.temperatura_final != null ? `${r.temperatura_final}` : '—', '≤ 20°C']
  ].forEach(([p, v, rng]) => {
    drawCell(margin, y, c3w, lineH, p, false, null, 7.5);
    drawCell(margin + c3w, y, c3w, lineH, v, true, null, 7.5, 'center');
    drawCell(margin + c3w * 2, y, c3w, lineH, rng, false, [248, 252, 248], 7.5, 'center');
    y += lineH;
  }); y += 3;

  // Sección: Trabajos realizados
  checkNewPage(50);
  y = drawSectionTitle(y, '6. Trabajos realizados');
  const trabajosText = 'Comprobar la nivelación de la unidad. Limpiar a fondo las superficies y la balsa del evaporativo eliminando las incrustaciones y adherencias. Aclarar con agua. En caso de realizar esta operación con biocidas, aclarar con abundante agua asegurándose de que no quedan restos de biocida. Limpiar los filtros de admisión de aire. Limpiar los paneles enfriadores y comprobar que no están saturados de cal. Desinfectar los paneles y la balsa con hipoclorito sódico, dejar actuar durante 60 minutos y aclarar con abundante agua, neutralizar y vaciar. Limpiar y secar la bomba de agua. Limpiar tuberías desmontables como la tubería de elevación y distribución, sumergir en agua con un limpiador adecuado, comprobar las superficies eliminando las incrustaciones y adherencias. En caso de realizar esta operación con biocidas, aclarar con abundante agua asegurándose de que no quedan restos de biocida. Limpiar y secar la válvula de drenaje. Comprobar el estado del retén de la válvula de drenaje. Limpiar el ventilador, poleas de transmisión y correas de transmisión (si se detectan roturas o grietas cambiar). Llenar la balsa para la puesta en marcha del equipo, verificación y comprobación de buen funcionamiento de la instalación.';
  const trabajosLines = doc.splitTextToSize(trabajosText, usable - 4);
  const trabajosH = Math.max(lineH * 2, trabajosLines.length * 4.5 + 4);
  checkNewPage(trabajosH + 5);
  drawCell(margin, y, usable, trabajosH, '', false, [250, 250, 252], 8);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text(trabajosLines, margin + cellPad, y + 4);
  y += trabajosH + 3;

  // Sección: Observaciones del técnico
  checkNewPage(20);
  y = drawSectionTitle(y, '7. Observaciones del técnico');
  const obsText = r.observaciones || r.partes_tratamiento || '—';
  const obsLines = doc.splitTextToSize(obsText, usable - 4);
  const obsH = Math.max(lineH * 2, obsLines.length * 5 + 4);
  drawCell(margin, y, usable, obsH, '', false, null, 8);
  if (obsLines.length) { doc.setFontSize(8); doc.text(obsLines, margin + cellPad, y + 4); }
  y += obsH + 3;

  checkNewPage(40);
  y = drawSectionTitle(y, '8. Responsable técnico y aplicador');
  y = drawRow(y, 'Responsable:', r.responsable_tecnico_nombre || '—');
  y = drawRow(y, 'Empresa responsable:', r.responsable_tecnico_empresa || appSettings?.company_name || '—');
  y = drawRow(y, 'D.N.I. responsable:', r.responsable_tecnico_dni || '—');
  y = drawRow(y, 'Curso Legionella:', r.responsable_tecnico_curso || '—');
  y = drawRow(y, 'Aplicador:', r.aplicador_nombre || r.responsable_tecnico_nombre || '—');
  y = drawRow(y, 'Empresa aplicador:', r.aplicador_empresa || appSettings?.company_name || '—');
  y = drawRow(y, 'D.N.I. aplicador:', r.aplicador_dni || '—'); y += 6;

  // Firmas
  checkNewPage(40);
  const firmaW = (usable - 10) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y + 18, margin + firmaW, y + 18);
  doc.setFontSize(7.5); doc.text('Firma responsable técnico', margin, y + 22);
  doc.rect(margin + firmaW + 10, y, firmaW, 28, 'S');
  doc.setFontSize(7.5); doc.text('Conformidad del cliente:', margin + firmaW + 12, y + 6);
  y += 32;

  // Aviso laboratorio
  y += 4;
  doc.setFillColor(255, 243, 205); doc.rect(margin, y, usable, 14, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('⚠ AVISO LEGAL: Recogida de muestras por laboratorio acreditado ISO 17025', margin + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Plazo: entre 15 y 30 días tras este tratamiento. Conservar este certificado 5 años.', margin + 2, y + 10);

  return doc;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LDTab({ equipment, equipmentId, client }) {
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const [step, setStep] = useState(0); // 0=Preparación 1=Dosificación+Timer 2=Neutralización 3=Cierre
  const [timerCompleto, setTimerCompleto] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);

  const balsaLitros = equipment?.balsa_litros || null;
  const protocolo = PROTOCOLOS.find(p => p.id === form.protocolo_id) || PROTOCOLOS[0];
  // PPM efectivas: personalizadas si el usuario las definió, si no las del protocolo
  const ppmPersonalizada = form.ppm_personalizada !== '' ? Number(form.ppm_personalizada) : null;
  const ppmEfectivas = ppmPersonalizada || protocolo.ppm;
  // ml por ppm por litro (factor basado en hipoclorito al 15%)
  const mlPerPpmPerLiter = protocolo.factor_hipoclorito / protocolo.ppm;
  // Cálculo ajustado: descuenta el cloro ya existente en la balsa
  const cloroActual = form.cloro_libre_inicial !== '' ? Number(form.cloro_libre_inicial) : 0;
  const ppmFaltantes = Math.max(0, ppmEfectivas - cloroActual);
  const mlAjustados = balsaLitros ? +(ppmFaltantes * balsaLitros * mlPerPpmPerLiter).toFixed(1) : null;
  const mlHipoclorito = balsaLitros ? +(ppmEfectivas * balsaLitros * mlPerPpmPerLiter).toFixed(1) : null;
  // Factor tiosulfato proporcional a PPM efectivas
  const factorTiosulfatoEfectivo = protocolo.factor_tiosulfato * (ppmEfectivas / protocolo.ppm);
  const gTiosulfato = balsaLitros ? +(balsaLitros * factorTiosulfatoEfectivo).toFixed(1) : null;

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings-ld'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' }),
  });
  const appSettings = settings[0] || null;

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['ld-registros', equipmentId],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'ld_registros', equipment_id: equipmentId
        });
        return res.data?.data || [];
      }
      return base44.entities.RegistroLD.filter({ equipment_id: equipmentId });
    },
    enabled: !!equipmentId,
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 30000,
  });
  const registrosOrdenados = [...registros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Sincronización en tiempo real (solo en modo directo, no en proxy de sesión técnico)
  useEffect(() => {
    if (!equipmentId || isSessionTech) return;
    const unsub = base44.entities.RegistroLD.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ld-registros', equipmentId] });
    });
    return unsub;
  }, [equipmentId, isSessionTech]);

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Validaciones por paso
  const paso0Valido = form.check_epi && form.check_limpieza_mecanica && form.check_llenado_limpio &&
    form.ph_inicial !== '' && Number(form.ph_inicial) >= 7.2 && Number(form.ph_inicial) <= 7.8;
  const paso1Valido = form.check_bombas_on_ventiladores_off;
  const cloroFinalNum = form.cloro_libre_final !== '' ? Number(form.cloro_libre_final) : null;
  const cloroFinalValido = cloroFinalNum !== null && cloroFinalNum >= 0 && cloroFinalNum < 1;
  const cloroObjetivoNum = form.cloro_objetivo !== '' ? Number(form.cloro_objetivo) : null;
  const cloroObjetivoValido = cloroObjetivoNum !== null && cloroObjetivoNum >= 0 && cloroObjetivoNum < 1;
  const paso2Valido = form.check_neutralizado_ok && cloroFinalValido && cloroObjetivoValido;
  const phAlerta = form.ph_inicial !== '' && (Number(form.ph_inicial) < 7.2 || Number(form.ph_inicial) > 7.8);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const p = PROTOCOLOS.find(x => x.id === data.protocolo_id) || PROTOCOLOS[0];
      const proxima = data.tipo_tratamiento === 'mantenimiento_mensual'
        ? addDays(new Date(data.fecha), 30).toISOString().split('T')[0] : null;
      const clientId = equipment?.client_id || client?.id || '';
      const payload = {
        ...data,
        equipment_id: equipmentId,
        client_id: clientId,
        balsa_litros: balsaLitros,
        tecnico_nombre: data.responsable_tecnico_nombre || '',
        ppm_deseadas: data.ppm_personalizada !== '' ? Number(data.ppm_personalizada) : p.ppm,
        ppm_personalizada: data.ppm_personalizada !== '' ? Number(data.ppm_personalizada) : null,
        porcentaje_hipoclorito: 15,
        hipoclorito_ml: data.hipoclorito_ml !== '' ? Number(data.hipoclorito_ml) : (balsaLitros ? +(balsaLitros * p.factor_hipoclorito).toFixed(1) : null),
        metabisulfito_g: data.metabisulfito_g !== '' ? Number(data.metabisulfito_g) : (balsaLitros ? +(balsaLitros * p.factor_tiosulfato).toFixed(1) : null),
        tiempo_recirculacion_min: p.tiempo_min,
        ph_inicial: data.ph_inicial !== '' ? Number(data.ph_inicial) : null,
        cloro_libre_inicial: data.cloro_libre_inicial !== '' ? Number(data.cloro_libre_inicial) : null,
        temperatura_inicial: data.temperatura_inicial !== '' ? Number(data.temperatura_inicial) : null,
        cloro_durante_desinfeccion: data.cloro_durante_desinfeccion !== '' ? Number(data.cloro_durante_desinfeccion) : null,
        ph_final: data.ph_final !== '' ? Number(data.ph_final) : null,
        cloro_libre_final: data.cloro_libre_final !== '' ? Number(data.cloro_libre_final) : null,
        temperatura_final: data.temperatura_final !== '' ? Number(data.temperatura_final) : null,
        cloro_a_neutralizar: data.cloro_a_neutralizar !== '' ? Number(data.cloro_a_neutralizar) : null,
        cloro_objetivo: data.cloro_objetivo !== '' ? Number(data.cloro_objetivo) : null,
        proxima_revision_fecha: proxima,
      };
      if (isSessionTech) {
        if (editingId) {
          const res = await base44.functions.invoke('getCompanyData', {
            technician_email: sessionTechEmail, entity: 'ld_update', record_id: editingId, updates: payload
          });
          return res.data?.data;
        }
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'ld_create', record: payload
        });
        return res.data?.data;
      }
      if (editingId) return base44.entities.RegistroLD.update(editingId, payload);
      return base44.entities.RegistroLD.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ld-registros', equipmentId] });
      toast.success(editingId ? 'Registro actualizado' : 'Registro L+D creado');
      setShowForm(false); setEditingId(null); setForm(emptyForm); setStep(0); setTimerCompleto(false);
    },
    onError: () => toast.error('Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (isSessionTech) {
        return base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, entity: 'ld_delete', record_id: id
        });
      }
      return base44.entities.RegistroLD.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ld-registros', equipmentId] }); toast.success('Registro eliminado'); },
  });

  const handleDuplicate = (r) => {
    const { id, created_date, updated_date, created_by_id, proxima_revision_fecha, documento_url, ...rest } = r;
    setForm({
      ...emptyForm,
      ...rest,
      fecha: new Date().toISOString().split('T')[0],
      ppm_personalizada: r.ppm_personalizada ?? '',
      ph_inicial: r.ph_inicial ?? '', cloro_libre_inicial: r.cloro_libre_inicial ?? '',
      temperatura_inicial: r.temperatura_inicial ?? '', hipoclorito_ml: r.hipoclorito_ml ?? '',
      metabisulfito_g: r.metabisulfito_g ?? '', cloro_durante_desinfeccion: r.cloro_durante_desinfeccion ?? '',
      ph_final: r.ph_final ?? '', cloro_libre_final: r.cloro_libre_final ?? '',
      temperatura_final: r.temperatura_final ?? '', cloro_a_neutralizar: r.cloro_a_neutralizar ?? '',
      cloro_objetivo: r.cloro_objetivo ?? '',
    });
    setEditingId(null); setStep(0); setTimerCompleto(false); setTimerVisible(false); setShowForm(true);
    toast.success('Registro duplicado — edita los datos y guarda');
  };

  const handleEdit = (r) => {
    setForm({
      ...emptyForm,
      fecha: r.fecha || '', tipo_tratamiento: r.tipo_tratamiento || 'mantenimiento_mensual',
      protocolo_id: r.protocolo_id || 'A', ppm_personalizada: r.ppm_personalizada ?? '', nombre_circuito: r.nombre_circuito || '',
      estado_conservacion: r.estado_conservacion || 'correcto', plano_hidraulico: r.plano_hidraulico || 'no',
      hora_inicio: r.hora_inicio || '', hora_fin: r.hora_fin || '',
      hora_inicio_desinfeccion: r.hora_inicio_desinfeccion || '', hora_fin_desinfeccion: r.hora_fin_desinfeccion || '',
      ph_inicial: r.ph_inicial ?? '', cloro_libre_inicial: r.cloro_libre_inicial ?? '', temperatura_inicial: r.temperatura_inicial ?? '',
      producto_principal: r.producto_principal || 'Hipoclorito Sódico Comercial 15%',
      producto_secundario: r.producto_secundario || 'Tiosulfato Sódico Pentahidratado',
      hipoclorito_ml: r.hipoclorito_ml ?? '', metabisulfito_g: r.metabisulfito_g ?? '',
      cloro_durante_desinfeccion: r.cloro_durante_desinfeccion ?? '',
      ph_final: r.ph_final ?? '', cloro_libre_final: r.cloro_libre_final ?? '', temperatura_final: r.temperatura_final ?? '',
      check_epi: r.check_epi || false, check_limpieza_mecanica: r.check_limpieza_mecanica || false,
      check_llenado_limpio: r.check_llenado_limpio || false,
      check_bombas_on_ventiladores_off: r.check_bombas_on_ventiladores_off || false,
      check_neutralizado_ok: r.check_neutralizado_ok || false,
      bp_cepillo_suave: r.bp_cepillo_suave || false, bp_secado_diario: r.bp_secado_diario || false,
      bp_purga_sales: r.bp_purga_sales || false,
      partes_tratamiento: r.partes_tratamiento || '', observaciones: r.observaciones || '',
      responsable_tecnico_nombre: r.responsable_tecnico_nombre || '', responsable_tecnico_dni: r.responsable_tecnico_dni || '',
      responsable_tecnico_empresa: r.responsable_tecnico_empresa || '', responsable_tecnico_curso: r.responsable_tecnico_curso || '',
      aplicador_nombre: r.aplicador_nombre || '', aplicador_dni: r.aplicador_dni || '',
      aplicador_empresa: r.aplicador_empresa || '', aplicador_curso: r.aplicador_curso || '',
      cloro_a_neutralizar: r.cloro_a_neutralizar ?? '',
      cloro_objetivo: r.cloro_objetivo ?? '',
    });
    setEditingId(r.id); setStep(0); setTimerCompleto(false); setTimerVisible(false); setShowForm(true);
  };

  const generatePDF = async (r) => {
    setGeneratingPdf(r.id);
    try {
      const doc = generatePDFFromTemplate(r, equipment, client, appSettings);
      const eqName = equipment?.reference_name || `${equipment?.brand}_${equipment?.model}`;
      doc.save(`LD_${eqName.replace(/\s+/g, '_')}_${r.fecha}.pdf`);
      toast.success('PDF generado');
    } catch (err) { toast.error('Error al generar el PDF'); }
    finally { setGeneratingPdf(null); }
  };

  const sessionTechName = sessionStorage.getItem('technician_name') || '';
  const sessionTechCompany = sessionStorage.getItem('technician_company') || '';

  const openNewForm = () => {
    const eqName = equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim() || '';
    setForm({
      ...emptyForm,
      nombre_circuito: eqName,
      responsable_tecnico_nombre: sessionTechName,
      responsable_tecnico_empresa: sessionTechCompany,
      aplicador_nombre: sessionTechName,
      aplicador_empresa: sessionTechCompany,
    });
    setEditingId(null); setStep(0); setTimerCompleto(false); setTimerVisible(false); setShowForm(true);
  };

  const STEPS = ['Preparación', 'Dosificación', 'Neutralización', 'Cierre'];

  const Label = ({ children }) => <label className="text-xs text-slate-500 mb-1 block">{children}</label>;

  return (
    <div className="space-y-5">

      {/* Info balsa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 border-0 bg-cyan-50">
          <p className="text-xs text-cyan-600 font-medium mb-1 flex items-center gap-1"><Droplets className="h-3 w-3" />Volumen balsa</p>
          <p className="text-lg font-bold text-slate-800">{balsaLitros ? `${balsaLitros} L` : 'No definido'}</p>
          {!balsaLitros && <p className="text-xs text-amber-600 mt-0.5">Edita el equipo para definirlo</p>}
        </Card>
        {balsaLitros && (
          <>
            <Card className="p-3 border-0 bg-emerald-50">
              <p className="text-xs text-emerald-700 font-medium mb-1">Opción A — 5 ppm (fab.)</p>
              <p className="text-sm font-bold text-slate-800">{+(balsaLitros * 0.033).toFixed(1)} ml cloro</p>
              <p className="text-xs text-slate-400">{+(balsaLitros * 0.035).toFixed(1)} g tiosulfato · 180 min</p>
            </Card>
            <Card className="p-3 border-0 bg-amber-50">
              <p className="text-xs text-amber-700 font-medium mb-1">Opción B — 20 ppm (RD)</p>
              <p className="text-sm font-bold text-slate-800">{+(balsaLitros * 0.133).toFixed(1)} ml cloro</p>
              <p className="text-xs text-slate-400">{+(balsaLitros * 0.14).toFixed(1)} g tiosulfato · 180 min</p>
            </Card>
          </>
        )}
      </div>

      {!showForm && (
        <Button size="sm" onClick={openNewForm} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />Nuevo Registro L+D
        </Button>
      )}

      {/* ── FORMULARIO WIZARD ── */}
      {showForm && (
        <Card className="border border-cyan-200 overflow-hidden">
          {/* Cabecera */}
          <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-400" />
              <span className="text-white text-sm font-semibold">{editingId ? 'Editar' : 'Nuevo'} Registro L+D</span>
            </div>
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded transition-all ${step === i ? 'bg-cyan-500 text-white font-semibold' : i < step ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span className="hidden sm:inline">{i < step ? '✓ ' : ''}{s}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="h-1 bg-slate-200">
            <div className="h-1 bg-cyan-500 transition-all duration-300" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>

          <div className="p-5">

            {/* ── PANTALLA 0: Preparación ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Pantalla 1 — Checklist de preparación obligatorio antes de añadir ningún producto.
                </div>

                {/* Datos básicos */}
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
                  </div>
                  <div>
                    <Label>Nombre circuito / instalación</Label>
                    <Input value={form.nombre_circuito} onChange={e => f('nombre_circuito', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label>Estado de conservación</Label>
                    <select value={form.estado_conservacion} onChange={e => f('estado_conservacion', e.target.value)}
                      className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                      {Object.entries(ESTADO_CONSERVACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Hora inicio actuación</Label>
                    <Input type="time" value={form.hora_inicio} onChange={e => f('hora_inicio', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Checkboxes EPIs */}
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-2">Verificaciones obligatorias (los 3 son requeridos)</p>
                <div className="space-y-2">
                  <CheckItem checked={form.check_epi} onChange={v => f('check_epi', v)} required>
                    Uso de EPIs verificado: <strong>Mascarilla FFP3, gafas de protección y guantes resistentes a productos químicos</strong>
                  </CheckItem>
                  <CheckItem checked={form.check_limpieza_mecanica} onChange={v => f('check_limpieza_mecanica', v)} required>
                    Limpieza mecánica realizada con <strong>cepillo suave o manguera</strong> (⛔ PROHIBIDO pistola a presión directa sobre el panel: desgarra el papel)
                  </CheckItem>
                  <CheckItem checked={form.check_llenado_limpio} onChange={v => f('check_llenado_limpio', v)} required>
                    Vaciado de agua sucia y <strong>llenado inicial con agua limpia de red</strong> realizado
                  </CheckItem>
                </div>

                {/* pH inicial */}
                <div>
                  <Label>pH del agua medido (antes de añadir cloro) *</Label>
                  <Input type="number" step="0.1" value={form.ph_inicial} onChange={e => f('ph_inicial', e.target.value)}
                    className={`h-8 text-sm w-32 ${phAlerta ? 'border-amber-400' : ''}`} placeholder="7.2 – 7.8" />
                  {phAlerta && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span><strong>Atención:</strong> El pH está fuera de rango operativo (7,2–7,8). Corrija con producto químico antes de añadir el cloro. Esta alerta quedará registrada en el histórico.</span>
                    </div>
                  )}
                  {form.ph_inicial !== '' && !phAlerta && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ pH en rango correcto</p>
                  )}
                </div>

                {/* Más mediciones iniciales */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cloro libre inicial (ppm)</Label>
                    <Input type="number" step="0.1" value={form.cloro_libre_inicial} onChange={e => f('cloro_libre_inicial', e.target.value)} className="h-8 text-sm" placeholder="0–0.5" />
                  </div>
                  <div>
                    <Label>Temperatura inicial (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperatura_inicial} onChange={e => f('temperatura_inicial', e.target.value)} className="h-8 text-sm" />
                    {form.temperatura_inicial !== '' && Number(form.temperatura_inicial) > 20 && (
                      <p className="text-xs text-red-600 mt-0.5">⚠ &gt;20°C: riesgo Legionella</p>
                    )}
                  </div>
                </div>

                {!paso0Valido && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Para continuar: marca los 3 checkboxes obligatorios y registra un pH entre 7,2 y 7,8.
                  </p>
                )}
              </div>
            )}

            {/* ── PANTALLA 1: Dosificación y temporizador ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Pantalla 2 — Selecciona el protocolo, añade el cloro e inicia el temporizador.
                </div>

                {/* Selector protocolo */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Selección de protocolo (obligatorio)</p>
                  {PROTOCOLOS.map(p => (
                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.protocolo_id === p.id ? p.bgClass : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="protocolo" value={p.id} checked={form.protocolo_id === p.id}
                        onChange={() => { f('protocolo_id', p.id); f('ppm_personalizada', ''); }} className="mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.sublabel} · Temporizador: {p.timerLabel}</p>
                        {balsaLitros && (
                          <p className="text-xs font-mono font-bold mt-1 text-slate-700">
                            → {+(balsaLitros * p.factor_hipoclorito).toFixed(1)} ml hipoclorito · {+(balsaLitros * p.factor_tiosulfato).toFixed(1)} g tiosulfato
                          </p>
                        )}
                        {p.alerta && form.protocolo_id === p.id && (
                          <p className="text-xs mt-1 text-amber-700 font-medium">{p.alerta}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* PPM personalizada */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">PPM personalizadas (opcional)</p>
                  <p className="text-xs text-slate-400 mb-2">Si el fabricante u otro criterio técnico indica una concentración distinta, introdúcela aquí. Anula la PPM del protocolo para el cálculo.</p>
                  <div className="flex items-center gap-2">
                    <Input type="number" step="0.5" min="0" value={form.ppm_personalizada}
                      onChange={e => f('ppm_personalizada', e.target.value)}
                      className="h-8 text-sm w-28" placeholder={`${protocolo.ppm} ppm`} />
                    <span className="text-sm text-slate-500">ppm</span>
                    {ppmPersonalizada && (
                      <button className="text-xs text-red-500 underline" onClick={() => f('ppm_personalizada', '')}>✕ Usar protocolo</button>
                    )}
                  </div>
                  {ppmPersonalizada && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">⚠ Usando {ppmPersonalizada} ppm (personalizado) en lugar de {protocolo.ppm} ppm del protocolo</p>
                  )}
                </div>

                {/* Resultado cálculo */}
                {balsaLitros && (
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                    <p className="text-xs text-slate-500 mb-2 font-medium">
                      🧪 Objetivo: <strong>{ppmEfectivas} ppm</strong>{ppmPersonalizada ? ' (personalizado)' : ` — Opción ${protocolo.id}`}
                      {cloroActual > 0 && ` · Cloro actual en balsa: ${cloroActual} ppm`}
                    </p>
                    {cloroActual > 0 && ppmFaltantes > 0 ? (
                      <>
                        <p className="text-xs text-slate-500 mb-1">Dosis a incorporar (ajustada descontando cloro existente):</p>
                        <p className="text-3xl font-bold text-emerald-700">{mlAjustados} ml</p>
                        <p className="text-sm text-slate-600">de <strong>Hipoclorito Sódico al 15%</strong></p>
                        <p className="text-xs text-slate-400 mt-1">
                          ({ppmEfectivas} - {cloroActual}) ppm × {balsaLitros} L × {mlPerPpmPerLiter.toFixed(5)} ml/ppm/L = {mlAjustados} ml
                        </p>
                        <p className="text-xs text-blue-500 mt-1 border-t border-emerald-200 pt-1">
                          Desde 0 ppm serían: {mlHipoclorito} ml totales
                        </p>
                      </>
                    ) : cloroActual > 0 && ppmFaltantes === 0 ? (
                      <>
                        <p className="text-xs text-emerald-700 font-medium mb-1">✓ El cloro actual ya alcanza el objetivo</p>
                        <p className="text-xs text-slate-500">No es necesario añadir hipoclorito. Cloro actual: {cloroActual} ppm ≥ {ppmEfectivas} ppm</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 mb-1">Dosis a incorporar (desde 0 ppm):</p>
                        <p className="text-3xl font-bold text-emerald-700">{mlHipoclorito} ml</p>
                        <p className="text-sm text-slate-600">de <strong>Hipoclorito Sódico al 15%</strong></p>
                        <p className="text-xs text-slate-400 mt-1">{ppmEfectivas} ppm × {balsaLitros} L × {mlPerPpmPerLiter.toFixed(5)} ml/ppm/L = {mlHipoclorito} ml</p>
                      </>
                    )}
                  </div>
                )}
                {!balsaLitros && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    ⚠ Define el volumen de la balsa en la ficha del equipo para activar el cálculo automático.
                  </div>
                )}

                {/* Confirmación bombas */}
                <CheckItem checked={form.check_bombas_on_ventiladores_off} onChange={v => f('check_bombas_on_ventiladores_off', v)} required>
                  Bombas de agua <strong>ENCENDIDAS</strong> y ventiladores <strong className="text-red-600">APAGADOS</strong>
                </CheckItem>

                {/* Hora inicio desinfección */}
                <div>
                  <Label>Hora inicio desinfección</Label>
                  <Input type="time" value={form.hora_inicio_desinfeccion} onChange={e => f('hora_inicio_desinfeccion', e.target.value)} className="h-8 text-sm w-36" />
                </div>

                {/* Hipoclorito real */}
                <div>
                  <Label>Hipoclorito sódico añadido realmente (ml)</Label>
                  <Input type="number" step="0.1" value={form.hipoclorito_ml} onChange={e => f('hipoclorito_ml', e.target.value)}
                    className="h-8 text-sm w-36" placeholder={mlHipoclorito || ''} />
                </div>

                {/* Temporizador — opcional */}
                <div>
                  <button onClick={() => setTimerVisible(v => !v)}
                    className="text-xs text-blue-600 underline flex items-center gap-1 mb-2">
                    <Timer className="h-3.5 w-3.5" />
                    {timerVisible ? 'Ocultar temporizador de ayuda' : 'Mostrar temporizador de ayuda (opcional)'}
                  </button>
                  {timerVisible && (
                    <Temporizador key={`timer-${form.protocolo_id}`} minutos={protocolo.tiempo_min} onComplete={() => setTimerCompleto(true)} />
                  )}
                </div>

                {/* Observaciones del técnico */}
                <div>
                  <Label>Observaciones del técnico</Label>
                  <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
                    className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2}
                    placeholder="Incidencias, anomalías o información adicional relevante..." />
                </div>

                {/* Control cloro intermedio */}
                <div>
                  <Label>Cloro libre mínimo medido durante el proceso (ppm)</Label>
                  <Input type="number" step="0.1" value={form.cloro_durante_desinfeccion} onChange={e => f('cloro_durante_desinfeccion', e.target.value)} className="h-8 text-sm w-36" />
                  <p className="text-xs text-slate-400 mt-0.5">Verifica cada 30 min que el nivel se mantiene estable.</p>
                </div>

                {!paso1Valido && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Para continuar: confirma que las bombas están ON / ventiladores OFF y espera a que el temporizador llegue a 0.
                  </p>
                )}
              </div>
            )}

            {/* ── PANTALLA 2: Neutralización ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Pantalla 3 — Neutralización obligatoria antes del vertido ecológico.
                </div>

                <CheckItem checked={form.check_neutralizado_ok} onChange={v => f('check_neutralizado_ok', v)} required>
                  Bombas de recirculación <strong>APAGADAS</strong>
                </CheckItem>

                {/* Cálculo de neutralización basado en PPM reales medidas */}
                <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200 space-y-3">
                  <p className="text-xs font-semibold text-blue-800">📐 Cálculo de tiosulfato a añadir</p>
                  <p className="text-xs text-slate-500">Introduce el cloro medido actualmente en la balsa y el nivel objetivo para calcular la dosis exacta.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cloro actual medido en balsa (ppm) *</Label>
                      <Input type="number" step="0.1" min="0" value={form.cloro_a_neutralizar}
                        onChange={e => f('cloro_a_neutralizar', e.target.value)} className="h-8 text-sm" placeholder="ej: 18" />
                      <p className="text-xs text-slate-400 mt-0.5">Mide con el medidor de campo ahora</p>
                    </div>
                    <div>
                      <Label>Cloro objetivo al dejar en servicio (ppm) *</Label>
                      <Input type="number" step="0.01" min="0" max="0.99" value={form.cloro_objetivo}
                        onChange={e => f('cloro_objetivo', e.target.value)}
                        className={`h-8 text-sm ${cloroObjetivoNum !== null && cloroObjetivoNum >= 1 ? 'border-red-400' : ''}`}
                        placeholder="ej: 0.2" />
                      {cloroObjetivoNum !== null && cloroObjetivoNum >= 1 && (
                        <p className="text-xs text-red-600 mt-0.5">⛔ Máximo legal &lt; 1 ppm</p>
                      )}
                    </div>
                  </div>
                  {/* Resultado cálculo: g = (ppm_actual - ppm_objetivo) * litros * 0.00705 */}
                  {(() => {
                    const cActual = form.cloro_a_neutralizar !== '' ? Number(form.cloro_a_neutralizar) : null;
                    const cObj = form.cloro_objetivo !== '' ? Number(form.cloro_objetivo) : null;
                    if (cActual !== null && cObj !== null && balsaLitros && cActual > cObj && cObj >= 0 && cObj < 1) {
                      const ppmANeutralizar = cActual - cObj;
                      const gCalculados = +(ppmANeutralizar * balsaLitros * 0.00705).toFixed(1);
                      return (
                        <div className="p-3 rounded-lg bg-white border border-blue-300 text-center">
                          <p className="text-xs text-slate-500 mb-1">Dosis calculada a incorporar:</p>
                          <p className="text-3xl font-bold text-blue-700">{gCalculados} g</p>
                          <p className="text-sm text-slate-600">de <strong>Tiosulfato Sódico Pentahidratado</strong></p>
                          <p className="text-xs text-slate-400 mt-1">
                            ({cActual} - {cObj}) ppm × {balsaLitros} L × 0,00705 = {gCalculados} g
                          </p>
                        </div>
                      );
                    }
                    if (cActual !== null && cObj !== null && cActual <= cObj) {
                      return <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">ℹ El cloro actual ya está por debajo del objetivo. Verifica las medidas.</p>;
                    }
                    if (!balsaLitros) return <p className="text-xs text-amber-700">⚠ Define el volumen de la balsa en el equipo para activar el cálculo.</p>;
                    return <p className="text-xs text-slate-400">Introduce el cloro actual y el nivel objetivo para calcular automáticamente.</p>;
                  })()}
                </div>

                {/* Tiosulfato realmente añadido */}
                <div>
                  <Label>Tiosulfato sódico añadido realmente (g)</Label>
                  <Input type="number" step="0.1" value={form.metabisulfito_g} onChange={e => f('metabisulfito_g', e.target.value)}
                    className="h-8 text-sm w-36" placeholder={gTiosulfato ? `calc: ${gTiosulfato}` : 'g'} />
                  <p className="text-xs text-slate-400 mt-0.5">Registra la cantidad que has añadido realmente.</p>
                </div>

                {/* Cloro medido post-neutralización */}
                <div>
                  <Label>Cloro libre medido post-neutralización (ppm) * — debe ser &lt; 1 ppm</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" step="0.01" value={form.cloro_libre_final} onChange={e => f('cloro_libre_final', e.target.value)}
                      className={`h-8 text-sm w-28 ${cloroFinalNum !== null && cloroFinalNum >= 1 ? 'border-red-400' : ''}`} placeholder="0.0 – 0.99" />
                    <span className="text-sm text-slate-500">ppm</span>
                  </div>
                  {cloroFinalNum !== null && cloroFinalNum >= 1 && (
                    <p className="text-xs text-red-600 font-medium mt-0.5">⛔ Supera 1 ppm. Añade más neutralizante y vuelve a medir.</p>
                  )}
                  {cloroFinalValido && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ Correcto — {cloroFinalNum} ppm registrado</p>
                  )}
                </div>

                <div>
                  <Label>Hora fin desinfección</Label>
                  <Input type="time" value={form.hora_fin_desinfeccion} onChange={e => f('hora_fin_desinfeccion', e.target.value)} className="h-8 text-sm w-36" />
                </div>

                {!paso2Valido && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Para continuar: bombas apagadas, nivel objetivo y cloro final medido (ambos &lt; 1 ppm).
                  </p>
                )}
              </div>
            )}

            {/* ── PANTALLA 3: Cierre técnico ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Pantalla 4 — Mediciones finales, buenas prácticas y firma del parte.
                </div>

                {/* Mediciones finales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>pH final agua de servicio</Label>
                    <Input type="number" step="0.1" value={form.ph_final} onChange={e => f('ph_final', e.target.value)} className="h-8 text-sm" placeholder="7.2–7.8" />
                    {form.ph_final !== '' && (Number(form.ph_final) < 7.2 || Number(form.ph_final) > 7.8) && (
                      <p className="text-xs text-red-600 mt-0.5">⚠ Fuera de rango</p>
                    )}
                  </div>
                  <div>
                    <Label>Temperatura final (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperatura_final} onChange={e => f('temperatura_final', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label>Hora fin actuación total</Label>
                    <Input type="time" value={form.hora_fin} onChange={e => f('hora_fin', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Buenas prácticas fabricante */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    ✅ Buenas prácticas del fabricante (recordatorios informativos)
                  </div>
                  <div className="p-3 space-y-2">
                    <CheckItem checked={form.bp_cepillo_suave} onChange={v => f('bp_cepillo_suave', v)}>
                      <strong>Limpieza física:</strong> Se ha usado cepillo suave o manguera. ⛔ PROHIBIDO pistola a presión directa sobre el panel (desgarra el papel celulósico).
                    </CheckItem>
                    <CheckItem checked={form.bp_secado_diario} onChange={v => f('bp_secado_diario', v)}>
                      <strong>Secado diario:</strong> Programada parada de bomba de agua 1 hora antes que los ventiladores para evitar biofilm de forma ecológica.
                    </CheckItem>
                    <CheckItem checked={form.bp_purga_sales} onChange={v => f('bp_purga_sales', v)}>
                      <strong>Purga de sales:</strong> Verificada purga semanal automática o manual de la balsa para prevenir la calcificación de los paneles.
                    </CheckItem>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <Label>Observaciones / Partes tratadas / Medidas correctoras</Label>
                  <textarea value={form.observaciones} onChange={e => f('observaciones', e.target.value)}
                    className="w-full text-sm border border-input rounded-md px-2 py-1 bg-background resize-none" rows={2}
                    placeholder="Anomalías, incidencias, acciones pendientes..." />
                </div>

                {/* Técnicos */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">👤 Responsable técnico</div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Nombre completo *</Label><Input value={form.responsable_tecnico_nombre} onChange={e => f('responsable_tecnico_nombre', e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label>D.N.I.</Label><Input value={form.responsable_tecnico_dni} onChange={e => f('responsable_tecnico_dni', e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label>Empresa</Label><Input value={form.responsable_tecnico_empresa} onChange={e => f('responsable_tecnico_empresa', e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label>Curso Legionella (lugar/fecha)</Label><Input value={form.responsable_tecnico_curso} onChange={e => f('responsable_tecnico_curso', e.target.value)} className="h-8 text-sm" /></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">🔧 Aplicador del tratamiento</div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Nombre</Label><Input value={form.aplicador_nombre} onChange={e => f('aplicador_nombre', e.target.value)} className="h-8 text-sm" placeholder="O 'Ídem responsable'" /></div>
                    <div><Label>D.N.I.</Label><Input value={form.aplicador_dni} onChange={e => f('aplicador_dni', e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label>Empresa</Label><Input value={form.aplicador_empresa} onChange={e => f('aplicador_empresa', e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label>Curso</Label><Input value={form.aplicador_curso} onChange={e => f('aplicador_curso', e.target.value)} className="h-8 text-sm" /></div>
                  </div>
                </div>

                {/* Aviso laboratorio */}
                <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-300 text-xs text-yellow-800">
                  <p className="font-bold mb-1">📅 Aviso legal automático — 15 días tras este registro</p>
                  <p>El sistema generará un recordatorio: «Apertura de ventana para recogida de muestras de agua por laboratorio acreditado ISO 17025 (Plazo: 15 a 30 días post-arranque)».</p>
                </div>
              </div>
            )}

          </div>

          {/* Navegación */}
          <div className="px-5 pb-4 flex items-center justify-between gap-2 border-t pt-3">
            <Button size="sm" variant="outline"
              onClick={() => step > 0 ? setStep(s => s - 1) : (setShowForm(false), setEditingId(null))}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            <span className="text-xs text-slate-400">Paso {step + 1} de 4</span>
            {step < 3 ? (
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"
                disabled={(step === 0 && !paso0Valido) || (step === 1 && !paso1Valido) || (step === 2 && !paso2Valido)}
                onClick={() => setStep(s => s + 1)}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm"
                disabled={saveMutation.isPending || !form.responsable_tecnico_nombre || !form.fecha}
                onClick={() => saveMutation.mutate(form)}
                className="bg-emerald-600 hover:bg-emerald-700">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
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
              <Droplets className="h-8 w-8 mx-auto mb-2 opacity-30" />No hay registros L+D. Añade el primero.
            </div>
          ) : (
            <div className="space-y-3">
              {registrosOrdenados.map(r => {
                const expanded = expandedId === r.id;
                const prot = PROTOCOLOS.find(p => p.id === r.protocolo_id) || PROTOCOLOS[0];
                return (
                  <Card key={r.id} className="border border-slate-200 overflow-hidden">
                    <div className="p-4 cursor-pointer flex items-start justify-between gap-3" onClick={() => setExpandedId(expanded ? null : r.id)}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                          <Droplets className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">{format(new Date(r.fecha), 'dd/MM/yyyy')}</span>
                            <Badge variant="outline" className="text-xs">{TIPO_LABELS[r.tipo_tratamiento]}</Badge>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prot.badgeClass}`}>{prot.ppm} ppm — Op. {prot.id}</span>
                            {r.cloro_libre_final === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">✓ Neutro OK</span>}
                            {r.proxima_revision_fecha && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />Próx: {format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {r.responsable_tecnico_nombre || r.tecnico_nombre || '—'}
                            {r.hipoclorito_ml != null && ` · ${r.hipoclorito_ml} ml cloro`}
                            {r.metabisulfito_g != null && ` · ${r.metabisulfito_g} g tiosulfato`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={e => { e.stopPropagation(); generatePDF(r); }} disabled={generatingPdf === r.id}>
                          {generatingPdf === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-blue-500" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicar registro" onClick={e => { e.stopPropagation(); handleDuplicate(r); }}>
                          <Copy className="h-3.5 w-3.5 text-cyan-500" />
                        </Button>
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {r.ph_inicial != null && <div><p className="text-slate-400">pH inicial</p><p className={`font-medium ${r.ph_inicial >= 7.2 && r.ph_inicial <= 7.8 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_inicial}</p></div>}
                          {r.temperatura_inicial != null && <div><p className="text-slate-400">Tª inicial</p><p className={`font-medium ${r.temperatura_inicial > 20 ? 'text-red-600' : 'text-slate-700'}`}>{r.temperatura_inicial}°C</p></div>}
                          {r.hipoclorito_ml != null && <div><p className="text-slate-400">Hipoclorito añadido</p><p className="font-medium text-slate-700">{r.hipoclorito_ml} ml</p></div>}
                          {r.metabisulfito_g != null && <div><p className="text-slate-400">Tiosulfato añadido</p><p className="font-medium text-slate-700">{r.metabisulfito_g} g</p></div>}
                          {r.cloro_durante_desinfeccion != null && <div><p className="text-slate-400">Cl proceso (mín.)</p><p className="font-medium text-slate-700">{r.cloro_durante_desinfeccion} ppm</p></div>}
                          {r.ph_final != null && <div><p className="text-slate-400">pH final</p><p className={`font-medium ${r.ph_final >= 7.2 && r.ph_final <= 7.8 ? 'text-emerald-700' : 'text-red-600'}`}>{r.ph_final}</p></div>}
                          {r.cloro_libre_final != null && <div><p className="text-slate-400">Cl post-neutr.</p><p className={`font-medium ${r.cloro_libre_final === 0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.cloro_libre_final} ppm</p></div>}
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