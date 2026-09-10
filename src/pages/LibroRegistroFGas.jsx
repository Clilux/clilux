import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BookOpen, FileDown, Plus, Wind, AlertTriangle, Shield, Factory,
  ArrowDownToLine, ArrowUpFromLine, Cloud, ChevronLeft
} from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import LibroFGasTable from '@/components/fgas/LibroFGasTable';
import LibroFGasForm from '@/components/fgas/LibroFGasForm';
import { exportarLibroFGasPDF } from '@/lib/fgas-pdf-export';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'carga_gas', label: 'Carga de Gas' },
  { value: 'recuperacion_gas', label: 'Recuperación' },
  { value: 'trasvase', label: 'Trasvase' },
  { value: 'eliminacion', label: 'Eliminación' },
  { value: 'control_fugas', label: 'Control de Fugas' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'desguace', label: 'Desguace' },
];

export default function LibroRegistroFGas() {
  const queryClient = useQueryClient();
  const isSessionTech = !!sessionStorage.getItem('technician_email');
  const effectiveEmail = isSessionTech ? sessionStorage.getItem('technician_email') : null;

  const [filtros, setFiltros] = useState({
    fechaDesde: '', fechaHasta: '', tecnico: '', tipo: '', refrigerante: '', search: ''
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Cargar datos: admins vía directa, técnicos de sesión vía proxy getCompanyData
  const { data: proxyData, isLoading: proxyLoading } = useQuery({
    queryKey: ['company-data-fgas', effectiveEmail],
    queryFn: () => base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'all' }),
    enabled: isSessionTech,
    staleTime: 0,
  });

  const { data: directRegistros = [], isLoading: directLoading1 } = useQuery({
    queryKey: ['fgas-libro-all'],
    queryFn: () => base44.entities.RegistroFGas.list('-fecha_intervencion', 1000),
    enabled: !isSessionTech,
  });

  const { data: directEquipment = [] } = useQuery({
    queryKey: ['equipment-libro-all'],
    queryFn: () => base44.entities.Equipment.list(),
    enabled: !isSessionTech,
  });

  const { data: directClients = [] } = useQuery({
    queryKey: ['clients-libro-all'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !isSessionTech,
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings-fgas'],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'main' }),
    enabled: !isSessionTech,
  });

  // Unificar datos de ambas fuentes
  const registros = isSessionTech
    ? (proxyData?.data?.registros_fgas || [])
    : directRegistros;
  const equipmentList = isSessionTech
    ? (proxyData?.data?.equipment || [])
    : directEquipment;
  const clientList = isSessionTech
    ? (proxyData?.data?.clients || [])
    : directClients;
  const companyInfo = isSessionTech
    ? (proxyData?.data?.company || proxyData?.data?.settings || {})
    : (settings?.[0] || {});
  const technicians = isSessionTech
    ? (proxyData?.data?.technicians || [])
    : [];

  const isLoading = isSessionTech ? proxyLoading : directLoading1;

  // Maps para lookup
  const equipmentMap = useMemo(() => {
    const m = {};
    equipmentList.forEach(e => { m[e.id] = e; });
    return m;
  }, [equipmentList]);

  const clientMap = useMemo(() => {
    const m = {};
    clientList.forEach(c => { m[c.id] = c; });
    return m;
  }, [clientList]);

  // Filtrado
  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtros.fechaDesde && r.fecha_intervencion < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && r.fecha_intervencion > filtros.fechaHasta) return false;
      if (filtros.tecnico && r.tecnico_nombre !== filtros.tecnico) return false;
      if (filtros.tipo && r.tipo_intervencion !== filtros.tipo) return false;
      if (filtros.refrigerante && !r.refrigerante_tipo?.toLowerCase().includes(filtros.refrigerante.toLowerCase())) return false;
      if (filtros.search) {
        const s = filtros.search.toLowerCase();
        const eq = equipmentMap[r.equipment_id];
        const eqText = eq ? `${eq.reference_name} ${eq.brand} ${eq.model}` : '';
        const searchText = `${r.tecnico_nombre} ${r.refrigerante_tipo} ${r.observaciones} ${eqText} ${r.empresa_mantenedora}`.toLowerCase();
        if (!searchText.includes(s)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion));
  }, [registros, filtros, equipmentMap]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalGasAnyadido = registrosFiltrados.reduce((s, r) => s + (Number(r.gas_anyadido_kg) || 0), 0);
    const totalGasRecuperado = registrosFiltrados.reduce((s, r) => s + (Number(r.gas_recuperado_kg) || 0), 0);
    const totaltCO2 = registrosFiltrados.reduce((s, r) => s + (Number(r.co2_equivalent_tons) || 0), 0);
    return {
      total: registrosFiltrados.length,
      gasAnyadido: totalGasAnyadido,
      gasRecuperado: totalGasRecuperado,
      tco2eq: totaltCO2,
    };
  }, [registrosFiltrados]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isSessionTech) {
        if (editingRecord) {
          return base44.functions.invoke('getCompanyData', {
            technician_email: effectiveEmail, entity: 'fgas_update',
            record_id: editingRecord.id, updates: payload
          });
        }
        return base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'fgas_create', record: payload
        });
      }
      if (editingRecord) {
        return base44.entities.RegistroFGas.update(editingRecord.id, payload);
      }
      return base44.entities.RegistroFGas.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-data-fgas', effectiveEmail] });
      queryClient.invalidateQueries({ queryKey: ['fgas-libro-all'] });
      toast.success(editingRecord ? 'Operación actualizada' : 'Operación registrada en el Libro');
      setFormOpen(false);
      setEditingRecord(null);
    },
    onError: (e) => toast.error('Error al guardar: ' + (e.message || '')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (record) => {
      if (isSessionTech) {
        return base44.functions.invoke('getCompanyData', {
          technician_email: effectiveEmail, entity: 'fgas_delete', record_id: record.id
        });
      }
      return base44.entities.RegistroFGas.delete(record.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-data-fgas', effectiveEmail] });
      queryClient.invalidateQueries({ queryKey: ['fgas-libro-all'] });
      toast.success('Operación eliminada del Libro');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const handleExport = () => {
    if (registrosFiltrados.length === 0) {
      toast.error('No hay operaciones para exportar');
      return;
    }
    let filtrosDesc = '';
    if (filtros.fechaDesde || filtros.fechaHasta) {
      filtrosDesc += `Fecha: ${filtros.fechaDesde || 'inicio'} - ${filtros.fechaHasta || 'hoy'}. `;
    }
    if (filtros.tipo) filtrosDesc += `Tipo: ${filtros.tipo}. `;
    if (filtros.tecnico) filtrosDesc += `Técnico: ${filtros.tecnico}. `;
    exportarLibroFGasPDF(registrosFiltrados, companyInfo, filtrosDesc || 'Todas las operaciones');
  };

  const handleEdit = (r) => { setEditingRecord(r); setFormOpen(true); };
  const handleAdd = () => { setEditingRecord(null); setFormOpen(true); };

  const tecnicoOptions = [...new Set(registros.map(r => r.tecnico_nombre).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      <NavHeader title="Libro de Registro F-Gas" backUrl="/HomeTecnico" />

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header legal */}
        <Card className="p-4 bg-brand-600 border-0 text-white">
          <div className="flex items-start gap-3">
            <BookOpen className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-base font-bold">LIBRO DE REGISTRO DE GASES FLUORADOS</h2>
              <p className="text-xs text-brand-100 mt-0.5">
                Documento obligatorio según <strong>RD 115/2017</strong> (BOE-A-2017-1679) y Reglamento (UE) 2024/573.
                Conservación mínima: <strong>5 años</strong>. Debe estar disponible ante inspección de Industria.
              </p>
            </div>
          </div>
        </Card>

        {/* Datos de la empresa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Factory className="h-4 w-4 text-brand-600" />
              <p className="text-xs font-semibold text-slate-600">EMPRESA MANIPULADORA</p>
            </div>
            <p className="text-sm font-bold text-slate-800">{companyInfo?.name || companyInfo?.company_name || '—'}</p>
            <p className="text-xs text-slate-500">CIF: {companyInfo?.cif || companyInfo?.company_cif || '—'}</p>
          </Card>
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-brand-600" />
              <p className="text-xs font-semibold text-slate-600">CERT. EMPRESA F-GAS</p>
            </div>
            <p className="text-sm font-bold text-slate-800">{companyInfo?.fgas_company_cert_num || '—'}</p>
            <p className="text-xs text-slate-500">{companyInfo?.address || companyInfo?.company_address || ''}</p>
          </Card>
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="h-4 w-4 text-brand-600" />
              <p className="text-xs font-semibold text-slate-600">CONSERVACIÓN DIGITAL</p>
            </div>
            <p className="text-sm font-bold text-emerald-600">✓ Archivo digital (5 años)</p>
            <p className="text-xs text-slate-500">Trazabilidad y firma electrónica</p>
          </Card>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-white border border-slate-200">
            <p className="text-xs text-slate-500 mb-0.5">Total operaciones</p>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          </Card>
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowDownToLine className="h-3 w-3 text-blue-600" />
              <p className="text-xs text-slate-500">Gas añadido</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.gasAnyadido.toFixed(2)} kg</p>
          </Card>
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpFromLine className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-slate-500">Gas recuperado</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.gasRecuperado.toFixed(2)} kg</p>
          </Card>
          <Card className="p-3 bg-white border border-slate-200">
            <div className="flex items-center gap-1 mb-0.5">
              <Wind className="h-3 w-3 text-slate-600" />
              <p className="text-xs text-slate-500">Total tCO₂eq</p>
            </div>
            <p className="text-xl font-bold text-slate-700">{stats.tco2eq.toFixed(3)}</p>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar (equipo, técnico, observaciones)..."
            value={filtros.search}
            onChange={e => setFiltros(p => ({ ...p, search: e.target.value }))}
            className="h-8 text-sm flex-1 min-w-[200px] max-w-xs"
          />
          <Input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(p => ({ ...p, fechaDesde: e.target.value }))} className="h-8 text-sm w-auto" />
          <Input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(p => ({ ...p, fechaHasta: e.target.value }))} className="h-8 text-sm w-auto" />
          <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))} className="h-8 text-sm border border-input rounded-md px-2 bg-background">
            {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtros.tecnico} onChange={e => setFiltros(p => ({ ...p, tecnico: e.target.value }))} className="h-8 text-sm border border-input rounded-md px-2 bg-background">
            <option value="">Todos los técnicos</option>
            {tecnicoOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="Refrigerante" value={filtros.refrigerante} onChange={e => setFiltros(p => ({ ...p, refrigerante: e.target.value }))} className="h-8 text-sm w-28" />
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleExport} className="border-brand-300 text-brand-700 hover:bg-brand-50">
            <FileDown className="h-4 w-4 mr-1" />Exportar PDF
          </Button>
          <Button size="sm" onClick={handleAdd} className="bg-brand-600 hover:bg-brand-700">
            <Plus className="h-4 w-4 mr-1" />Nueva operación
          </Button>
        </div>

        {/* Tabla */}
        <Card className="border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
              Cargando operaciones del Libro...
            </div>
          ) : (
            <LibroFGasTable
              registros={registrosFiltrados}
              equipmentMap={equipmentMap}
              clientMap={clientMap}
              onEdit={handleEdit}
              onDelete={(r) => deleteMutation.mutate(r)}
              isAdmin={true}
            />
          )}
        </Card>
      </div>

      {/* Modal: nueva/editar operación */}
      <LibroFGasForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingRecord(null); }}
        onSave={(payload) => saveMutation.mutate(payload)}
        technicians={technicians}
        companyInfo={companyInfo}
        editingRecord={editingRecord}
      />
    </div>
  );
}