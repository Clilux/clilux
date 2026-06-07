import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Plus, Search, HardHat, ChevronRight, Loader2, Building2, User, Euro } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO_CONFIG = {
  activa:        { label: 'Activa',        color: 'bg-emerald-100 text-emerald-700' },
  pausada:       { label: 'Pausada',       color: 'bg-amber-100 text-amber-700' },
  finalizada:    { label: 'Finalizada',    color: 'bg-slate-100 text-slate-600' },
  presupuestada: { label: 'Presupuestada', color: 'bg-blue-100 text-blue-700' },
};

export default function ControlObras() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newObra, setNewObra] = useState({
    nombre: '', descripcion: '', estado: 'activa',
    client_id: '', building_id: '', building_address: '',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin_prevista: '', presupuesto_inicial: '',
    responsable_nombre: '', notas: '',
    building_nueva: false, nuevo_building_nombre: '',
  });

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

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const { data: obras = [], isLoading } = useQuery({
    queryKey: ['obras'],
    queryFn: () => base44.entities.Obra.list('-created_date'),
  });

  const filteredBuildings = buildings.filter(b => b.client_id === newObra.client_id);

  const filtered = obras.filter(o => {
    const matchSearch = !search || o.nombre?.toLowerCase().includes(search.toLowerCase()) || o.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'all' || o.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const createObra = useMutation({
    mutationFn: async () => {
      setSaving(true);
      let buildingId = newObra.building_id;
      let buildingName = buildings.find(b => b.id === buildingId)?.name || '';

      if (newObra.building_nueva && newObra.nuevo_building_nombre && newObra.client_id) {
        const nb = await base44.entities.Building.create({
          client_id: newObra.client_id,
          name: newObra.nuevo_building_nombre,
          address: newObra.building_address || '',
          status: 'active',
        });
        buildingId = nb.id;
        buildingName = nb.name;
      }

      const client = clients.find(c => c.id === newObra.client_id);
      await base44.entities.Obra.create({
        nombre: newObra.nombre,
        descripcion: newObra.descripcion,
        estado: newObra.estado,
        client_id: newObra.client_id,
        client_name: client?.name || '',
        building_id: buildingId,
        building_name: buildingName,
        building_address: newObra.building_address,
        fecha_inicio: newObra.fecha_inicio,
        fecha_fin_prevista: newObra.fecha_fin_prevista || null,
        presupuesto_inicial: parseFloat(newObra.presupuesto_inicial) || 0,
        responsable_nombre: newObra.responsable_nombre || myTechRecord?.name || '',
        responsable_id: myTechRecord?.id || '',
        company_id: myTechRecord?.company_id || '',
        notas: newObra.notas,
        facturas: [], documentos: [], fotos: [],
        costo_trabajadores: 0, costo_materiales: 0, total_facturado: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success('Obra creada');
      setShowNew(false);
      setSaving(false);
      setNewObra({ nombre: '', descripcion: '', estado: 'activa', client_id: '', building_id: '', building_address: '', fecha_inicio: format(new Date(), 'yyyy-MM-dd'), fecha_fin_prevista: '', presupuesto_inicial: '', responsable_nombre: '', notas: '', building_nueva: false, nuevo_building_nombre: '' });
    },
    onError: () => setSaving(false),
  });

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    if (isSessionTech) navigate(createPageUrl('MenuInicio'));
    else base44.auth.logout(createPageUrl('MenuInicio'));
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar isSessionTech={isSessionTech} isAdmin={isAdmin} isLoading={false} onLogout={handleLogout} techEmail={effectiveEmail} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <HardHat className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Control de Obras</h1>
                <p className="text-xs text-slate-400">{obras.length} obras registradas</p>
              </div>
            </div>
            <Button onClick={() => setShowNew(true)} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
              <Plus className="h-4 w-4" />Nueva obra
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra o cliente..." className="pl-9" />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {['activa', 'pausada', 'presupuestada', 'finalizada'].map(estado => (
              <Card key={estado} className="p-4 bg-white border-0 shadow-sm text-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFiltroEstado(estado === filtroEstado ? 'all' : estado)}>
                <p className="text-2xl font-bold text-slate-800">{obras.filter(o => o.estado === estado).length}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ESTADO_CONFIG[estado].label}</p>
              </Card>
            ))}
          </div>

          {/* Lista obras */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center bg-white border-0 shadow-sm">
              <HardHat className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay obras que mostrar</p>
              <Button onClick={() => setShowNew(true)} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />Crear primera obra
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(obra => {
                const cfg = ESTADO_CONFIG[obra.estado] || ESTADO_CONFIG.activa;
                const margen = obra.presupuesto_inicial > 0
                  ? obra.presupuesto_inicial - (obra.costo_trabajadores || 0) - (obra.costo_materiales || 0)
                  : null;
                return (
                  <Link key={obra.id} to={`/ObraDetail?id=${obra.id}`}>
                    <Card className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-800 truncate">{obra.nombre}</h3>
                            <Badge className={`${cfg.color} border-0 text-xs shrink-0`}>{cfg.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            {obra.client_name && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />{obra.client_name}</span>
                            )}
                            {obra.building_name && (
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{obra.building_name}</span>
                            )}
                            {obra.fecha_inicio && (
                              <span>{format(parseISO(obra.fecha_inicio), 'd MMM yyyy', { locale: es })}</span>
                            )}
                            {obra.responsable_nombre && (
                              <span className="text-slate-400">Resp: {obra.responsable_nombre}</span>
                            )}
                          </div>
                          {obra.presupuesto_inicial > 0 && (
                            <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <Euro className="h-3 w-3" />Ppto: {obra.presupuesto_inicial.toLocaleString('es-ES')}€
                              </span>
                              {margen !== null && (
                                <span className={`font-medium ${margen >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  Margen: {margen >= 0 ? '+' : ''}{margen.toLocaleString('es-ES')}€
                                </span>
                              )}
                              {obra.total_facturado > 0 && (
                                <span className="text-slate-500">Facturado: {obra.total_facturado.toLocaleString('es-ES')}€</span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 mt-1" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog nueva obra */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nombre de la obra *</Label>
              <Input value={newObra.nombre} onChange={e => setNewObra(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Instalación climatización Oficina" className="mt-1" />
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={newObra.client_id} onValueChange={v => setNewObra(p => ({ ...p, client_id: v, building_id: '', building_nueva: false }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newObra.client_id && (
              <div>
                <Label>Edificio</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={newObra.building_id} onValueChange={v => setNewObra(p => ({ ...p, building_id: v, building_nueva: false }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar edificio..." /></SelectTrigger>
                    <SelectContent>
                      {filteredBuildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setNewObra(p => ({ ...p, building_nueva: !p.building_nueva, building_id: '' }))}>
                    <Plus className="h-4 w-4" />Nuevo
                  </Button>
                </div>
                {newObra.building_nueva && (
                  <div className="mt-2 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Input value={newObra.nuevo_building_nombre} onChange={e => setNewObra(p => ({ ...p, nuevo_building_nombre: e.target.value }))} placeholder="Nombre del edificio" />
                    <Input value={newObra.building_address} onChange={e => setNewObra(p => ({ ...p, building_address: e.target.value }))} placeholder="Dirección" />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={newObra.fecha_inicio} onChange={e => setNewObra(p => ({ ...p, fecha_inicio: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Fecha fin prevista</Label>
                <Input type="date" value={newObra.fecha_fin_prevista} onChange={e => setNewObra(p => ({ ...p, fecha_fin_prevista: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={newObra.estado} onValueChange={v => setNewObra(p => ({ ...p, estado: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Presupuesto inicial (€)</Label>
                <Input type="number" min="0" step="0.01" value={newObra.presupuesto_inicial}
                  onChange={e => setNewObra(p => ({ ...p, presupuesto_inicial: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input value={newObra.responsable_nombre} onChange={e => setNewObra(p => ({ ...p, responsable_nombre: e.target.value }))}
                placeholder={myTechRecord?.name || 'Nombre del responsable'} className="mt-1" />
            </div>
            <div>
              <Label>Descripción / Notas</Label>
              <textarea className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none"
                value={newObra.descripcion} onChange={e => setNewObra(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción de los trabajos..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button onClick={() => createObra.mutate()} disabled={saving || !newObra.nombre || !newObra.client_id} className="bg-orange-600 hover:bg-orange-700 text-white">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Crear obra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}