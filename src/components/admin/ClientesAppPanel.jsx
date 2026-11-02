import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Building2, Search, Loader2, Save, CreditCard, AlertTriangle, CheckCircle2,
  Clock, Sparkles, Euro, Calendar, Cog
} from 'lucide-react';

const ESTADOS_PAGO = {
  prueba: { label: 'En prueba', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Sparkles },
  activa: { label: 'Al corriente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  vencida: { label: 'Vencida', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
  suspendida: { label: 'Suspendida', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  cancelada: { label: 'Cancelada', color: 'bg-slate-200 text-slate-600 border-slate-300', icon: AlertTriangle },
};

const CICLOS = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };

function formatDate(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(d); }
}

function countActiveModules(modulos) {
  if (!modulos) return 0;
  let n = 0;
  if (modulos.automatizacion) n++;
  if (modulos.erp) n++;
  if (modulos.normativa) {
    if (modulos.normativa.rite) n++;
    if (modulos.normativa.legionela) n++;
    if (modulos.normativa.fgas) n++;
    if (modulos.normativa.equipos_presion) n++;
  }
  return n;
}

export default function ClientesAppPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [editing, setEditing] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['company-entities'],
    queryFn: () => base44.entities.Company.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Company.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-entities'] });
      toast.success('Cliente actualizado');
    },
    onError: (e) => toast.error('Error: ' + (e.message || '')),
  });

  const filtered = useMemo(() => {
    return companies.filter(c => {
      const matchSearch = !search ||
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cif || '').toLowerCase().includes(search.toLowerCase());
      const est = c.suscripcion?.estado || 'prueba';
      const matchEstado = filtroEstado === 'all' || est === filtroEstado;
      return matchSearch && matchEstado;
    });
  }, [companies, search, filtroEstado]);

  const stats = useMemo(() => {
    const total = companies.length;
    const activos = companies.filter(c => c.suscripcion?.estado === 'activa').length;
    const pendientes = companies.filter(c => ['pendiente', 'vencida'].includes(c.suscripcion?.estado)).length;
    const prueba = companies.filter(c => c.suscripcion?.estado === 'prueba' || !c.suscripcion?.estado).length;
    const mrr = companies
      .filter(c => c.suscripcion?.estado === 'activa' && c.suscripcion?.ciclo === 'mensual')
      .reduce((s, c) => s + (c.suscripcion?.importe || 0), 0);
    return { total, activos, pendientes, prueba, mrr };
  }, [companies]);

  const handleSave = (data) => {
    updateMutation.mutate({ id: editing.id, updates: data }, {
      onSuccess: () => setEditing(null),
    });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">Clientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.activos}</p>
              <p className="text-xs text-slate-500">Al corriente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.pendientes}</p>
              <p className="text-xs text-slate-500">Pago pendiente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.mrr.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
              <p className="text-xs text-slate-500">MRR mensual</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o CIF..."
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ESTADOS_PAGO).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de clientes */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center bg-white border-0 shadow-sm">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay clientes que coincidan con el filtro.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const est = c.suscripcion?.estado || 'prueba';
            const estInfo = ESTADOS_PAGO[est] || ESTADOS_PAGO.prueba;
            const EstIcon = estInfo.icon;
            const modCount = countActiveModules(c.modulos);
            return (
              <Card key={c.id} className="p-4 bg-white border-0 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {c.status === 'active' ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{c.cif || 'Sin CIF'} · {c.email || 'Sin email'}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={`text-xs border ${estInfo.color}`}>
                          <EstIcon className="h-3 w-3 mr-1" />
                          {estInfo.label}
                        </Badge>
                        {modCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Cog className="h-3 w-3 mr-1" />
                            {modCount} módulo{modCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {c.suscripcion?.ciclo && c.suscripcion?.estado === 'activa' && (
                          <span className="text-xs text-slate-500">
                            {CICLOS[c.suscripcion.ciclo]} · {(c.suscripcion.importe || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€
                          </span>
                        )}
                        {c.suscripcion?.fecha_proximo_pago && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Próx. {formatDate(c.suscripcion.fecha_proximo_pago)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => setEditing(c)}
                    >
                      <Cog className="h-3.5 w-3.5 mr-1.5" />
                      Módulos y pago
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <EditarClienteDialog
          company={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditarClienteDialog({ company, onClose, onSave, saving }) {
  const [modulos, setModulos] = useState(() => ({
    base: true,
    automatizacion: false,
    erp: false,
    normativa: { rite: false, legionela: false, fgas: false, equipos_presion: false },
    ...(company.modulos || {}),
  }));
  const [suscripcion, setSuscripcion] = useState(() => ({
    estado: 'prueba',
    ciclo: 'mensual',
    importe: 0,
    fecha_inicio: '',
    fecha_ultimo_pago: '',
    fecha_proximo_pago: '',
    metodo: 'manual',
    subscription_id: '',
    dias_prueba: 14,
    notas: '',
    ...(company.suscripcion || {}),
  }));
  const [status, setStatus] = useState(company.status || 'active');

  const toggleNorm = (key) => setModulos(p => ({
    ...p,
    normativa: { ...(p.normativa || {}), [key]: !p.normativa?.[key] },
  }));

  const handleSave = () => {
    onSave({
      modulos: { ...modulos, base: true },
      suscripcion,
      status,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Estado general */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="font-medium text-slate-800 text-sm">Estado de la cuenta</p>
              <p className="text-xs text-slate-500">Una cuenta inactiva no puede acceder a la app.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{status === 'active' ? 'Activa' : 'Inactiva'}</span>
              <Switch checked={status === 'active'} onCheckedChange={(v) => setStatus(v ? 'active' : 'inactive')} />
            </div>
          </div>

          {/* Módulos */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Cog className="h-4 w-4 text-slate-400" /> Módulos contratados
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div>
                  <p className="text-sm font-medium text-blue-800">Mantenimiento (base)</p>
                  <p className="text-xs text-blue-600">Clientes, edificios, equipos, incidencias, revisiones.</p>
                </div>
                <Badge className="bg-blue-600 text-white border-0 text-xs">Siempre activo</Badge>
              </div>
              <ModuloToggle label="Automatización" desc="Loxone, Airzone y paneles SCADA." checked={modulos.automatizacion} onChange={(v) => setModulos(p => ({ ...p, automatizacion: v }))} />
              <ModuloToggle label="ERP" desc="Presupuestos, albaranes, pedidos, compras, artículos, proveedores." checked={modulos.erp} onChange={(v) => setModulos(p => ({ ...p, erp: v }))} />
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-sm font-medium text-slate-700 mb-2">Cumplimiento normativo</p>
                <div className="grid grid-cols-2 gap-2">
                  <NormToggle label="RITE" checked={modulos.normativa?.rite} onChange={() => toggleNorm('rite')} />
                  <NormToggle label="Legionela (L+D)" checked={modulos.normativa?.legionela} onChange={() => toggleNorm('legionela')} />
                  <NormToggle label="F-Gas" checked={modulos.normativa?.fgas} onChange={() => toggleNorm('fgas')} />
                  <NormToggle label="Equipos a presión (REP)" checked={modulos.normativa?.equipos_presion} onChange={() => toggleNorm('equipos_presion')} />
                </div>
              </div>
            </div>
          </div>

          {/* Suscripción / pago */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-slate-400" /> Suscripción y pago
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Estado de pago</Label>
                  <Select value={suscripcion.estado} onValueChange={(v) => setSuscripcion(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESTADOS_PAGO).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ciclo de facturación</Label>
                  <Select value={suscripcion.ciclo} onValueChange={(v) => setSuscripcion(p => ({ ...p, ciclo: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CICLOS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Importe por ciclo (€, sin IVA)</Label>
                  <Input
                    type="number"
                    value={suscripcion.importe}
                    onChange={(e) => setSuscripcion(p => ({ ...p, importe: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Método de cobro</Label>
                  <Select value={suscripcion.metodo} onValueChange={(v) => setSuscripcion(p => ({ ...p, metodo: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="stripe">Stripe (portal online)</SelectItem>
                      <SelectItem value="wix">Wix Payments (portal online)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Fecha alta</Label>
                  <Input type="date" value={suscripcion.fecha_inicio || ''} onChange={(e) => setSuscripcion(p => ({ ...p, fecha_inicio: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Último pago</Label>
                  <Input type="date" value={suscripcion.fecha_ultimo_pago || ''} onChange={(e) => setSuscripcion(p => ({ ...p, fecha_ultimo_pago: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Próximo pago</Label>
                  <Input type="date" value={suscripcion.fecha_proximo_pago || ''} onChange={(e) => setSuscripcion(p => ({ ...p, fecha_proximo_pago: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {suscripcion.metodo !== 'manual' && (
                <div>
                  <Label className="text-xs">ID de suscripción (pasarela)</Label>
                  <Input
                    value={suscripcion.subscription_id || ''}
                    onChange={(e) => setSuscripcion(p => ({ ...p, subscription_id: e.target.value }))}
                    placeholder="sub_xxxxx (se rellenará al activar el portal de pago)"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Notas internas</Label>
                <Textarea
                  value={suscripcion.notas || ''}
                  onChange={(e) => setSuscripcion(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Observaciones sobre el pago, condiciones especiales..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Aviso portal futuro */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              El cobro online (Stripe / Wix Payments) queda preparado para el futuro: cuando actives la pasarela de pagos,
              el cliente podrá pagar desde su portal y el estado se sincronizará automáticamente.
              Por ahora, el estado se gestiona manualmente desde aquí.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModuloToggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start gap-3">
        <Checkbox checked={!!checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function NormToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
      <Checkbox checked={!!checked} onCheckedChange={onChange} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}