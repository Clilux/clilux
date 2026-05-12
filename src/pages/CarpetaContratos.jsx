import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  FileText, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Download, Upload, Pencil, Wrench, HardHat, CheckCircle2, Clock,
  Trash2, Eye, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/navigation/NavHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const TIPO_LABELS = {
  mantenimiento: { label: 'Mantenimiento', color: 'bg-blue-100 text-blue-700', icon: Wrench },
  instalaciones: { label: 'Instalación', color: 'bg-orange-100 text-orange-700', icon: HardHat },
};

const ESTADO_CONFIG = {
  realizado: { label: 'Realizado', color: 'bg-amber-100 text-amber-700 border border-amber-200', icon: Clock },
  firmado: { label: 'Firmado', color: 'bg-green-100 text-green-700 border border-green-200', icon: CheckCircle2 },
};

export default function CarpetaContratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [sortField, setSortField] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [editModal, setEditModal] = useState(null);
  const [subirFirmado, setSubirFirmado] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const load = async () => {
    setLoading(true);
    let data;
    if (isSessionTech) {
      const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity: 'contratos' });
      data = res.data?.data || [];
    } else {
      data = await base44.entities.Contrato.list();
    }
    setContratos(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const filtered = contratos
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.numero_contrato?.toLowerCase().includes(q) ||
        c.cliente_nombre?.toLowerCase().includes(q) ||
        c.cliente_cif?.toLowerCase().includes(q);
      const matchTipo = filtroTipo === 'todos' || c.tipo_contrato === filtroTipo;
      const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
      return matchSearch && matchTipo && matchEstado;
    })
    .sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (sortField === 'fecha_inicio' || sortField === 'created_date') {
        va = va || '';
        vb = vb || '';
      }
      if (sortField === 'precio_anual') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

  const handleEstadoChange = async (contrato, nuevoEstado) => {
    await base44.entities.Contrato.update(contrato.id, { estado: nuevoEstado });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return;
    await base44.entities.Contrato.delete(id);
    load();
  };

  const handleSubirFirmado = async (e, contrato) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingId(contrato.id);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Contrato.update(contrato.id, {
      pdf_firmado_url: file_url,
      estado: 'firmado'
    });
    setUploadingId(null);
    load();
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    await base44.entities.Contrato.update(editModal.id, {
      numero_contrato: editModal.numero_contrato,
      cliente_nombre: editModal.cliente_nombre,
      cliente_cif: editModal.cliente_cif,
      fecha_inicio: editModal.fecha_inicio,
      fecha_fin: editModal.fecha_fin,
      precio_anual: editModal.precio_anual,
      notas: editModal.notas,
    });
    setSaving(false);
    setEditModal(null);
    load();
  };

  const statsRealizado = contratos.filter(c => c.estado === 'realizado').length;
  const statsFirmado = contratos.filter(c => c.estado === 'firmado').length;

  return (
    <div className="min-h-screen bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <NavHeader title="Carpeta de Contratos" homeUrl="HomeTecnico" />

        <div className="bg-slate-50 rounded-2xl p-6 min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Carpeta de Contratos</h1>
                <p className="text-slate-500 text-sm">{contratos.length} contrato{contratos.length !== 1 ? 's' : ''} archivados</p>
              </div>
            </div>
            <Link to="/ContratoMantenimiento">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Nuevo contrato
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{contratos.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total contratos</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{statsRealizado}</p>
              <p className="text-xs text-amber-600 mt-1">Realizados</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{statsFirmado}</p>
              <p className="text-xs text-green-600 mt-1">Firmados</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nº, cliente, CIF..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-200"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-40 bg-white border-slate-200">
                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="instalaciones">Instalación</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-40 bg-white border-slate-200">
                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="realizado">Realizados</SelectItem>
                <SelectItem value="firmado">Firmados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera ordenable */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <button className="col-span-2 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('numero_contrato')}>
                Nº Contrato <SortIcon field="numero_contrato" />
              </button>
              <button className="col-span-1 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('tipo_contrato')}>
                Tipo <SortIcon field="tipo_contrato" />
              </button>
              <button className="col-span-3 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('cliente_nombre')}>
                Cliente <SortIcon field="cliente_nombre" />
              </button>
              <button className="col-span-2 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('fecha_inicio')}>
                Inicio <SortIcon field="fecha_inicio" />
              </button>
              <button className="col-span-1 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('precio_anual')}>
                Importe <SortIcon field="precio_anual" />
              </button>
              <button className="col-span-1 flex items-center gap-1 hover:text-slate-800 text-left" onClick={() => handleSort('estado')}>
                Estado <SortIcon field="estado" />
              </button>
              <div className="col-span-2 text-right">Acciones</div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                Cargando contratos...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay contratos{search ? ' que coincidan con la búsqueda' : ''}</p>
                {!search && (
                  <p className="text-sm mt-1">
                    Genera tu primer contrato desde{' '}
                    <Link to="/ContratoMantenimiento" className="text-blue-600 underline">aquí</Link>
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(contrato => {
                  const TipoConf = TIPO_LABELS[contrato.tipo_contrato] || TIPO_LABELS.mantenimiento;
                  const EstadoConf = ESTADO_CONFIG[contrato.estado] || ESTADO_CONFIG.realizado;
                  const TipoIcon = TipoConf.icon;
                  const EstadoIcon = EstadoConf.icon;

                  return (
                    <div key={contrato.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-4 hover:bg-slate-50 transition-colors items-center">
                      {/* Nº Contrato */}
                      <div className="md:col-span-2">
                        <p className="font-mono text-sm font-semibold text-slate-800">{contrato.numero_contrato}</p>
                        <p className="text-xs text-slate-400 md:hidden">{formatDate(contrato.created_date?.split('T')[0])}</p>
                      </div>

                      {/* Tipo */}
                      <div className="md:col-span-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${TipoConf.color}`}>
                          <TipoIcon className="w-3 h-3" />
                          <span className="hidden lg:inline">{TipoConf.label}</span>
                        </span>
                      </div>

                      {/* Cliente */}
                      <div className="md:col-span-3">
                        <p className="text-sm font-medium text-slate-800 truncate">{contrato.cliente_nombre || '—'}</p>
                        {contrato.cliente_cif && <p className="text-xs text-slate-400">{contrato.cliente_cif}</p>}
                      </div>

                      {/* Fecha inicio */}
                      <div className="md:col-span-2">
                        <p className="text-sm text-slate-600">{formatDate(contrato.fecha_inicio)}</p>
                        {contrato.fecha_fin && <p className="text-xs text-slate-400">hasta {formatDate(contrato.fecha_fin)}</p>}
                      </div>

                      {/* Importe */}
                      <div className="md:col-span-1">
                        <p className="text-sm font-medium text-slate-700">
                          {contrato.precio_anual ? `${Number(contrato.precio_anual).toLocaleString('es-ES')} €` : '—'}
                        </p>
                      </div>

                      {/* Estado */}
                      <div className="md:col-span-1">
                        <Select
                          value={contrato.estado || 'realizado'}
                          onValueChange={(val) => handleEstadoChange(contrato, val)}
                        >
                          <SelectTrigger className={`h-7 text-xs px-2 border-0 shadow-none ${EstadoConf.color} rounded-full`}>
                            <EstadoIcon className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realizado">
                              <span className="flex items-center gap-2"><Clock className="w-3 h-3 text-amber-600" /> Realizado</span>
                            </SelectItem>
                            <SelectItem value="firmado">
                              <span className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Firmado</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Acciones */}
                      <div className="md:col-span-2 flex items-center gap-1 justify-end flex-wrap">
                        {/* PDF generado */}
                        {contrato.pdf_url && (
                          <a href={contrato.pdf_url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" title="Ver PDF">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}

                        {/* PDF firmado */}
                        {contrato.pdf_firmado_url ? (
                          <a href={contrato.pdf_firmado_url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50" title="Ver PDF firmado">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <label title="Subir PDF firmado">
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={e => handleSubirFirmado(e, contrato)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-green-50 hover:text-green-600 cursor-pointer"
                              asChild
                              disabled={uploadingId === contrato.id}
                            >
                              <span>
                                {uploadingId === contrato.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                  : <Upload className="w-3.5 h-3.5" />
                                }
                              </span>
                            </Button>
                          </label>
                        )}

                        {/* Editar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Editar"
                          onClick={() => setEditModal({ ...contrato })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {/* Eliminar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          title="Eliminar"
                          onClick={() => handleDelete(contrato.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {filtered.length > 0 && (
            <p className="text-xs text-slate-400 mt-3 text-right">
              Mostrando {filtered.length} de {contratos.length} contratos
            </p>
          )}
        </div>
      </div>

      {/* Modal editar */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              Editar contrato {editModal?.numero_contrato}
            </DialogTitle>
          </DialogHeader>
          {editModal && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nº Contrato</Label>
                  <Input value={editModal.numero_contrato || ''} onChange={e => setEditModal(p => ({ ...p, numero_contrato: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>CIF Cliente</Label>
                  <Input value={editModal.cliente_cif || ''} onChange={e => setEditModal(p => ({ ...p, cliente_cif: e.target.value }))} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Nombre cliente</Label>
                  <Input value={editModal.cliente_nombre || ''} onChange={e => setEditModal(p => ({ ...p, cliente_nombre: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="date" value={editModal.fecha_inicio || ''} onChange={e => setEditModal(p => ({ ...p, fecha_inicio: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="date" value={editModal.fecha_fin || ''} onChange={e => setEditModal(p => ({ ...p, fecha_fin: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Importe (€)</Label>
                  <Input type="number" value={editModal.precio_anual || ''} onChange={e => setEditModal(p => ({ ...p, precio_anual: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editModal.estado || 'realizado'} onValueChange={v => setEditModal(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="firmado">Firmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea value={editModal.notas || ''} onChange={e => setEditModal(p => ({ ...p, notas: e.target.value }))} className="mt-1 min-h-[80px]" placeholder="Observaciones sobre el contrato..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}