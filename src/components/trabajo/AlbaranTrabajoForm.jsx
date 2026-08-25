import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Trash2, Save, FileDown, Send, PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import SignaturePad from './SignaturePad';

const UNIDADES = ['ud', 'h', 'kg', 'm', 'm²', 'm³', 'l', 'mes'];

const lineaVacia = () => ({ descripcion: '', cantidad: 1, unidad: 'ud', precio_unitario: 0, descuento: 0, subtotal: 0 });

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

export default function AlbaranTrabajoForm({
  record, prefill, clients, obras, existingCount, isSessionTech, effectiveEmail, techRecord, onBack, onSaved,
}) {
  const isEdit = !!record;
  const [createdId, setCreatedId] = useState(null);
  const isEditView = isEdit || !!createdId;
  const [form, setForm] = useState(() => ({
    numero: record?.numero || `ALB-${new Date().getFullYear()}-${String((existingCount || 0) + 1).padStart(4, '0')}`,
    fecha: record?.fecha || format(new Date(), 'yyyy-MM-dd'),
    titulo: record?.titulo || prefill?.titulo || '',
    client_id: record?.client_id || prefill?.client_id || '',
    client_name: record?.client_name || '',
    client_email: record?.client_email || '',
    obra_id: record?.obra_id || '',
    obra_nombre: record?.obra_nombre || '',
    capitulo: record?.capitulo || '',
    lineas: record?.lineas?.length ? record.lineas : [lineaVacia()],
    notas: record?.notas || '',
    estado: record?.estado || 'borrador',
    firma_url: record?.firma_url || null,
    firmante_nombre: record?.firmante_nombre || '',
    fecha_firma: record?.fecha_firma || null,
    documento_url: record?.documento_url || null,
    incident_id: record?.incident_id || prefill?.incident_id || '',
  }));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Cálculo de totales
  const totales = useMemo(() => {
    let base = 0, descuentoTotal = 0, total = 0;
    const lineas = form.lineas.map(l => {
      const bruto = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
      const dto = bruto * ((Number(l.descuento) || 0) / 100);
      const sub = round2(bruto - dto);
      base += bruto;
      descuentoTotal += dto;
      total += sub;
      return { ...l, subtotal: sub };
    });
    return { lineas, base: round2(base), descuento_total: round2(descuentoTotal), total: round2(total) };
  }, [form.lineas]);

  const onClientChange = (clientId) => {
    const c = clients.find(c => c.id === clientId);
    setForm(p => ({
      ...p,
      client_id: clientId,
      client_name: c?.name || '',
      client_email: c?.email || p.client_email,
    }));
  };

  const onObraChange = (obraId) => {
    const o = obras.find(o => o.id === obraId);
    setForm(p => ({ ...p, obra_id: obraId, obra_nombre: o?.nombre || '' }));
  };

  const updateLinea = (idx, k, v) => {
    setForm(p => ({
      ...p,
      lineas: p.lineas.map((l, i) => (i === idx ? { ...l, [k]: v } : l)),
    }));
  };
  const addLinea = () => setForm(p => ({ ...p, lineas: [...p.lineas, lineaVacia()] }));
  const removeLinea = (idx) => setForm(p => ({ ...p, lineas: p.lineas.filter((_, i) => i !== idx) }));

  const buildRecord = (extra = {}) => ({
    numero: form.numero,
    fecha: form.fecha,
    titulo: form.titulo,
    client_id: form.client_id,
    client_name: form.client_name,
    client_email: form.client_email,
    obra_id: form.obra_id || null,
    obra_nombre: form.obra_nombre,
    capitulo: form.capitulo,
    lineas: totales.lineas,
    base_imponible: totales.base,
    descuento_total: totales.descuento_total,
    total: totales.total,
    notas: form.notas,
    incident_id: form.incident_id || null,
    tecnico_nombre: techRecord?.name || '',
    tecnico_email: effectiveEmail || '',
    ...extra,
  });

  const doSave = async (extra = {}) => {
    if (!form.titulo.trim()) { toast.error('Indica un título'); return null; }
    if (!form.fecha) { toast.error('Indica la fecha'); return null; }
    if (!form.client_name.trim() && !form.client_id) { toast.error('Selecciona un cliente'); return null; }
    setSaving(true);
    try {
      const id = record?.id || createdId;
      const editing = isEdit || !!createdId;
      const payload = buildRecord(extra);
      const res = await onSaved(payload, editing, id);
      if (!editing && res?.data?.id) setCreatedId(res.data.id);
      if (res?.data) {
        setForm(p => ({ ...p, ...extra, documento_url: res.data.documento_url || p.documento_url }));
      }
      toast.success(editing ? 'Albarán actualizado' : 'Albarán creado');
      return res;
    } catch (e) {
      toast.error('Error al guardar el albarán');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => doSave();

  const handleFirma = async (dataUrl) => {
    setSigning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: await (await fetch(dataUrl)).blob(),
      });
      setForm(p => ({ ...p, firma_url: file_url, firmante_nombre: p.firmante_nombre || p.client_name, fecha_firma: new Date().toISOString() }));
      toast.success('Firma guardada. Pulsa "Guardar" para confirmar.');
    } catch {
      toast.error('Error al guardar la firma');
    } finally {
      setSigning(false);
    }
  };

  const generarPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.setFont(undefined, 'bold');
      doc.text('Albarán de Trabajo', 14, 18);
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text(`Nº: ${form.numero}`, 14, 28);
      doc.text(`Fecha: ${form.fecha ? format(new Date(form.fecha), "dd/MM/yyyy") : '—'}`, 14, 34);
      doc.text(`Cliente: ${form.client_name || '—'}`, 14, 40);
      if (form.client_email) doc.text(`Email: ${form.client_email}`, 14, 46);
      doc.text(`Título: ${form.titulo}`, 14, 52);
      if (form.capitulo) doc.text(`Capítulo: ${form.capitulo}`, 14, 58);
      if (form.obra_nombre) doc.text(`Obra: ${form.obra_nombre}`, 14, 64);
      doc.line(14, 68, 196, 68);

      // Cabecera de líneas
      let y = 76;
      doc.setFont(undefined, 'bold'); doc.setFontSize(9);
      doc.text('Descripción', 14, y);
      doc.text('Cant.', 120, y);
      doc.text('Precio', 140, y);
      doc.text('Dto.%', 160, y);
      doc.text('Subtotal', 176, y);
      y += 4;
      doc.line(14, y, 196, y); y += 5;
      doc.setFont(undefined, 'normal');
      totales.lineas.forEach(l => {
        if (y > 250) { doc.addPage(); y = 20; }
        const desc = doc.splitTextToSize(l.descripcion || '', 100);
        doc.text(desc[0] || '', 14, y);
        doc.text(String(l.cantidad || 0), 120, y);
        doc.text(`${(l.precio_unitario || 0).toFixed(2)}`, 140, y);
        doc.text(`${(l.descuento || 0)}%`, 160, y);
        doc.text(`${(l.subtotal || 0).toFixed(2)}€`, 176, y);
        y += 6;
      });
      y += 2; doc.line(14, y, 196, y); y += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Base:', 150, y); doc.setFont(undefined, 'normal'); doc.text(`${totales.base.toFixed(2)}€`, 176, y); y += 6;
      if (totales.descuento_total > 0) {
        doc.text('Descuento:', 150, y); doc.setFont(undefined, 'normal'); doc.text(`-${totales.descuento_total.toFixed(2)}€`, 176, y); y += 6;
      }
      doc.setFont(undefined, 'bold'); doc.setFontSize(12);
      doc.text('TOTAL:', 150, y); doc.text(`${totales.total.toFixed(2)}€`, 176, y);

      // Firma
      if (form.firma_url) {
        try {
          const img = new Image();
          img.src = form.firma_url;
          doc.addImage(form.firma_url, 'PNG', 14, y + 4, 70, 28);
        } catch {}
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text(`Firmado por: ${form.firmante_nombre || form.client_name || '—'}`, 14, y + 40);
      } else {
        doc.setFontSize(9);
        doc.text('Firma del cliente: _______________________', 14, y + 30);
      }

      const blob = doc.output('blob');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
      setForm(p => ({ ...p, documento_url: file_url }));
      // Guardar el documento_url en el registro
      await doSave({ documento_url: file_url });
      doc.save(`albaran_${form.numero}.pdf`);
      toast.success('PDF generado y guardado');
    } catch (e) {
      toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const enviarAlCliente = async () => {
    if (!form.client_email) { toast.error('El cliente no tiene email'); return; }
    setSending(true);
    try {
      let docUrl = form.documento_url;
      if (!docUrl) {
        // generar PDF si no existe
        setGenerating(true);
        const doc = new jsPDF();
        doc.setFontSize(18); doc.setFont(undefined, 'bold');
        doc.text('Albarán de Trabajo', 14, 18);
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`Nº: ${form.numero}`, 14, 28);
        doc.text(`Fecha: ${form.fecha}`, 14, 34);
        doc.text(`Cliente: ${form.client_name}`, 14, 40);
        doc.text(`Título: ${form.titulo}`, 14, 46);
        let y = 56;
        totales.lineas.forEach(l => { doc.text(`${l.descripcion || ''}  x${l.cantidad}  ${l.subtotal.toFixed(2)}€`, 14, y); y += 6; });
        doc.setFont(undefined, 'bold'); doc.text(`TOTAL: ${totales.total.toFixed(2)}€`, 14, y + 4);
        const blob = doc.output('blob');
        const up = await base44.integrations.Core.UploadFile({ file: blob });
        docUrl = up.file_url;
        setForm(p => ({ ...p, documento_url: docUrl }));
        setGenerating(false);
      }
      await base44.integrations.Core.SendEmail({
        to: form.client_email,
        subject: `Albarán ${form.numero} - ${form.titulo}`,
        body: `Estimado cliente,\n\nLe adjuntamos el enlace a su albarán de trabajo Nº ${form.numero} con título "${form.titulo}" por un importe total de ${totales.total.toFixed(2)}€.\n\nPuede consultarlo en el siguiente enlace:\n${docUrl}\n\nAtentamente.`,
      });
      await doSave({ estado: 'enviado', documento_url: docUrl });
      toast.success('Albarán enviado al cliente');
    } catch (e) {
      toast.error('Error al enviar el email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4">
        <ChevronLeft className="h-4 w-4" />Volver a albaranes
      </button>

      <h1 className="text-xl font-bold text-slate-800 mb-4">{isEditView ? 'Editar albarán' : 'Nuevo albarán de trabajo'}</h1>

      {/* Datos generales */}
      <Card className="p-4 bg-white border-0 shadow-sm mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Nº albarán</Label>
            <Input value={form.numero} onChange={e => set('numero', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Capítulo</Label>
            <Input value={form.capitulo} onChange={e => set('capitulo', e.target.value)} placeholder="Ej: Suministros" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Título / concepto</Label>
          <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Descripción del trabajo" className="mt-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Cliente</Label>
            {clients.length > 0 ? (
              <Select value={form.client_id} onValueChange={onClientChange}>
                <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Nombre del cliente" className="mt-1" />
            )}
          </div>
          <div>
            <Label className="text-xs">Email cliente (para envío)</Label>
            <Input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="cliente@email.com" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Obra vinculada (genera gasto)</Label>
          <Select value={form.obra_id || 'none'} onValueChange={v => onObraChange(v === 'none' ? '' : v)}>
            <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Sin obra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin obra vinculada</SelectItem>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Líneas */}
      <Card className="p-4 bg-white border-0 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">Líneas</h3>
          <Button size="sm" variant="outline" onClick={addLinea}><Plus className="h-4 w-4 mr-1" />Añadir línea</Button>
        </div>
        <div className="space-y-3">
          {totales.lineas.map((l, idx) => (
            <div key={idx} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
              <div className="flex items-start gap-2">
                <Input
                  value={l.descripcion}
                  onChange={e => updateLinea(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción de la línea"
                  className="flex-1 bg-white"
                />
                <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => removeLinea(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                <div>
                  <Label className="text-[10px] text-slate-400">Cantidad</Label>
                  <Input type="number" min="0" step="0.01" value={l.cantidad} onChange={e => updateLinea(idx, 'cantidad', parseFloat(e.target.value) || 0)} className="bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400">Unidad</Label>
                  <Select value={l.unidad} onValueChange={v => updateLinea(idx, 'unidad', v)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400">Precio €</Label>
                  <Input type="number" min="0" step="0.01" value={l.precio_unitario} onChange={e => updateLinea(idx, 'precio_unitario', parseFloat(e.target.value) || 0)} className="bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400">Dto. %</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={l.descuento} onChange={e => updateLinea(idx, 'descuento', parseFloat(e.target.value) || 0)} className="bg-white" />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400">Subtotal</Label>
                  <div className="h-9 flex items-center px-3 rounded-md bg-white border border-slate-200 text-sm font-semibold text-slate-700">
                    {(l.subtotal || 0).toFixed(2)}€
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Totales */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-end gap-1">
          <div className="flex gap-6 text-sm text-slate-500"><span>Base:</span><span>{totales.base.toFixed(2)}€</span></div>
          {totales.descuento_total > 0 && (
            <div className="flex gap-6 text-sm text-slate-500"><span>Descuento:</span><span>-{totales.descuento_total.toFixed(2)}€</span></div>
          )}
          <div className="flex gap-6 text-base font-bold text-slate-800"><span>TOTAL:</span><span>{totales.total.toFixed(2)}€</span></div>
        </div>
      </Card>

      {/* Firma */}
      <Card className="p-4 bg-white border-0 shadow-sm mb-4">
        <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><PenLine className="h-4 w-4 text-blue-600" />Firma del cliente</h3>
        {form.firma_url ? (
          <div className="space-y-3">
            <img src={form.firma_url} alt="Firma" className="max-h-28 rounded-lg border border-slate-200 bg-white p-2" />
            <Input value={form.firmante_nombre} onChange={e => set('firmante_nombre', e.target.value)} placeholder="Nombre del firmante" className="max-w-xs" />
            <Button size="sm" variant="outline" onClick={() => set('firma_url', null)}>Rehacer firma</Button>
          </div>
        ) : (
          <SignaturePad onSave={handleFirma} />
        )}
        {signing && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Guardando firma...</p>}
      </Card>

      {/* Notas */}
      <Card className="p-4 bg-white border-0 shadow-sm mb-4">
        <Label className="text-xs">Notas</Label>
        <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} className="mt-1" />
      </Card>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-slate-50/90 backdrop-blur p-3 -mx-4 md:mx-0 rounded-t-xl border-t border-slate-200">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {isEditView ? 'Guardar' : 'Crear albarán'}
        </Button>
        <Button variant="outline" onClick={generarPDF} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          Generar PDF
        </Button>
        <Button variant="outline" onClick={enviarAlCliente} disabled={sending || generating}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Enviar al cliente
        </Button>
        <Button variant="ghost" onClick={onBack}>Cancelar</Button>
      </div>
    </div>
  );
}