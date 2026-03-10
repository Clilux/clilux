import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Download, Loader2, Save } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

const operacionesPreventivo = [
  "Limpieza de los evaporadores",
  "Limpieza de los condensadores",
  "Drenaje, limpieza y tratamiento del circuito de torres de refrigeración",
  "Comprobación de la estanquidad y niveles de refrigerante y aceite en equipos frigoríficos",
  "Comprobación y limpieza, si procede, de circuito de humos de calderas",
  "Comprobación y limpieza, si procede, de conductos de humos y chimenea",
  "Limpieza del quemador de la caldera",
  "Revisión del vaso de expansión",
  "Revisión de los sistemas de tratamiento de agua",
  "Comprobación de material refractario",
  "Comprobación de estanquidad de cierre entre quemador y caldera",
  "Revisión general de caldera de gas",
  "Revisión general de caldera de gasóleo",
  "Comprobación de niveles de agua en circuitos",
  "Comprobación de estanquidad de circuitos de tuberías",
  "Comprobación de estanquidad de válvulas de interceptación",
  "Comprobación de tarado de elementos de seguridad",
  "Revisión y limpieza de filtros de agua",
  "Revisión y limpieza de filtros de aceite",
  "Revisión de baterías de intercambio térmico",
  "Revisión de aparatos de humectación y enfriamiento evaporativo",
  "Revisión y limpieza de aparatos de recuperación de calor",
  "Revisión de unidades terminales agua-aire",
  "Revisión de unidades terminales de distribución de aire",
  "Revisión y limpieza de unidades de impulsión y retorno de aire",
  "Revisión de equipos autónomos",
  "Revisión de bombas y ventiladores",
  "Revisión del sistema de preparación de agua caliente sanitaria",
  "Revisión del estado del aislamiento térmico",
  "Revisión del sistema de control automático",
  "Instalación de energía solar térmica",
  "Comprobación del estado de almacenamiento de biocombustible sólido",
  "Apertura y cierre del contenedor plegable en instalaciones de biocombustible sólido",
  "Limpieza y retirada de cenizas en instalaciones de biocombustible sólido",
  "Control visual de la caldera de biomasa",
  "Comprobación y limpieza, si procede, de circuito de humos de calderas y conductos de humos y chimeneas en calderas de biomasa",
  "Revisión de los elementos de seguridad en instalaciones de biomasa",
  "Revisión de la red de conductos según criterio de la norma UNE 100012",
  "Revisión de la calidad ambiental según criterios de la norma UNE 171330",
];

const gestionCalor = [
  "Temperatura o presión del fluido portador en entrada y salida del generador de calor",
  "Temperatura ambiente del local o sala de máquinas",
  "Temperatura de los gases de combustión",
  "Contenido en CO y CO₂ en los productos de combustión",
  "Índice de opacidad de los humos en combustibles sólidos o líquidos y de contenido de partículas sólidas en combustibles sólidos",
  "Tiro en la caja de humos de la caldera",
];

const gestionFrio = [
  "Temperatura del fluido exterior en entrada y salida del evaporador",
  "Temperatura del fluido exterior en entrada y salida del condensador",
  "Pérdida de presión en el evaporador en plantas enfriadas por agua",
  "Pérdida de presión en el condensador en plantas enfriadas por agua",
  "Temperatura y presión de evaporador",
  "Temperatura y presión de condensación",
  "Potencia eléctrica absorbida",
  "Potencia térmica instantánea del generador, como porcentaje de la carga máxima",
  "CEE o COP instantáneo",
  "Caudal de agua en el evaporador",
  "Caudal de agua en el condensador",
];

