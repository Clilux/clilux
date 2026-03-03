import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Download, Loader2, Save, Plus, Trash2, Upload, FileText, Building, Settings, Wind, Calculator, Paperclip, X, ChevronRight } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// IDA según RITE IT 1.1.4.2.3 — Tabla 1.4.2.1
// Caudales en l/s por persona (Método A) y en l/s·m² (Método B)
// RD 1027/2007 modificado por RD 178/2021
const idaCategorias = [
  {
    value: 'IDA1', label: 'IDA 1 — Aire de óptima calidad',
    descripcion: 'Hospitales, clínicas, laboratorios, guarderías, salas de neonatos',
    caudal_lsp_persona: 20,     // l/s·persona (Método A) — RITE Tabla 1.4.2.1
    caudal_lsm2: 0.83,          // l/s·m² (Método B)
    filtro_impulsion: 'ISO_ePM1_55',
    filtro_retorno: 'ISO_ePM10_50',
    nota_filtro: 'RITE IT 1.1.4.2.6 — Mínimo ISO ePM1 ≥55% en impulsión para IDA1',
  },
  {
    value: 'IDA2', label: 'IDA 2 — Aire de buena calidad',
    descripcion: 'Oficinas, residencias, salas de lectura, museos, juzgados, aulas',
    caudal_lsp_persona: 12.5,
    caudal_lsm2: 0.56,
    filtro_impulsion: 'ISO_ePM1_55',
    filtro_retorno: 'ISO_ePM10_50',
    nota_filtro: 'RITE IT 1.1.4.2.6 — Mínimo ISO ePM1 ≥55% en impulsión para IDA2',
  },
  {
    value: 'IDA3', label: 'IDA 3 — Aire de calidad media',
    descripcion: 'Edificios comerciales, cines, teatros, salones de actos, hoteles',
    caudal_lsp_persona: 8,
    caudal_lsm2: 0.28,
    filtro_impulsion: 'ISO_ePM10_50',
    filtro_retorno: 'ISO_coarse_60',
    nota_filtro: 'RITE IT 1.1.4.2.6 — Mínimo ISO ePM10 ≥50% en impulsión para IDA3',
  },
  {
    value: 'IDA4', label: 'IDA 4 — Aire de calidad baja',
    descripcion: 'Solo admisible en usos industriales o espacios especiales justificados',
    caudal_lsp_persona: 5,
    caudal_lsm2: 0.17,
    filtro_impulsion: 'ISO_coarse_60',
    filtro_retorno: 'ISO_coarse_60',
    nota_filtro: 'RITE IT 1.1.4.2.6 — Mínimo ISO Coarse ≥60% en impulsión para IDA4',
  },
];

const metodosVentilacion = [
  {
    value: 'metodo_a', label: 'Método A — Caudal por persona',
    descripcion: 'Q = n_personas × q_p (l/s·persona). El más habitual en locales ocupados. Tabla 1.4.2.1 RITE.',
    formula: 'Q [m³/h] = Nº personas × caudal IDA [l/s/persona] × 3,6',
  },
  {
    value: 'metodo_b', label: 'Método B — Caudal por superficie',
    descripcion: 'Q = Superficie × q_A (l/s·m²). Para locales con ocupación variable o desconocida. Tabla 1.4.2.2 RITE.',
    formula: 'Q [m³/h] = Superficie [m²] × caudal IDA [l/s·m²] × 3,6',
  },
  {
    value: 'metodo_c', label: 'Método C — Renovaciones por hora',
    descripcion: 'Q = Volumen × n_ren/h. Apto para zonas sin ocupación permanente (aparcamientos, almacenes, aseos). Tabla 1.4.2.3 RITE.',
    formula: 'Q [m³/h] = Volumen [m³] × Renovaciones/hora',
  },
  {
    value: 'metodo_indirecto', label: 'Indirecto — Control por sonda CO₂ (VCD)',
    descripcion: 'Ventilación de Caudal Variable según Demanda. El caudal se ajusta automáticamente según la concentración de CO₂ medida. Recomendado para IDA2 con ocupación variable.',
    formula: 'Caudal variable: mínimo cuando CO₂ < umbral, máximo cuando CO₂ > 1000 ppm',
  },
];

// Filtros según RITE IT 1.1.4.2.6 — RD 178/2021 adopta ISO 16890 (sustituye EN 779)
const tiposFiltro = [
  { value: 'ISO_ePM1_55',   label: 'ISO ePM1 ≥55% (equiv. F7)',   descripcion: 'Partículas ≤1 µm. Obligatorio IDA1 e IDA2. Reemplaza F7 (ISO 16890)' },
  { value: 'ISO_ePM1_80',   label: 'ISO ePM1 ≥80% (equiv. F8)',   descripcion: 'Alta eficiencia partículas finas. Hospitales, zonas críticas' },
  { value: 'ISO_ePM2_5_65', label: 'ISO ePM2,5 ≥65% (equiv. F8)', descripcion: 'Partículas ≤2,5 µm. Buena protección polvo fino' },
  { value: 'ISO_ePM10_50',  label: 'ISO ePM10 ≥50% (equiv. F5/F6)', descripcion: 'Partículas ≤10 µm. Mínimo IDA3 en impulsión, retorno IDA1/IDA2' },
  { value: 'ISO_coarse_60', label: 'ISO Coarse ≥60% (equiv. G4)',  descripcion: 'Prefiltro partículas gruesas. Retorno IDA3/IDA4, primera etapa' },
  { value: 'ISO_coarse_80', label: 'ISO Coarse ≥80% (equiv. G4+)', descripcion: 'Prefiltro alta retención. Primera etapa en instalaciones con alta carga de polvo' },
  { value: 'HEPA_H13',      label: 'HEPA H13',                     descripcion: 'Retención >99,95% partículas ≥0,3 µm. Hospitales, salas limpias' },
];

const actividadOcupacion = [
  { value: 'oficina', label: 'Oficina / Despacho', m2_persona: 10, carga_interna_w: 8 },
  { value: 'comercio', label: 'Comercio / Tienda', m2_persona: 3, carga_interna_w: 15 },
  { value: 'restaurante', label: 'Restaurante / Cafetería', m2_persona: 2, carga_interna_w: 20 },
  { value: 'aula', label: 'Aula / Centro educativo', m2_persona: 2.5, carga_interna_w: 6 },
  { value: 'hotel', label: 'Hotel / Residencia', m2_persona: 15, carga_interna_w: 5 },
  { value: 'hospital', label: 'Hospital / Clínica', m2_persona: 8, carga_interna_w: 12 },
  { value: 'industria', label: 'Industrial / Almacén', m2_persona: 30, carga_interna_w: 25 },
  { value: 'vivienda', label: 'Vivienda', m2_persona: 20, carga_interna_w: 4 },
  { value: 'otros', label: 'Otros (definir manualmente)', m2_persona: 10, carga_interna_w: 8 },
];

const getFiltrosAuto = (ida) => {
  const cat = idaCategorias.find(c => c.value === ida);
  return { impulsion: cat?.filtro_impulsion || 'ISO_ePM10_50', retorno: cat?.filtro_retorno || 'ISO_coarse_60' };
};

const emptyZona = () => {
  const filtros = getFiltrosAuto('IDA2');
  return {
    id: Date.now(),
    nombre: '',
    actividad: '',
    superficie: '',
    altura: '',
    ocupacion: '',
    ida: 'IDA2',
    metodo_ventilacion: 'metodo_a',
    caudal_impulsion: '',
    caudal_retorno: '',
    renovaciones_hora: '',
    concentracion_co2_max: '1000',
    usa_sonda_co2: false,
    necesita_recuperador: false,
    tipo_filtro_impulsion: filtros.impulsion,
    tipo_filtro_retorno: filtros.retorno,
    filtros_manual: false, // false = auto según IDA
    observaciones: '',
  };
};

