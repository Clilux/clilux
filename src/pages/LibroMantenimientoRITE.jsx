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
import { Download, Loader2, Save, Plus, Trash2, BookOpen, Settings, ClipboardList, Zap, FileText, Building } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// Periodicidades de mantenimiento según RITE IT 3
const tareasPreventivas = [
  // Mensual (P ≤ 70 kW)
  { id: 1, tarea: "Limpieza de los evaporadores", periodicidad: "Mensual", categoria: "Equipos frío" },
  { id: 2, tarea: "Limpieza de los condensadores", periodicidad: "Mensual", categoria: "Equipos frío" },
  { id: 3, tarea: "Comprobación de niveles de agua en circuitos", periodicidad: "Mensual", categoria: "Circuitos hidráulicos" },
  { id: 4, tarea: "Revisión y limpieza de filtros de aire", periodicidad: "Mensual", categoria: "Ventilación" },
  { id: 5, tarea: "Control visual de la instalación", periodicidad: "Mensual", categoria: "General" },
  // Trimestral
  { id: 6, tarea: "Comprobación de la estanquidad y niveles de refrigerante y aceite", periodicidad: "Trimestral", categoria: "Equipos frío" },
  { id: 7, tarea: "Revisión de bombas y ventiladores", periodicidad: "Trimestral", categoria: "Hidráulico" },
  { id: 8, tarea: "Comprobación de estanquidad de circuitos de tuberías", periodicidad: "Trimestral", categoria: "Circuitos hidráulicos" },
  { id: 9, tarea: "Revisión de baterías de intercambio térmico", periodicidad: "Trimestral", categoria: "Intercambiadores" },
  { id: 10, tarea: "Comprobación de tarado de elementos de seguridad", periodicidad: "Trimestral", categoria: "Seguridad" },
  { id: 11, tarea: "Revisión y limpieza de filtros de agua", periodicidad: "Trimestral", categoria: "Hidráulico" },
  // Semestral
  { id: 12, tarea: "Revisión del vaso de expansión", periodicidad: "Semestral", categoria: "Hidráulico" },
  { id: 13, tarea: "Revisión de los sistemas de tratamiento de agua", periodicidad: "Semestral", categoria: "Agua" },
  { id: 14, tarea: "Revisión de aparatos de recuperación de calor", periodicidad: "Semestral", categoria: "Intercambiadores" },
  { id: 15, tarea: "Revisión de equipos autónomos", periodicidad: "Semestral", categoria: "Equipos" },
  { id: 16, tarea: "Revisión del sistema de control automático", periodicidad: "Semestral", categoria: "Control" },
  { id: 17, tarea: "Revisión y limpieza de unidades de impulsión y retorno de aire", periodicidad: "Semestral", categoria: "Ventilación" },
  // Anual
  { id: 18, tarea: "Limpieza del quemador de la caldera", periodicidad: "Anual", categoria: "Caldera" },
  { id: 19, tarea: "Revisión general de caldera de gas / gasóleo", periodicidad: "Anual", categoria: "Caldera" },
  { id: 20, tarea: "Comprobación y limpieza de circuito de humos y chimeneas", periodicidad: "Anual", categoria: "Caldera" },
  { id: 21, tarea: "Revisión del sistema de preparación de ACS", periodicidad: "Anual", categoria: "ACS" },
  { id: 22, tarea: "Revisión del estado del aislamiento térmico", periodicidad: "Anual", categoria: "Aislamiento" },
  { id: 23, tarea: "Drenaje, limpieza y tratamiento del circuito de torres de refrigeración", periodicidad: "Anual", categoria: "Torres" },
  { id: 24, tarea: "Revisión de la red de conductos (UNE 100012)", periodicidad: "Anual", categoria: "Conductos" },
  { id: 25, tarea: "Comprobación de material refractario", periodicidad: "Anual", categoria: "Caldera" },
];

