import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function EditScheduledRevision() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const revisionId = urlParams.get('id');
  
  const [formData, setFormData] = useState({
    scheduled_date: '',
    revision_type: 'monthly',
    status: 'pending'
  });

  const { data: revision, isLoading } = useQuery({
    queryKey: ['scheduled-revision', revisionId],
    queryFn: async () => {
      const items = await base44.entities.ScheduledRevision.filter({ id: revisionId });
      const rev = items[0];
      if (rev) {
        setFormData({
          scheduled_date: rev.scheduled_date,
          revision_type: rev.revision_type,
          status: rev.status
        });
      }
      return rev;
    },
    enabled: !!revisionId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment', revision?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: revision.equipment_id });
      return items[0];
    },
    enabled: !!revision?.equipment_id,
  });

  const { data: client } = useQuery({
    queryKey: ['client', revision?.client_id],
    queryFn: async () => {
      const items = await base44.entities.Client.filter({ id: revision.client_id });
      return items[0];
    },
    enabled: !!revision?.client_id,
  });

  const { data: building } = useQuery({
    queryKey: ['building', revision?.building_id],
    queryFn: async () => {
      const items = await base44.entities.Building.filter({ id: revision.building_id });
      return items[0];
    },
    enabled: !!revision?.building_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ScheduledRevision.update(revisionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      toast.success('Revisión actualizada');
      navigate(-1);
    },
    onError: () => {
      toast.error('Error al actualizar la revisión');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ScheduledRevision.delete(revisionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      toast.success('Revisión eliminada');
      navigate(-1);
    },
    onError: () => {
      toast.error('Error al eliminar la revisión');
    },
  });

  const handleSubmit = () => {
    if (!formData.scheduled_date) {
      toast.error('Introduce una fecha');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta revisión programada?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!revision) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto text-center py-12">
          <p className="text-slate-500">Revisión no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <NavHeader title="Editar Revisión Programada" />

        <Card className="p-6 mb-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">
              {equipment?.brand} {equipment?.model}
            </h2>
            {client && <p className="text-slate-600">{client.name}</p>}
            {building && <p className="text-slate-500 text-sm">{building.name}</p>}
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">Tipo de Revisión</Label>
              <Select
                value={formData.revision_type}
                onValueChange={(v) => setFormData({ ...formData, revision_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="biannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700">Fecha Programada *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-slate-700">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Guardar</>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}