const emptyEquipo = () => ({
  id: Date.now(),
  referencia: '',
  tipo: '',
  marca: '',
  modelo: '',
  pot_frio: '',
  pot_calor: '',
  cop: '',
  eer: '',
  combustible: '',
  refrigerante: '',
  ubicacion: '',
  energia_renovable: '',
});

export default function MemoriaTecnicaRITE() {
  const [generating, setGenerating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingPdfBlob, setPendingPdfBlob] = useState(null);
  const [pendingFilename, setPendingFilename] = useState('');
  const [activeTab, setActiveTab] = useState('datos');
  const [uploadingSection, setUploadingSection] = useState(null);

  const [form, setForm] = useState({
    // Datos generales
    num_expediente: '',
    num_proyecto: '',
    fecha: new Date().toISOString().split('T')[0],
    // Titular
    titular_nombre: '',
    titular_nif: '',
    titular_direccion: '',
    titular_cp: '',
    titular_localidad: '',
    titular_telefono: '',
    titular_email: '',
    // Instalación
    inst_nombre: '',
    inst_direccion: '',
    inst_cp: '',
    inst_localidad: '',
    inst_provincia: '',
    inst_uso: '',
    inst_actividad: '',
    inst_superficie: '',
    inst_año: '',
    // Técnico responsable
    tecnico_nombre: '',
    tecnico_titulacion: '',
    tecnico_colegio: '',
    tecnico_num_colegiado: '',
    empresa_nombre: '',
    empresa_ri: '',
    empresa_cif: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    // Justificación
    justificacion_bienestar: '',
    justificacion_higiene: '',
    justificacion_seguridad: '',
    justificacion_eficiencia: '',
    normativa_aplicada: 'RITE (RD 1027/2007 y modificaciones), CTE DB HE, CTE DB HS3',
    // Equipos generadores
    equipos: [emptyEquipo()],
    // Distribución
    dist_tuberias: '',
    dist_diametros: '',
    dist_aislamiento: '',
    dist_bombas: '',
    dist_fluido: '',
    dist_presion: '',
    // Unidades terminales
    terminales_tipo: '',
    terminales_descripcion: '',
    // Zonas de ventilación
    zonas: [emptyZona()],
    // Cargas térmicas
    carga_total_frio: '',
    carga_total_calor: '',
    carga_descripcion: '',
    // Eficiencia energética
    eficiencia_descripcion: '',
    cop_sistema: '',
    eer_sistema: '',
    clase_energetica: '',
    // Puesta en marcha
    puesta_presion_trabajo: '',
    puesta_presion_prueba: '',
    puesta_caudal_total: '',
    puesta_nivel_ruido: '',
    puesta_fecha: '',
    puesta_observaciones: '',
    // Documentos adjuntos por sección
    adjuntos: {
      datos_generales: [],
      descripcion_tecnica: [],
      calculos: [],
      planos: [],
      complementaria: [],
    },
    observaciones_generales: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings-mem', selectedClientId],
    queryFn: () => base44.entities.Building.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId,
  });
  const { data: buildingEquipment = [] } = useQuery({
    queryKey: ['equipment-mem', selectedBuildingId],
    queryFn: () => base44.entities.Equipment.filter({ building_id: selectedBuildingId }),
    enabled: !!selectedBuildingId,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    },
  });

  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId);
    setSelectedBuildingId('');
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        titular_nombre: client.name || '',
        titular_nif: client.cif || '',
        titular_direccion: client.address || '',
        titular_cp: client.postal_code || '',
        titular_localidad: client.city || '',
        titular_telefono: client.phone || '',
        titular_email: client.email || '',
      }));
    }
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuildingId(buildingId);
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
      setForm(prev => ({
        ...prev,
        inst_nombre: building.name || '',
        inst_direccion: building.address || '',
        inst_cp: building.postal_code || '',
        inst_localidad: building.city || '',
        inst_provincia: building.province || '',
        inst_superficie: building.surface_m2 ? String(building.surface_m2) : prev.inst_superficie,
      }));
    }
  };

  React.useEffect(() => {
    if (!settings) return;
    setForm(prev => ({
      ...prev,
      empresa_nombre: prev.empresa_nombre || settings.company_name || '',
      empresa_cif: prev.empresa_cif || settings.company_cif || '',
      empresa_direccion: prev.empresa_direccion || settings.company_address || '',
      empresa_telefono: prev.empresa_telefono || settings.company_phone || '',
      empresa_email: prev.empresa_email || settings.company_email || '',
    }));
  }, [settings]);

  React.useEffect(() => {
    if (buildingEquipment.length === 0) return;
    const eqs = buildingEquipment.map(eq => ({
      id: eq.id,
      referencia: eq.reference_name || '',
      tipo: eq.equipment_type || '',
      marca: eq.brand || '',
      modelo: eq.model || '',
      pot_frio: eq.cooling_power_kw ? String(eq.cooling_power_kw) : '',
      pot_calor: eq.heating_power_kw ? String(eq.heating_power_kw) : '',
      cop: '', eer: '',
      combustible: '',
      refrigerante: eq.refrigerant_type || '',
      ubicacion: eq.location || '',
      energia_renovable: '',
    }));
    setForm(prev => ({ ...prev, equipos: eqs.length ? eqs : prev.equipos }));
  }, [buildingEquipment]);

  const hC = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  // Equipos
  const addEquipo = () => setForm(prev => ({ ...prev, equipos: [...prev.equipos, emptyEquipo()] }));
  const updEquipo = (i, f, v) => setForm(prev => { const e = [...prev.equipos]; e[i] = { ...e[i], [f]: v }; return { ...prev, equipos: e }; });
  const delEquipo = (i) => setForm(prev => ({ ...prev, equipos: prev.equipos.filter((_, idx) => idx !== i) }));

  // Zonas
  const addZona = () => setForm(prev => ({ ...prev, zonas: [...prev.zonas, emptyZona()] }));
  const updZona = (i, f, v) => setForm(prev => { const z = [...prev.zonas]; z[i] = { ...z[i], [f]: v }; return { ...prev, zonas: z }; });
  const delZona = (i) => setForm(prev => ({ ...prev, zonas: prev.zonas.filter((_, idx) => idx !== i) }));

  // Auto-set filtros cuando cambia IDA (solo si no están en modo manual)
  const handleIdaChange = (i, newIda) => {
    const zona = form.zonas[i];
    const filtros = getFiltrosAuto(newIda);
    setForm(prev => {
      const z = [...prev.zonas];
      z[i] = {
        ...z[i],
        ida: newIda,
        ...((!zona.filtros_manual) ? { tipo_filtro_impulsion: filtros.impulsion, tipo_filtro_retorno: filtros.retorno } : {}),
      };
      return { ...prev, zonas: z };
    });
  };

  // Calcular caudal automático según zona — RITE IT 1.1.4.2
  const calcularCaudalDetalle = (zona) => {
    const ida = idaCategorias.find(c => c.value === zona.ida);
    if (!ida) return null;
    const ocupantes = zona.ocupacion ? parseInt(zona.ocupacion) : null;
    const superficie = zona.superficie ? parseFloat(zona.superficie) : null;
    const altura = zona.altura ? parseFloat(zona.altura) : null;

    if (zona.metodo_ventilacion === 'metodo_a' && ocupantes) {
      const caudal_m3h = Math.ceil(ocupantes * ida.caudal_lsp_persona * 3.6);
      return {
        valor: caudal_m3h + ' m³/h',
        formula: `${ocupantes} pers × ${ida.caudal_lsp_persona} l/s·pers × 3,6 = ${caudal_m3h} m³/h`,
        norma: 'RITE IT 1.1.4.2.3 Tabla 1.4.2.1 — Método A',
      };
    }
    if (zona.metodo_ventilacion === 'metodo_b' && superficie) {
      const caudal_m3h = Math.ceil(superficie * ida.caudal_lsm2 * 3.6);
      return {
        valor: caudal_m3h + ' m³/h',
        formula: `${superficie} m² × ${ida.caudal_lsm2} l/s·m² × 3,6 = ${caudal_m3h} m³/h`,
        norma: 'RITE IT 1.1.4.2.3 Tabla 1.4.2.2 — Método B',
      };
    }
    if (zona.metodo_ventilacion === 'metodo_c' && zona.renovaciones_hora && superficie && altura) {
      const vol = superficie * altura;
      const caudal_m3h = Math.ceil(vol * parseFloat(zona.renovaciones_hora));
      return {
        valor: caudal_m3h + ' m³/h',
        formula: `${superficie} m² × ${altura} m × ${zona.renovaciones_hora} ren/h = ${caudal_m3h} m³/h`,
        norma: 'RITE IT 1.1.4.2.3 Tabla 1.4.2.3 — Método C',
      };
    }
    if (zona.metodo_ventilacion === 'metodo_indirecto') {
      return { valor: 'Variable (VCD)', formula: 'Caudal variable según sonda CO₂', norma: 'RITE IT 1.1.4.2 — Ventilación por demanda' };
    }
    return null;
  };

  const calcularCaudal = (zona) => calcularCaudalDetalle(zona)?.valor || null;

  // Upload adjuntos
  const handleUploadAdjunto = async (seccion, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingSection(seccion);
    try {
      const uploads = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type };
      }));
      setForm(prev => ({
        ...prev,
        adjuntos: { ...prev.adjuntos, [seccion]: [...(prev.adjuntos[seccion] || []), ...uploads] }
      }));
      toast.success(`${uploads.length} archivo(s) subido(s)`);
    } catch {
      toast.error('Error al subir archivo');
    } finally {
      setUploadingSection(null);
    }
  };

  const delAdjunto = (seccion, idx) => {
    setForm(prev => ({
      ...prev,
      adjuntos: { ...prev.adjuntos, [seccion]: prev.adjuntos[seccion].filter((_, i) => i !== idx) }
    }));
  };

  // Sección de adjuntos reutilizable
  const AdjuntosSection = ({ seccion, label }) => (
    <div className="mt-4 border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />{label}
        </span>
        <label className="cursor-pointer">
          <input type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.docx" onChange={e => handleUploadAdjunto(seccion, e)} />
          <Button size="sm" variant="outline" className="text-xs pointer-events-none" asChild>
            <span>{uploadingSection === seccion ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Subiendo...</> : <><Upload className="h-3 w-3 mr-1" />Adjuntar</>}</span>
          </Button>
        </label>
      </div>
      {form.adjuntos[seccion]?.length > 0 && (
        <div className="space-y-1">
          {form.adjuntos[seccion].map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded border px-3 py-1.5 text-sm">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-xs">{f.name}</a>
              <button onClick={() => delAdjunto(seccion, i)} className="text-slate-400 hover:text-red-500 ml-2"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const loadImageAsBase64 = (url) => new Promise((resolve) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); resolve({ dataUrl: c.toDataURL('image/png'), w: img.width, h: img.height }); };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, margin = 12, cW = pageW - margin * 2;
      let y = margin, pageNum = 0;

      let logoData = null;
      if (settings?.logo_url) logoData = await loadImageAsBase64(settings.logo_url);
      const hexRgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
      const [cr, cg, cb] = hexRgb(settings?.button_color || '#1e3a5f');

      const newPage = () => {
        doc.addPage(); y = margin; pageNum++;
        doc.setFontSize(7); doc.setTextColor(150,150,150);
        doc.text(`Memoria Técnica RITE – ${form.inst_nombre || 'Instalación'} – Pág. ${pageNum}`, pageW/2, 292, { align: 'center' });
        doc.setTextColor(0,0,0);
      };
      const chk = (n=8) => { if (y+n > 282) newPage(); };

      const sec = (t) => { chk(10); doc.setFillColor(cr,cg,cb); doc.rect(margin,y,cW,7,'F'); doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255); doc.text(t, pageW/2, y+5, {align:'center'}); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); y+=8; };
      const sub = (t) => { chk(8); doc.setFillColor(Math.min(cr+60,255),Math.min(cg+60,255),Math.min(cb+60,255)); doc.rect(margin,y,cW,5.5,'F'); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255); doc.text(t, margin+2, y+4); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); y+=6.5; };
      const fila = (items) => { chk(6); let x=margin; items.forEach(item=>{ doc.setFontSize(7.5); doc.setFont('helvetica','bold'); const lbl=item.label+': '; doc.text(lbl,x+1,y+4); doc.setFont('helvetica','normal'); doc.text(String(item.value||''),x+1+doc.getTextWidth(lbl),y+4); doc.rect(x,y,item.w,6); x+=item.w; }); y+=6; };
      const txtArea = (label, text, h=20) => { chk(h+8); doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.text(label, margin, y+4); y+=5; const lines=doc.splitTextToSize(text||'',cW-4); const rH=Math.max(h,lines.length*4.5+4); doc.rect(margin,y,cW,rH); doc.setFont('helvetica','normal'); doc.text(lines,margin+2,y+4); y+=rH+3; };

      // ===== PORTADA =====
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,pageW,65,'F');
      if (logoData) { const lH=20; const lW=Math.min(lH*logoData.w/logoData.h,50); doc.addImage(logoData.dataUrl,'PNG',pageW/2-lW/2,8,lW,lH); }
      doc.setTextColor(255,255,255); doc.setFontSize(17); doc.setFont('helvetica','bold');
      doc.text('MEMORIA TÉCNICA DE INSTALACIÓN', pageW/2, 40, {align:'center'});
      doc.setFontSize(12); doc.text('REGLAMENTO DE INSTALACIONES TÉRMICAS (RITE)', pageW/2, 50, {align:'center'});
      doc.setFontSize(9); doc.text('Real Decreto 1027/2007 y modificaciones', pageW/2, 58, {align:'center'});
      doc.setTextColor(0,0,0); y=72;

      // Info portada
      doc.setDrawColor(cr,cg,cb); doc.setLineWidth(0.8);
      doc.rect(margin,y,cW,55);
      doc.setLineWidth(0.2); doc.setDrawColor(0,0,0);
      const portadaRows = [
        {label:'Instalación / Proyecto', value: form.inst_nombre},
        {label:'Dirección', value: `${form.inst_direccion}, ${form.inst_cp} ${form.inst_localidad}`},
        {label:'Titular', value: `${form.titular_nombre} – NIF: ${form.titular_nif}`},
        {label:'Empresa instaladora', value: form.empresa_nombre},
        {label:'Técnico responsable', value: form.tecnico_nombre},
        {label:'Núm. expediente', value: form.num_expediente},
        {label:'Fecha', value: form.fecha},
      ];
      doc.setFontSize(9);
      portadaRows.forEach((r,i) => {
        doc.setFont('helvetica','bold'); doc.text(r.label+':', margin+3, y+8+i*7.5);
        doc.setFont('helvetica','normal'); doc.text(String(r.value||''), margin+55, y+8+i*7.5);
      });
      y+=58;
      doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(100,100,100);
      doc.text('Documento redactado conforme al RITE (RD 1027/2007). Deberá presentarse ante el órgano competente de la CCAA.', pageW/2, y, {align:'center'});
      doc.setTextColor(0,0,0); y+=6;
      doc.setFontSize(7); doc.setTextColor(150,150,150); doc.text('Memoria Técnica RITE – Pág. 1', pageW/2, 292, {align:'center'}); doc.setTextColor(0,0,0);
      pageNum=1;

      // ===== SECCIÓN 1: DATOS GENERALES =====
      newPage();
      sec('1. DATOS GENERALES Y JUSTIFICACIÓN');
      sub('1.1 TITULAR DE LA INSTALACIÓN');
      fila([{label:'Nombre/Razón Social',value:form.titular_nombre,w:cW*0.65},{label:'NIF/CIF',value:form.titular_nif,w:cW*0.35}]);
      fila([{label:'Dirección',value:form.titular_direccion,w:cW*0.7},{label:'C.P.',value:form.titular_cp,w:cW*0.3}]);
      fila([{label:'Localidad',value:form.titular_localidad,w:cW*0.5},{label:'Teléfono',value:form.titular_telefono,w:cW*0.25},{label:'Email',value:form.titular_email,w:cW*0.25}]);

      sub('1.2 DATOS DE LA INSTALACIÓN');
      fila([{label:'Nombre/Emplazamiento',value:form.inst_nombre,w:cW}]);
      fila([{label:'Dirección',value:form.inst_direccion,w:cW*0.6},{label:'Localidad',value:form.inst_localidad,w:cW*0.4}]);
      fila([{label:'Uso del edificio',value:form.inst_uso,w:cW*0.5},{label:'Actividad',value:form.inst_actividad,w:cW*0.5}]);
      fila([{label:'Superficie total (m²)',value:form.inst_superficie,w:cW*0.4},{label:'Año construcción',value:form.inst_año,w:cW*0.3},{label:'Provincia',value:form.inst_provincia,w:cW*0.3}]);

      sub('1.3 TÉCNICO RESPONSABLE / EMPRESA AUTORIZADA');
      fila([{label:'Técnico',value:form.tecnico_nombre,w:cW*0.6},{label:'Titulación',value:form.tecnico_titulacion,w:cW*0.4}]);
      fila([{label:'Núm. Colegiado',value:form.tecnico_num_colegiado,w:cW*0.5},{label:'Colegio',value:form.tecnico_colegio,w:cW*0.5}]);
      fila([{label:'Empresa',value:form.empresa_nombre,w:cW*0.6},{label:'CIF',value:form.empresa_cif,w:cW*0.4}]);
      fila([{label:'Núm. R.I.',value:form.empresa_ri,w:cW*0.4},{label:'Teléfono',value:form.empresa_telefono,w:cW*0.3},{label:'Email',value:form.empresa_email,w:cW*0.3}]);

      sub('1.4 NORMATIVA APLICADA');
      chk(8); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      const normLines = doc.splitTextToSize(form.normativa_aplicada||'', cW-4);
      doc.rect(margin,y,cW,normLines.length*4.5+4); doc.text(normLines,margin+2,y+4); y+=normLines.length*4.5+7;

      sub('1.5 JUSTIFICACIÓN DE DISEÑO');
      if (form.justificacion_bienestar) txtArea('Bienestar e higrotérmico:', form.justificacion_bienestar);
      if (form.justificacion_higiene) txtArea('Calidad del aire interior (higiene):', form.justificacion_higiene);
      if (form.justificacion_seguridad) txtArea('Seguridad:', form.justificacion_seguridad);
      if (form.justificacion_eficiencia) txtArea('Eficiencia energética:', form.justificacion_eficiencia);

      // ===== SECCIÓN 2: DESCRIPCIÓN TÉCNICA =====
      newPage();
      sec('2. DESCRIPCIÓN TÉCNICA DE LA INSTALACIÓN');
      sub('2.1 EQUIPOS GENERADORES');

      const eqCols=[35,22,30,20,20,20,cW-147];
      const eqHeads=['Referencia','Tipo','Marca/Modelo','Frío (kW)','Calor (kW)','Refrig.','Ubicación'];
      chk(7); let ex=margin;
      eqHeads.forEach((h,i)=>{ doc.setFillColor(cr,cg,cb); doc.rect(ex,y,eqCols[i],6,'F'); doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255); doc.text(h,ex+1,y+4.5); ex+=eqCols[i]; });
      doc.setTextColor(0,0,0); y+=6;
      form.equipos.forEach((eq,i)=>{
        chk(6);
        if(i%2===1){doc.setFillColor(247,248,250); doc.rect(margin,y,cW,6,'F');}
        const vals=[eq.referencia,eq.tipo,`${eq.marca} ${eq.modelo}`.trim(),eq.pot_frio,eq.pot_calor,eq.refrigerante,eq.ubicacion];
        ex=margin;
        vals.forEach((v,j)=>{ doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(0,0,0); const t=doc.splitTextToSize(String(v||''),eqCols[j]-2); doc.text(t[0],ex+1,y+4); doc.rect(ex,y,eqCols[j],6); ex+=eqCols[j]; });
        y+=6;
      });

      sub('2.2 SISTEMAS DE DISTRIBUCIÓN');
      fila([{label:'Tuberías',value:form.dist_tuberias,w:cW*0.5},{label:'Diámetros principales',value:form.dist_diametros,w:cW*0.5}]);
      fila([{label:'Aislamiento',value:form.dist_aislamiento,w:cW*0.5},{label:'Fluido caloportador',value:form.dist_fluido,w:cW*0.5}]);
      fila([{label:'Bombas / circuladores',value:form.dist_bombas,w:cW*0.6},{label:'Presión de trabajo',value:form.dist_presion,w:cW*0.4}]);

      sub('2.3 UNIDADES TERMINALES');
      fila([{label:'Tipo',value:form.terminales_tipo,w:cW}]);
      if (form.terminales_descripcion) txtArea('Descripción:', form.terminales_descripcion, 15);

      // ===== SECCIÓN 3: VENTILACIÓN Y CALIDAD DE AIRE =====
      newPage();
      sec('3. VENTILACIÓN Y CALIDAD DEL AIRE INTERIOR (RITE IT 1.1.4)');

      form.zonas.forEach((zona, i) => {
        chk(50);
        sub(`ZONA ${i+1}: ${zona.nombre || 'Sin nombre'}`);
        const idaInfo = idaCategorias.find(c=>c.value===zona.ida);
        fila([{label:'Actividad',value:zona.actividad,w:cW*0.4},{label:'Categoría IDA',value:zona.ida,w:cW*0.3},{label:'Método ventilación',value:zona.metodo_ventilacion?.replace('metodo_','Método '),w:cW*0.3}]);
        fila([{label:'Superficie (m²)',value:zona.superficie,w:cW*0.25},{label:'Altura (m)',value:zona.altura,w:cW*0.25},{label:'Ocupación (personas)',value:zona.ocupacion,w:cW*0.25},{label:'Vol. (m³)',value:zona.superficie&&zona.altura?String((parseFloat(zona.superficie||0)*parseFloat(zona.altura||0)).toFixed(1)):'',w:cW*0.25}]);
        const caudalCalc = calcularCaudal(zona);
        fila([{label:'Caudal impulsión',value:zona.caudal_impulsion||caudalCalc||'',w:cW*0.4},{label:'Caudal retorno',value:zona.caudal_retorno,w:cW*0.3},{label:'Ren./hora',value:zona.renovaciones_hora,w:cW*0.3}]);
        fila([{label:'Filtro impulsión',value:zona.tipo_filtro_impulsion,w:cW*0.35},{label:'Filtro retorno',value:zona.tipo_filtro_retorno,w:cW*0.35},{label:'Recuperador de calor',value:zona.necesita_recuperador?'Sí':'No',w:cW*0.3}]);
        if (zona.usa_sonda_co2) {
          fila([{label:'Sonda CO₂',value:'SÍ — Control ventilación variable',w:cW*0.6},{label:'Concentración máx.',value:(zona.concentracion_co2_max||'1000')+' ppm',w:cW*0.4}]);
        }
        y+=2;
      });

      // ===== SECCIÓN 4: CARGAS TÉRMICAS =====
      newPage();
      sec('4. CÁLCULOS Y ESPECIFICACIONES');
      sub('4.1 CARGAS TÉRMICAS');
      fila([{label:'Carga total refrigeración (kW)',value:form.carga_total_frio,w:cW*0.5},{label:'Carga total calefacción (kW)',value:form.carga_total_calor,w:cW*0.5}]);
      if (form.carga_descripcion) txtArea('Descripción de cargas:', form.carga_descripcion, 20);

      sub('4.2 EFICIENCIA ENERGÉTICA');
      fila([{label:'COP sistema',value:form.cop_sistema,w:cW*0.33},{label:'EER sistema',value:form.eer_sistema,w:cW*0.33},{label:'Clase energética',value:form.clase_energetica,w:cW*0.34}]);
      if (form.eficiencia_descripcion) txtArea('Justificación eficiencia:', form.eficiencia_descripcion, 20);

      // ===== SECCIÓN 5: PUESTA EN MARCHA =====
      sec('5. FICHA DE PUESTA EN MARCHA');
      fila([{label:'Presión de trabajo (bar)',value:form.puesta_presion_trabajo,w:cW*0.4},{label:'Presión de prueba (bar)',value:form.puesta_presion_prueba,w:cW*0.3},{label:'Fecha',value:form.puesta_fecha,w:cW*0.3}]);
      fila([{label:'Caudal total (m³/h)',value:form.puesta_caudal_total,w:cW*0.5},{label:'Nivel de ruido (dB)',value:form.puesta_nivel_ruido,w:cW*0.5}]);
      if (form.puesta_observaciones) txtArea('Observaciones puesta en marcha:', form.puesta_observaciones, 15);

      // ===== SECCIÓN 6: PLANOS Y DOCUMENTACIÓN =====
      sec('6. PLANOS Y DOCUMENTACIÓN COMPLEMENTARIA');
      const adjSecs = [
        {key:'planos', label:'Planos adjuntos'},
        {key:'complementaria', label:'Documentación complementaria (CE, fichas técnicas...)'},
        {key:'calculos', label:'Anexos de cálculo'},
      ];
      adjSecs.forEach(({key,label}) => {
        const docs = form.adjuntos[key] || [];
        chk(8);
        doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text(label+':', margin, y+4); y+=6;
        if (docs.length === 0) {
          doc.setFont('helvetica','italic'); doc.setTextColor(150,150,150); doc.setFontSize(7.5);
          doc.text('No se han adjuntado documentos en esta sección.', margin+4, y+4);
          doc.setTextColor(0,0,0); y+=7;
        } else {
          docs.forEach(d => { chk(5); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(`• ${d.name}`, margin+4, y+4); y+=5; });
        }
      });

      // ===== OBSERVACIONES =====
      chk(30); y+=4;
      sec('7. OBSERVACIONES GENERALES');
      const obsL = doc.splitTextToSize(form.observaciones_generales||'Sin observaciones adicionales.',cW-4);
      const obsH = Math.max(20, obsL.length*4.5+6);
      doc.rect(margin,y,cW,obsH); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(obsL,margin+2,y+4); y+=obsH+6;

      // FIRMA
      chk(40);
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      const decl='El técnico responsable certifica que la instalación descrita en esta memoria cumple con los requisitos exigidos por el RITE (Real Decreto 1027/2007 y posteriores modificaciones), así como con la normativa de aplicación vigente.';
      const dL=doc.splitTextToSize(decl,cW); doc.text(dL,margin,y); y+=dL.length*5+8;
      const fw=cW/2-5;
      doc.rect(margin,y,fw,22); doc.rect(margin+fw+10,y,fw,22);
      doc.setFontSize(7.5);
      doc.text('Firma del técnico responsable',margin+2,y+18);
      doc.text('Sello de la empresa instaladora',margin+fw+12,y+18);

      const filename = `MemoriaTecnica_RITE_${form.inst_nombre||'instalacion'}_${form.fecha||new Date().getFullYear()}.pdf`;
      const blob = doc.output('blob');
      setPendingPdfBlob(blob); setPendingFilename(filename); setShowSaveDialog(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar la memoria técnica');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadOnly = () => {
    const url = URL.createObjectURL(pendingPdfBlob);
    const a = document.createElement('a'); a.href=url; a.download=pendingFilename; a.click(); URL.revokeObjectURL(url);
    setShowSaveDialog(false); toast.success('Memoria técnica descargada');
  };

  const handleSaveAndDownload = async () => {
    if (!selectedClientId) { toast.error('Selecciona un cliente para guardar'); return; }
    try {
      const file = new File([pendingPdfBlob], pendingFilename, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ClientDocument.create({
        client_id: selectedClientId,
        title: `Memoria Técnica RITE – ${form.inst_nombre || form.titular_nombre}`,
        document_type: 'otro',
        file_url,
        building_name: form.inst_nombre,
        tecnico_nombre: form.tecnico_nombre,
        observaciones: form.observaciones_generales,
        fecha_firma: form.fecha,
        form_data: form,
      });
      const url = URL.createObjectURL(pendingPdfBlob);
      const a = document.createElement('a'); a.href=url; a.download=pendingFilename; a.click(); URL.revokeObjectURL(url);
      setShowSaveDialog(false); toast.success('Memoria guardada y descargada');
    } catch { toast.error('Error al guardar'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Memoria Técnica de Instalación RITE" />

        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <p className="text-sm text-blue-700">
            <strong>RITE — Real Decreto 1027/2007</strong> — Documento técnico obligatorio para instalaciones térmicas. Cumplimenta todas las secciones y genera la memoria en PDF para presentar ante la administración competente.
          </p>
        </Card>

        {/* Selección cliente/edificio */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Building className="h-4 w-4" />Carga rápida desde cliente/edificio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleClientChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{clients.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Edificio/Instalación</Label>
              <Select onValueChange={handleBuildingChange} disabled={!selectedClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{buildings.map(b=><SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="datos" className="text-xs"><FileText className="h-3 w-3 mr-1" />Datos generales</TabsTrigger>
            <TabsTrigger value="tecnica" className="text-xs"><Settings className="h-3 w-3 mr-1" />Descripción técnica</TabsTrigger>
            <TabsTrigger value="ventilacion" className="text-xs"><Wind className="h-3 w-3 mr-1" />Ventilación</TabsTrigger>
            <TabsTrigger value="calculos" className="text-xs"><Calculator className="h-3 w-3 mr-1" />Cálculos</TabsTrigger>
            <TabsTrigger value="planos" className="text-xs"><Paperclip className="h-3 w-3 mr-1" />Planos y docs.</TabsTrigger>
          </TabsList>

          {/* ===================== TAB DATOS GENERALES ===================== */}
          <TabsContent value="datos" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Identificación del proyecto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Núm. Expediente</Label><Input className="mt-1" value={form.num_expediente} onChange={e=>hC('num_expediente',e.target.value)} /></div>
                <div><Label>Núm. Proyecto</Label><Input className="mt-1" value={form.num_proyecto} onChange={e=>hC('num_proyecto',e.target.value)} /></div>
                <div><Label>Fecha</Label><Input className="mt-1" type="date" value={form.fecha} onChange={e=>hC('fecha',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Titular de la instalación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre / Razón Social</Label><Input className="mt-1" value={form.titular_nombre} onChange={e=>hC('titular_nombre',e.target.value)} /></div>
                <div><Label>NIF / CIF</Label><Input className="mt-1" value={form.titular_nif} onChange={e=>hC('titular_nif',e.target.value)} /></div>
                <div><Label>Dirección</Label><Input className="mt-1" value={form.titular_direccion} onChange={e=>hC('titular_direccion',e.target.value)} /></div>
                <div><Label>Código Postal</Label><Input className="mt-1" value={form.titular_cp} onChange={e=>hC('titular_cp',e.target.value)} /></div>
                <div><Label>Localidad</Label><Input className="mt-1" value={form.titular_localidad} onChange={e=>hC('titular_localidad',e.target.value)} /></div>
                <div><Label>Teléfono</Label><Input className="mt-1" value={form.titular_telefono} onChange={e=>hC('titular_telefono',e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Email</Label><Input className="mt-1" value={form.titular_email} onChange={e=>hC('titular_email',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Datos de la instalación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Nombre / Emplazamiento</Label><Input className="mt-1" value={form.inst_nombre} onChange={e=>hC('inst_nombre',e.target.value)} /></div>
                <div><Label>Dirección</Label><Input className="mt-1" value={form.inst_direccion} onChange={e=>hC('inst_direccion',e.target.value)} /></div>
                <div><Label>C.P.</Label><Input className="mt-1" value={form.inst_cp} onChange={e=>hC('inst_cp',e.target.value)} /></div>
                <div><Label>Localidad</Label><Input className="mt-1" value={form.inst_localidad} onChange={e=>hC('inst_localidad',e.target.value)} /></div>
                <div><Label>Provincia</Label><Input className="mt-1" value={form.inst_provincia} onChange={e=>hC('inst_provincia',e.target.value)} /></div>
                <div><Label>Uso del edificio</Label><Input className="mt-1" value={form.inst_uso} onChange={e=>hC('inst_uso',e.target.value)} placeholder="Residencial, Comercial, Industrial..." /></div>
                <div><Label>Actividad principal</Label><Input className="mt-1" value={form.inst_actividad} onChange={e=>hC('inst_actividad',e.target.value)} placeholder="Oficinas, Restaurante..." /></div>
                <div><Label>Superficie total (m²)</Label><Input className="mt-1" type="number" value={form.inst_superficie} onChange={e=>hC('inst_superficie',e.target.value)} /></div>
                <div><Label>Año construcción</Label><Input className="mt-1" value={form.inst_año} onChange={e=>hC('inst_año',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Técnico responsable / Empresa autorizada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre del técnico</Label><Input className="mt-1" value={form.tecnico_nombre} onChange={e=>hC('tecnico_nombre',e.target.value)} /></div>
                <div><Label>Titulación</Label><Input className="mt-1" value={form.tecnico_titulacion} onChange={e=>hC('tecnico_titulacion',e.target.value)} placeholder="Ing. Industrial, Ing. Técnico..." /></div>
                <div><Label>Núm. Colegiado</Label><Input className="mt-1" value={form.tecnico_num_colegiado} onChange={e=>hC('tecnico_num_colegiado',e.target.value)} /></div>
                <div><Label>Colegio Profesional</Label><Input className="mt-1" value={form.tecnico_colegio} onChange={e=>hC('tecnico_colegio',e.target.value)} /></div>
                <div><Label>Empresa instaladora</Label><Input className="mt-1" value={form.empresa_nombre} onChange={e=>hC('empresa_nombre',e.target.value)} /></div>
                <div><Label>CIF empresa</Label><Input className="mt-1" value={form.empresa_cif} onChange={e=>hC('empresa_cif',e.target.value)} /></div>
                <div><Label>Núm. R.I. (Registro Industria)</Label><Input className="mt-1" value={form.empresa_ri} onChange={e=>hC('empresa_ri',e.target.value)} /></div>
                <div><Label>Email empresa</Label><Input className="mt-1" value={form.empresa_email} onChange={e=>hC('empresa_email',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Justificación de diseño</h3>
              <div className="space-y-4">
                <div><Label>Normativa aplicada</Label><Input className="mt-1" value={form.normativa_aplicada} onChange={e=>hC('normativa_aplicada',e.target.value)} /></div>
                <div><Label>Bienestar e higrotérmico</Label><Textarea className="mt-1 resize-none" rows={3} value={form.justificacion_bienestar} onChange={e=>hC('justificacion_bienestar',e.target.value)} placeholder="Justificación del cumplimiento de las exigencias de bienestar..." /></div>
                <div><Label>Calidad del aire interior (higiene)</Label><Textarea className="mt-1 resize-none" rows={3} value={form.justificacion_higiene} onChange={e=>hC('justificacion_higiene',e.target.value)} placeholder="Caudales de ventilación, categorías IDA, ODA..." /></div>
                <div><Label>Seguridad</Label><Textarea className="mt-1 resize-none" rows={3} value={form.justificacion_seguridad} onChange={e=>hC('justificacion_seguridad',e.target.value)} placeholder="Elementos de seguridad, cortes de gas, detectores..." /></div>
                <div><Label>Eficiencia energética</Label><Textarea className="mt-1 resize-none" rows={3} value={form.justificacion_eficiencia} onChange={e=>hC('justificacion_eficiencia',e.target.value)} placeholder="COP, EER, clase energética, energías renovables..." /></div>
              </div>
              <AdjuntosSection seccion="datos_generales" label="Documentos adjuntos a esta sección" />
            </Card>
          </TabsContent>

          {/* ===================== TAB DESCRIPCIÓN TÉCNICA ===================== */}
          <TabsContent value="tecnica" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-semibold text-slate-800">Equipos generadores</h3>
                <Button size="sm" onClick={addEquipo} className="text-xs"><Plus className="h-3 w-3 mr-1" />Añadir equipo</Button>
              </div>
              {form.equipos.map((eq, i) => (
                <div key={eq.id} className="p-4 bg-slate-50 rounded-lg border mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-slate-700 text-sm">Equipo {i+1}</span>
                    {form.equipos.length > 1 && <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={()=>delEquipo(i)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label className="text-xs">Referencia</Label><Input className="mt-1 h-7 text-xs" value={eq.referencia} onChange={e=>updEquipo(i,'referencia',e.target.value)} /></div>
                    <div><Label className="text-xs">Tipo de equipo</Label><Input className="mt-1 h-7 text-xs" value={eq.tipo} onChange={e=>updEquipo(i,'tipo',e.target.value)} placeholder="Split, Caldera, UTA..." /></div>
                    <div><Label className="text-xs">Marca</Label><Input className="mt-1 h-7 text-xs" value={eq.marca} onChange={e=>updEquipo(i,'marca',e.target.value)} /></div>
                    <div><Label className="text-xs">Modelo</Label><Input className="mt-1 h-7 text-xs" value={eq.modelo} onChange={e=>updEquipo(i,'modelo',e.target.value)} /></div>
                    <div><Label className="text-xs">Pot. frigorífica (kW)</Label><Input className="mt-1 h-7 text-xs" type="number" value={eq.pot_frio} onChange={e=>updEquipo(i,'pot_frio',e.target.value)} /></div>
                    <div><Label className="text-xs">Pot. calorífica (kW)</Label><Input className="mt-1 h-7 text-xs" type="number" value={eq.pot_calor} onChange={e=>updEquipo(i,'pot_calor',e.target.value)} /></div>
                    <div><Label className="text-xs">COP</Label><Input className="mt-1 h-7 text-xs" type="number" value={eq.cop} onChange={e=>updEquipo(i,'cop',e.target.value)} /></div>
                    <div><Label className="text-xs">EER</Label><Input className="mt-1 h-7 text-xs" type="number" value={eq.eer} onChange={e=>updEquipo(i,'eer',e.target.value)} /></div>
                    <div><Label className="text-xs">Combustible</Label><Input className="mt-1 h-7 text-xs" value={eq.combustible} onChange={e=>updEquipo(i,'combustible',e.target.value)} placeholder="Gas, Gasóleo, Eléctrico..." /></div>
                    <div><Label className="text-xs">Refrigerante</Label><Input className="mt-1 h-7 text-xs" value={eq.refrigerante} onChange={e=>updEquipo(i,'refrigerante',e.target.value)} placeholder="R-410A, R-32..." /></div>
                    <div><Label className="text-xs">Energía renovable</Label><Input className="mt-1 h-7 text-xs" value={eq.energia_renovable} onChange={e=>updEquipo(i,'energia_renovable',e.target.value)} placeholder="Aerotermia, Solar..." /></div>
                    <div><Label className="text-xs">Ubicación</Label><Input className="mt-1 h-7 text-xs" value={eq.ubicacion} onChange={e=>updEquipo(i,'ubicacion',e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Sistemas de distribución</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Material tuberías</Label><Input className="mt-1" value={form.dist_tuberias} onChange={e=>hC('dist_tuberias',e.target.value)} placeholder="Cobre, Acero, PEX..." /></div>
                <div><Label>Diámetros principales</Label><Input className="mt-1" value={form.dist_diametros} onChange={e=>hC('dist_diametros',e.target.value)} placeholder="DN25, DN32..." /></div>
                <div><Label>Aislamiento</Label><Input className="mt-1" value={form.dist_aislamiento} onChange={e=>hC('dist_aislamiento',e.target.value)} placeholder="Coquilla elastomérica, lana mineral..." /></div>
                <div><Label>Fluido caloportador</Label><Input className="mt-1" value={form.dist_fluido} onChange={e=>hC('dist_fluido',e.target.value)} placeholder="Agua, Glicol..." /></div>
                <div><Label>Bombas / circuladores</Label><Input className="mt-1" value={form.dist_bombas} onChange={e=>hC('dist_bombas',e.target.value)} /></div>
                <div><Label>Presión de trabajo (bar)</Label><Input className="mt-1" type="number" value={form.dist_presion} onChange={e=>hC('dist_presion',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Unidades terminales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Tipo de terminales</Label><Input className="mt-1" value={form.terminales_tipo} onChange={e=>hC('terminales_tipo',e.target.value)} placeholder="Fancoils, Splits, Radiadores, Suelo radiante..." /></div>
              </div>
              <div className="mt-3"><Label>Descripción del sistema terminal</Label><Textarea className="mt-1 resize-none" rows={3} value={form.terminales_descripcion} onChange={e=>hC('terminales_descripcion',e.target.value)} /></div>
            </Card>

            <AdjuntosSection seccion="descripcion_tecnica" label="Adjuntar fichas técnicas y documentación de equipos" />
          </TabsContent>

          {/* ===================== TAB VENTILACIÓN ===================== */}
          <TabsContent value="ventilacion" className="space-y-4">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>RITE IT 1.1.4.2</strong> — Define la categoría de calidad del aire (IDA), el caudal mínimo de ventilación y los sistemas de filtrado para cada zona. El asistente calcula el caudal orientativo según el método seleccionado.
              </p>
            </Card>

            {form.zonas.map((zona, i) => (
              <Card key={zona.id} className="p-6 bg-white border-0 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-semibold text-slate-800">Zona {i+1}{zona.nombre ? ` — ${zona.nombre}` : ''}</h3>
                  {form.zonas.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={()=>delZona(i)}><Trash2 className="h-3 w-3" /></Button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2"><Label>Nombre de la zona</Label><Input className="mt-1" value={zona.nombre} onChange={e=>updZona(i,'nombre',e.target.value)} placeholder="Ej: Oficina planta 1, Sala reuniones..." /></div>

                  <div>
                    <Label>Actividad / Uso</Label>
                    <Select value={zona.actividad} onValueChange={v=>{ updZona(i,'actividad',v); const act=actividadOcupacion.find(a=>a.value===v); if(act&&zona.superficie){ updZona(i,'ocupacion',String(Math.ceil(parseFloat(zona.superficie)/act.m2_persona))); } }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar actividad..." /></SelectTrigger>
                      <SelectContent>{actividadOcupacion.map(a=><SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoría IDA (calidad del aire)</Label>
                    <Select value={zona.ida} onValueChange={v=>updZona(i,'ida',v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {idaCategorias.map(c=>(
                          <SelectItem key={c.value} value={c.value}>
                            <div><div className="font-medium">{c.value}</div><div className="text-xs text-slate-500">{c.descripcion}</div></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {zona.ida && <p className="text-xs text-slate-500 mt-1">{idaCategorias.find(c=>c.value===zona.ida)?.descripcion}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><Label>Superficie (m²)</Label><Input className="mt-1" type="number" value={zona.superficie} onChange={e=>{ updZona(i,'superficie',e.target.value); const act=actividadOcupacion.find(a=>a.value===zona.actividad); if(act){ updZona(i,'ocupacion',String(Math.ceil(parseFloat(e.target.value||0)/act.m2_persona))); } }} /></div>
                  <div><Label>Altura libre (m)</Label><Input className="mt-1" type="number" value={zona.altura} onChange={e=>updZona(i,'altura',e.target.value)} /></div>
                  <div><Label>Ocupación (personas)</Label><Input className="mt-1" type="number" value={zona.ocupacion} onChange={e=>updZona(i,'ocupacion',e.target.value)} /></div>
                  <div className="flex flex-col justify-end">
                    {zona.superficie && zona.altura && <div className="text-xs text-slate-500 bg-slate-100 rounded p-2">Vol.: <strong>{(parseFloat(zona.superficie||0)*parseFloat(zona.altura||0)).toFixed(1)} m³</strong></div>}
                  </div>
                </div>

                <div className="mb-4">
                  <Label>Método de cálculo de ventilación</Label>
                  <Select value={zona.metodo_ventilacion} onValueChange={v=>updZona(i,'metodo_ventilacion',v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {metodosVentilacion.map(m=>(
                        <SelectItem key={m.value} value={m.value}>
                          <div><div className="font-medium">{m.label}</div><div className="text-xs text-slate-500">{m.descripcion}</div></div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Caudal calculado automáticamente */}
                {calcularCaudal(zona) && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Caudal calculado (orientativo):</strong> {calcularCaudal(zona)}
                      <span className="text-xs ml-2 text-green-600">según {zona.ida} y {zona.metodo_ventilacion?.replace('metodo_','Método ')}</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div><Label>Caudal impulsión (m³/h)</Label><Input className="mt-1" type="number" value={zona.caudal_impulsion} onChange={e=>updZona(i,'caudal_impulsion',e.target.value)} placeholder={calcularCaudal(zona)||'Auto'} /></div>
                  <div><Label>Caudal retorno (m³/h)</Label><Input className="mt-1" type="number" value={zona.caudal_retorno} onChange={e=>updZona(i,'caudal_retorno',e.target.value)} /></div>
                  {zona.metodo_ventilacion === 'metodo_c' && <div><Label>Renovaciones/hora</Label><Input className="mt-1" type="number" value={zona.renovaciones_hora} onChange={e=>updZona(i,'renovaciones_hora',e.target.value)} /></div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Filtro de impulsión</Label>
                    <Select value={zona.tipo_filtro_impulsion} onValueChange={v=>updZona(i,'tipo_filtro_impulsion',v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{tiposFiltro.map(f=><SelectItem key={f.value} value={f.value}><div><div className="font-medium">{f.label}</div><div className="text-xs text-slate-500">{f.descripcion}</div></div></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Filtro de retorno</Label>
                    <Select value={zona.tipo_filtro_retorno} onValueChange={v=>updZona(i,'tipo_filtro_retorno',v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{tiposFiltro.map(f=><SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mb-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={zona.necesita_recuperador} onCheckedChange={v=>updZona(i,'necesita_recuperador',v)} id={`rec-${i}`} />
                    <Label htmlFor={`rec-${i}`} className="cursor-pointer">
                      Recuperador de calor
                      <span className="text-xs text-slate-500 block">Obligatorio si P&gt;70kW o según RITE</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={zona.usa_sonda_co2} onCheckedChange={v=>updZona(i,'usa_sonda_co2',v)} id={`co2-${i}`} />
                    <Label htmlFor={`co2-${i}`} className="cursor-pointer">
                      Sonda CO₂ (ventilación variable)
                      <span className="text-xs text-slate-500 block">Recomendado para IDA 2 y ocupación variable</span>
                    </Label>
                  </div>
                </div>

                {zona.usa_sonda_co2 && (
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <Label>Concentración CO₂ máxima (ppm)</Label>
                      <Input className="mt-1" type="number" value={zona.concentracion_co2_max} onChange={e=>updZona(i,'concentracion_co2_max',e.target.value)} placeholder="1000" />
                      <p className="text-xs text-blue-600 mt-1">Recomendado: ≤1000 ppm (IDA 2). Exterior: ~400 ppm</p>
                    </div>
                    <div className="flex items-start pt-6">
                      <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
                        La ventilación se regulará automáticamente según la concentración de CO₂ medida, optimizando el consumo energético.
                      </div>
                    </div>
                  </div>
                )}

                <div><Label>Observaciones de la zona</Label><Textarea className="mt-1 resize-none" rows={2} value={zona.observaciones} onChange={e=>updZona(i,'observaciones',e.target.value)} /></div>
              </Card>
            ))}

            <Button onClick={addZona} variant="outline" className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" />Añadir zona</Button>
          </TabsContent>

          {/* ===================== TAB CÁLCULOS ===================== */}
          <TabsContent value="calculos" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Cargas térmicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Carga total refrigeración (kW)</Label><Input className="mt-1" type="number" value={form.carga_total_frio} onChange={e=>hC('carga_total_frio',e.target.value)} /></div>
                <div><Label>Carga total calefacción (kW)</Label><Input className="mt-1" type="number" value={form.carga_total_calor} onChange={e=>hC('carga_total_calor',e.target.value)} /></div>
              </div>
              <div className="mt-4"><Label>Descripción y resumen de cargas</Label><Textarea className="mt-1 resize-none" rows={4} value={form.carga_descripcion} onChange={e=>hC('carga_descripcion',e.target.value)} placeholder="Resumen de cargas por local, método empleado (ASHRAE, CTE...)..." /></div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Eficiencia energética</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>COP del sistema</Label><Input className="mt-1" type="number" value={form.cop_sistema} onChange={e=>hC('cop_sistema',e.target.value)} /></div>
                <div><Label>EER del sistema</Label><Input className="mt-1" type="number" value={form.eer_sistema} onChange={e=>hC('eer_sistema',e.target.value)} /></div>
                <div><Label>Clase energética</Label><Input className="mt-1" value={form.clase_energetica} onChange={e=>hC('clase_energetica',e.target.value)} placeholder="A+, A, B..." /></div>
              </div>
              <div className="mt-4"><Label>Justificación de eficiencia energética</Label><Textarea className="mt-1 resize-none" rows={4} value={form.eficiencia_descripcion} onChange={e=>hC('eficiencia_descripcion',e.target.value)} placeholder="Justificación del cumplimiento del CTE HE, límites de consumo energético, etc..." /></div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Ficha de puesta en marcha</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label>Presión de trabajo (bar)</Label><Input className="mt-1" type="number" value={form.puesta_presion_trabajo} onChange={e=>hC('puesta_presion_trabajo',e.target.value)} /></div>
                <div><Label>Presión de prueba (bar)</Label><Input className="mt-1" type="number" value={form.puesta_presion_prueba} onChange={e=>hC('puesta_presion_prueba',e.target.value)} /></div>
                <div><Label>Caudal total (m³/h)</Label><Input className="mt-1" type="number" value={form.puesta_caudal_total} onChange={e=>hC('puesta_caudal_total',e.target.value)} /></div>
                <div><Label>Nivel de ruido (dB)</Label><Input className="mt-1" type="number" value={form.puesta_nivel_ruido} onChange={e=>hC('puesta_nivel_ruido',e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Fecha de puesta en marcha</Label><Input className="mt-1" type="date" value={form.puesta_fecha} onChange={e=>hC('puesta_fecha',e.target.value)} /></div>
              </div>
              <div className="mt-4"><Label>Observaciones de puesta en marcha</Label><Textarea className="mt-1 resize-none" rows={3} value={form.puesta_observaciones} onChange={e=>hC('puesta_observaciones',e.target.value)} /></div>
            </Card>

            <AdjuntosSection seccion="calculos" label="Adjuntar hojas de cálculo, certificados de eficiencia..." />
          </TabsContent>

          {/* ===================== TAB PLANOS Y DOCS ===================== */}
          <TabsContent value="planos" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Planos y esquemas</h3>
              <div className="space-y-3 text-sm text-slate-600">
                {['Plano de emplazamiento y situación','Plano en planta con ubicación de equipos y trazado','Esquema de principio (diámetros, seguridad, vasos...)','Plano detalle sala de calderas / máquinas','Plano PDC (evacuación productos combustión)'].map((p,i)=>(
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                    <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <AdjuntosSection seccion="planos" label="Subir planos (PDF, DWG, DXF, PNG...)" />
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Documentación complementaria</h3>
              <div className="space-y-3 text-sm text-slate-600">
                {['Declaraciones de conformidad CE de los equipos','Fichas técnicas del fabricante','Plan de mantenimiento y uso','Certificados de instalación','Informes de inspección de eficiencia energética'].map((p,i)=>(
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                    <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <AdjuntosSection seccion="complementaria" label="Subir documentación complementaria" />
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Observaciones generales</h3>
              <Textarea value={form.observaciones_generales} onChange={e=>hC('observaciones_generales',e.target.value)} rows={4} placeholder="Cualquier información adicional relevante..." className="resize-none" />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botón generar */}
        <div className="flex justify-end mt-6">
          <Button onClick={generatePDF} disabled={generating} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 text-base">
            {generating ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generando PDF...</>) : (<><Download className="h-5 w-5 mr-2" />Generar Memoria Técnica RITE</>)}
          </Button>
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Memoria Técnica generada</DialogTitle></DialogHeader>
          <div className="py-4 text-slate-600 text-sm">
            <p className="mb-2">¿Deseas guardar este documento en la ficha del cliente?</p>
            {!selectedClientId && <p className="text-amber-600 font-medium">⚠️ No has seleccionado un cliente. Solo podrás descargarlo.</p>}
          </div>
          <DialogFooter className="flex gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={handleDownloadOnly} className="flex-1"><Download className="h-4 w-4 mr-2" />Solo descargar</Button>
            <Button onClick={handleSaveAndDownload} disabled={!selectedClientId} className="flex-1 bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4 mr-2" />Guardar y descargar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}