const mesesEspanol = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function LibroMantenimientoRITE() {
  const [generating, setGenerating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingPdfBlob, setPendingPdfBlob] = useState(null);
  const [pendingFilename, setPendingFilename] = useState('');
  const [activeTab, setActiveTab] = useState('datos');

  const anioActual = new Date().getFullYear();

  const [form, setForm] = useState({
    // Identificación instalación
    num_expediente: '',
    anio_libro: String(anioActual),
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
    inst_uso: '',
    inst_año_instalacion: '',
    // Empresa mantenedora
    empresa_nombre: '',
    empresa_ri: '',
    empresa_telefono: '',
    empresa_email: '',
    // Director mantenimiento
    director_nombre: '',
    director_colegiado: '',
    director_titulacion: '',
    // Características técnicas
    pot_frio_total: '',
    pot_calor_total: '',
    tipo_combustible: '',
    refrigerante: '',
    superficie_solar: '',
    volumen_acumulacion: '',
    // Plan preventivo - resultados por tarea y mes
    preventivo: tareasPreventivas.map(() => ({
      ene: '', feb: '', mar: '', abr: '', may: '', jun: '',
      jul: '', ago: '', sep: '', oct: '', nov: '', dic: '',
      observaciones: ''
    })),
    // Registro de operaciones
    operaciones: [],
    // Consumos anuales
    consumos: {
      gas_kwh: '', gas_m3: '',
      gasoleo_litros: '', gasoleo_kwh: '',
      electricidad_kwh: '',
      agua_m3: '',
      solar_kwh: '',
      biomasa_kg: '',
    },
    // Incidencias
    incidencias: [],
    // Observaciones generales
    observaciones_generales: '',
  });

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings-libro', selectedClientId],
    queryFn: () => base44.entities.Building.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId,
  });
  const { data: buildingEquipment = [] } = useQuery({
    queryKey: ['equipment-libro', selectedBuildingId],
    queryFn: () => base44.entities.Equipment.filter({ building_id: selectedBuildingId }),
    enabled: !!selectedBuildingId,
  });
  const { data: completedRevisions = [] } = useQuery({
    queryKey: ['revisions-libro', selectedBuildingId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ building_id: selectedBuildingId, status: 'completed' }),
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
      }));
    }
  };

  React.useEffect(() => {
    if (buildingEquipment.length === 0) return;
    const potFrio = buildingEquipment.reduce((s, e) => s + (parseFloat(e.cooling_power_kw) || 0), 0);
    const potCalor = buildingEquipment.reduce((s, e) => s + (parseFloat(e.heating_power_kw) || 0), 0);
    const refs = [...new Set(buildingEquipment.map(e => e.refrigerant_type).filter(Boolean))].join(', ');
    setForm(prev => ({
      ...prev,
      pot_frio_total: potFrio > 0 ? potFrio.toFixed(2) : prev.pot_frio_total,
      pot_calor_total: potCalor > 0 ? potCalor.toFixed(2) : prev.pot_calor_total,
      refrigerante: refs || prev.refrigerante,
    }));
  }, [buildingEquipment]);

  // También importar revisiones completadas como operaciones
  React.useEffect(() => {
    if (completedRevisions.length === 0) return;
    const ops = completedRevisions.map(rev => {
      const eq = buildingEquipment.find(e => e.id === rev.equipment_id);
      return {
        fecha: rev.completed_date || rev.scheduled_date || '',
        tipo: rev.revision_type || '',
        descripcion: `Revisión ${rev.revision_type || ''} – ${eq ? `${eq.brand} ${eq.model}` : 'Equipo'}`,
        tecnico: '',
        resultado: 'OK',
        observaciones: rev.notes || '',
      };
    });
    setForm(prev => ({ ...prev, operaciones: ops.length > prev.operaciones.length ? ops : prev.operaciones }));
  }, [completedRevisions, buildingEquipment]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleConsumo = (field, value) => setForm(prev => ({ ...prev, consumos: { ...prev.consumos, [field]: value } }));
  const handlePreventivo = (index, mes, value) => {
    setForm(prev => {
      const p = [...prev.preventivo];
      p[index] = { ...p[index], [mes]: value };
      return { ...prev, preventivo: p };
    });
  };

  const addOperacion = () => {
    setForm(prev => ({
      ...prev,
      operaciones: [...prev.operaciones, { fecha: '', tipo: '', descripcion: '', tecnico: '', resultado: '', observaciones: '' }]
    }));
  };
  const updateOperacion = (i, field, value) => {
    setForm(prev => {
      const ops = [...prev.operaciones];
      ops[i] = { ...ops[i], [field]: value };
      return { ...prev, operaciones: ops };
    });
  };
  const removeOperacion = (i) => {
    setForm(prev => ({ ...prev, operaciones: prev.operaciones.filter((_, idx) => idx !== i) }));
  };

  const addIncidencia = () => {
    setForm(prev => ({
      ...prev,
      incidencias: [...prev.incidencias, { fecha: '', descripcion: '', accion: '', tecnico: '', estado: 'Resuelta' }]
    }));
  };
  const updateIncidencia = (i, field, value) => {
    setForm(prev => {
      const inc = [...prev.incidencias];
      inc[i] = { ...inc[i], [field]: value };
      return { ...prev, incidencias: inc };
    });
  };
  const removeIncidencia = (i) => {
    setForm(prev => ({ ...prev, incidencias: prev.incidencias.filter((_, idx) => idx !== i) }));
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.width, h: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 12;
      const cW = pageW - margin * 2;
      let y = margin;
      let pageNum = 0;

      let logoData = null;
      if (settings?.logo_url) logoData = await loadImageAsBase64(settings.logo_url);

      const corpHex = settings?.button_color || '#1e3a5f';
      const hexRgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
      const [cr, cg, cb] = hexRgb(corpHex);

      const newPage = () => {
        doc.addPage();
        y = margin;
        pageNum++;
        // Pie de página
        doc.setFontSize(7);
        doc.setTextColor(150,150,150);
        doc.text(`Libro de Mantenimiento RITE – ${form.inst_nombre || 'Instalación'} – Pág. ${pageNum}`, pageW/2, 292, { align: 'center' });
        doc.setTextColor(0,0,0);
      };

      const chk = (need = 8) => { if (y + need > 282) newPage(); };

      const seccion = (titulo) => {
        chk(10);
        doc.setFillColor(cr, cg, cb);
        doc.rect(margin, y, cW, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255,255,255);
        doc.text(titulo, pageW/2, y+5, { align: 'center' });
        doc.setTextColor(0,0,0);
        doc.setFont('helvetica', 'normal');
        y += 8;
      };

      const subseccion = (titulo) => {
        chk(8);
        doc.setFillColor(Math.min(cr+60,255), Math.min(cg+60,255), Math.min(cb+60,255));
        doc.rect(margin, y, cW, 5.5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255,255,255);
        doc.text(titulo, margin+2, y+4);
        doc.setTextColor(0,0,0);
        doc.setFont('helvetica', 'normal');
        y += 6.5;
      };

      const fila = (items) => {
        chk(6);
        let x = margin;
        items.forEach(item => {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          const lbl = item.label + ': ';
          doc.text(lbl, x+1, y+4);
          doc.setFont('helvetica', 'normal');
          doc.text(String(item.value || ''), x+1+doc.getTextWidth(lbl), y+4);
          doc.rect(x, y, item.w, 6);
          x += item.w;
        });
        y += 6;
      };

      // ===================== PORTADA =====================
      doc.setFillColor(cr, cg, cb);
      doc.rect(0, 0, pageW, 60, 'F');
      if (logoData) {
        const lH = 20; const lW = Math.min(lH * logoData.w/logoData.h, 50);
        doc.addImage(logoData.dataUrl, 'PNG', pageW/2 - lW/2, 10, lW, lH);
      }
      doc.setTextColor(255,255,255);
      doc.setFontSize(18); doc.setFont('helvetica','bold');
      doc.text('LIBRO DE MANTENIMIENTO', pageW/2, 40, { align: 'center' });
      doc.setFontSize(13);
      doc.text('INSTALACIONES TÉRMICAS EN EDIFICIOS (RITE)', pageW/2, 49, { align: 'center' });
      doc.setFontSize(9);
      doc.text('Real Decreto 1027/2007 — IT 3', pageW/2, 57, { align: 'center' });
      doc.setTextColor(0,0,0);
      y = 70;

      doc.setFontSize(12); doc.setFont('helvetica','bold');
      doc.text('DATOS DE LA INSTALACIÓN', pageW/2, y, { align: 'center' });
      y += 8;

      // Recuadro datos principales
      doc.setDrawColor(cr,cg,cb); doc.setLineWidth(0.8);
      doc.rect(margin, y, cW, 60);
      doc.setLineWidth(0.2); doc.setDrawColor(0,0,0);
      doc.setFontSize(9);
      const infoRows = [
        { label: 'Instalación', value: form.inst_nombre },
        { label: 'Dirección', value: `${form.inst_direccion}${form.inst_cp ? ', '+form.inst_cp : ''}${form.inst_localidad ? ' – '+form.inst_localidad : ''}` },
        { label: 'Titular', value: form.titular_nombre },
        { label: 'NIF/CIF', value: form.titular_nif },
        { label: 'Empresa mantenedora', value: form.empresa_nombre || settings?.company_name || '' },
        { label: 'Núm. expediente', value: form.num_expediente },
        { label: 'Año del libro', value: form.anio_libro },
        { label: 'Potencia frío / calor', value: `${form.pot_frio_total || '—'} kW / ${form.pot_calor_total || '—'} kW` },
      ];
      infoRows.forEach((r, i) => {
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
        doc.text(r.label + ':', margin+3, y+7+i*7);
        doc.setFont('helvetica','normal');
        doc.text(String(r.value || ''), margin+50, y+7+i*7);
      });
      y += 64;

      doc.setFontSize(7.5); doc.setFont('helvetica','italic'); doc.setTextColor(100,100,100);
      doc.text('Este Libro de Mantenimiento debe conservarse durante al menos 5 años (Art. 27 RITE, RD 1027/2007).', pageW/2, y, { align: 'center' });
      doc.setTextColor(0,0,0); doc.setFont('helvetica','normal');
      y += 10;

      // Pie portada
      doc.setFontSize(7); doc.setTextColor(150,150,150);
      doc.text(`Libro de Mantenimiento RITE – ${form.inst_nombre || 'Instalación'} – Pág. 1`, pageW/2, 292, { align: 'center' });
      doc.setTextColor(0,0,0);
      pageNum = 1;

      // ===================== PÁG 2: DATOS GENERALES =====================
      newPage();
      seccion('1. IDENTIFICACIÓN Y DATOS GENERALES');

      subseccion('1.1 TITULAR / PROMOTOR');
      fila([{ label: 'Nombre/Razón Social', value: form.titular_nombre, w: cW*0.65 },{ label: 'NIF/CIF', value: form.titular_nif, w: cW*0.35 }]);
      fila([{ label: 'Dirección', value: form.titular_direccion, w: cW*0.7 },{ label: 'C.P.', value: form.titular_cp, w: cW*0.3 }]);
      fila([{ label: 'Localidad', value: form.titular_localidad, w: cW*0.5 },{ label: 'Teléfono', value: form.titular_telefono, w: cW*0.25 },{ label: 'Email', value: form.titular_email, w: cW*0.25 }]);

      subseccion('1.2 INSTALACIÓN');
      fila([{ label: 'Nombre/Emplazamiento', value: form.inst_nombre, w: cW }]);
      fila([{ label: 'Dirección', value: form.inst_direccion, w: cW*0.7 },{ label: 'C.P.', value: form.inst_cp, w: cW*0.3 }]);
      fila([{ label: 'Localidad', value: form.inst_localidad, w: cW*0.5 },{ label: 'Uso del edificio', value: form.inst_uso, w: cW*0.5 }]);
      fila([{ label: 'Año instalación', value: form.inst_año_instalacion, w: cW*0.4 },{ label: 'Núm. expediente', value: form.num_expediente, w: cW*0.6 }]);

      subseccion('1.3 EMPRESA MANTENEDORA HABILITADA');
      fila([{ label: 'Empresa', value: form.empresa_nombre || settings?.company_name || '', w: cW*0.7 },{ label: 'Núm. R.I.', value: form.empresa_ri, w: cW*0.3 }]);
      fila([{ label: 'Teléfono', value: form.empresa_telefono || settings?.company_phone || '', w: cW*0.5 },{ label: 'Email', value: form.empresa_email || settings?.company_email || '', w: cW*0.5 }]);

      subseccion('1.4 DIRECTOR DE MANTENIMIENTO (cuando sea preceptivo)');
      fila([{ label: 'Nombre', value: form.director_nombre, w: cW*0.6 },{ label: 'Núm. colegiado', value: form.director_colegiado, w: cW*0.4 }]);
      fila([{ label: 'Titulación', value: form.director_titulacion, w: cW }]);

      // ===================== PÁG 3: CARACTERÍSTICAS TÉCNICAS =====================
      newPage();
      seccion('2. CARACTERÍSTICAS TÉCNICAS DE LA INSTALACIÓN');

      subseccion('2.1 DATOS TÉCNICOS GENERALES');
      fila([{ label: 'Pot. térmica frío total', value: form.pot_frio_total ? form.pot_frio_total+' kW' : '', w: cW*0.5 },{ label: 'Pot. térmica calor total', value: form.pot_calor_total ? form.pot_calor_total+' kW' : '', w: cW*0.5 }]);
      fila([{ label: 'Tipo de combustible', value: form.tipo_combustible, w: cW*0.5 },{ label: 'Refrigerante', value: form.refrigerante, w: cW*0.5 }]);
      fila([{ label: 'Superficie captadores solares', value: form.superficie_solar ? form.superficie_solar+' m²' : '', w: cW*0.5 },{ label: 'Volumen acumulación ACS', value: form.volumen_acumulacion ? form.volumen_acumulacion+' L' : '', w: cW*0.5 }]);

      subseccion('2.2 FICHAS TÉCNICAS DE EQUIPOS');
      if (buildingEquipment.length === 0) {
        chk(8);
        doc.setFontSize(8); doc.setTextColor(120,120,120);
        doc.text('No hay equipos registrados para este edificio.', margin+2, y+5);
        doc.setTextColor(0,0,0);
        y += 8;
      } else {
        // Cabecera tabla
        chk(8);
        doc.setFillColor(cr, cg, cb);
        const cols = [40, 30, 30, 20, 20, 18, 28];
        const heads = ['Referencia', 'Tipo', 'Marca/Modelo', 'Frío kW', 'Calor kW', 'Refrig.', 'N/S'];
        let tx = margin;
        heads.forEach((h, i) => {
          doc.setFillColor(cr, cg, cb);
          doc.rect(tx, y, cols[i], 5.5, 'F');
          doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
          doc.text(h, tx+1, y+4);
          tx += cols[i];
        });
        doc.setTextColor(0,0,0); y += 5.5;

        buildingEquipment.forEach((eq, i) => {
          chk(5.5);
          if (i % 2 === 1) { doc.setFillColor(240,242,245); doc.rect(margin, y, cW, 5.5, 'F'); }
          const vals = [
            eq.reference_name || `Equipo ${i+1}`,
            eq.equipment_type || '',
            `${eq.brand || ''} ${eq.model || ''}`.trim(),
            eq.cooling_power_kw ? String(eq.cooling_power_kw) : '—',
            eq.heating_power_kw ? String(eq.heating_power_kw) : '—',
            eq.refrigerant_type || '—',
            eq.serial_number || '',
          ];
          tx = margin;
          vals.forEach((v, j) => {
            doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);
            const txt = doc.splitTextToSize(v, cols[j]-2);
            doc.text(txt[0], tx+1, y+4);
            doc.rect(tx, y, cols[j], 5.5);
            tx += cols[j];
          });
          y += 5.5;
        });
      }

      // ===================== PLAN PREVENTIVO =====================
      newPage();
      seccion('3. PLAN DE MANTENIMIENTO PREVENTIVO — REGISTRO ANUAL ' + form.anio_libro);

      const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
      const mesesKeys = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      const colTarea = 68;
      const colPer = 18;
      const colMes = (cW - colTarea - colPer) / 12;

      // Cabecera tabla preventivo
      chk(10);
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin, y, colTarea, 8, 'F');
      doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
      doc.text('Tarea de Mantenimiento', margin+1, y+5.5);
      doc.rect(margin+colTarea, y, colPer, 8, 'F');
      doc.text('Period.', margin+colTarea+1, y+5.5);
      let mx = margin+colTarea+colPer;
      mesesCortos.forEach(m => {
        doc.rect(mx, y, colMes, 8, 'F');
        doc.text(m, mx+colMes/2-2, y+5.5);
        mx += colMes;
      });
      doc.setTextColor(0,0,0); y += 8;

      const periColors = {
        'Mensual': [255,235,210], 'Trimestral': [210,235,255],
        'Semestral': [210,255,225], 'Anual': [255,210,255],
      };

      tareasPreventivas.forEach((tarea, i) => {
        chk(5);
        const [pr, pg, pb] = periColors[tarea.periodicidad] || [250,250,250];
        doc.setFillColor(i%2===0 ? 252 : 245, i%2===0 ? 252 : 248, i%2===0 ? 252 : 250);
        doc.rect(margin, y, colTarea, 5);
        doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(30,30,30);
        const tt = doc.splitTextToSize(tarea.tarea, colTarea-2);
        doc.text(tt[0], margin+1, y+3.5);

        doc.setFillColor(pr, pg, pb);
        doc.rect(margin+colTarea, y, colPer, 5, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(6);
        doc.text(tarea.periodicidad.slice(0,3).toUpperCase(), margin+colTarea+1, y+3.5);

        mx = margin+colTarea+colPer;
        mesesKeys.forEach(mes => {
          const val = form.preventivo[i]?.[mes] || '';
          const bgVal = val === 'OK' ? [200,240,200] : val === 'NOK' ? [255,200,200] : val === 'NP' ? [230,230,230] : [255,255,255];
          doc.setFillColor(...bgVal);
          doc.rect(mx, y, colMes, 5, 'F');
          doc.setFont('helvetica', val ? 'bold' : 'normal'); doc.setFontSize(6);
          doc.setTextColor(val === 'OK' ? 0 : val === 'NOK' ? 180 : 80, val === 'OK' ? 120 : 0, 0);
          if (val) doc.text(val, mx+colMes/2-2, y+3.5);
          doc.setDrawColor(200,200,200);
          doc.rect(mx, y, colMes, 5);
          doc.setDrawColor(0,0,0);
          mx += colMes;
        });
        doc.rect(margin, y, cW, 5);
        y += 5;
      });

      // Leyenda
      chk(8);
      y += 2;
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
      doc.text('Leyenda: ', margin, y+3.5);
      [['OK', [200,240,200]], ['NOK', [255,200,200]], ['NP = No procede', [230,230,230]]].forEach(([lbl, col], i) => {
        const ox = margin + 16 + i*30;
        doc.setFillColor(...col); doc.rect(ox, y, 8, 5, 'F'); doc.rect(ox, y, 8, 5);
        doc.setTextColor(80,80,80); doc.text(lbl, ox+9, y+3.5);
      });
      doc.setTextColor(0,0,0); y += 8;

      // ===================== REGISTRO DE OPERACIONES =====================
      newPage();
      seccion('4. REGISTRO DE OPERACIONES E INTERVENCIONES');

      if (form.operaciones.length === 0) {
        chk(10);
        doc.setFontSize(8); doc.setTextColor(120,120,120);
        doc.text('No se han registrado operaciones para este periodo.', margin+2, y+5);
        doc.setTextColor(0,0,0); y += 10;
      } else {
        // Cabecera
        chk(7);
        const opCols = [20, 22, 60, 28, 18, cW-148];
        const opHeads = ['Fecha', 'Tipo', 'Descripción', 'Técnico', 'Resultado', 'Observaciones'];
        let ox2 = margin;
        opHeads.forEach((h, i) => {
          doc.setFillColor(cr,cg,cb); doc.rect(ox2, y, opCols[i], 6, 'F');
          doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
          doc.text(h, ox2+1, y+4.5);
          ox2 += opCols[i];
        });
        doc.setTextColor(0,0,0); y += 6;

        form.operaciones.forEach((op, i) => {
          chk(6);
          if (i%2===1) { doc.setFillColor(247,248,250); doc.rect(margin, y, cW, 6, 'F'); }
          const vals = [op.fecha, op.tipo, op.descripcion, op.tecnico, op.resultado, op.observaciones];
          ox2 = margin;
          vals.forEach((v, j) => {
            doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(0,0,0);
            const t = doc.splitTextToSize(String(v||''), opCols[j]-2);
            doc.text(t[0], ox2+1, y+4);
            doc.rect(ox2, y, opCols[j], 6);
            ox2 += opCols[j];
          });
          y += 6;
        });
      }

      // ===================== CONSUMOS =====================
      newPage();
      seccion('5. REGISTRO DE CONSUMOS ANUALES — ' + form.anio_libro);

      const c = form.consumos;
      subseccion('5.1 COMBUSTIBLES Y ENERGÍA');
      fila([{ label: 'Gas natural (kWh)', value: c.gas_kwh, w: cW*0.5 },{ label: 'Gas natural (m³)', value: c.gas_m3, w: cW*0.5 }]);
      fila([{ label: 'Gasóleo (litros)', value: c.gasoleo_litros, w: cW*0.5 },{ label: 'Gasóleo (kWh equiv.)', value: c.gasoleo_kwh, w: cW*0.5 }]);
      fila([{ label: 'Electricidad (kWh)', value: c.electricidad_kwh, w: cW*0.5 },{ label: 'Biomasa (kg)', value: c.biomasa_kg, w: cW*0.5 }]);

      subseccion('5.2 AGUA Y ENERGÍAS RENOVABLES');
      fila([{ label: 'Consumo de agua (m³)', value: c.agua_m3, w: cW*0.5 },{ label: 'Aportación solar térmica (kWh)', value: c.solar_kwh, w: cW*0.5 }]);

      // Gráfico de barras simple para consumos
      chk(50);
      y += 5;
      doc.setFontSize(8.5); doc.setFont('helvetica','bold');
      doc.text('Resumen visual de consumos', margin, y); y += 5;
      const consumosData = [
        { label: 'Gas (kWh)', val: parseFloat(c.gas_kwh)||0 },
        { label: 'Eléct. (kWh)', val: parseFloat(c.electricidad_kwh)||0 },
        { label: 'Solar (kWh)', val: parseFloat(c.solar_kwh)||0 },
        { label: 'Agua (m³)', val: parseFloat(c.agua_m3)||0 },
      ];
      const maxVal = Math.max(...consumosData.map(d=>d.val), 1);
      const barMaxW = cW * 0.6;
      consumosData.forEach((cd, i) => {
        chk(8);
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
        doc.text(cd.label, margin, y+5);
        const bw = (cd.val/maxVal)*barMaxW;
        const clrs = [[cr,cg,cb],[100,160,230],[80,180,120],[230,140,60]];
        doc.setFillColor(...clrs[i%4]);
        if (bw > 0) doc.rect(margin+35, y, bw, 5, 'F');
        doc.rect(margin+35, y, barMaxW, 5);
        if (cd.val > 0) {
          doc.setFontSize(7); doc.text(String(cd.val), margin+37+bw, y+4);
        }
        y += 7;
      });

      // ===================== INCIDENCIAS =====================
      newPage();
      seccion('6. REGISTRO DE INCIDENCIAS Y MODIFICACIONES');

      if (form.incidencias.length === 0) {
        chk(10);
        doc.setFontSize(8); doc.setTextColor(120,120,120);
        doc.text('No se han registrado incidencias para este periodo.', margin+2, y+5);
        doc.setTextColor(0,0,0); y += 10;
      } else {
        const incCols = [20, 60, 55, 28, 23];
        const incHeads = ['Fecha', 'Descripción', 'Acción correctiva', 'Técnico', 'Estado'];
        let ix = margin;
        incHeads.forEach((h, i) => {
          doc.setFillColor(cr,cg,cb); doc.rect(ix, y, incCols[i], 6, 'F');
          doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
          doc.text(h, ix+1, y+4.5);
          ix += incCols[i];
        });
        doc.setTextColor(0,0,0); y += 6;

        form.incidencias.forEach((inc, i) => {
          chk(6);
          if (i%2===1) { doc.setFillColor(247,248,250); doc.rect(margin, y, cW, 6, 'F'); }
          const vals = [inc.fecha, inc.descripcion, inc.accion, inc.tecnico, inc.estado];
          ix = margin;
          vals.forEach((v, j) => {
            doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(0,0,0);
            const t = doc.splitTextToSize(String(v||''), incCols[j]-2);
            doc.text(t[0], ix+1, y+4);
            doc.rect(ix, y, incCols[j], 6);
            ix += incCols[j];
          });
          y += 6;
        });
      }

      // ===================== OBSERVACIONES =====================
      chk(30);
      y += 6;
      seccion('7. OBSERVACIONES GENERALES');
      const obsLines = doc.splitTextToSize(form.observaciones_generales || 'Sin observaciones.', cW-4);
      const obsH = Math.max(25, obsLines.length*4.5+6);
      doc.rect(margin, y, cW, obsH);
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(obsLines, margin+2, y+5);
      y += obsH + 8;

      // ===================== DECLARACIÓN FIRMA =====================
      chk(40);
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      const decl = 'El técnico mantenedor y la empresa mantenedora certifican que las operaciones recogidas en este Libro de Mantenimiento han sido realizadas conforme a los requisitos exigidos en la IT 3 del RITE (Real Decreto 1027/2007) y de acuerdo con el Plan de Mantenimiento del fabricante.';
      const declLines = doc.splitTextToSize(decl, cW);
      doc.text(declLines, margin, y); y += declLines.length*5 + 8;

      const fw2 = cW/2-3;
      doc.rect(margin, y, fw2, 22);
      doc.rect(margin+fw2+6, y, fw2, 22);
      doc.setFontSize(7.5);
      doc.text('Firma empresa mantenedora y sello', margin+2, y+18);
      doc.text('Firma titular / responsable de la instalación', margin+fw2+8, y+18);
      y += 25;

      // Nota legal final
      chk(15);
      doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(100,100,100);
      const nota = 'Documento sujeto a la normativa del RITE (RD 1027/2007). Debe conservarse un mínimo de 5 años y estar disponible para inspección por parte de la Administración competente. Cualquier reforma o modificación relevante de la instalación debe quedar reflejada en este libro.';
      const notaLines = doc.splitTextToSize(nota, cW);
      doc.text(notaLines, margin, y);

      const filename = `LibroMantenimiento_RITE_${form.inst_nombre || 'instalacion'}_${form.anio_libro}.pdf`;
      const blob = doc.output('blob');
      setPendingPdfBlob(blob);
      setPendingFilename(filename);
      setShowSaveDialog(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el libro de mantenimiento');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadOnly = () => {
    if (!pendingPdfBlob) return;
    const url = URL.createObjectURL(pendingPdfBlob);
    const a = document.createElement('a'); a.href = url; a.download = pendingFilename; a.click();
    URL.revokeObjectURL(url);
    setShowSaveDialog(false);
    toast.success('Libro de Mantenimiento descargado');
  };

  const handleSaveAndDownload = async () => {
    if (!pendingPdfBlob || !selectedClientId) {
      toast.error('Selecciona un cliente para guardar el documento');
      return;
    }
    try {
      const file = new File([pendingPdfBlob], pendingFilename, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ClientDocument.create({
        client_id: selectedClientId,
        title: `Libro Mantenimiento RITE – ${form.inst_nombre || form.titular_nombre} (${form.anio_libro})`,
        document_type: 'otro',
        file_url,
        building_name: form.inst_nombre,
        tecnico_nombre: form.empresa_nombre || settings?.company_name || '',
        observaciones: form.observaciones_generales,
        fecha_firma: form.anio_libro,
        form_data: form,
      });
      const url = URL.createObjectURL(pendingPdfBlob);
      const a = document.createElement('a'); a.href = url; a.download = pendingFilename; a.click();
      URL.revokeObjectURL(url);
      setShowSaveDialog(false);
      toast.success('Libro guardado en el cliente y descargado');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el documento');
    }
  };

  const periodoColor = { 'Mensual': 'bg-orange-100 text-orange-700', 'Trimestral': 'bg-blue-100 text-blue-700', 'Semestral': 'bg-green-100 text-green-700', 'Anual': 'bg-purple-100 text-purple-700' };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Libro de Mantenimiento RITE" />

        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Real Decreto 1027/2007 — IT 3 RITE</strong> — Documento obligatorio que recoge todas las actuaciones, revisiones y consumos de las instalaciones térmicas. Debe conservarse un mínimo de <strong>5 años</strong>.
          </p>
        </Card>

        {/* Selección cliente/edificio */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Building className="h-4 w-4" />Carga de datos desde cliente/edificio</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleClientChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Edificio/Instalación</Label>
              <Select onValueChange={handleBuildingChange} disabled={!selectedClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Año del libro</Label>
              <Input className="mt-1" value={form.anio_libro} onChange={e => handleChange('anio_libro', e.target.value)} placeholder={String(anioActual)} />
            </div>
          </div>
          {selectedBuildingId && buildingEquipment.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              ✓ {buildingEquipment.length} equipos cargados automáticamente
              {completedRevisions.length > 0 && ` · ${completedRevisions.length} revisiones importadas`}
            </div>
          )}
        </Card>

        {/* Tabs del formulario */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="datos" className="text-xs"><FileText className="h-3 w-3 mr-1" />Datos generales</TabsTrigger>
            <TabsTrigger value="tecnico" className="text-xs"><Settings className="h-3 w-3 mr-1" />Características técnicas</TabsTrigger>
            <TabsTrigger value="preventivo" className="text-xs"><ClipboardList className="h-3 w-3 mr-1" />Plan preventivo</TabsTrigger>
            <TabsTrigger value="operaciones" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Registro operaciones</TabsTrigger>
            <TabsTrigger value="consumos" className="text-xs"><Zap className="h-3 w-3 mr-1" />Consumos</TabsTrigger>
          </TabsList>

          {/* TAB 1: Datos generales */}
          <TabsContent value="datos" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Identificación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Núm. Expediente</Label><Input className="mt-1" value={form.num_expediente} onChange={e=>handleChange('num_expediente',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Titular / Promotor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre / Razón Social</Label><Input className="mt-1" value={form.titular_nombre} onChange={e=>handleChange('titular_nombre',e.target.value)} /></div>
                <div><Label>NIF / CIF</Label><Input className="mt-1" value={form.titular_nif} onChange={e=>handleChange('titular_nif',e.target.value)} /></div>
                <div><Label>Dirección</Label><Input className="mt-1" value={form.titular_direccion} onChange={e=>handleChange('titular_direccion',e.target.value)} /></div>
                <div><Label>Código Postal</Label><Input className="mt-1" value={form.titular_cp} onChange={e=>handleChange('titular_cp',e.target.value)} /></div>
                <div><Label>Localidad</Label><Input className="mt-1" value={form.titular_localidad} onChange={e=>handleChange('titular_localidad',e.target.value)} /></div>
                <div><Label>Teléfono</Label><Input className="mt-1" value={form.titular_telefono} onChange={e=>handleChange('titular_telefono',e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Email</Label><Input className="mt-1" value={form.titular_email} onChange={e=>handleChange('titular_email',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Instalación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Nombre / Emplazamiento</Label><Input className="mt-1" value={form.inst_nombre} onChange={e=>handleChange('inst_nombre',e.target.value)} /></div>
                <div><Label>Dirección</Label><Input className="mt-1" value={form.inst_direccion} onChange={e=>handleChange('inst_direccion',e.target.value)} /></div>
                <div><Label>Código Postal</Label><Input className="mt-1" value={form.inst_cp} onChange={e=>handleChange('inst_cp',e.target.value)} /></div>
                <div><Label>Localidad</Label><Input className="mt-1" value={form.inst_localidad} onChange={e=>handleChange('inst_localidad',e.target.value)} /></div>
                <div><Label>Uso del edificio</Label><Input className="mt-1" value={form.inst_uso} onChange={e=>handleChange('inst_uso',e.target.value)} placeholder="Ej: Residencial, Comercial..." /></div>
                <div><Label>Año de instalación</Label><Input className="mt-1" value={form.inst_año_instalacion} onChange={e=>handleChange('inst_año_instalacion',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Empresa Mantenedora Habilitada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Empresa</Label><Input className="mt-1" value={form.empresa_nombre || settings?.company_name || ''} onChange={e=>handleChange('empresa_nombre',e.target.value)} /></div>
                <div><Label>Núm. R.I.</Label><Input className="mt-1" value={form.empresa_ri} onChange={e=>handleChange('empresa_ri',e.target.value)} /></div>
                <div><Label>Teléfono</Label><Input className="mt-1" value={form.empresa_telefono || settings?.company_phone || ''} onChange={e=>handleChange('empresa_telefono',e.target.value)} /></div>
                <div><Label>Email</Label><Input className="mt-1" value={form.empresa_email || settings?.company_email || ''} onChange={e=>handleChange('empresa_email',e.target.value)} /></div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Director de Mantenimiento <span className="text-xs font-normal text-slate-400">(cuando sea preceptivo)</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre</Label><Input className="mt-1" value={form.director_nombre} onChange={e=>handleChange('director_nombre',e.target.value)} /></div>
                <div><Label>Núm. Colegiado</Label><Input className="mt-1" value={form.director_colegiado} onChange={e=>handleChange('director_colegiado',e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Titulación</Label><Input className="mt-1" value={form.director_titulacion} onChange={e=>handleChange('director_titulacion',e.target.value)} /></div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: Características técnicas */}
          <TabsContent value="tecnico" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Datos Técnicos Generales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Pot. frío total (kW)</Label><Input className="mt-1" type="number" value={form.pot_frio_total} onChange={e=>handleChange('pot_frio_total',e.target.value)} /></div>
                <div><Label>Pot. calor total (kW)</Label><Input className="mt-1" type="number" value={form.pot_calor_total} onChange={e=>handleChange('pot_calor_total',e.target.value)} /></div>
                <div><Label>Tipo de combustible</Label><Input className="mt-1" value={form.tipo_combustible} onChange={e=>handleChange('tipo_combustible',e.target.value)} placeholder="Gas, Gasóleo, Biomasa..." /></div>
                <div><Label>Refrigerante</Label><Input className="mt-1" value={form.refrigerante} onChange={e=>handleChange('refrigerante',e.target.value)} placeholder="R-410A, R-32..." /></div>
                <div><Label>Sup. captadores solares (m²)</Label><Input className="mt-1" type="number" value={form.superficie_solar} onChange={e=>handleChange('superficie_solar',e.target.value)} /></div>
                <div><Label>Vol. acumulación ACS (L)</Label><Input className="mt-1" type="number" value={form.volumen_acumulacion} onChange={e=>handleChange('volumen_acumulacion',e.target.value)} /></div>
              </div>
            </Card>

            {buildingEquipment.length > 0 && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Fichas de Equipos del Edificio ({buildingEquipment.length})</h3>
                <div className="space-y-3">
                  {buildingEquipment.map((eq, i) => (
                    <div key={eq.id} className="p-3 bg-slate-50 rounded-lg border text-sm">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-slate-800">{eq.reference_name || `Equipo ${i+1}`} — {eq.brand} {eq.model}</div>
                        <Badge variant="outline" className="text-xs">{eq.equipment_type}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-600">
                        <span>Frío: <strong>{eq.cooling_power_kw || '—'} kW</strong></span>
                        <span>Calor: <strong>{eq.heating_power_kw || '—'} kW</strong></span>
                        <span>Refrig.: <strong>{eq.refrigerant_type || '—'}</strong></span>
                        <span>N/S: {eq.serial_number || '—'}</span>
                        <span>Ubicación: {eq.location || '—'}</span>
                        <span>Inst.: {eq.installation_date || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: Plan preventivo */}
          <TabsContent value="preventivo">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Registro Anual del Plan Preventivo — {form.anio_libro}</h3>
              <p className="text-xs text-slate-500 mb-4">Marca OK, NOK o NP (No procede) para cada tarea en el mes correspondiente.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left p-2 w-10">#</th>
                      <th className="text-left p-2 min-w-48">Tarea</th>
                      <th className="text-left p-2 w-20">Period.</th>
                      {mesesEspanol.map(m => <th key={m} className="p-1 w-14 text-center">{m.slice(0,3)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tareasPreventivas.map((tarea, i) => (
                      <tr key={tarea.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1 text-slate-400 text-center">{tarea.id}</td>
                        <td className="p-2 text-slate-700">{tarea.tarea}</td>
                        <td className="p-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${periodoColor[tarea.periodicidad]}`}>
                            {tarea.periodicidad.slice(0,3)}
                          </span>
                        </td>
                        {mesesKeys.map(mes => (
                          <td key={mes} className="p-0.5">
                            <select
                              value={form.preventivo[i]?.[mes] || ''}
                              onChange={e => handlePreventivo(i, mes, e.target.value)}
                              className={`w-full h-6 text-xs rounded border text-center ${
                                form.preventivo[i]?.[mes] === 'OK' ? 'bg-green-100 border-green-300' :
                                form.preventivo[i]?.[mes] === 'NOK' ? 'bg-red-100 border-red-300' :
                                form.preventivo[i]?.[mes] === 'NP' ? 'bg-slate-200 border-slate-300' : 'border-input'
                              }`}
                            >
                              <option value="">—</option>
                              <option value="OK">OK</option>
                              <option value="NOK">NOK</option>
                              <option value="NP">NP</option>
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-100 border border-green-300 rounded inline-block"></span>OK = Correcto</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-100 border border-red-300 rounded inline-block"></span>NOK = Incorrecto</span>
                <span className="flex items-center gap-1"><span className="w-4 h-4 bg-slate-200 border border-slate-300 rounded inline-block"></span>NP = No procede</span>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: Registro de operaciones */}
          <TabsContent value="operaciones" className="space-y-4">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-semibold text-slate-800">Registro de Operaciones e Intervenciones</h3>
                <Button size="sm" onClick={addOperacion} className="text-xs"><Plus className="h-3 w-3 mr-1" />Añadir</Button>
              </div>
              {form.operaciones.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No hay operaciones registradas. Pulsa "Añadir" para comenzar.</p>
              ) : (
                <div className="space-y-3">
                  {form.operaciones.map((op, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                      <div><Label className="text-xs">Fecha</Label><Input className="mt-1 h-7 text-xs" value={op.fecha} onChange={e=>updateOperacion(i,'fecha',e.target.value)} placeholder="dd/mm/aaaa" /></div>
                      <div><Label className="text-xs">Tipo</Label><Input className="mt-1 h-7 text-xs" value={op.tipo} onChange={e=>updateOperacion(i,'tipo',e.target.value)} placeholder="Preventivo..." /></div>
                      <div className="md:col-span-2"><Label className="text-xs">Descripción</Label><Input className="mt-1 h-7 text-xs" value={op.descripcion} onChange={e=>updateOperacion(i,'descripcion',e.target.value)} /></div>
                      <div><Label className="text-xs">Técnico</Label><Input className="mt-1 h-7 text-xs" value={op.tecnico} onChange={e=>updateOperacion(i,'tecnico',e.target.value)} /></div>
                      <div className="flex gap-1 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Resultado</Label>
                          <select value={op.resultado} onChange={e=>updateOperacion(i,'resultado',e.target.value)} className="mt-1 h-7 text-xs w-full rounded border border-input bg-background px-1">
                            <option value="">—</option><option value="OK">OK</option><option value="NOK">NOK</option><option value="Pendiente">Pendiente</option>
                          </select>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 mb-0" onClick={()=>removeOperacion(i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-semibold text-slate-800">Registro de Incidencias y Modificaciones</h3>
                <Button size="sm" onClick={addIncidencia} className="text-xs"><Plus className="h-3 w-3 mr-1" />Añadir</Button>
              </div>
              {form.incidencias.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">No hay incidencias registradas.</p>
              ) : (
                <div className="space-y-3">
                  {form.incidencias.map((inc, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                      <div><Label className="text-xs">Fecha</Label><Input className="mt-1 h-7 text-xs" value={inc.fecha} onChange={e=>updateIncidencia(i,'fecha',e.target.value)} /></div>
                      <div className="md:col-span-2"><Label className="text-xs">Descripción</Label><Input className="mt-1 h-7 text-xs" value={inc.descripcion} onChange={e=>updateIncidencia(i,'descripcion',e.target.value)} /></div>
                      <div><Label className="text-xs">Acción correctiva</Label><Input className="mt-1 h-7 text-xs" value={inc.accion} onChange={e=>updateIncidencia(i,'accion',e.target.value)} /></div>
                      <div className="flex gap-1 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Estado</Label>
                          <select value={inc.estado} onChange={e=>updateIncidencia(i,'estado',e.target.value)} className="mt-1 h-7 text-xs w-full rounded border border-input bg-background px-1">
                            <option value="Resuelta">Resuelta</option><option value="Pendiente">Pendiente</option><option value="En curso">En curso</option>
                          </select>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={()=>removeIncidencia(i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 border-b pb-2">Observaciones Generales</h3>
              <Textarea value={form.observaciones_generales} onChange={e=>handleChange('observaciones_generales',e.target.value)} rows={4} placeholder="Observaciones, reformas, cambios relevantes..." className="resize-none" />
            </Card>
          </TabsContent>

          {/* TAB 5: Consumos */}
          <TabsContent value="consumos">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Registro de Consumos Anuales — {form.anio_libro}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Gas natural (kWh)</Label><Input className="mt-1" type="number" value={form.consumos.gas_kwh} onChange={e=>handleConsumo('gas_kwh',e.target.value)} /></div>
                <div><Label>Gas natural (m³)</Label><Input className="mt-1" type="number" value={form.consumos.gas_m3} onChange={e=>handleConsumo('gas_m3',e.target.value)} /></div>
                <div><Label>Gasóleo (litros)</Label><Input className="mt-1" type="number" value={form.consumos.gasoleo_litros} onChange={e=>handleConsumo('gasoleo_litros',e.target.value)} /></div>
                <div><Label>Gasóleo (kWh equiv.)</Label><Input className="mt-1" type="number" value={form.consumos.gasoleo_kwh} onChange={e=>handleConsumo('gasoleo_kwh',e.target.value)} /></div>
                <div><Label>Electricidad (kWh)</Label><Input className="mt-1" type="number" value={form.consumos.electricidad_kwh} onChange={e=>handleConsumo('electricidad_kwh',e.target.value)} /></div>
                <div><Label>Agua (m³)</Label><Input className="mt-1" type="number" value={form.consumos.agua_m3} onChange={e=>handleConsumo('agua_m3',e.target.value)} /></div>
                <div><Label>Solar térmica (kWh)</Label><Input className="mt-1" type="number" value={form.consumos.solar_kwh} onChange={e=>handleConsumo('solar_kwh',e.target.value)} /></div>
                <div><Label>Biomasa (kg)</Label><Input className="mt-1" type="number" value={form.consumos.biomasa_kg} onChange={e=>handleConsumo('biomasa_kg',e.target.value)} /></div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botón generar */}
        <div className="flex justify-end mt-6">
          <Button onClick={generatePDF} disabled={generating} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 text-base">
            {generating ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generando PDF...</>) : (<><Download className="h-5 w-5 mr-2" />Generar Libro de Mantenimiento RITE</>)}
          </Button>
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Libro de Mantenimiento generado</DialogTitle></DialogHeader>
          <div className="py-4 text-slate-600 text-sm">
            <p className="mb-2">¿Deseas guardar este libro en la ficha del cliente?</p>
            {selectedClientId ? (
              <p className="text-slate-400">Se guardará en la pestaña <strong>Documentos</strong> del cliente y podrás consultarlo en cualquier momento.</p>
            ) : (
              <p className="text-amber-600 font-medium">⚠️ No has seleccionado un cliente. Solo podrás descargarlo.</p>
            )}
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