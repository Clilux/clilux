import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Home, Calendar, Download } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function ClientRevisions() {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const storedClientId = sessionStorage.getItem('client_id');
    if (storedClientId) setClientId(storedClientId);
  }, []);

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['client-revisions-page', clientId],
    queryFn: () => base44.entities.ScheduledRevision.filter({ client_id: clientId, status: 'completed' }, '-completed_date'),
    enabled: !!clientId
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['client-equipment-rev', clientId],
    queryFn: () => base44.entities.Equipment.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : 'Equipo';
  };

  const getEquipment = (equipmentId) => equipment.find((e) => e.id === equipmentId);

  const handleDownloadPDF = (revision) => {
    const eq = getEquipment(revision.equipment_id);
    const doc = new jsPDF();
    const primaryColor = [41, 128, 185];
    const darkColor = [30, 30, 50];
    const lightGray = [245, 247, 250];
    const midGray = [100, 110, 130];

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 38, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE REVISIÓN', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const tipoLabel = revisionTypeLabels[revision.revision_type] || revision.revision_type;
    const fecha = format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es });
    doc.text(`Tipo: ${tipoLabel}  ·  Fecha: ${fecha}`, 14, 26);
    doc.text(`Estado: Completada`, 14, 33);

    // Equipment info box
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, 44, 182, 32, 3, 3, 'F');
    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipo', 20, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...midGray);
    if (eq) {
      doc.text(`${eq.brand} ${eq.model}`, 20, 62);
      if (eq.serial_number) doc.text(`S/N: ${eq.serial_number}`, 20, 69);
      if (eq.location) doc.text(`Ubicación: ${eq.location}`, 100, 62);
      if (eq.equipment_type) doc.text(`Tipo: ${eq.equipment_type}`, 100, 69);
    }

    let y = 88;

    // Revision data
    if (revision.revision_data && Object.keys(revision.revision_data).length > 0) {
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos de la Revisión', 14, y);
      y += 6;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(14, y, 196, y);
      y += 8;

      const entries = Object.entries(revision.revision_data);
      entries.forEach(([key, value], i) => {
        if (i % 2 === 0 && i > 0) y += 10;
        if (y > 270) { doc.addPage(); y = 20; }
        const col = i % 2 === 0 ? 14 : 110;
        doc.setFillColor(...lightGray);
        doc.roundedRect(col, y - 4, 88, 9, 1, 1, 'F');
        doc.setTextColor(...midGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(String(key), col + 3, y + 1);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkColor);
        doc.setFontSize(9);
        doc.text(String(value ?? ''), col + 3, y + 6);
      });
      y += 18;
    }

    // Notes
    if (revision.notes) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones', 14, y);
      y += 6;
      doc.setDrawColor(...primaryColor);
      doc.line(14, y, 196, y);
      y += 8;
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(revision.notes, 180);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 6;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(230, 235, 245);
      doc.rect(0, 284, 210, 13, 'F');
      doc.setTextColor(...midGray);
      doc.setFontSize(8);
      doc.text('Informe generado automáticamente', 14, 291);
      doc.text(`Página ${i} de ${pageCount}`, 180, 291);
    }

    doc.save(`Revision_${tipoLabel}_${fecha.replace(/ /g, '_')}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-500 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 bg-white/10" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-500 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Revisiones" showBack={true} homeUrl="HomeCliente" />

        {revisions.length === 0 ? (
          <Card className="p-12 bg-white/10 border-white/20 text-center">
            <div className="flex flex-col items-center gap-4">
              <ClipboardCheck className="h-16 w-16 text-slate-400" />
              <p className="text-slate-300 text-lg">No hay revisiones completadas</p>
              <Link to={createPageUrl('HomeCliente')}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {revisions.map((revision) => (
              <Card key={revision.id} className="bg-slate-200 p-5 rounded-xl border shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ClipboardCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {getEquipmentName(revision.equipment_id)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-sm text-slate-600">
                          {format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                      {revision.notes && (
                        <p className="text-sm text-slate-500 mt-1">{revision.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700">Completada</Badge>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      {revisionTypeLabels[revision.revision_type] || revision.revision_type}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}