import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente'
};

const statusLabels = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  resolved: 'Resuelta',
  closed: 'Cerrada'
};

export default function IncidentReport({ incident, equipment, client, building }) {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Título
      pdf.setFontSize(20);
      pdf.setTextColor(220, 38, 38);
      pdf.text('Informe de Incidencia', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // Información de la incidencia
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Información de la Incidencia', 15, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);

      const incidentData = [
        ['Título:', incident.title || 'N/A'],
        ['Estado:', statusLabels[incident.status] || incident.status],
        ['Prioridad:', priorityLabels[incident.priority] || incident.priority],
        ['Reportado por:', incident.reported_by_name || incident.reported_by || 'N/A'],
        ['Fecha reporte:', format(new Date(incident.created_date), 'dd/MM/yyyy HH:mm', { locale: es })],
      ];

      incidentData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        const splitValue = pdf.splitTextToSize(value, pageWidth - 70);
        pdf.text(splitValue, 55, yPosition);
        yPosition += splitValue.length * 6;
      });

      yPosition += 5;

      // Descripción
      if (incident.description) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Descripción:', 15, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        const splitDesc = pdf.splitTextToSize(incident.description, pageWidth - 30);
        pdf.text(splitDesc, 15, yPosition);
        yPosition += splitDesc.length * 6 + 5;
      }

      // Equipo afectado
      if (equipment) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Equipo Afectado', 15, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(`${equipment.brand} ${equipment.model}`, 15, yPosition);
        yPosition += 6;
        if (equipment.serial_number) {
          pdf.text(`Nº Serie: ${equipment.serial_number}`, 15, yPosition);
          yPosition += 6;
        }
        if (equipment.location) {
          pdf.text(`Ubicación: ${equipment.location}`, 15, yPosition);
          yPosition += 6;
        }
        yPosition += 5;
      }

      // Cliente
      if (client) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Cliente', 15, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(client.name, 15, yPosition);
        yPosition += 6;
        if (client.phone) {
          pdf.text(`Tel: ${client.phone}`, 15, yPosition);
          yPosition += 6;
        }
        yPosition += 5;
      }

      // Edificio
      if (building) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Edificio', 15, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(building.name, 15, yPosition);
        yPosition += 6;
        if (building.address) {
          pdf.text(building.address, 15, yPosition);
          yPosition += 6;
        }
        yPosition += 5;
      }

      // Notas del técnico
      if (incident.technician_notes) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Notas del Técnico', 15, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        const splitNotes = pdf.splitTextToSize(incident.technician_notes, pageWidth - 30);
        pdf.text(splitNotes, 15, yPosition);
        yPosition += splitNotes.length * 6 + 5;
      }

      // Resolución
      if (incident.resolution_notes) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94);
        pdf.text('Resolución', 15, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        if (incident.resolution_date) {
          pdf.text(`Fecha: ${format(new Date(incident.resolution_date), 'dd/MM/yyyy')}`, 15, yPosition);
          yPosition += 7;
        }
        const splitResolution = pdf.splitTextToSize(incident.resolution_notes, pageWidth - 30);
        pdf.text(splitResolution, 15, yPosition);
      }

      // Descargar
      pdf.save(`Incidencia_${incident.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Informe generado');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el informe');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      variant="outline"
      size="sm"
    >
      {generating ? (
        <>
          <FileText className="h-4 w-4 mr-2 animate-pulse" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Informe Incidencia
        </>
      )}
    </Button>
  );
}