import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Building2, User, Calendar, CreditCard, Wrench, Plus, Trash2, Download, Eye, ChevronRight, ChevronLeft, HardHat, ClipboardList, FolderOpen, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';
import NavHeader from '../components/navigation/NavHeader';

const STEPS = [
  { id: 1, label: 'Tipo', icon: ClipboardList },
  { id: 2, label: 'Cliente', icon: User },
  { id: 3, label: 'Empresa', icon: Building2 },
  { id: 4, label: 'Duración', icon: Calendar },
  { id: 5, label: 'Tarifas', icon: CreditCard },
  { id: 6, label: 'Trabajos', icon: Wrench },
  { id: 7, label: 'Vista previa', icon: Eye },
];

const DEFAULT_TRABAJOS_MANTENIMIENTO = `El servicio de mantenimiento preventivo incluye las siguientes actuaciones:

• Revisión y limpieza de filtros de aire y unidades interiores/exteriores.
• Comprobación del circuito frigorífico: presiones, temperaturas y estanqueidad.
• Revisión del sistema eléctrico: conexiones, protecciones y consumos.
• Limpieza de condensadores y evaporadores.
• Verificación del funcionamiento en modo frío y calor.
• Comprobación de niveles de refrigerante y detección de fugas.
• Lubricación de partes móviles cuando sea necesario.
• Informe técnico de cada visita realizada.`;

const DEFAULT_TRABAJOS_INSTALACIONES = `El presente contrato de instalación comprende los siguientes trabajos:

• Suministro e instalación de los equipos descritos en el presupuesto adjunto.
• Conexionado eléctrico y frigorífico según normativa vigente.
• Puesta en marcha y verificación del correcto funcionamiento.
• Configuración de parámetros y mandos a distancia.
• Pruebas de estanqueidad y carga de refrigerante si aplica.
• Formación básica al usuario sobre el uso y mantenimiento.
• Documentación técnica y garantías de los equipos instalados.`;

const DEFAULT_CLAUSULAS = `El presente contrato se regirá por las siguientes condiciones generales:

1. El contratista realizará las revisiones programadas en las fechas acordadas con el cliente, con un margen de 5 días hábiles.
2. Las reparaciones de averías causadas por mal uso o daños externos no están incluidas en este contrato.
3. El precio del contrato podrá revisarse anualmente según el IPC publicado por el INE.
4. Cualquiera de las partes podrá resolver el contrato con un preaviso de 30 días por escrito.
5. En caso de avería urgente, el tiempo de respuesta será de 24-48 horas hábiles.`;

const DEFAULT_LOPD = `CLÁUSULA DE PROTECCIÓN DE DATOS PERSONALES

En cumplimiento de lo establecido en la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), y del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016 (RGPD), le informamos que:

RESPONSABLE DEL TRATAMIENTO: Los datos personales facilitados por el CLIENTE serán tratados por [NOMBRE EMPRESA] como responsable del tratamiento.

FINALIDAD: Los datos serán utilizados exclusivamente para la gestión, ejecución y seguimiento del presente contrato de mantenimiento, así como para el envío de comunicaciones relacionadas con el mismo.

LEGITIMACIÓN: La base legal del tratamiento es la ejecución del contrato (art. 6.1.b RGPD).

CONSERVACIÓN: Los datos se conservarán durante la vigencia del contrato y, una vez finalizado, durante los plazos legalmente exigibles.

DESTINATARIOS: Los datos no serán cedidos a terceros salvo obligación legal.

DERECHOS: El CLIENTE podrá ejercitar los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de sus datos dirigiéndose por escrito al domicilio del RESPONSABLE o al correo electrónico indicado en este contrato, adjuntando copia de su documento de identidad.

RECLAMACIÓN: Si considera que el tratamiento no se ajusta a la normativa vigente, podrá presentar reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).`;

