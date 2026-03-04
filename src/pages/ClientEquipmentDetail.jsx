import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Home, Thermometer, MapPin, Calendar, FileText,
  Snowflake, Flame, Wind, Droplet, ClipboardCheck, AlertCircle, Plus, Download } from
'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const equipmentTypeLabels = {
  split_mural: 'Split Mural',
  split_cassette: 'Split Cassette',
  split_conductos: 'Split Conductos',
  climatizador: 'Climatizador',
  enfriadora: 'Enfriadora',
  caldera: 'Caldera',
  bomba_calor: 'Bomba de calor',
  vrf: 'VRF / Caudal Variable',
  fancoil: 'Fancoil',
  uta: 'UTA',
  rooftop: 'Rooftop',
  torre_refrigeracion: 'Torre de refrigeración',
  otro: 'Otro'
};

const statusInfo = {
  operational: { label: 'Operativo', color: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  maintenance_needed: { label: 'Requiere mantenimiento', color: 'bg-amber-100 text-amber-800', icon: '⚠' },
  out_of_service: { label: 'Fuera de servicio', color: 'bg-red-100 text-red-800', icon: '✕' }
};

export default function ClientEquipmentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get('id');
  const clientId = urlParams.get('client_id');

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0] || null;
    },
    enabled: !!equipmentId
  });

  const { data: building } = useQuery({
    queryKey: ['building-equipment', equipment?.building_id],
    queryFn: async () => {
      const buildings = await base44.entities.Building.filter({ id: equipment.building_id });
      return buildings[0] || null;
    },
    enabled: !!equipment?.building_id
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions-equipment', equipmentId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ equipment_id: equipmentId, status: 'completed' }, '-completed_date'),
    enabled: !!equipmentId
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents-equipment', equipmentId],
    queryFn: () => base44.entities.Incident.filter({ equipment_id: equipmentId }, '-created_date'),
    enabled: !!equipmentId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <Skeleton className="h-64 rounded-xl bg-white/10" />
        </div>
      </div>);

  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-white/10 text-white">

              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-semibold text-white">Equipo</h1>
          </div>
          <Card className="p-12 bg-white/5 backdrop-blur-sm border-white/10 text-center">
            <div className="flex flex-col items-center gap-4">
              <Thermometer className="h-16 w-16 text-slate-400" />
              <p className="text-slate-300 text-lg">Equipo no encontrado</p>
              <div className="flex gap-3">
                <Button onClick={() => navigate(-1)} variant="outline" className="border-white/20 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <Button onClick={() => navigate(createPageUrl('HomeCliente'))} variant="outline" className="border-white/20 text-white">
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>);

  }

  return (
    <div className="bg-slate-100 p-6 min-h-screen from-slate-900 via-slate-800 to-slate-900">
      <div className="fixed top-10 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl(`HomeCliente`))}
              className="rounded-full hover:bg-white/10 text-white">

              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-semibold text-white">
              {equipment.brand} {equipment.model}
            </h1>
          </div>
        </div>

        {/* Status Overview Card */}
        <Card className="bg-slate-200 text-slate-950 mb-6 p-6 rounded-xl border shadow backdrop-blur-sm border-white/20">
          <div className="flex flex-col md:flex-row gap-6">
            {equipment.photo_url &&
            <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                <img
                src={equipment.photo_url}
                alt={`${equipment.brand} ${equipment.model}`}
                className="w-full h-full object-cover" />

              </div>
            }
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-white">
                      {equipment.brand} {equipment.model}
                    </h2>
                    <Badge className={statusInfo[equipment.status || 'operational'].color}>
                      {statusInfo[equipment.status || 'operational'].label}
                    </Badge>
                  </div>
                  <p className="text-slate-400">
                    {equipmentTypeLabels[equipment.equipment_type] || equipment.equipment_type}
                    {equipment.serial_number && ` · S/N: ${equipment.serial_number}`}
                  </p>
                  {building &&
                  <p className="text-sm text-slate-500 mt-1">{building.name}</p>
                  }
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {equipment.location &&
                <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Ubicación</p>
                      <p className="text-sm text-white">{equipment.location}</p>
                    </div>
                  </div>
                }
                {equipment.cooling_power_kw &&
                <div className="flex items-start gap-2">
                    <Snowflake className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pot. Frigorífica</p>
                      <p className="text-sm text-white">{equipment.cooling_power_kw} kW</p>
                    </div>
                  </div>
                }
                {equipment.heating_power_kw &&
                <div className="flex items-start gap-2">
                    <Flame className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Pot. Calorífica</p>
                      <p className="text-sm text-white">{equipment.heating_power_kw} kW</p>
                    </div>
                  </div>
                }
                {equipment.refrigerant_type &&
                <div className="flex items-start gap-2">
                    <Wind className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Refrigerante</p>
                      <p className="text-sm text-white">{equipment.refrigerant_type}</p>
                    </div>
                  </div>
                }
                {equipment.refrigerant_charge_kg &&
                <div className="flex items-start gap-2">
                    <Droplet className="h-4 w-4 text-cyan-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Carga</p>
                      <p className="text-sm text-white">{equipment.refrigerant_charge_kg} kg</p>
                    </div>
                  </div>
                }
                {equipment.installation_date &&
                <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Instalación</p>
                      <p className="text-sm text-white">
                        {format(new Date(equipment.installation_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          {equipment.notes &&
          <div className="mt-4 p-3 rounded-lg bg-white/5">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-400">Observaciones</p>
                  <p className="text-white">{equipment.notes}</p>
                </div>
              </div>
            </div>
          }
        </Card>

        {/* Revisiones */}
        <Card className="bg-slate-100 text-card-foreground mb-6 p-6 rounded-xl border shadow backdrop-blur-sm border-white/20">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-500" />
            Historial de Revisiones ({revisions.length})
          </h2>

          {revisions.length === 0 ?
          <p className="text-slate-500 text-center py-8">No hay revisiones registradas</p> :

          <div className="space-y-3">
              {revisions.map((revision) => {
                const handleDownload = () => {
                  const tipoLabel = revision.revision_type === 'monthly' ? 'Mensual' :
                    revision.revision_type === 'quarterly' ? 'Trimestral' :
                    revision.revision_type === 'biannual' ? 'Semestral' : 'Anual';
                  const fecha = format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es });
                  const datos = revision.revision_data ? Object.entries(revision.revision_data).map(([k, v]) => `${k}: ${v}`).join('\n') : '';
                  const contenido = `REVISIÓN ${tipoLabel.toUpperCase()}\nEquipo: ${equipment?.brand || ''} ${equipment?.model || ''}\nFecha: ${fecha}\n\n${datos}${revision.notes ? '\nNotas: ' + revision.notes : ''}`;
                  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Revision_${tipoLabel}_${fecha.replace(/ /g,'_')}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                };
                return (
                  <div key={revision.id} className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-800">
                          {format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es })}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Tipo: {revision.revision_type === 'monthly' ? 'Mensual' :
                          revision.revision_type === 'quarterly' ? 'Trimestral' :
                          revision.revision_type === 'biannual' ? 'Semestral' : 'Anual'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">Completada</Badge>
                        <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 px-2 text-xs">
                          <Download className="h-3 w-3 mr-1" />Descargar
                        </Button>
                      </div>
                    </div>
                    {revision.notes && <p className="text-sm text-slate-500 mt-2">{revision.notes}</p>}
                    {revision.revision_data && Object.keys(revision.revision_data).length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {Object.entries(revision.revision_data).slice(0, 6).map(([k, v]) => (
                          <p key={k} className="text-xs text-slate-500"><span className="font-medium">{k}:</span> {String(v)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </Card>

        {/* Incidencias */}
        <Card className="bg-amber-50 text-card-foreground p-6 rounded-xl border shadow backdrop-blur-sm border-white/20">
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Incidencias ({incidents.length})
          </h2>
          <Link to={createPageUrl(`ClientReportIncident`) + `?equipment_id=${equipmentId}`}>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs">
              <Plus className="h-3 w-3 mr-1" />Reportar Incidencia
            </Button>
          </Link>
          </div>

          {incidents.length === 0 ?
          <p className="text-slate-400 text-center py-8">No hay incidencias registradas</p> :

          <div className="space-y-3">
              {incidents.map((incident) =>
            <div
              key={incident.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10">

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{incident.title}</h3>
                    <Badge className={
                incident.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                incident.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                incident.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-slate-500/20 text-slate-400'
                }>
                      {incident.status === 'pending' ? 'Pendiente' :
                  incident.status === 'in_progress' ? 'En progreso' :
                  incident.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{incident.description}</p>
                  {incident.resolution_notes &&
              <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-emerald-400 font-medium">Resolución:</p>
                      <p className="text-sm text-emerald-300">{incident.resolution_notes}</p>
                    </div>
              }
                </div>
            )}
            </div>
          }
        </Card>
      </div>
    </div>);

}