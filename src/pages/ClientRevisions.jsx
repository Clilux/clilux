import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');

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

  // Obtener meses únicos de las revisiones
  const availableMonths = [...new Set(revisions.map(r => {
    const d = new Date(r.completed_date || r.scheduled_date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))].sort().reverse();

  const filteredRevisions = revisions.filter(r => {
    if (filterEquipment !== 'all' && r.equipment_id !== filterEquipment) return false;
    if (filterMonth !== 'all') {
      const d = new Date(r.completed_date || r.scheduled_date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthKey !== filterMonth) return false;
    }
    return true;
  });

  const getEquipmentName = (equipmentId) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    return eq ? `${eq.brand} ${eq.model}` : 'Equipo';
  };

  const getEquipment = (equipmentId) => equipment.find((e) => e.id === equipmentId);

  const handleDownloadPDF = (revision) => {
    const eq = getEquipment(revision.equipment_id);
    const doc = new jsPDF();
    const tipoLabel = revisionTypeLabels[revision.revision_type] || revision.revision_type;
    const fecha = format(new Date(revision.completed_date || revision.scheduled_date), "dd 'de' MMMM yyyy", { locale: es });

    // Colors
    const blue = [41, 98, 255];
    const teal = [0, 188, 212];
    const purple = [103, 58, 183];
    const white = [255, 255, 255];
    const darkBg = [15, 23, 42];
    const lightBg = [241, 245, 249];
    const midGray = [100, 116, 139];
    const darkText = [15, 23, 42];

    // === HEADER GRADIENT (simulate with two rects) ===
    doc.setFillColor(...blue);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setFillColor(...teal);
    doc.rect(140, 0, 70, 45, 'F');

    // Decorative circle
    doc.setFillColor(255, 255, 255, 0.1);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.circle(190, 10, 18, 'D');
    doc.circle(185, 38, 10, 'D');

    // Title
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE REVISIÓN', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo: ${tipoLabel}   ·   Fecha: ${fecha}`, 14, 28);

    // Status badge
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(14, 33, 32, 7, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLETADA', 16, 38);

    // === EQUIPMENT CARD ===
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
    if (eq) {
      doc.text(`${eq.brand} ${eq.model}`, 24, 69);
    } else {
      doc.text('Equipo no especificado', 24, 69);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...midGray);
    if (eq) {
      const details = [
        eq.serial_number ? `S/N: ${eq.serial_number}` : null,
        eq.location ? `Ubicación: ${eq.location}` : null,
        eq.equipment_type ? `Tipo: ${eq.equipment_type}` : null
      ].filter(Boolean).join('   ·   ');
      if (details) doc.text(details, 24, 76);
    }

    let y = 100;

    // === REVISION DATA ===
    if (revision.revision_data && Object.keys(revision.revision_data).length > 0) {
      // Section header
      doc.setFillColor(...blue);
      doc.roundedRect(14, y - 6, 182, 10, 2, 2, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE LA REVISIÓN', 18, y + 1);
      y += 14;

      const entries = Object.entries(revision.revision_data);
      const colW = 88;
      entries.forEach(([key, value], i) => {
        const col = i % 2 === 0 ? 14 : 108;
        if (i % 2 === 0 && i > 0) y += 18;
        if (y > 265) { doc.addPage(); y = 20; }

        const bgColor = i % 4 < 2 ? [235, 245, 255] : [240, 253, 250];
        doc.setFillColor(...bgColor);
        doc.roundedRect(col, y - 5, colW, 16, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...midGray);
        doc.text(String(key).toUpperCase(), col + 3, y + 1);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkText);
        doc.text(String(value ?? '-'), col + 3, y + 9);
      });

      // If odd number of entries, advance row
      if (entries.length % 2 !== 0) y += 18;
      else y += 18;
      y += 6;
    }

    // === NOTES ===
    if (revision.notes) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(...purple);
      doc.roundedRect(14, y - 6, 182, 10, 2, 2, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVACIONES', 18, y + 1);
      y += 14;

      doc.setFillColor(250, 245, 255);
      const notesLines = doc.splitTextToSize(revision.notes, 174);
      const notesH = notesLines.length * 6 + 8;
      doc.roundedRect(14, y - 4, 182, notesH, 3, 3, 'F');
      doc.setFillColor(...purple);
      doc.roundedRect(14, y - 4, 4, notesH, 2, 2, 'F');

      doc.setTextColor(74, 20, 140);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(notesLines, 22, y + 2);
      y += notesH + 10;
    }

    // === FOOTER ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...blue);
      doc.rect(0, 284, 210, 13, 'F');
      doc.setFillColor(...teal);
      doc.rect(150, 284, 60, 13, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe generado automáticamente · Clilux', 14, 292);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pág. ${i}/${pageCount}`, 185, 292);
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

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Filtrar por mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {availableMonths.map(m => {
                const [year, month] = m.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return (
                  <SelectItem key={m} value={m}>
                    {format(date, 'MMMM yyyy', { locale: es })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={filterEquipment} onValueChange={setFilterEquipment}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Filtrar por equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {equipment.map(eq => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.reference_name || `${eq.brand} ${eq.model}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredRevisions.length === 0 ? (
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
            {filteredRevisions.map((revision) => (
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
                    <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(revision)} className="h-7 px-2 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Download className="h-3 w-3" />Descargar
                    </Button>
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