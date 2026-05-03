import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Clock, Calendar, FileText, Loader2 } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPO_LABELS = {
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-100 text-blue-700' },
  baja_medica: { label: 'Baja médica', color: 'bg-red-100 text-red-700' },
  permiso: { label: 'Permiso', color: 'bg-yellow-100 text-yellow-700' },
  asunto_propio: { label: 'Asunto propio', color: 'bg-purple-100 text-purple-700' },
  maternidad_paternidad: { label: 'Mat./Paternidad', color: 'bg-pink-100 text-pink-700' },
  otro: { label: 'Otro', color: 'bg-slate-100 text-slate-700' },
};

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700' },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
};

export default function GestionAusencias() {
  const queryClient = useQueryClient();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newData, setNewData] = useState({
    tipo: 'vacaciones',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    enabled: !!currentUser,
  });

  const isAdmin = currentUser?.role === 'admin';
  const myTechRecord = technicians.find(t =>
    t.user_email === currentUser?.email || t.email === currentUser?.email
  );

  const { data: ausencias = [], isLoading } = useQuery({
    queryKey: ['ausencias', currentUser?.email, isAdmin],
    queryFn: async () => {
      const all = await base44.entities.Ausencia.list('-fecha_inicio', 200);
      if (!isAdmin) return all.filter(a => a.technician_email === currentUser?.email);
      if (myTechRecord?.company_id) {
        return all.filter(a => {
          const tech = technicians.find(t => t.user_email === a.technician_email || t.email === a.technician_email);
          return tech?.company_id === myTechRecord.company_id;
        });
      }
      return all;
    },
    enabled: !!currentUser,
  });

  const pendientes = ausencias.filter(a => a.estado === 'pendiente');
  const aprobadas = ausencias.filter(a => a.estado === 'aprobada');
  const rechazadas = ausencias.filter(a => a.estado === 'rechazada');

  const handleCreate = async () => {
    if (!newData.fecha_inicio || !newData.fecha_fin) return;
    setSaving(true);
    try {
      const dias = differenceInCalendarDays(
        parseISO(newData.fecha_fin),
        parseISO(newData.fecha_inicio)
      ) + 1;
      await base44.entities.Ausencia.create({
        technician_email: currentUser.email,
        technician_name: myTechRecord?.name || currentUser.full_name || currentUser.email,
        technician_id: myTechRecord?.id || '',
        company_id: myTechRecord?.company_id || '',
        ...newData,
        dias_totales: dias,
        estado: 'pendiente',
      });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      toast.success('Solicitud enviada');
      setShowNewDialog(false);
      setNewData({ tipo: 'vacaciones', fecha_inicio: '', fecha_fin: '', motivo: '' });
    } catch (err) {
      toast.error('Error al enviar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const handleEstado = async (ausencia, estado) => {
    try {
      await base44.entities.Ausencia.update(ausencia.id, { estado });
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      toast.success(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const AusenciaCard = ({ ausencia }) => {
    const tipo = TIPO_LABELS[ausencia.tipo] || TIPO_LABELS.otro;
    const estado = ESTADO_CONFIG[ausencia.estado] || ESTADO_CONFIG.pendiente;
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {isAdmin && (
              <p className="font-semibold text-slate-800 text-sm mb-1">{ausencia.technician_name || ausencia.technician_email}</p>
            )}
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge className={`${tipo.color} border-0 text-xs`}>{tipo.label}</Badge>
              <Badge className={`${estado.color} border-0 text-xs`}>{estado.label}</Badge>
            </div>
            <p className="text-sm text-slate-600">
              {ausencia.fecha_inicio && format(parseISO(ausencia.fecha_inicio), "d MMM yyyy", { locale: es })}
              {' → '}
              {ausencia.fecha_fin && format(parseISO(ausencia.fecha_fin), "d MMM yyyy", { locale: es })}
              <span className="text-slate-400 ml-2">({ausencia.dias_totales} día{ausencia.dias_totales !== 1 ? 's' : ''})</span>
            </p>
            {ausencia.motivo && <p className="text-xs text-slate-400 mt-1">{ausencia.motivo}</p>}
          </div>
          {isAdmin && ausencia.estado === 'pendiente' && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => handleEstado(ausencia, 'aprobada')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEstado(ausencia, 'rechazada')}
                className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Rechazar
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Ausencias y Vacaciones" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{pendientes.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-emerald-600">{aprobadas.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Aprobadas</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <p className="text-2xl font-bold text-red-500">{rechazadas.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rechazadas</p>
          </Card>
        </div>

        {/* Action */}
        {!isAdmin && (
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowNewDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva solicitud
            </Button>
          </div>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-slate-700">Pendientes de aprobación</h3>
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{pendientes.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendientes.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
            </div>
          </div>
        )}

        {/* Aprobadas */}
        {aprobadas.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-slate-700">Aprobadas</h3>
            </div>
            <div className="space-y-3">
              {aprobadas.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
            </div>
          </div>
        )}

        {/* Rechazadas */}
        {rechazadas.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-4 w-4 text-red-400" />
              <h3 className="font-semibold text-slate-700">Rechazadas</h3>
            </div>
            <div className="space-y-3">
              {rechazadas.map(a => <AusenciaCard key={a.id} ausencia={a} />)}
            </div>
          </div>
        )}

        {ausencias.length === 0 && !isLoading && (
          <Card className="p-8 text-center bg-white border-0 shadow-sm">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay solicitudes de ausencia</p>
            {!isAdmin && (
              <Button onClick={() => setShowNewDialog(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Crear solicitud
              </Button>
            )}
          </Card>
        )}

        {/* New dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva solicitud de ausencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Tipo de ausencia</Label>
                <Select value={newData.tipo} onValueChange={v => setNewData(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={newData.fecha_inicio}
                    onChange={e => setNewData(p => ({ ...p, fecha_inicio: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    value={newData.fecha_fin}
                    min={newData.fecha_inicio}
                    onChange={e => setNewData(p => ({ ...p, fecha_fin: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              {newData.fecha_inicio && newData.fecha_fin && (
                <p className="text-sm text-blue-600 font-medium">
                  {differenceInCalendarDays(parseISO(newData.fecha_fin), parseISO(newData.fecha_inicio)) + 1} días
                </p>
              )}
              <div>
                <Label>Motivo / Observaciones</Label>
                <Input
                  value={newData.motivo}
                  onChange={e => setNewData(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="Opcional"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newData.fecha_inicio || !newData.fecha_fin || saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}