export default function CertificadoRITE() {
  const [generating, setGenerating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingPdfBlob, setPendingPdfBlob] = useState(null);
  const [pendingFilename, setPendingFilename] = useState('');

  // RITE compliance criteria per RD 1027/2007
  const criteriasRITE = [
    // IT 1 - Diseño y dimensionado
    { id: 'it1_1', seccion: 'IT 1.1 – Calidad del ambiente interior', texto: 'La instalación garantiza las condiciones de calidad del aire interior (categorías IDA) según tabla 1.4.2.1' },
    { id: 'it1_2', seccion: 'IT 1.2 – Exigencia de calidad del aire interior', texto: 'El caudal de aire exterior es el mínimo exigido para cada categoría de calidad del aire (IDA 1 a IDA 4)' },
    { id: 'it1_3', seccion: 'IT 1.2.4.5 – Filtración', texto: 'Los filtros de aire cumplen los requisitos de eficacia mínima (clases G4, F6, F7, F8, F9 o superiores según corresponda)' },
    { id: 'it1_4', seccion: 'IT 1.3.4 – Eficiencia energética', texto: 'Los equipos de generación de frío y calor cumplen los rendimientos mínimos exigidos (COP/EER mínimos)' },
    { id: 'it1_5', seccion: 'IT 1.3.4.1 – Generadores de calor', texto: 'Las calderas tienen rendimiento estacional ≥ 90% (gas natural) o ≥ 85% (gasóleo) para potencias > 70 kW' },
    { id: 'it1_6', seccion: 'IT 1.3.4.2 – Generadores de frío', texto: 'Las enfriadoras cumplen los valores mínimos de EER en condiciones de referencia según tabla IT 1.3.4.2' },
    { id: 'it1_7', seccion: 'IT 1.3.4.4 – Redes de tuberías y conductos', texto: 'Las redes de distribución disponen del aislamiento térmico exigido (Tabla 1.2.4.2 de espesores mínimos)' },
    { id: 'it1_8', seccion: 'IT 1.3.4.5 – Control', texto: 'La instalación dispone de un sistema de control automático con regulación de temperatura (termostatos, sondas, etc.)' },
    { id: 'it1_9', seccion: 'IT 1.3.4.6 – Contabilización de energía', texto: 'La instalación dispone de contadores de energía según los umbrales de potencia exigidos (≥ 70 kW)' },
    { id: 'it1_10', seccion: 'IT 1.3.4.7 – Recuperación de energía', texto: 'La instalación incorpora sistemas de recuperación de calor donde es preceptivo (caudal ≥ 0,5 m³/s)' },
    // IT 2 - Montaje
    { id: 'it2_1', seccion: 'IT 2 – Montaje', texto: 'La instalación ha sido ejecutada por empresa instaladora habilitada y se dispone del certificado de instalación' },
    { id: 'it2_2', seccion: 'IT 2.1 – Proyecto', texto: 'La instalación dispone de proyecto técnico firmado por técnico competente (obligatorio para P > 70 kW)' },
    // IT 3 - Mantenimiento
    { id: 'it3_1', seccion: 'IT 3.1 – Manual de uso y mantenimiento', texto: 'Existe el "Manual de uso y mantenimiento" de la instalación disponible en el edificio' },
    { id: 'it3_2', seccion: 'IT 3.2 – Empresa mantenedora', texto: 'El mantenimiento es realizado por empresa mantenedora habilitada con contrato vigente (para P > 5 kW)' },
    { id: 'it3_3', seccion: 'IT 3.3 – Frecuencia mantenimiento', texto: 'Las operaciones de mantenimiento se realizan con la frecuencia exigida según tablas 3.3 y 3.4 del RITE' },
    { id: 'it3_4', seccion: 'IT 3.3 – Registro operaciones', texto: 'Existe el "Libro de mantenimiento" o registro de todas las operaciones realizadas con fechas y resultados' },
    { id: 'it3_5', seccion: 'IT 3.3 – Inspecciones periódicas', texto: 'Se han realizado las inspecciones periódicas obligatorias por organismo de control autorizado (OCA) en el plazo exigido' },
    // IT 4 - Inspección
    { id: 'it4_1', seccion: 'IT 4.1 – Inspección de calderas', texto: 'Las calderas con potencia > 20 kW (calef.) o > 12 kW (ACS) han sido inspeccionadas en los plazos reglamentarios' },
    { id: 'it4_2', seccion: 'IT 4.2 – Inspección de instalaciones de A/A', texto: 'Las instalaciones de climatización con P > 12 kW (frío) han sido inspeccionadas cada 5 años por OCA' },
    { id: 'it4_3', seccion: 'IT 4 – Certificado de inspección', texto: 'Se dispone del certificado de inspección vigente emitido por OCA o técnico competente' },
    // Refrigerantes
    { id: 'ref_1', seccion: 'Reglamento F-Gas – Refrigerantes HFC', texto: 'Los equipos con refrigerantes HFC cumplen la normativa de control de fugas (Reg. 517/2014): revisiones periódicas según carga' },
    { id: 'ref_2', seccion: 'F-Gas – Registro operador', texto: 'El operador de equipos con ≥ 5 ton CO2-eq de refrigerante tiene contrato con empresa frigorista certificada (carné F-Gas)' },
    // Legionella (si aplica)
    { id: 'leg_1', seccion: 'RD 487/2022 – Legionella (si aplica)', texto: 'Las instalaciones de riesgo de legionella (torres, ACS, adiabáticos) disponen de programa de control aprobado por sanidad' },
  ];

  const [form, setForm] = useState({
    num_certificado: '',
    // Cumplimiento RITE
    criterias_rite: criteriasRITE.map(c => ({ id: c.id, cumple: '', observacion: '' })),
    // Titular
    titular_nombre: '',
    titular_nif: '',
    titular_direccion: '',
    titular_cp: '',
    titular_localidad: '',
    titular_poblacion: '',
    titular_email: '',
    titular_telefono: '',
    // Instalación
    inst_emplazamiento: '',
    inst_direccion: '',
    inst_cp: '',
    inst_localidad: '',
    inst_poblacion: '',
    // Director obra
    director_nombre: '',
    director_colegiado: '',
    director_colegio: '',
    // Empresa mantenedora
    empresa_nombre: '',
    empresa_ri: '',
    // Técnico
    tecnico_nombre: '',
    tecnico_nif: '',
    // Características técnicas
    pot_frio: '',
    pot_calor: '',
    num_gen_frio: '',
    num_gen_calor: '',
    tipos_gen_frio: '',
    tipos_gen_calor: '',
    superficie_solar: '',
    // Operaciones preventivo (resultado y fecha)
    preventivo: operacionesPreventivo.map(() => ({ resultado: '', fecha: '' })),
    // Gestión energética calor
    gestion_calor: gestionCalor.map(() => ({ resultado: '', fecha: '' })),
    // Gestión energética frío
    gestion_frio: gestionFrio.map(() => ({ resultado: '', fecha: '' })),
    // Observaciones
    observaciones: '',
    // Fecha firma
    lugar_firma: '',
    dia_firma: '',
    mes_firma: '',
    anio_firma: new Date().getFullYear().toString(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings-rite', selectedClientId],
    queryFn: () => base44.entities.Building.filter({ client_id: selectedClientId }),
    enabled: !!selectedClientId,
  });

  const { data: buildingEquipment = [] } = useQuery({
    queryKey: ['equipment-rite', selectedBuildingId],
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
        titular_email: client.email || '',
        titular_telefono: client.phone || '',
      }));
    }
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuildingId(buildingId);
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
      setForm(prev => ({
        ...prev,
        inst_emplazamiento: building.name || '',
        inst_direccion: building.address || '',
        inst_cp: building.postal_code || '',
        inst_localidad: building.city || '',
      }));
    }
  };

  // Cuando llegan los equipos del edificio, autocalcular potencias y tipos
  React.useEffect(() => {
    if (buildingEquipment.length === 0) return;
    const potFrio = buildingEquipment.reduce((sum, eq) => sum + (parseFloat(eq.cooling_power_kw) || 0), 0);
    const potCalor = buildingEquipment.reduce((sum, eq) => sum + (parseFloat(eq.heating_power_kw) || 0), 0);
    const tiposFrio = [...new Set(buildingEquipment.filter(eq => eq.cooling_power_kw > 0).map(eq => eq.equipment_type).filter(Boolean))].join(', ');
    const tiposCalor = [...new Set(buildingEquipment.filter(eq => eq.heating_power_kw > 0).map(eq => eq.equipment_type).filter(Boolean))].join(', ');
    const numFrio = buildingEquipment.filter(eq => eq.cooling_power_kw > 0).length;
    const numCalor = buildingEquipment.filter(eq => eq.heating_power_kw > 0).length;
    setForm(prev => ({
      ...prev,
      pot_frio: potFrio > 0 ? potFrio.toFixed(2) : prev.pot_frio,
      pot_calor: potCalor > 0 ? potCalor.toFixed(2) : prev.pot_calor,
      tipos_gen_frio: tiposFrio || prev.tipos_gen_frio,
      tipos_gen_calor: tiposCalor || prev.tipos_gen_calor,
      num_gen_frio: numFrio > 0 ? String(numFrio) : prev.num_gen_frio,
      num_gen_calor: numCalor > 0 ? String(numCalor) : prev.num_gen_calor,
    }));
  }, [buildingEquipment]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCriteriaRITE = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.criterias_rite];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, criterias_rite: updated };
    });
  };

  const handleOperacion = (type, index, field, value) => {
    setForm(prev => {
      const updated = [...prev[type]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [type]: updated };
    });
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.width, h: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const requiresDirector = parseFloat(form.pot_calor) > 5000 || parseFloat(form.pot_frio) > 1000;

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 15;
      const requiresDirectorPDF = parseFloat(form.pot_calor) > 5000 || parseFloat(form.pot_frio) > 1000;

      // Precargar logo y marca de agua
      let logoData = null;
      if (settings?.logo_url) {
        logoData = await loadImageAsBase64(settings.logo_url);
      }
      let watermarkData = null;
      if (settings?.watermark_url) {
        watermarkData = await loadImageAsBase64(settings.watermark_url);
      }

      const addWatermark = () => {
        if (!watermarkData) return;
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        const wmMaxW = 120;
        const wmAspect = watermarkData.w / watermarkData.h;
        const wmW = wmMaxW;
        const wmH = wmW / wmAspect;
        doc.addImage(watermarkData.dataUrl, 'PNG', (pageW - wmW) / 2, (297 - wmH) / 2, wmW, wmH);
        doc.restoreGraphicsState();
      };

      let pageCount = 1;
      const addPage = () => {
        addWatermark();
        doc.addPage();
        pageCount++;
        y = 15;
        addPageHeader(pageCount);
      };

      const checkPageBreak = (needed = 8) => {
        if (y + needed > 280) addPage();
      };

      // Color corporativo desde settings
      const corpColorHex = settings?.button_color || '#1e3a5f';
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      const [cr, cg, cb] = hexToRgb(corpColorHex);

      const addPageHeader = (pageNum) => {
        // Fondo corporativo en cabecera
        doc.setFillColor(cr, cg, cb);
        doc.rect(margin, y, contentW, 22, 'F');

        // Logo a la izquierda
        if (logoData) {
          const logoMaxH = 18;
          const logoAspect = logoData.w / logoData.h;
          const logoW = Math.min(logoMaxH * logoAspect, 40);
          const logoH = logoW / logoAspect;
          doc.addImage(logoData.dataUrl, 'PNG', margin + 2, y + 2, logoW, logoH);
        }

        // Texto centrado en blanco
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICADO DE MANTENIMIENTO', pageW / 2, y + 8, { align: 'center' });
        doc.text('DE INSTALACIONES TÉRMICAS EN LOS EDIFICIOS', pageW / 2, y + 15, { align: 'center' });

        // Número de página en esquina derecha
        doc.setFontSize(13);
        doc.text(String(pageNum), margin + contentW - 5, y + 14, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        y += 24;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Art. 28 del Reglamento de Instalaciones Térmicas en los Edificios (Real Decreto 1027/2007)', margin, y);
        y += 6;
      };

      addPageHeader(1);
      addWatermark();

      const drawSection = (title) => {
        checkPageBreak(12);
        doc.setFillColor(cr, cg, cb);
        doc.rect(margin, y, contentW, 6, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, pageW / 2, y + 4.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += 7;
      };

      const drawField = (label, value, x, w, rowH = 6) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(label, x + 1, y + 4);
        doc.setFont('helvetica', 'normal');
        const val = value || '';
        doc.text(String(val), x + 1 + doc.getTextWidth(label) + 2, y + 4);
        doc.rect(x, y, w, rowH);
        y += rowH;
      };

      const drawRow = (items) => {
        // items: [{label, value, w}]
        let x = margin;
        const rowH = 6;
        items.forEach(item => {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(item.label + ':', x + 1, y + 4);
          doc.setFont('helvetica', 'normal');
          if (item.value) doc.text(String(item.value), x + 1 + doc.getTextWidth(item.label + ':') + 1, y + 4);
          doc.rect(x, y, item.w, rowH);
          x += item.w;
        });
        y += rowH;
      };

      // Num certificado
      checkPageBreak(8);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentW, 6);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NÚM. CERTIFICADO:', margin + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(form.num_certificado || '', margin + 40, y + 4);
      y += 7;

      // Titular
      drawSection('TITULAR / PROMOTOR');
      drawRow([
        { label: 'Nombre/Razón Social', value: form.titular_nombre, w: contentW * 0.65 },
        { label: 'NIF/CIF', value: form.titular_nif, w: contentW * 0.35 },
      ]);
      drawRow([
        { label: 'Dirección', value: form.titular_direccion, w: contentW * 0.75 },
        { label: 'C.P.', value: form.titular_cp, w: contentW * 0.25 },
      ]);
      drawRow([
        { label: 'Localidad', value: form.titular_localidad, w: contentW * 0.5 },
        { label: 'Población', value: form.titular_poblacion, w: contentW * 0.5 },
      ]);
      drawRow([
        { label: 'Correo electrónico', value: form.titular_email, w: contentW * 0.5 },
        { label: 'Teléfono', value: form.titular_telefono, w: contentW * 0.25 },
        { label: 'Fax', value: '', w: contentW * 0.25 },
      ]);

      // Instalación
      drawSection('INSTALACIÓN');
      drawRow([{ label: 'Emplazamiento', value: form.inst_emplazamiento, w: contentW }]);
      drawRow([
        { label: 'Dirección', value: form.inst_direccion, w: contentW * 0.75 },
        { label: 'C.P.', value: form.inst_cp, w: contentW * 0.25 },
      ]);
      drawRow([
        { label: 'Localidad', value: form.inst_localidad, w: contentW * 0.5 },
        { label: 'Población', value: form.inst_poblacion, w: contentW * 0.5 },
      ]);

      // Director obra
      drawSection('DIRECTOR DE OBRA (cuando su participación se preceptiva)');
      drawRow([
        { label: 'Nombre', value: form.director_nombre, w: contentW * 0.6 },
        { label: 'Colegiado', value: form.director_colegiado, w: contentW * 0.4 },
      ]);
      drawRow([{ label: 'Colegio profesional', value: form.director_colegio, w: contentW }]);

      // Empresa mantenedora
      drawSection('EMPRESA MANTENEDORA HABILITADA');
      drawRow([
        { label: 'Nombre', value: form.empresa_nombre || settings?.company_name || '', w: contentW * 0.7 },
        { label: 'Núm. R.I.', value: form.empresa_ri, w: contentW * 0.3 },
      ]);

      // Técnico mantenedor
      drawSection('TÉCNICO MANTENEDOR');
      drawRow([
        { label: 'Nombre', value: form.tecnico_nombre, w: contentW * 0.7 },
        { label: 'NIF', value: form.tecnico_nif, w: contentW * 0.3 },
      ]);

      // Características técnicas
      drawSection('CARACTERÍSTICAS TÉCNICAS DE LA INSTALACIÓN');
      drawRow([
        { label: 'Pot. térmica total en frío', value: form.pot_frio ? form.pot_frio + ' kW' : '', w: contentW * 0.5 },
        { label: 'Pot. térmica total en calor', value: form.pot_calor ? form.pot_calor + ' kW' : '', w: contentW * 0.5 },
      ]);
      drawRow([
        { label: 'Núm. de generadores (frío)', value: form.num_gen_frio, w: contentW * 0.5 },
        { label: 'Núm. de generadores (calor)', value: form.num_gen_calor, w: contentW * 0.5 },
      ]);
      drawRow([{ label: 'Tipos de generadores (frío)', value: form.tipos_gen_frio, w: contentW }]);
      drawRow([{ label: 'Tipos de generadores (calor)', value: form.tipos_gen_calor, w: contentW }]);
      drawRow([{ label: 'Superficie de Captadores Solares Térmicos', value: form.superficie_solar ? form.superficie_solar + ' m²' : '', w: contentW }]);

      // Operaciones preventivo
      checkPageBreak(12);
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('OPERACIONES DE MANTENIMIENTO DEL PROGRAMA PREVENTIVO', margin + 2, y + 4.5);
      y += 7;

      // Header operaciones
      checkPageBreak(6);
      doc.setFontSize(7.5);
      doc.setFillColor(cr * 0.85, cg * 0.85, cb * 0.85);
      doc.rect(margin, y, contentW - 25, 5, 'F');
      doc.rect(margin + contentW - 25, y, 25, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('IT 3 del Reglamento... (Real decreto 1027/2007)', margin + 2, y + 3.5);
      doc.text('Resultado', margin + contentW - 23, y + 3.5);
      doc.setTextColor(0, 0, 0);
      y += 5;

      operacionesPreventivo.forEach((op, i) => {
        checkPageBreak(5);
        doc.setFontSize(7);
        doc.rect(margin, y, 7, 5);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i + 1), margin + 2, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.rect(margin + 7, y, contentW - 57, 5);
        const lines = doc.splitTextToSize(op, contentW - 60);
        doc.text(lines[0], margin + 9, y + 3.5);
        doc.rect(margin + contentW - 50, y, 25, 5);
        doc.text(form.preventivo[i]?.resultado || '', margin + contentW - 48, y + 3.5);
        doc.rect(margin + contentW - 25, y, 25, 5);
        doc.text(form.preventivo[i]?.fecha || '', margin + contentW - 23, y + 3.5);
        y += 5;
      });

      // Página 2
      addPage();

      // Gestión energética - calor
      checkPageBreak(10);
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('OPERACIONES DE MANTENIMIENTO DEL PROGRAMA DE GESTIÓN ENERGÉTICA', pageW / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 7;

      // Generadores de calor header
      checkPageBreak(6);
      doc.setFillColor(cr * 0.85, cg * 0.85, cb * 0.85);
      doc.rect(margin, y, contentW - 25, 5, 'F');
      doc.rect(margin + contentW - 25, y, 25, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Generadores de calor', margin + 2, y + 3.5);
      doc.text('Resultado', margin + contentW - 23, y + 3.5);
      doc.setTextColor(0, 0, 0);
      y += 5;

      gestionCalor.forEach((op, i) => {
        checkPageBreak(5);
        doc.setFontSize(7);
        doc.rect(margin, y, 7, 5);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i + 1), margin + 2, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.rect(margin + 7, y, contentW - 57, 5);
        const lines = doc.splitTextToSize(op, contentW - 60);
        doc.text(lines[0], margin + 9, y + 3.5);
        doc.rect(margin + contentW - 50, y, 25, 5);
        doc.text(form.gestion_calor[i]?.resultado || '', margin + contentW - 48, y + 3.5);
        doc.rect(margin + contentW - 25, y, 25, 5);
        doc.text(form.gestion_calor[i]?.fecha || '', margin + contentW - 23, y + 3.5);
        y += 5;
      });

      // Generadores de frío header
      checkPageBreak(6);
      doc.setFillColor(cr * 0.85, cg * 0.85, cb * 0.85);
      doc.rect(margin, y, contentW - 25, 5, 'F');
      doc.rect(margin + contentW - 25, y, 25, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Generadores de frío', margin + 2, y + 3.5);
      doc.text('Resultado', margin + contentW - 23, y + 3.5);
      doc.setTextColor(0, 0, 0);
      y += 5;

      gestionFrio.forEach((op, i) => {
        checkPageBreak(5);
        doc.setFontSize(7);
        doc.rect(margin, y, 7, 5);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i + 1), margin + 2, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.rect(margin + 7, y, contentW - 57, 5);
        const lines = doc.splitTextToSize(op, contentW - 60);
        doc.text(lines[0], margin + 9, y + 3.5);
        doc.rect(margin + contentW - 50, y, 25, 5);
        doc.text(form.gestion_frio[i]?.resultado || '', margin + contentW - 48, y + 3.5);
        doc.rect(margin + contentW - 25, y, 25, 5);
        doc.text(form.gestion_frio[i]?.fecha || '', margin + contentW - 23, y + 3.5);
        y += 5;
      });

      // Observaciones
      checkPageBreak(20);
      doc.setFillColor(cr, cg, cb);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('OBSERVACIONES', pageW / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const obsLines = doc.splitTextToSize(form.observaciones || '', contentW - 4);
      const obsH = Math.max(20, obsLines.length * 5 + 4);
      doc.rect(margin, y, contentW, obsH);
      doc.text(obsLines, margin + 2, y + 4);
      y += obsH + 5;

      // Declaración
      checkPageBreak(20);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const decText = 'El mantenedor habilitador y el director de mantenimiento, cuando su participación sea preceptiva, certifica o certifican que la instalación antes indicada ha sido mantenida de acuerdo con el "Manual de uso y mantenimiento" y que cumple con los requisitos exigidos en la IT 3 del Reglamento de instalaciones térmicas en los edificios (Real Decreto 1027/2007).';
      const decLines = doc.splitTextToSize(decText, contentW);
      doc.text(decLines, margin, y);
      y += decLines.length * 5 + 6;

      // Lugar y fecha firma
      checkPageBreak(10);
      doc.setFontSize(8);
      doc.text(`${form.lugar_firma || '_______________'}, ${form.dia_firma || '__'} de ${form.mes_firma || '___________'} de ${form.anio_firma || '20__'}`, margin, y);
      y += 10;

      // Firmas
      checkPageBreak(20);
      const fw = contentW / 3;
      doc.setFontSize(7.5);
      doc.rect(margin, y, fw - 2, 18);
      doc.text('Firma del mantenedor', margin + 2, y + 14);
      doc.text('y sello de la empresa instaladora', margin + 2, y + 17);
      doc.rect(margin + fw, y, fw - 2, 18);
      doc.text('Firma del director de mantenimiento', margin + fw + 2, y + 14);
      doc.rect(margin + fw * 2, y, fw, 18);
      doc.text('Firma del titular', margin + fw * 2 + 2, y + 14);
      y += 20;

      // Nota final
      checkPageBreak(12);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      const nota = 'Este certificado tiene una validez de un año (art. 28.1 del Real Decreto 1027/2007). El titular de la instalación ha de mantener una copia de éste en posesión, i estará a disposición de las autoridades competentes que así lo exijan para inspección o cualquier otro requerimiento.';
      const notaLines = doc.splitTextToSize(nota, contentW);
      doc.text(notaLines, margin, y);

      const filename = `Certificado_RITE_${form.titular_nombre || 'cliente'}_${new Date().getFullYear()}.pdf`;
      const blob = doc.output('blob');
      setPendingPdfBlob(blob);
      setPendingFilename(filename);
      setShowSaveDialog(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el certificado');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadOnly = () => {
    if (!pendingPdfBlob) return;
    const url = URL.createObjectURL(pendingPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pendingFilename;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveDialog(false);
    toast.success('Certificado RITE descargado');
  };

  const handleSaveAndDownload = async () => {
    if (!pendingPdfBlob || !selectedClientId) {
      toast.error('Debes seleccionar un cliente para guardar el documento');
      return;
    }
    try {
      const file = new File([pendingPdfBlob], pendingFilename, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const building = buildings.find(b => b.id === selectedBuildingId);
      const fechaFirma = [form.dia_firma, form.mes_firma, form.anio_firma].filter(Boolean).join(' de ');
      await base44.entities.ClientDocument.create({
        client_id: selectedClientId,
        title: `Certificado RITE – ${form.inst_emplazamiento || building?.name || form.titular_nombre || 'Sin nombre'}`,
        document_type: 'certificado_rite',
        file_url,
        num_certificado: form.num_certificado,
        building_name: form.inst_emplazamiento || building?.name || '',
        tecnico_nombre: form.tecnico_nombre,
        observaciones: form.observaciones,
        fecha_firma: fechaFirma,
        form_data: form,
      });
      // También descargar
      const url = URL.createObjectURL(pendingPdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pendingFilename;
      a.click();
      URL.revokeObjectURL(url);
      setShowSaveDialog(false);
      toast.success('Certificado guardado en el cliente y descargado');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el documento');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Certificado RITE de Mantenimiento" />

        {/* Cabecera informativa */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Art. 28 del RITE (Real Decreto 1027/2007)</strong> — Rellena el formulario y genera el certificado oficial en PDF. 
            Validez: 1 año.
          </p>
        </Card>

        {/* Selección cliente y edificio */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">Carga rápida desde cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleClientChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Edificio (instalación)</Label>
              <Select onValueChange={handleBuildingChange} disabled={!selectedClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar edificio..." />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Num certificado */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Núm. Certificado</Label>
              <Input className="mt-1" value={form.num_certificado} onChange={e => handleChange('num_certificado', e.target.value)} placeholder="Ej: 2024-001" />
            </div>
          </div>
        </Card>

        {/* Titular */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Titular / Promotor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <Label>Nombre / Razón Social</Label>
              <Input className="mt-1" value={form.titular_nombre} onChange={e => handleChange('titular_nombre', e.target.value)} />
            </div>
            <div>
              <Label>NIF / CIF</Label>
              <Input className="mt-1" value={form.titular_nif} onChange={e => handleChange('titular_nif', e.target.value)} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input className="mt-1" value={form.titular_direccion} onChange={e => handleChange('titular_direccion', e.target.value)} />
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input className="mt-1" value={form.titular_cp} onChange={e => handleChange('titular_cp', e.target.value)} />
            </div>
            <div>
              <Label>Localidad</Label>
              <Input className="mt-1" value={form.titular_localidad} onChange={e => handleChange('titular_localidad', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" value={form.titular_email} onChange={e => handleChange('titular_email', e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input className="mt-1" value={form.titular_telefono} onChange={e => handleChange('titular_telefono', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Instalación */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Instalación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Emplazamiento</Label>
              <Input className="mt-1" value={form.inst_emplazamiento} onChange={e => handleChange('inst_emplazamiento', e.target.value)} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input className="mt-1" value={form.inst_direccion} onChange={e => handleChange('inst_direccion', e.target.value)} />
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input className="mt-1" value={form.inst_cp} onChange={e => handleChange('inst_cp', e.target.value)} />
            </div>
            <div>
              <Label>Localidad</Label>
              <Input className="mt-1" value={form.inst_localidad} onChange={e => handleChange('inst_localidad', e.target.value)} />
            </div>
            <div>
              <Label>Población</Label>
              <Input className="mt-1" value={form.inst_poblacion} onChange={e => handleChange('inst_poblacion', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Director obra */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Director de Obra <span className="text-xs font-normal text-slate-400">(cuando su participación sea preceptiva)</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input className="mt-1" value={form.director_nombre} onChange={e => handleChange('director_nombre', e.target.value)} />
            </div>
            <div>
              <Label>Núm. Colegiado</Label>
              <Input className="mt-1" value={form.director_colegiado} onChange={e => handleChange('director_colegiado', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Colegio Profesional</Label>
              <Input className="mt-1" value={form.director_colegio} onChange={e => handleChange('director_colegio', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Empresa mantenedora */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Empresa Mantenedora Habilitada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input className="mt-1" value={form.empresa_nombre || settings?.company_name || ''} onChange={e => handleChange('empresa_nombre', e.target.value)} />
            </div>
            <div>
              <Label>Núm. R.I.</Label>
              <Input className="mt-1" value={form.empresa_ri} onChange={e => handleChange('empresa_ri', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Técnico mantenedor */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Técnico Mantenedor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input className="mt-1" value={form.tecnico_nombre} onChange={e => handleChange('tecnico_nombre', e.target.value)} />
            </div>
            <div>
              <Label>NIF</Label>
              <Input className="mt-1" value={form.tecnico_nif} onChange={e => handleChange('tecnico_nif', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Características técnicas */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Características Técnicas de la Instalación</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Pot. térmica frío (kW)</Label>
              <Input className="mt-1" type="number" value={form.pot_frio} onChange={e => handleChange('pot_frio', e.target.value)} />
            </div>
            <div>
              <Label>Pot. térmica calor (kW)</Label>
              <Input className="mt-1" type="number" value={form.pot_calor} onChange={e => handleChange('pot_calor', e.target.value)} />
            </div>
            <div>
              <Label>Nº generadores frío</Label>
              <Input className="mt-1" type="number" value={form.num_gen_frio} onChange={e => handleChange('num_gen_frio', e.target.value)} />
            </div>
            <div>
              <Label>Nº generadores calor</Label>
              <Input className="mt-1" type="number" value={form.num_gen_calor} onChange={e => handleChange('num_gen_calor', e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Label>Superficie captadores solares (m²)</Label>
              <Input className="mt-1" type="number" value={form.superficie_solar} onChange={e => handleChange('superficie_solar', e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Label>Tipos generadores frío</Label>
              <Input className="mt-1" value={form.tipos_gen_frio} onChange={e => handleChange('tipos_gen_frio', e.target.value)} placeholder="Ej: Enfriadora, Split..." />
            </div>
            <div className="md:col-span-3">
              <Label>Tipos generadores calor</Label>
              <Input className="mt-1" value={form.tipos_gen_calor} onChange={e => handleChange('tipos_gen_calor', e.target.value)} placeholder="Ej: Caldera gas, Bomba calor..." />
            </div>
          </div>
        </Card>

        {/* Criterios de Cumplimiento RITE */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-2 border-b pb-2">Criterios de Cumplimiento RITE (RD 1027/2007)</h3>
          <p className="text-xs text-slate-500 mb-4">Marca si cada criterio del Reglamento de Instalaciones Térmicas en Edificios se cumple, no cumple, o no aplica a esta instalación.</p>
          
          {/* Summary badges */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {['Sí cumple', 'No cumple', 'No aplica'].map(estado => {
              const count = (form.criterias_rite || []).filter(c => c.cumple === estado).length;
              const color = estado === 'Sí cumple' ? 'bg-green-100 text-green-700' : estado === 'No cumple' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
              return (
                <span key={estado} className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
                  {estado}: {count}
                </span>
              );
            })}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              Sin responder: {(form.criterias_rite || []).filter(c => !c.cumple).length}
            </span>
          </div>

          <div className="space-y-2">
            {criteriasRITE.map((criterio, i) => {
              const val = form.criterias_rite?.[i] || {};
              const rowColor = val.cumple === 'Sí cumple' ? 'bg-green-50 border-green-200' : val.cumple === 'No cumple' ? 'bg-red-50 border-red-200' : val.cumple === 'No aplica' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200';
              return (
                <div key={criterio.id} className={`p-3 border rounded-lg ${rowColor} transition-colors`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-500 mb-0.5">{criterio.seccion}</div>
                      <div className="text-sm text-slate-700">{criterio.texto}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <select
                        value={val.cumple || ''}
                        onChange={e => handleCriteriaRITE(i, 'cumple', e.target.value)}
                        className={`h-8 text-xs rounded border px-2 font-medium
                          ${val.cumple === 'Sí cumple' ? 'bg-green-100 border-green-300 text-green-800' :
                            val.cumple === 'No cumple' ? 'bg-red-100 border-red-300 text-red-800' :
                            val.cumple === 'No aplica' ? 'bg-slate-100 border-slate-300 text-slate-600' :
                            'bg-white border-slate-300 text-slate-500'}`}
                      >
                        <option value="">— Valorar —</option>
                        <option value="Sí cumple">✓ Sí cumple</option>
                        <option value="No cumple">✗ No cumple</option>
                        <option value="No aplica">— No aplica</option>
                      </select>
                    </div>
                  </div>
                  {val.cumple === 'No cumple' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={val.observacion || ''}
                        onChange={e => handleCriteriaRITE(i, 'observacion', e.target.value)}
                        placeholder="Observación o acción correctiva..."
                        className="w-full h-7 text-xs rounded border border-red-300 bg-white px-2 text-slate-700"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Operaciones preventivo */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Operaciones de Mantenimiento — Programa Preventivo (IT 3)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-2 w-8">#</th>
                  <th className="text-left p-2">Operación</th>
                  <th className="text-left p-2 w-36">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {operacionesPreventivo.map((op, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2 text-slate-500 font-medium">{i + 1}</td>
                    <td className="p-2 text-slate-700">{op}</td>
                    <td className="p-2">
                      <select
                        value={form.preventivo[i]?.resultado || ''}
                        onChange={e => handleOperacion('preventivo', i, 'resultado', e.target.value)}
                        className="h-7 text-xs w-full rounded border border-input bg-background px-2"
                      >
                        <option value="">—</option>
                        <option value="OK">OK</option>
                        <option value="NOK">NOK</option>
                        <option value="No procede">No procede</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Gestión energética */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Operaciones de Mantenimiento — Programa de Gestión Energética</h3>
          
          <h4 className="font-medium text-slate-700 mb-3 mt-2">Generadores de Calor</h4>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-2 w-8">#</th>
                  <th className="text-left p-2">Operación</th>
                  <th className="text-left p-2 w-36">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {gestionCalor.map((op, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2 text-slate-500 font-medium">{i + 1}</td>
                    <td className="p-2 text-slate-700">{op}</td>
                    <td className="p-2">
                      <Input
                        value={form.gestion_calor[i]?.resultado || ''}
                        onChange={e => handleOperacion('gestion_calor', i, 'resultado', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Valor"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="font-medium text-slate-700 mb-3">Generadores de Frío</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-2 w-8">#</th>
                  <th className="text-left p-2">Operación</th>
                  <th className="text-left p-2 w-36">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {gestionFrio.map((op, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2 text-slate-500 font-medium">{i + 1}</td>
                    <td className="p-2 text-slate-700">{op}</td>
                    <td className="p-2">
                      <Input
                        value={form.gestion_frio[i]?.resultado || ''}
                        onChange={e => handleOperacion('gestion_frio', i, 'resultado', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Valor"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Observaciones */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Observaciones</h3>
          <Textarea
            value={form.observaciones}
            onChange={e => handleChange('observaciones', e.target.value)}
            rows={4}
            placeholder="Observaciones adicionales..."
            className="resize-none"
          />
        </Card>

        {/* Fecha firma */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Lugar y Fecha de Firma</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Lugar</Label>
              <Input className="mt-1" value={form.lugar_firma} onChange={e => handleChange('lugar_firma', e.target.value)} placeholder="Barcelona" />
            </div>
            <div>
              <Label>Día</Label>
              <Input className="mt-1" value={form.dia_firma} onChange={e => handleChange('dia_firma', e.target.value)} placeholder="15" />
            </div>
            <div>
              <Label>Mes</Label>
              <Input className="mt-1" value={form.mes_firma} onChange={e => handleChange('mes_firma', e.target.value)} placeholder="marzo" />
            </div>
            <div>
              <Label>Año</Label>
              <Input className="mt-1" value={form.anio_firma} onChange={e => handleChange('anio_firma', e.target.value)} placeholder="2024" />
            </div>
          </div>
        </Card>

        {/* Declaración legal */}
        <Card className="p-5 bg-slate-50 border border-slate-200 mb-6">
          <p className="text-xs text-slate-600">
            <strong>Declaración:</strong> El mantenedor habilitador y el director de mantenimiento, cuando su participación sea preceptiva, certifica o certifican que la instalación antes indicada ha sido mantenida de acuerdo con el "Manual de uso y mantenimiento" y que cumple con los requisitos exigidos en la IT 3 del Reglamento de instalaciones térmicas en los edificios (Real Decreto 1027/2007).
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Este certificado tiene una validez de un año (art. 28.1 del Real Decreto 1027/2007).
          </p>
        </Card>

        {/* Botón generar */}
        <div className="flex justify-end">
          <Button
            onClick={generatePDF}
            disabled={generating}
            className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 text-base"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generando PDF...</>
            ) : (
              <><Download className="h-5 w-5 mr-2" />Generar Certificado RITE</>
            )}
          </Button>
        </div>
      </div>

      {/* Diálogo guardar o solo descargar */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Certificado generado</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-600 text-sm">
            <p className="mb-2">¿Deseas guardar este certificado en la ficha del cliente?</p>
            {selectedClientId ? (
              <p className="text-slate-400">
                Se guardará en la pestaña <strong>Documentos</strong> del cliente seleccionado y podrás consultarlo en cualquier momento.
              </p>
            ) : (
              <p className="text-amber-600 font-medium">⚠️ No has seleccionado un cliente. Solo podrás descargarlo.</p>
            )}
          </div>
          <DialogFooter className="flex gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={handleDownloadOnly} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Solo descargar
            </Button>
            <Button
              onClick={handleSaveAndDownload}
              disabled={!selectedClientId}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar y descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}