export default function ContratoMantenimiento() {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [nuevoClienteMode, setNuevoClienteMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tipoContrato, setTipoContrato] = useState('mantenimiento');
  const [savedContratoId, setSavedContratoId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [form, setForm] = useState({
    // Cliente
    cliente_nombre: '',
    cliente_cif: '',
    cliente_direccion: '',
    cliente_ciudad: '',
    cliente_cp: '',
    cliente_telefono: '',
    cliente_email: '',
    cliente_representante: '',

    // Empresa
    empresa_nombre: '',
    empresa_cif: '',
    empresa_direccion: '',
    empresa_ciudad: '',
    empresa_cp: '',
    empresa_telefono: '',
    empresa_email: '',
    empresa_web: '',
    empresa_representante: '',

    // Duración
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    duracion_meses: '12',
    renovacion_automatica: 'si',

    // Tarifas
    precio_anual: '',
    precio_mensual: '',
    forma_pago: 'mensual',
    metodo_pago: 'transferencia',
    iban: '',
    num_revisiones_anuales: '4',
    incluye_materiales: 'no',
    incluye_urgencias: 'no',
    lineas_tarifas_horas: [
      { concepto: 'Horas de administración', horas_incluidas: '', precio_hora: '' },
    ],

    // Instalaciones
    presupuesto_numero: '',
    presupuesto_fecha: '',
    presupuesto_importe: '',
    presupuesto_descripcion: '',

    // Trabajos
    descripcion_trabajos: DEFAULT_TRABAJOS_MANTENIMIENTO,
    clausulas: DEFAULT_CLAUSULAS,
    lopd_texto: DEFAULT_LOPD,
    lugar_firma: '',
    numero_contrato: `MC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    tipo_contrato: 'mantenimiento',
  });

  useEffect(() => {
    const load = async () => {
      const [cls, settingsArr] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.AppSettings.filter({ setting_key: 'main' }),
      ]);
      setClients(cls.filter(c => c.status === 'active'));
      if (settingsArr[0]) {
        const s = settingsArr[0];
        setSettings(s);
        setForm(prev => ({
          ...prev,
          empresa_nombre: s.company_name || '',
          empresa_cif: s.company_cif || '',
          empresa_direccion: s.company_address || '',
          empresa_ciudad: s.company_city || '',
          empresa_cp: s.company_postal_code || '',
          empresa_telefono: s.company_phone || '',
          empresa_email: s.company_email || '',
          empresa_web: s.company_web || '',
          lopd_texto: DEFAULT_LOPD.replace('[NOMBRE EMPRESA]', s.company_name || '[NOMBRE EMPRESA]'),
        }));
      }
    };
    load();
  }, []);

  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    setForm(prev => ({
      ...prev,
      cliente_nombre: c.name || '',
      cliente_cif: c.cif || '',
      cliente_direccion: c.address || '',
      cliente_ciudad: c.city || '',
      cliente_cp: c.postal_code || '',
      cliente_telefono: c.phone || '',
      cliente_email: c.email || '',
      cliente_representante: c.contact_person || '',
    }));
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const updateLineaTarifa = (idx, key, value) => {
    const newLineas = [...(form.lineas_tarifas_horas || [])];
    newLineas[idx] = { ...newLineas[idx], [key]: value };
    set('lineas_tarifas_horas', newLineas);
  };

  const addLineaTarifa = () => {
    set('lineas_tarifas_horas', [...(form.lineas_tarifas_horas || []), { concepto: '', horas_incluidas: '', precio_hora: '' }]);
  };

  const removeLineaTarifa = (idx) => {
    set('lineas_tarifas_horas', (form.lineas_tarifas_horas || []).filter((_, i) => i !== idx));
  };

  const saveDraft = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const fechaFin = form.fecha_fin || calcFechaFin(form.fecha_inicio, form.duracion_meses);
      const contratoData = {
        numero_contrato: form.numero_contrato,
        tipo_contrato: tipoContrato,
        estado: 'realizado',
        cliente_nombre: form.cliente_nombre,
        cliente_cif: form.cliente_cif,
        cliente_id: selectedClientId || '',
        fecha_inicio: form.fecha_inicio,
        fecha_fin: fechaFin,
        precio_anual: form.precio_anual ? Number(form.precio_anual) : null,
        forma_pago: form.forma_pago,
        form_data: { ...form, tipoContrato },
      };
      let id = savedContratoId;
      if (id) {
        await base44.entities.Contrato.update(id, contratoData);
      } else {
        const existing = await base44.entities.Contrato.filter({ numero_contrato: form.numero_contrato });
        if (existing.length > 0) {
          await base44.entities.Contrato.update(existing[0].id, contratoData);
          id = existing[0].id;
        } else {
          const created = await base44.entities.Contrato.create(contratoData);
          id = created.id;
        }
        setSavedContratoId(id);
      }
      setSaveMsg('✓ Guardado');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg('Error al guardar');
    }
    setSaving(false);
  };

  const calcFechaFin = (inicio, meses) => {
    if (!inicio || !meses) return '';
    const d = new Date(inicio);
    d.setMonth(d.getMonth() + parseInt(meses));
    return d.toISOString().split('T')[0];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const generatePDF = async () => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 20;

    const addText = (text, x, yPos, options = {}) => {
      doc.setFontSize(options.size || 10);
      doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
      if (options.color) doc.setTextColor(...options.color);
      else doc.setTextColor(30, 30, 30);
      doc.text(text, x, yPos, options);
    };

    const checkPage = (needed = 10) => {
      if (y + needed > 275) {
        doc.addPage();
        y = 20;
      }
    };

    const drawLine = (yPos) => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageW - margin, yPos);
    };

    const sectionTitle = (title) => {
      checkPage(15);
      doc.setFillColor(30, 64, 175);
      doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
      addText(title.toUpperCase(), margin + 4, y + 5.5, { size: 9, bold: true, color: [255, 255, 255] });
      y += 12;
    };

    const field = (label, value, x, yPos, w) => {
      addText(label + ':', x, yPos, { size: 8, bold: true, color: [80, 80, 80] });
      addText(value || '—', x, yPos + 5, { size: 9 });
    };

    // Header
    const tituloContrato = tipoContrato === 'instalaciones' ? 'CONTRATO DE INSTALACIÓN' : 'CONTRATO DE MANTENIMIENTO';
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 35, 'F');
    addText(tituloContrato, margin, 15, { size: 16, bold: true, color: [255, 255, 255] });
    addText(`Nº ${form.numero_contrato}`, margin, 24, { size: 10, color: [180, 200, 255] });
    addText(`Fecha: ${formatDate(form.fecha_inicio)}`, pageW - margin, 15, { size: 9, color: [200, 220, 255], align: 'right' });
    if (form.empresa_nombre) addText(form.empresa_nombre, pageW - margin, 22, { size: 10, bold: true, color: [255, 255, 255], align: 'right' });
    y = 45;

    // Partes
    sectionTitle('PARTES DEL CONTRATO');

    addText('CONTRATISTA (Empresa de mantenimiento):', margin, y, { size: 9, bold: true });
    y += 6;
    const col1 = margin;
    const col2 = margin + contentW / 2 + 5;
    field('Empresa', form.empresa_nombre, col1, y, 80);
    field('CIF', form.empresa_cif, col2, y, 40);
    y += 12;
    field('Dirección', `${form.empresa_direccion} ${form.empresa_ciudad} ${form.empresa_cp}`.trim(), col1, y, 120);
    field('Teléfono', form.empresa_telefono, col2, y, 40);
    y += 12;
    field('Email', form.empresa_email, col1, y, 80);
    if (form.empresa_representante) { field('Representante', form.empresa_representante, col2, y, 80); }
    y += 14;
    drawLine(y); y += 6;

    addText('CLIENTE:', margin, y, { size: 9, bold: true });
    y += 6;
    field('Nombre / Razón social', form.cliente_nombre, col1, y, 80);
    field('CIF/NIF', form.cliente_cif, col2, y, 40);
    y += 12;
    field('Dirección', `${form.cliente_direccion} ${form.cliente_ciudad} ${form.cliente_cp}`.trim(), col1, y, 120);
    field('Teléfono', form.cliente_telefono, col2, y, 40);
    y += 12;
    field('Email', form.cliente_email, col1, y, 80);
    if (form.cliente_representante) { field('Representante', form.cliente_representante, col2, y, 80); }
    y += 16;

    // Duración
    sectionTitle('DURACIÓN DEL CONTRATO');
    field('Fecha de inicio', formatDate(form.fecha_inicio), col1, y, 60);
    field('Fecha de fin', formatDate(form.fecha_fin || calcFechaFin(form.fecha_inicio, form.duracion_meses)), col2, y, 60);
    y += 12;
    field('Duración', `${form.duracion_meses} meses`, col1, y, 60);
    field('Renovación automática', form.renovacion_automatica === 'si' ? 'Sí, por períodos iguales' : 'No', col2, y, 80);
    y += 16;

    // Tarifas
    sectionTitle('CONDICIONES ECONÓMICAS');
    if (form.precio_anual) { field('Precio anual', `${form.precio_anual} € + IVA`, col1, y, 70); }
    if (form.precio_mensual) { field('Cuota mensual', `${form.precio_mensual} € + IVA`, col2, y, 70); }
    y += 12;
    const formasPago = { mensual: 'Mensual', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
    const metodosPago = { transferencia: 'Transferencia bancaria', domiciliacion: 'Domiciliación bancaria', efectivo: 'Efectivo', cheque: 'Cheque' };
    field('Periodicidad de pago', formasPago[form.forma_pago] || form.forma_pago, col1, y, 70);
    field('Método de pago', metodosPago[form.metodo_pago] || form.metodo_pago, col2, y, 70);
    y += 12;
    if (form.iban) { field('IBAN', form.iban, col1, y, 120); y += 12; }
    if (tipoContrato === 'mantenimiento') {
      field('Revisiones incluidas/año', form.num_revisiones_anuales, col1, y, 70);
      field('Materiales incluidos', form.incluye_materiales === 'si' ? 'Sí' : 'No', col2, y, 70);
      y += 12;
      field('Urgencias incluidas (24h)', form.incluye_urgencias === 'si' ? 'Sí' : 'No', col1, y, 70);
    }
    const lineas = (form.lineas_tarifas_horas || []).filter(l => l.concepto || l.horas_incluidas || l.precio_hora);
    if (lineas.length > 0) {
      y += 8;
      addText('Tarifas de horas:', col1, y, { size: 8, bold: true, color: [80, 80, 80] });
      y += 6;
      for (const l of lineas) {
        checkPage(6);
        const txt = `• ${l.concepto || '—'}: ${l.horas_incluidas ? l.horas_incluidas + ' h incluidas' : ''}${l.precio_hora ? ' · ' + l.precio_hora + ' €/h extra' : ''}`;
        addText(txt.trim(), col1 + 2, y, { size: 9 });
        y += 6;
      }
    }
    y += 10;

    // Presupuesto adjunto (instalaciones)
    if (tipoContrato === 'instalaciones' && form.presupuesto_numero) {
      checkPage(20);
      sectionTitle('PRESUPUESTO ADJUNTO');
      field('Nº Presupuesto', form.presupuesto_numero, col1, y, 70);
      if (form.presupuesto_fecha) field('Fecha', formatDate(form.presupuesto_fecha), col2, y, 60);
      y += 12;
      if (form.presupuesto_importe) field('Importe total', `${form.presupuesto_importe} € + IVA`, col1, y, 70);
      y += 12;
      if (form.presupuesto_descripcion) {
        const presLines = doc.splitTextToSize(form.presupuesto_descripcion, contentW);
        for (const line of presLines) { checkPage(6); addText(line, margin, y, { size: 9 }); y += 5; }
      }
      y += 8;
    }

    // Trabajos
    sectionTitle('DESCRIPCIÓN DE LOS TRABAJOS');
    const trabajoLines = doc.splitTextToSize(form.descripcion_trabajos, contentW);
    for (const line of trabajoLines) {
      checkPage(6);
      addText(line, margin, y, { size: 9 });
      y += 5;
    }
    y += 8;

    // Cláusulas
    checkPage(20);
    sectionTitle('CONDICIONES GENERALES');
    const clausulasLines = doc.splitTextToSize(form.clausulas, contentW);
    for (const line of clausulasLines) {
      checkPage(6);
      addText(line, margin, y, { size: 9 });
      y += 5;
    }
    y += 12;

    // LOPD
    checkPage(20);
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
    addText('CLÁUSULA DE PROTECCIÓN DE DATOS (LEY ORGÁNICA 3/2018 - LOPDGDD)', margin + 4, y + 5.5, { size: 9, bold: true, color: [30, 64, 175] });
    y += 12;
    const lopdLines = doc.splitTextToSize(form.lopd_texto, contentW);
    for (const line of lopdLines) {
      checkPage(6);
      addText(line, margin, y, { size: 8, color: [60, 60, 80] });
      y += 4.5;
    }
    y += 10;

    // Firmas
    checkPage(50);
    sectionTitle('FIRMAS');
    y += 4;
    const lugarFecha = `En ${form.lugar_firma || '_______________'}, a ${formatDate(form.fecha_inicio)}`;
    addText(lugarFecha, margin, y, { size: 9 });
    y += 14;

    doc.setDrawColor(180, 180, 180);
    doc.line(col1, y + 10, col1 + 75, y + 10);
    doc.line(col2, y + 10, col2 + 75, y + 10);
    addText('EL CONTRATISTA', col1 + 10, y + 16, { size: 8, bold: true, color: [100, 100, 100] });
    addText(form.empresa_nombre, col1 + 10, y + 21, { size: 8, color: [100, 100, 100] });
    addText('EL CLIENTE', col2 + 15, y + 16, { size: 8, bold: true, color: [100, 100, 100] });
    addText(form.cliente_nombre, col2 + 15, y + 21, { size: 8, color: [100, 100, 100] });

    doc.save(`Contrato_${form.numero_contrato}_${form.cliente_nombre || 'cliente'}.pdf`);

    // Guardar en la carpeta de contratos
    try {
      const existing = await base44.entities.Contrato.filter({ numero_contrato: form.numero_contrato });
      const fechaFin = form.fecha_fin || calcFechaFin(form.fecha_inicio, form.duracion_meses);
      const contratoData = {
        numero_contrato: form.numero_contrato,
        tipo_contrato: tipoContrato,
        estado: 'realizado',
        cliente_nombre: form.cliente_nombre,
        cliente_cif: form.cliente_cif,
        cliente_id: selectedClientId || '',
        fecha_inicio: form.fecha_inicio,
        fecha_fin: fechaFin,
        precio_anual: form.precio_anual ? Number(form.precio_anual) : null,
        forma_pago: form.forma_pago,
        form_data: { ...form, tipoContrato },
      };
      if (existing.length > 0) {
        await base44.entities.Contrato.update(existing[0].id, contratoData);
      } else {
        await base44.entities.Contrato.create(contratoData);
      }
    } catch (e) {
      console.error('Error guardando contrato:', e);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = step === s.id;
        const done = step > s.id;
        return (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => setStep(s.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                active ? 'bg-blue-600 text-white' : done ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );

  const inputCls = "bg-white border-slate-200 text-slate-800";

  const handleTipoContrato = (tipo) => {
    setTipoContrato(tipo);
    set('tipo_contrato', tipo);
    set('descripcion_trabajos', tipo === 'instalaciones' ? DEFAULT_TRABAJOS_INSTALACIONES : DEFAULT_TRABAJOS_MANTENIMIENTO);
    set('numero_contrato', `${tipo === 'instalaciones' ? 'CI' : 'MC'}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  };

  const renderStep0 = () => (
    <div className="space-y-6">
      <p className="text-slate-500 text-sm">Selecciona el tipo de contrato que deseas generar.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleTipoContrato('mantenimiento')}
          className={`p-6 rounded-xl border-2 text-left transition-all ${tipoContrato === 'mantenimiento' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tipoContrato === 'mantenimiento' ? 'bg-blue-600' : 'bg-slate-100'}`}>
              <Wrench className={`w-5 h-5 ${tipoContrato === 'mantenimiento' ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <span className={`font-semibold text-lg ${tipoContrato === 'mantenimiento' ? 'text-blue-700' : 'text-slate-700'}`}>Mantenimiento</span>
          </div>
          <p className="text-sm text-slate-500">Contrato de mantenimiento preventivo y/o correctivo de equipos. Incluye revisiones periódicas, horas de asistencia y condiciones de servicio.</p>
          {tipoContrato === 'mantenimiento' && <span className="mt-3 inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded-full">Seleccionado</span>}
        </button>

        <button
          type="button"
          onClick={() => handleTipoContrato('instalaciones')}
          className={`p-6 rounded-xl border-2 text-left transition-all ${tipoContrato === 'instalaciones' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tipoContrato === 'instalaciones' ? 'bg-orange-500' : 'bg-slate-100'}`}>
              <HardHat className={`w-5 h-5 ${tipoContrato === 'instalaciones' ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <span className={`font-semibold text-lg ${tipoContrato === 'instalaciones' ? 'text-orange-600' : 'text-slate-700'}`}>Instalaciones</span>
          </div>
          <p className="text-sm text-slate-500">Contrato de instalación de nuevos equipos. Permite adjuntar presupuesto, definir horas de administración y condiciones de la obra.</p>
          {tipoContrato === 'instalaciones' && <span className="mt-3 inline-block text-xs bg-orange-500 text-white px-2 py-1 rounded-full">Seleccionado</span>}
        </button>
      </div>
    </div>
  );

  const handleNuevoCliente = () => {
    setNuevoClienteMode(true);
    setSelectedClientId('');
    setForm(prev => ({
      ...prev,
      cliente_nombre: '',
      cliente_cif: '',
      cliente_direccion: '',
      cliente_ciudad: '',
      cliente_cp: '',
      cliente_telefono: '',
      cliente_email: '',
      cliente_representante: '',
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Button
          type="button"
          variant={!nuevoClienteMode ? 'default' : 'outline'}
          onClick={() => setNuevoClienteMode(false)}
          className="flex-1"
        >
          Cliente existente
        </Button>
        <Button
          type="button"
          variant={nuevoClienteMode ? 'default' : 'outline'}
          onClick={handleNuevoCliente}
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-1" /> Nuevo cliente (sin guardar)
        </Button>
      </div>

      {nuevoClienteMode ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          ℹ️ Los datos introducidos se usarán solo para este contrato y <strong>no se guardarán</strong> en la base de datos.
        </div>
      ) : (
        <div>
          <Label className="text-slate-600 mb-2 block">Seleccionar cliente existente</Label>
          <Select value={selectedClientId} onValueChange={handleClientSelect}>
            <SelectTrigger className={inputCls}>
              <SelectValue placeholder="Buscar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.cif}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label className="text-slate-600">Nombre / Razón social *</Label><Input className={inputCls} value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Empresa S.L." /></div>
        <div><Label className="text-slate-600">CIF/NIF *</Label><Input className={inputCls} value={form.cliente_cif} onChange={e => set('cliente_cif', e.target.value)} placeholder="B12345678" /></div>
        <div className="md:col-span-2"><Label className="text-slate-600">Dirección</Label><Input className={inputCls} value={form.cliente_direccion} onChange={e => set('cliente_direccion', e.target.value)} placeholder="Calle Mayor 1" /></div>
        <div><Label className="text-slate-600">Ciudad</Label><Input className={inputCls} value={form.cliente_ciudad} onChange={e => set('cliente_ciudad', e.target.value)} /></div>
        <div><Label className="text-slate-600">Código Postal</Label><Input className={inputCls} value={form.cliente_cp} onChange={e => set('cliente_cp', e.target.value)} /></div>
        <div><Label className="text-slate-600">Teléfono</Label><Input className={inputCls} value={form.cliente_telefono} onChange={e => set('cliente_telefono', e.target.value)} /></div>
        <div><Label className="text-slate-600">Email</Label><Input className={inputCls} value={form.cliente_email} onChange={e => set('cliente_email', e.target.value)} /></div>
        <div className="md:col-span-2"><Label className="text-slate-600">Persona representante / contacto</Label><Input className={inputCls} value={form.cliente_representante} onChange={e => set('cliente_representante', e.target.value)} placeholder="D./Dña. ..." /></div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><Label className="text-slate-600">Nombre empresa *</Label><Input className={inputCls} value={form.empresa_nombre} onChange={e => set('empresa_nombre', e.target.value)} /></div>
      <div><Label className="text-slate-600">CIF</Label><Input className={inputCls} value={form.empresa_cif} onChange={e => set('empresa_cif', e.target.value)} /></div>
      <div className="md:col-span-2"><Label className="text-slate-600">Dirección fiscal</Label><Input className={inputCls} value={form.empresa_direccion} onChange={e => set('empresa_direccion', e.target.value)} /></div>
      <div><Label className="text-slate-600">Ciudad</Label><Input className={inputCls} value={form.empresa_ciudad} onChange={e => set('empresa_ciudad', e.target.value)} /></div>
      <div><Label className="text-slate-600">Código Postal</Label><Input className={inputCls} value={form.empresa_cp} onChange={e => set('empresa_cp', e.target.value)} /></div>
      <div><Label className="text-slate-600">Teléfono</Label><Input className={inputCls} value={form.empresa_telefono} onChange={e => set('empresa_telefono', e.target.value)} /></div>
      <div><Label className="text-slate-600">Email</Label><Input className={inputCls} value={form.empresa_email} onChange={e => set('empresa_email', e.target.value)} /></div>
      <div><Label className="text-slate-600">Web</Label><Input className={inputCls} value={form.empresa_web} onChange={e => set('empresa_web', e.target.value)} /></div>
      <div><Label className="text-slate-600">Representante legal</Label><Input className={inputCls} value={form.empresa_representante} onChange={e => set('empresa_representante', e.target.value)} placeholder="D./Dña. ..." /></div>
    </div>
  );

  const renderStep3 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label className="text-slate-600">Número de contrato</Label>
        <Input className={inputCls} value={form.numero_contrato} onChange={e => set('numero_contrato', e.target.value)} />
      </div>
      <div>
        <Label className="text-slate-600">Lugar de firma</Label>
        <Input className={inputCls} value={form.lugar_firma} onChange={e => set('lugar_firma', e.target.value)} placeholder="Madrid" />
      </div>
      <div>
        <Label className="text-slate-600">Fecha de inicio</Label>
        <Input className={inputCls} type="date" value={form.fecha_inicio} onChange={e => {
          const val = e.target.value;
          set('fecha_inicio', val);
          set('fecha_fin', calcFechaFin(val, form.duracion_meses));
        }} />
      </div>
      <div>
        <Label className="text-slate-600">Duración (meses)</Label>
        <Select value={form.duracion_meses} onValueChange={v => { set('duracion_meses', v); set('fecha_fin', calcFechaFin(form.fecha_inicio, v)); }}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            {['1','3','6','12','24','36'].map(m => <SelectItem key={m} value={m}>{m} {m === '1' ? 'mes' : 'meses'}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-slate-600">Fecha de fin (calculada)</Label>
        <Input className={`${inputCls} bg-slate-50`} type="date" value={form.fecha_fin || calcFechaFin(form.fecha_inicio, form.duracion_meses)} onChange={e => set('fecha_fin', e.target.value)} />
      </div>
      <div>
        <Label className="text-slate-600">Renovación automática</Label>
        <Select value={form.renovacion_automatica} onValueChange={v => set('renovacion_automatica', v)}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="si">Sí, por períodos iguales</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-600">{tipoContrato === 'instalaciones' ? 'Importe total instalación (€ sin IVA)' : 'Precio anual (€ sin IVA)'}</Label>
          <Input className={inputCls} type="number" value={form.precio_anual} onChange={e => set('precio_anual', e.target.value)} placeholder="1200" />
        </div>
        <div>
          <Label className="text-slate-600">Periodicidad de facturación</Label>
          <Select value={form.forma_pago} onValueChange={v => set('forma_pago', v)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-600">
            Cuota {form.forma_pago === 'trimestral' ? 'trimestral' : form.forma_pago === 'semestral' ? 'semestral' : form.forma_pago === 'anual' ? 'anual' : 'mensual'} (€ sin IVA)
          </Label>
          <Input className={inputCls} type="number" value={form.precio_mensual} onChange={e => set('precio_mensual', e.target.value)} placeholder="100" />
        </div>
        <div>
          <Label className="text-slate-600">Método de pago</Label>
          <Select value={form.metodo_pago} onValueChange={v => set('metodo_pago', v)}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
              <SelectItem value="domiciliacion">Domiciliación bancaria</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.metodo_pago === 'domiciliacion' && (
          <div className="md:col-span-2">
            <Label className="text-slate-600">IBAN del cliente</Label>
            <Input className={inputCls} value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
          </div>
        )}

        {tipoContrato === 'mantenimiento' && (<>
          <div>
            <Label className="text-slate-600">Nº de revisiones al año</Label>
            <Select value={form.num_revisiones_anuales} onValueChange={v => set('num_revisiones_anuales', v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1','2','3','4','6','12'].map(n => <SelectItem key={n} value={n}>{n} visita{n !== '1' ? 's' : ''}/año</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-600">¿Incluye materiales?</Label>
            <Select value={form.incluye_materiales} onValueChange={v => set('incluye_materiales', v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No incluido</SelectItem>
                <SelectItem value="si">Sí incluido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-600">¿Incluye urgencias 24h?</Label>
            <Select value={form.incluye_urgencias} onValueChange={v => set('incluye_urgencias', v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No incluido</SelectItem>
                <SelectItem value="si">Sí incluido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>)}

        {tipoContrato === 'instalaciones' && (
          <div className="md:col-span-2 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-orange-700">Datos del Presupuesto Adjunto</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-600">Nº Presupuesto</Label>
                <Input className={inputCls} value={form.presupuesto_numero} onChange={e => set('presupuesto_numero', e.target.value)} placeholder="PRES-2026-001" />
              </div>
              <div>
                <Label className="text-slate-600">Fecha presupuesto</Label>
                <Input className={inputCls} type="date" value={form.presupuesto_fecha} onChange={e => set('presupuesto_fecha', e.target.value)} />
              </div>
              <div>
                <Label className="text-slate-600">Importe (€ sin IVA)</Label>
                <Input className={inputCls} type="number" value={form.presupuesto_importe} onChange={e => set('presupuesto_importe', e.target.value)} placeholder="5000" />
              </div>
              <div className="md:col-span-3">
                <Label className="text-slate-600">Descripción del presupuesto</Label>
                <Textarea className={`${inputCls} min-h-[80px] text-sm`} value={form.presupuesto_descripcion} onChange={e => set('presupuesto_descripcion', e.target.value)} placeholder="Equipos y trabajos descritos en el presupuesto..." />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tarifas de horas — líneas dinámicas */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-700">Tarifas de horas</p>
            <span className="text-xs text-slate-400">(administración, urgencias, desplazamientos...)</span>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addLineaTarifa} className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50">
            <Plus className="w-3 h-3" /> Añadir línea
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 font-medium px-1">
            <div className="col-span-5">Concepto</div>
            <div className="col-span-3">Horas incluidas</div>
            <div className="col-span-3">€/hora (extra)</div>
            <div className="col-span-1"></div>
          </div>
          {(form.lineas_tarifas_horas || []).map((linea, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  className={`${inputCls} text-sm`}
                  value={linea.concepto}
                  onChange={e => updateLineaTarifa(idx, 'concepto', e.target.value)}
                  placeholder="Ej: Horas urgencias"
                />
              </div>
              <div className="col-span-3">
                <Input
                  className={`${inputCls} text-sm`}
                  type="number"
                  value={linea.horas_incluidas}
                  onChange={e => updateLineaTarifa(idx, 'horas_incluidas', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-3">
                <Input
                  className={`${inputCls} text-sm`}
                  type="number"
                  value={linea.precio_hora}
                  onChange={e => updateLineaTarifa(idx, 'precio_hora', e.target.value)}
                  placeholder="55"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button type="button" onClick={() => removeLineaTarifa(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">Añade tantas líneas como tipos de horas quieras reflejar en el contrato.</p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-slate-600 mb-1 block font-medium">Descripción de los trabajos incluidos</Label>
        <p className="text-xs text-slate-400 mb-2">Este texto aparecerá en el contrato. Puedes modificarlo libremente.</p>
        <Textarea className={`${inputCls} min-h-[180px] text-sm`} value={form.descripcion_trabajos} onChange={e => set('descripcion_trabajos', e.target.value)} />
      </div>
      <div>
        <Label className="text-slate-600 mb-1 block font-medium">Condiciones generales y cláusulas</Label>
        <p className="text-xs text-slate-400 mb-2">Condiciones legales, penalizaciones, prórrogas, etc.</p>
        <Textarea className={`${inputCls} min-h-[180px] text-sm`} value={form.clausulas} onChange={e => set('clausulas', e.target.value)} />
      </div>
      <div>
        <Label className="text-slate-600 mb-1 block font-medium flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">LOPDGDD</span>
          Cláusula de Protección de Datos
        </Label>
        <p className="text-xs text-slate-400 mb-2">Incluida automáticamente según Ley Orgánica 3/2018 y RGPD. Puedes editarla si es necesario.</p>
        <Textarea className={`${inputCls} min-h-[200px] text-sm`} value={form.lopd_texto} onChange={e => set('lopd_texto', e.target.value)} />
      </div>
    </div>
  );

  const renderStep6 = () => {
    const fechaFin = form.fecha_fin || calcFechaFin(form.fecha_inicio, form.duracion_meses);
    const formasPago = { mensual: 'Mensual', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
    const metodosPago = { transferencia: 'Transferencia bancaria', domiciliacion: 'Domiciliación bancaria', efectivo: 'Efectivo', cheque: 'Cheque' };
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-slate-500 text-sm">Revisa los datos antes de generar el PDF.</p>
          <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Download className="w-4 h-4" /> Generar PDF
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className={`text-xl font-bold ${tipoContrato === 'instalaciones' ? 'text-orange-600' : 'text-blue-700'}`}>
                {tipoContrato === 'instalaciones' ? 'CONTRATO DE INSTALACIÓN' : 'CONTRATO DE MANTENIMIENTO'}
              </h2>
              <p className="text-slate-500 text-sm">Nº {form.numero_contrato}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold">{form.empresa_nombre}</p>
              <p>{formatDate(form.fecha_inicio)}</p>
            </div>
          </div>

          {/* Partes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-600 uppercase mb-2">Contratista</p>
              <p className="font-semibold text-slate-800">{form.empresa_nombre || '—'}</p>
              <p className="text-sm text-slate-600">{form.empresa_cif}</p>
              <p className="text-sm text-slate-600">{form.empresa_direccion}</p>
              <p className="text-sm text-slate-600">{form.empresa_telefono} · {form.empresa_email}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Cliente</p>
              <p className="font-semibold text-slate-800">{form.cliente_nombre || '—'}</p>
              <p className="text-sm text-slate-600">{form.cliente_cif}</p>
              <p className="text-sm text-slate-600">{form.cliente_direccion}</p>
              <p className="text-sm text-slate-600">{form.cliente_telefono} · {form.cliente_email}</p>
            </div>
          </div>

          {/* Duración y tarifas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Inicio', value: formatDate(form.fecha_inicio) },
              { label: 'Fin', value: formatDate(fechaFin) },
              { label: tipoContrato === 'instalaciones' ? 'Importe total' : 'Precio anual', value: form.precio_anual ? `${form.precio_anual} €` : '—' },
              { label: `Cuota ${formasPago[form.forma_pago] || 'mensual'}`, value: form.precio_mensual ? `${form.precio_mensual} €` : '—' },
              { label: 'Facturación', value: formasPago[form.forma_pago] },
              { label: 'Pago', value: metodosPago[form.metodo_pago] },
              ...(tipoContrato === 'mantenimiento' ? [
                { label: 'Revisiones/año', value: form.num_revisiones_anuales },
                { label: 'Urgencias', value: form.incluye_urgencias === 'si' ? 'Incluidas' : 'No incluidas' },
              ] : []),
              ...((form.lineas_tarifas_horas || []).filter(l => l.concepto).map(l => ({
                label: l.concepto,
                value: `${l.horas_incluidas ? l.horas_incluidas + ' h incl.' : ''}${l.precio_hora ? ' · ' + l.precio_hora + ' €/h' : ''}`.trim() || '—',
              }))),
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 uppercase">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Presupuesto adjunto (instalaciones) */}
          {tipoContrato === 'instalaciones' && form.presupuesto_numero && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-bold text-orange-600 uppercase mb-2">Presupuesto adjunto</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-slate-400 text-xs block">Nº</span><span className="font-medium">{form.presupuesto_numero}</span></div>
                {form.presupuesto_fecha && <div><span className="text-slate-400 text-xs block">Fecha</span><span className="font-medium">{formatDate(form.presupuesto_fecha)}</span></div>}
                {form.presupuesto_importe && <div><span className="text-slate-400 text-xs block">Importe</span><span className="font-medium">{form.presupuesto_importe} € + IVA</span></div>}
              </div>
              {form.presupuesto_descripcion && <p className="text-xs text-slate-600 mt-2">{form.presupuesto_descripcion}</p>}
            </div>
          )}

          {/* Trabajos */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Descripción de trabajos</p>
            <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg p-3">{form.descripcion_trabajos}</p>
          </div>

          {/* Cláusulas */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Condiciones generales</p>
            <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg p-3">{form.clausulas}</p>
          </div>

          {/* LOPD */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <p className="text-xs font-bold text-blue-700 uppercase mb-2">📋 Protección de datos — Ley Orgánica 3/2018</p>
            <p className="text-xs text-slate-600 whitespace-pre-line">{form.lopd_texto}</p>
          </div>
        </div>
      </div>
    );
  };

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  return (
    <div className="min-h-screen bg-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <NavHeader title="Contratos" homeUrl="HomeTecnico" />
        <div className="flex justify-end mb-2">
          <Link to="/CarpetaContratos">
            <Button variant="outline" size="sm" className="gap-2 text-slate-600 bg-white/80 border-slate-300">
              <FolderOpen className="w-4 h-4" /> Carpeta de contratos
            </Button>
          </Link>
        </div>
        <div className="bg-slate-50 rounded-2xl p-6 min-h-screen">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tipoContrato === 'instalaciones' ? 'bg-orange-500' : 'bg-blue-600'}`}>
            {tipoContrato === 'instalaciones' ? <HardHat className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{tipoContrato === 'instalaciones' ? 'Contrato de Instalación' : 'Contrato de Mantenimiento'}</h1>
            <p className="text-slate-500 text-sm">Genera contratos profesionales en formato PDF</p>
          </div>
        </div>

        {renderStepIndicator()}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-slate-700 text-lg flex items-center gap-2">
              {(() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-5 h-5 text-blue-600" />; })()}
              {STEPS[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {stepContent[step - 1]()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving}
              className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            {saveMsg && <span className="text-sm text-emerald-600 font-medium">{saveMsg}</span>}
            {step < STEPS.length ? (
              <Button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={generatePDF} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Download className="w-4 h-4" /> Descargar PDF
              </Button>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}