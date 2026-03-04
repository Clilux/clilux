import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Home, Thermometer, MapPin, Calendar, FileText,
  Snowflake, Flame, Wind, Droplet, ClipboardCheck, Download } from
'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

const handleRevisionPDF = (revision, equipment) => {
  const doc = new jsPDF();
  const tipoLabel = revisionTypeLabels[revision.revision_type] || revision.revision_type;
  const fecha = format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es });
  const blue = [41, 98, 255];
  const teal = [0, 188, 212];
  const white = [255, 255, 255];
  const lightBg = [241, 245, 249];
  const midGray = [100, 116, 139];
  const darkText = [15, 23, 42];
  const purple = [103, 58, 183];

  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setFillColor(...teal);
  doc.rect(140, 0, 70, 45, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME DE REVISIÓN', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo: ${tipoLabel}   ·   Fecha: ${fecha}`, 14, 28);
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(14, 33, 32, 7, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPLETADA', 16, 38);

  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 52, 182, 38, 4, 4, 'F');
  doc.setFillColor(...blue);
  doc.roundedRect(14, 52, 5, 38, 2, 2, 'F');
  doc.setTextColor(...blue);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPO', 24, 60);
  doc.setTextColor(...darkText);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(equipment ? `${equipment.brand} ${equipment.model}` : 'Equipo', 24, 69);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...midGray);
  if (equipment) {
    const details = [
      equipment.serial_number ? `S/N: ${equipment.serial_number}` : null,
      equipment.location ? `Ubicación: ${equipment.location}` : null,
    ].filter(Boolean).join('   ·   ');
    if (details) doc.text(details, 24, 76);
  }

  let y = 100;

  if (revision.revision_data && Object.keys(revision.revision_data).length > 0) {
    doc.setFillColor(...blue);
    doc.roundedRect(14, y - 6, 182, 10, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA REVISIÓN', 18, y + 1);
    y += 14;
    const entries = Object.entries(revision.revision_data);
    entries.forEach(([key, value], i) => {
      const col = i % 2 === 0 ? 14 : 108;
      if (i % 2 === 0 && i > 0) y += 18;
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFillColor(...(i % 4 < 2 ? [235, 245, 255] : [240, 253, 250]));
      doc.roundedRect(col, y - 5, 88, 16, 2, 2, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...midGray);
      doc.text(String(key).toUpperCase(), col + 3, y + 1);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkText);
      doc.text(String(value ?? '-'), col + 3, y + 9);
    });
    y += 24;
  }

  if (revision.notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(...purple);
    doc.roundedRect(14, y - 6, 182, 10, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES', 18, y + 1);
    y += 14;
    const notesLines = doc.splitTextToSize(revision.notes, 174);
    doc.setFillColor(250, 245, 255);
    doc.roundedRect(14, y - 4, 182, notesLines.length * 6 + 8, 3, 3, 'F');
    doc.setFillColor(...purple);
    doc.roundedRect(14, y - 4, 4, notesLines.length * 6 + 8, 2, 2, 'F');
    doc.setTextColor(74, 20, 140); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(notesLines, 22, y + 2);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...blue);
    doc.rect(0, 284, 210, 13, 'F');
    doc.setFillColor(...teal);
    doc.rect(150, 284, 60, 13, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Informe generado automáticamente · Clilux', 14, 292);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pág. ${i}/${pageCount}`, 185, 292);
  }
  doc.save(`Revision_${tipoLabel}_${fecha.replace(/ /g, '_')}.pdf`);
};

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
              {revisions.map((revision) => (
                <div key={revision.id} className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800">
                        {format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es })}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Tipo: {revisionTypeLabels[revision.revision_type] || revision.revision_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700">Completada</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleRevisionPDF(revision, equipment)} className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
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
              ))}
            </div>
          }
        </Card>


      </div>
    </div>);

}