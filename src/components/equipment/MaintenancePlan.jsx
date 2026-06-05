import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, Edit2, Save, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

const revisionTypeColors = {
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-purple-100 text-purple-700',
  biannual: 'bg-orange-100 text-orange-700',
  annual: 'bg-green-100 text-green-700'
};

// Helper: llama al proxy si hay sesión de técnico, o directo si hay sesión Base44
const techEmail = () => sessionStorage.getItem('technician_email');

const proxyCall = async (entity, extraBody = {}) => {
  const res = await base44.functions.invoke('getCompanyData', {
    technician_email: techEmail(),
    entity,
    ...extraBody,
  });
  return res.data;
};

export default function MaintenancePlan({ equipmentId, clientId, buildingId }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRevision, setNewRevision] = useState({
    revision_type: 'monthly',
    scheduled_date: ''
  });

  const isTechSession = !!techEmail();

  const { data: revisions = [] } = useQuery({
    queryKey: ['equipment-revisions', equipmentId],
    queryFn: async () => {
      let all;
      if (isTechSession) {
        const res = await proxyCall('equipment_revisions', { equipment_id: equipmentId });
        all = res.data || [];
      } else {
        all = await base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId });
      }
      return all.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    },
    enabled: !!equipmentId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment-revisions'] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, date }) => {
      if (isTechSession) {
        await proxyCall('revision_update', { revision_id: id, updates: { scheduled_date: date } });
      } else {
        await base44.entities.ScheduledRevision.update(id, { scheduled_date: date });
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Fecha actualizada');
      setEditingId(null);
      setEditDate('');
    },
    onError: () => toast.error('Error al actualizar la fecha'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const record = {
        equipment_id: equipmentId,
        client_id: clientId,
        building_id: buildingId,
        ...data,
        status: 'pending'
      };
      if (isTechSession) {
        await proxyCall('revision_create', { record });
      } else {
        await base44.entities.ScheduledRevision.create(record);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Revisión añadida');
      setShowAddForm(false);
      setNewRevision({ revision_type: 'monthly', scheduled_date: '' });
    },
    onError: () => toast.error('Error al crear la revisión'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (isTechSession) {
        await proxyCall('revision_delete', { revision_id: id });
      } else {
        await base44.entities.ScheduledRevision.delete(id);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Revisión eliminada');
    },
    onError: () => toast.error('Error al eliminar la revisión'),
  });

  const handleStartEdit = (revision) => {
    setEditingId(revision.id);
    setEditDate(revision.scheduled_date);
  };

  const handleSaveEdit = (id) => {
    if (!editDate) {
      toast.error('Introduce una fecha válida');
      return;
    }
    updateMutation.mutate({ id, date: editDate });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate('');
  };

  const handleAddRevision = () => {
    if (!newRevision.scheduled_date) {
      toast.error('Introduce una fecha');
      return;
    }
    createMutation.mutate(newRevision);
  };

  const handleDeleteRevision = (id) => {
    if (window.confirm('¿Eliminar esta revisión programada?')) {
      deleteMutation.mutate(id);
    }
  };

  const pendingRevisions = revisions.filter(r => r.status === 'pending');
  const completedRevisions = revisions.filter(r => r.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Plan de Mantenimiento</h3>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Revisión
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo</label>
              <select
                value={newRevision.revision_type}
                onChange={(e) => setNewRevision({ ...newRevision, revision_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="biannual">Semestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Fecha</label>
              <Input
                type="date"
                value={newRevision.scheduled_date}
                onChange={(e) => setNewRevision({ ...newRevision, scheduled_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddRevision} disabled={createMutation.isPending}>
              <Save className="h-3 w-3 mr-1" />
              Guardar
            </Button>
          </div>
        </Card>
      )}

      {pendingRevisions.length === 0 && !showAddForm ? (
        <Card className="p-8 text-center bg-slate-50">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">No hay revisiones programadas</p>
          <p className="text-slate-400 text-sm mt-1">Añade revisiones al plan de mantenimiento</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingRevisions.map((revision) => (
            <Card key={revision.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={revisionTypeColors[revision.revision_type]}>
                        {revisionTypeLabels[revision.revision_type]}
                      </Badge>
                      <Badge variant="outline" className="text-slate-600">
                        Pendiente
                      </Badge>
                    </div>
                    {editingId === revision.id ? (
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="max-w-xs"
                      />
                    ) : (
                      <p className="text-sm text-slate-600">
                        {format(new Date(revision.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingId === revision.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveEdit(revision.id)}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleStartEdit(revision)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRevision(revision.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {completedRevisions.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Revisiones Completadas</h4>
          <div className="space-y-2">
            {completedRevisions.slice(0, 5).map((revision) => (
              <div key={revision.id} className="flex items-center gap-3 p-2 rounded bg-slate-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <Badge className={revisionTypeColors[revision.revision_type]} variant="outline">
                  {revisionTypeLabels[revision.revision_type]}
                </Badge>
                <span className="text-sm text-slate-600">
                  {format(new Date(revision.completed_date || revision.scheduled_date), "d MMM yyyy", { locale: es })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}