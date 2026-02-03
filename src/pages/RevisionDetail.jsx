import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Edit, Calendar, User, ClipboardCheck, FileText,
  Thermometer, Gauge, CheckCircle, XCircle, AlertTriangle, Trash2
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import StatusBadge from '../components/ui/StatusBadge';
import DeleteConfirmDialog from '../components/ui/DeleteConfirmDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusLabels = {
  bueno: 'Bueno',
  aceptable: 'Aceptable',
  sucio: 'Sucio',
  cambiar: 'Requiere cambio',
  desgastado: 'Desgastado',
  na: 'N/A',
  correcto: 'Correcto',
  bajo: 'Bajo',
  deteriorado: 'Deteriorado',
  reparar: 'Requiere reparación',
  limpia: 'Limpia',
  sucia: 'Sucia',
  normales: 'Normales',
  elevadas: 'Elevadas',
  excesivas: 'Excesivas',
};

export default function RevisionDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const revisionId = urlParams.get('id');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Revision.delete(revisionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      toast.success('Revisión eliminada');
      navigate(-1);
    },
    onError: () => toast.error('Error al eliminar la revisión'),
  });

  const { data: revision, isLoading } = useQuery({
    queryKey: ['revision', revisionId],
    queryFn: async () => {
      const revisions = await base44.entities.Revision.filter({ id: revisionId });
      return revisions[0] || null;
    },
    enabled: !!revisionId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment-revision', revision?.equipment_id],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: revision.equipment_id });
      return items[0] || null;
    },
    enabled: !!revision?.equipment_id,
  });

  const { data: building } = useQuery({
    queryKey: ['building-revision', revision?.building_id],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: revision.building_id });
      return buildings[0] || null;
    },
    enabled: !!revision?.building_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!revision) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-slate-500">Revisión no encontrada</p>
        </div>
      </div>
    );
  }

  const it3 = revision.it3_data || {};

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title={`Revisión ${format(new Date(revision.revision_date), "dd/MM/yyyy")}`} />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-50">
                <ClipboardCheck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {format(new Date(revision.revision_date), "dd 'de' MMMM yyyy", { locale: es })}
                </h2>
                {equipment && (
                  <Link 
                    to={createPageUrl(`EquipmentDetail?id=${equipment.id}`)}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {equipment.brand} {equipment.model}
                  </Link>
                )}
                {building && (
                  <span className="text-slate-400"> · {building.name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={revision.revision_type} />
              <StatusBadge status={revision.general_status} />
              <Link to={createPageUrl(`RevisionForm?id=${revision.id}`)}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Fecha de Revisión</p>
                <p className="text-slate-700">{format(new Date(revision.revision_date), "dd/MM/yyyy")}</p>
              </div>
            </div>
            {revision.technician_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Técnico</p>
                  <p className="text-slate-700">{revision.technician_name}</p>
                </div>
              </div>
            )}
            {revision.next_revision_date && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Próxima Revisión</p>
                  <p className="text-slate-700">{format(new Date(revision.next_revision_date), "dd/MM/yyyy")}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {revision.it3_data && Object.keys(revision.it3_data).some(k => revision.it3_data[k]) && (
          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Datos IT3 RITE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Temperaturas */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperaturas
                </h4>
                {it3.temp_impulsion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Impulsión</span>
                    <span className="font-medium">{it3.temp_impulsion}°C</span>
                  </div>
                )}
                {it3.temp_retorno && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Retorno</span>
                    <span className="font-medium">{it3.temp_retorno}°C</span>
                  </div>
                )}
                {it3.temp_exterior && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Exterior</span>
                    <span className="font-medium">{it3.temp_exterior}°C</span>
                  </div>
                )}
                {it3.humedad_relativa && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Humedad</span>
                    <span className="font-medium">{it3.humedad_relativa}%</span>
                  </div>
                )}
              </div>

              {/* Presiones */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Presiones
                </h4>
                {it3.presion_alta && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Presión alta</span>
                    <span className="font-medium">{it3.presion_alta} bar</span>
                  </div>
                )}
                {it3.presion_baja && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Presión baja</span>
                    <span className="font-medium">{it3.presion_baja} bar</span>
                  </div>
                )}
                {it3.caudal_aire && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Caudal aire</span>
                    <span className="font-medium">{it3.caudal_aire} m³/h</span>
                  </div>
                )}
                {it3.consumo_electrico && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Consumo</span>
                    <span className="font-medium">{it3.consumo_electrico} kW</span>
                  </div>
                )}
              </div>

              {/* Estado de componentes */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Estado
                </h4>
                {it3.estado_filtros && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Filtros</span>
                    <span className="font-medium">{statusLabels[it3.estado_filtros] || it3.estado_filtros}</span>
                  </div>
                )}
                {it3.estado_correas && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Correas</span>
                    <span className="font-medium">{statusLabels[it3.estado_correas] || it3.estado_correas}</span>
                  </div>
                )}
                {it3.nivel_aceite && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Aceite</span>
                    <span className="font-medium">{statusLabels[it3.nivel_aceite] || it3.nivel_aceite}</span>
                  </div>
                )}
                {it3.limpieza_unidad && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Limpieza</span>
                    <span className="font-medium">{statusLabels[it3.limpieza_unidad] || it3.limpieza_unidad}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alertas */}
            {(it3.fugas_refrigerante || it3.ruidos_anomalos) && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {it3.fugas_refrigerante && (
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Fugas de refrigerante detectadas
                    </p>
                  )}
                  {it3.ruidos_anomalos && (
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Ruidos anómalos detectados
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {(revision.observations || revision.actions_taken || revision.recommendations) && (
          <Card className="p-6 bg-white border-0 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observaciones y Acciones
            </h3>
            <div className="space-y-4">
              {revision.observations && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Observaciones</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{revision.observations}</p>
                </div>
              )}
              {revision.actions_taken && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Acciones Realizadas</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{revision.actions_taken}</p>
                </div>
              )}
              {revision.recommendations && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Recomendaciones</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{revision.recommendations}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {revision.photos && revision.photos.length > 0 && (
          <Card className="p-6 bg-white border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Fotos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {revision.photos.map((photo, index) => (
                <a 
                  key={index} 
                  href={photo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
                >
                  <img 
                    src={photo} 
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </Card>
        )}

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="¿Eliminar revisión?"
          description="Esta revisión se eliminará permanentemente. Esta acción no se puede deshacer."
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}