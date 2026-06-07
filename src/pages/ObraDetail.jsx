import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import AlbaranObraModal from '@/components/obras/AlbaranObraModal';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { HardHat, Plus, FileText, Euro, Image, Trash2, Download, Loader2, ChevronLeft, Pencil, CheckCircle, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

const ESTADO_CONFIG = {
  activa:        { label: 'Activa',        color: 'bg-emerald-100 text-emerald-700' },
  pausada:       { label: 'Pausada',       color: 'bg-amber-100 text-amber-700' },
  finalizada:    { label: 'Finalizada',    color: 'bg-slate-100 text-slate-600' },
  presupuestada: { label: 'Presupuestada', color: 'bg-blue-100 text-blue-700' },
};

export default function ObraDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const obraId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAlbaran, setShowAlbaran] = useState(false);
  const [editingEcon, setEditingEcon] = useState(false);
  const [econForm, setEconForm] = useState(null);
  const [newFactura, setNewFactura] = useState({ numero: '', fecha: format(new Date(), 'yyyy-MM-dd'), importe: '', estado: 'pendiente', notas: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const effectiveEmail = sessionTechEmail || base44User?.email;

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const myTechRecord = technicians.find(t => t.email === effectiveEmail || t.user_email === effectiveEmail);
  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || myTechRecord?.is_admin === true;

  const { data: obra, isLoading } = useQuery({
    queryKey: ['obra', obraId],
    queryFn: () => base44.entities.Obra.filter({ id: obraId }).then(r => r[0]),
    enabled: !!obraId,
  });

  const { data: albaranes = [] } = useQuery({
    queryKey: ['albaranes-obra', obraId],
    queryFn: () => base44.entities.AlbaranObra.filter({ obra_id: obraId }),
    enabled: !!obraId,
  });

  const updateObra = useMutation({
    mutationFn: (data) => base44.entities.Obra.update(obraId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['obra', obraId] }); queryClient.invalidateQueries({ queryKey: ['obras'] }); },
  });

  const saveEcon = () => {
    updateObra.mutate({
      presupuesto_inicial: parseFloat(econForm.presupuesto_inicial) || 0,
      costo_trabajadores: parseFloat(econForm.costo_trabajadores) || 0,
      costo_materiales: parseFloat(econForm.costo_materiales) || 0,
    });
    setEditingEcon(false);
    toast.success('Control económico actualizado');
  };

  const addFactura = () => {
    if (!newFactura.importe) return;
    const facturas = [...(obra.facturas || []), { ...newFactura, importe: parseFloat(newFactura.importe) }];
    const totalFacturado = facturas.reduce((s, f) => s + (f.importe || 0), 0);
    updateObra.mutate({ facturas, total_facturado: totalFacturado });
    setNewFactura({ numero: '', fecha: format(new Date(), 'yyyy-MM-dd'), importe: '', estado: 'pendiente', notas: '' });
    toast.success('Factura añadida');
  };

  const removeFactura = (idx) => {
    const facturas = (obra.facturas || []).filter((_, i) => i !== idx);
    const totalFacturado = facturas.reduce((s, f) => s + (f.importe || 0), 0);
    updateObra.mutate({ facturas, total_facturado: totalFacturado });
  };

  const uploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const documentos = [...(obra.documentos || []), { nombre: file.name, url: file_url, tipo: file.type, fecha: format(new Date(), 'yyyy-MM-dd') }];
    updateObra.mutate({ documentos });
    setUploadingDoc(false);
    toast.success('Documento subido');
  };

  const uploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const fotos = [...(obra.fotos || []), file_url];
    updateObra.mutate({ fotos });
    setUploadingFoto(false);
    toast.success('Foto añadida');
  };

  const removeDoc = (idx) => {
    updateObra.mutate({ documentos: (obra.documentos || []).filter((_, i) => i !== idx) });
  };

  const removeFoto = (idx) => {
    updateObra.mutate({ fotos: (obra.fotos || []).filter((_, i) => i !== idx) });
  };

  const exportAlbaranPDF = (albaran) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Albarán de Obra', 14, 20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Nº: ${albaran.numero || '—'}`, 14, 30);
    doc.text(`Fecha: ${albaran.fecha ? format(parseISO(albaran.fecha), "d 'de' MMMM yyyy", { locale: es }) : '—'}`, 14, 38);
    doc.text(`Técnico: ${albaran.tecnico_nombre || '—'}`, 14, 46);
    doc.text(`Obra: ${albaran.obra_nombre || '—'}`, 14, 54);
    doc.text(`Cliente: ${albaran.client_name || '—'}`, 14, 62);
    doc.line(14, 68, 196, 68);
    let y = 76;
    doc.setFont(undefined, 'bold');
    doc.text('Horas trabajadas', 14, y); y += 8;
    doc.setFont(undefined, 'normal');
    doc.text(`Inicio: ${albaran.hora_inicio || '—'}  |  Fin: ${albaran.hora_fin || '—'}  |  Total: ${albaran.horas_trabajadas || 0}h`, 14, y); y += 12;
    doc.setFont(undefined, 'bold');
    doc.text('Descripción de trabajos', 14, y); y += 8;
    doc.setFont(undefined, 'normal');
    const lineas = doc.splitTextToSize(albaran.descripcion_trabajos || '', 180);
    doc.text(lineas, 14, y); y += lineas.length * 7 + 8;
    if (albaran.materiales_usados?.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('Materiales', 14, y); y += 8;
      doc.setFont(undefined, 'normal');
      albaran.materiales_usados.forEach(m => {
        doc.text(`• ${m.descripcion}  x${m.cantidad}${m.precio_unitario > 0 ? `  (${m.precio_unitario}€/u)` : ''}`, 16, y); y += 7;
      });
    }
    if (albaran.notas) { y += 4; doc.text(`Notas: ${albaran.notas}`, 14, y); }
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${format(new Date(), "d MMM yyyy HH:mm", { locale: es })}`, 14, 285);
    doc.save(`albaran_${albaran.numero || albaran.id}_${albaran.fecha}.pdf`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    if (isSessionTech) navigate(createPageUrl('MenuInicio'));
    else base44.auth.logout(createPageUrl('MenuInicio'));
  };

  if (isLoading) return (
    <div className="h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (!obra) return (
    <div className="h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Obra no encontrada</p>
    </div>
  );

  const cfg = ESTADO_CONFIG[obra.estado] || ESTADO_CONFIG.activa;
  const costoTotal = (obra.costo_trabajadores || 0) + (obra.costo_materiales || 0);
  const margen = obra.presupuesto_inicial > 0 ? obra.presupuesto_inicial - costoTotal : null;
  const totalFacturado = obra.total_facturado || 0;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isAdmin} isLoading={false} onLogout={handleLogout} techEmail={effectiveEmail} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">

          {/* Back + Header */}
          <button onClick={() => navigate('/ControlObras')} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
            <ChevronLeft className="h-4 w-4" />Volver a obras
          </button>

          <Card className="p-5 bg-white border-0 shadow-sm mb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <HardHat className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-800">{obra.nombre}</h1>
                    <Badge className={`${cfg.color} border-0`}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{obra.client_name}{obra.building_name ? ` · ${obra.building_name}` : ''}</p>
                  {obra.fecha_inicio && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Inicio: {format(parseISO(obra.fecha_inicio), "d MMM yyyy", { locale: es })}
                      {obra.fecha_fin_prevista && ` · Fin previsto: ${format(parseISO(obra.fecha_fin_prevista), "d MMM yyyy", { locale: es })}`}
                    </p>
                  )}
                </div>
              </div>
              <Select value={obra.estado} onValueChange={v => updateObra.mutate({ estado: v })}>
                <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {obra.descripcion && <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">{obra.descripcion}</p>}
          </Card>

          <Tabs defaultValue="albaranes">
            <TabsList className="mb-4">
              <TabsTrigger value="albaranes">Albaranes ({albaranes.length})</TabsTrigger>
              <TabsTrigger value="economia">Control Económico</TabsTrigger>
              <TabsTrigger value="docs">Docs y Fotos</TabsTrigger>
            </TabsList>

            {/* ── ALBARANES ── */}
            <TabsContent value="albaranes">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowAlbaran(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Plus className="h-4 w-4" />Nuevo albarán
                </Button>
              </div>
              {albaranes.length === 0 ? (
                <Card className="p-8 text-center bg-white border-0 shadow-sm">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Sin albaranes aún</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {albaranes.sort((a, b) => b.fecha?.localeCompare(a.fecha || '') || 0).map(a => (
                    <Card key={a.id} className="p-4 bg-white border-0 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-700 text-sm">{a.numero || 'Sin número'}</span>
                            <Badge className={a.estado === 'firmado' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-slate-100 text-slate-500 border-0 text-xs'}>
                              {a.estado === 'firmado' ? 'Firmado' : 'Borrador'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mb-1">
                            {a.fecha && format(parseISO(a.fecha), "d MMM yyyy", { locale: es })} · {a.tecnico_nombre}
                            {a.horas_trabajadas > 0 && ` · ${a.horas_trabajadas}h`}
                          </p>
                          <p className="text-sm text-slate-600 line-clamp-2">{a.descripcion_trabajos}</p>
                          {a.materiales_usados?.length > 0 && (
                            <p className="text-xs text-slate-400 mt-1">{a.materiales_usados.length} material(es)</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {a.estado !== 'firmado' && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-600 gap-1"
                              onClick={() => { base44.entities.AlbaranObra.update(a.id, { estado: 'firmado' }); queryClient.invalidateQueries({ queryKey: ['albaranes-obra'] }); toast.success('Marcado como firmado'); }}>
                              <CheckCircle className="h-3.5 w-3.5" />Firmar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                            onClick={() => exportAlbaranPDF(a)} title="Descargar PDF">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── ECONOMÍA ── */}
            <TabsContent value="economia">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <Card className="p-4 bg-blue-50 border-0 shadow-sm text-center">
                  <p className="text-xl font-bold text-blue-700">{(obra.presupuesto_inicial || 0).toLocaleString('es-ES')}€</p>
                  <p className="text-xs text-slate-500 mt-0.5">Presupuesto</p>
                </Card>
                <Card className="p-4 bg-slate-50 border-0 shadow-sm text-center">
                  <p className="text-xl font-bold text-slate-700">{costoTotal.toLocaleString('es-ES')}€</p>
                  <p className="text-xs text-slate-500 mt-0.5">Costo total</p>
                </Card>
                <Card className={`p-4 border-0 shadow-sm text-center ${margen !== null ? (margen >= 0 ? 'bg-emerald-50' : 'bg-red-50') : 'bg-slate-50'}`}>
                  <p className={`text-xl font-bold ${margen !== null ? (margen >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'}`}>
                    {margen !== null ? `${margen >= 0 ? '+' : ''}${margen.toLocaleString('es-ES')}€` : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Margen</p>
                </Card>
                <Card className="p-4 bg-amber-50 border-0 shadow-sm text-center">
                  <p className="text-xl font-bold text-amber-700">{totalFacturado.toLocaleString('es-ES')}€</p>
                  <p className="text-xs text-slate-500 mt-0.5">Facturado</p>
                </Card>
              </div>

              {/* Editar costos */}
              <Card className="p-4 bg-white border-0 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700">Desglose de costos</h3>
                  {!editingEcon ? (
                    <Button size="sm" variant="outline" onClick={() => { setEconForm({ presupuesto_inicial: obra.presupuesto_inicial || 0, costo_trabajadores: obra.costo_trabajadores || 0, costo_materiales: obra.costo_materiales || 0 }); setEditingEcon(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingEcon(false)}>Cancelar</Button>
                      <Button size="sm" className="bg-blue-600 text-white" onClick={saveEcon}><Save className="h-3.5 w-3.5 mr-1" />Guardar</Button>
                    </div>
                  )}
                </div>
                {editingEcon ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[['presupuesto_inicial', 'Presupuesto inicial (€)'], ['costo_trabajadores', 'Costo trabajadores (€)'], ['costo_materiales', 'Costo materiales (€)']].map(([k, lbl]) => (
                      <div key={k}>
                        <Label className="text-xs">{lbl}</Label>
                        <Input type="number" min="0" step="0.01" value={econForm[k]}
                          onChange={e => setEconForm(p => ({ ...p, [k]: e.target.value }))} className="mt-1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[['Presupuesto inicial', obra.presupuesto_inicial || 0, 'text-blue-600'], ['Costo mano de obra', obra.costo_trabajadores || 0, 'text-slate-700'], ['Costo materiales', obra.costo_materiales || 0, 'text-slate-700']].map(([lbl, val, cls]) => (
                      <div key={lbl} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-600">{lbl}</span>
                        <span className={`font-semibold ${cls}`}>{val.toLocaleString('es-ES')}€</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Facturas */}
              <Card className="p-4 bg-white border-0 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3">Facturas emitidas</h3>
                {(obra.facturas || []).length > 0 && (
                  <div className="space-y-2 mb-4">
                    {obra.facturas.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-700">{f.numero || `Factura ${i + 1}`}</span>
                          <span className="text-slate-400 ml-2 text-xs">{f.fecha && format(parseISO(f.fecha), "d MMM yyyy", { locale: es })}</span>
                          {f.notas && <span className="text-slate-400 ml-2 text-xs">· {f.notas}</span>}
                        </div>
                        <Badge className={f.estado === 'cobrada' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-amber-100 text-amber-700 border-0 text-xs'}>
                          {f.estado === 'cobrada' ? 'Cobrada' : 'Pendiente'}
                        </Badge>
                        <span className="font-bold text-slate-800 shrink-0">{f.importe?.toLocaleString('es-ES')}€</span>
                        <button onClick={() => removeFactura(i)} className="text-red-300 hover:text-red-500 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-sm font-semibold text-slate-600">Total facturado</span>
                      <span className="font-bold text-slate-800">{totalFacturado.toLocaleString('es-ES')}€</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Input value={newFactura.numero} onChange={e => setNewFactura(p => ({ ...p, numero: e.target.value }))} placeholder="Nº factura" className="text-sm" />
                  <Input type="date" value={newFactura.fecha} onChange={e => setNewFactura(p => ({ ...p, fecha: e.target.value }))} className="text-sm" />
                  <Input type="number" min="0" step="0.01" value={newFactura.importe} onChange={e => setNewFactura(p => ({ ...p, importe: e.target.value }))} placeholder="Importe €" className="text-sm" />
                  <Select value={newFactura.estado} onValueChange={v => setNewFactura(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="cobrada">Cobrada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addFactura} disabled={!newFactura.importe} className="bg-blue-600 text-white">
                    <Plus className="h-4 w-4 mr-1" />Añadir
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* ── DOCS Y FOTOS ── */}
            <TabsContent value="docs">
              {/* Documentos */}
              <Card className="p-4 bg-white border-0 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />Documentos
                  </h3>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={uploadDoc} />
                    <Button size="sm" variant="outline" asChild>
                      <span>{uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Subir documento</span>
                    </Button>
                  </label>
                </div>
                {(obra.documentos || []).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Sin documentos</p>
                ) : (
                  <div className="space-y-2">
                    {obra.documentos.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-sm">
                        <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                        <span className="flex-1 truncate text-slate-700">{d.nombre}</span>
                        <span className="text-xs text-slate-400 shrink-0">{d.fecha}</span>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                          <Download className="h-4 w-4" />
                        </a>
                        <button onClick={() => removeDoc(i)} className="text-red-300 hover:text-red-500 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Fotos */}
              <Card className="p-4 bg-white border-0 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Image className="h-4 w-4 text-purple-600" />Fotos ({(obra.fotos || []).length})
                  </h3>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={uploadFoto} />
                    <Button size="sm" variant="outline" asChild>
                      <span>{uploadingFoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Añadir foto</span>
                    </Button>
                  </label>
                </div>
                {(obra.fotos || []).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Sin fotos</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {obra.fotos.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFoto(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showAlbaran && (
        <AlbaranObraModal
          open={showAlbaran}
          onClose={() => setShowAlbaran(false)}
          techRecord={myTechRecord}
        />
      )}
    </div>
  );
}