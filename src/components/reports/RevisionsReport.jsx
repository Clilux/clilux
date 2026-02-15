import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

export default function RevisionsReport({ equipment, building, client, revisions }) {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Título
      pdf.setFontSize(20);
      pdf.setTextColor(30, 58, 138);
      pdf.text('Informe de Revisiones', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;

      // Datos del equipo
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Equipo:', 15, yPosition);
      yPosition += 7;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${equipment.brand} ${equipment.model}${equipment.serial_number ? ' - S/N: ' + equipment.serial_number : ''}`, 15, yPosition);
      yPosition += 6;
      
      if (client) {
        pdf.text(`Cliente: ${client.name}`, 15, yPosition);
        yPosition += 6;
      }
      
      if (building) {
        pdf.text(`Edificio: ${building.name}`, 15, yPosition);
        yPosition += 6;
      }

      yPosition += 10;

      // Historial de revisiones
      const completedRevisions = revisions.filter(r => r.status === 'completed').sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));
      
      if (completedRevisions.length === 0) {
        pdf.setTextColor(100, 100, 100);
        pdf.text('No hay revisiones completadas', pageWidth / 2, yPosition, { align: 'center' });
      } else {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Historial de Revisiones', 15, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        completedRevisions.forEach(rev => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 58, 138);
          pdf.text(`${revisionTypeLabels[rev.revision_type] || rev.revision_type} - ${format(new Date(rev.completed_date || rev.scheduled_date), 'dd/MM/yyyy')}`, 15, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(60, 60, 60);
          
          if (rev.revision_data) {
            const data = typeof rev.revision_data === 'string' ? JSON.parse(rev.revision_data) : rev.revision_data;
            Object.entries(data).forEach(([key, value]) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
              }
              const line = `  • ${key}: ${value}`;
              const splitLine = pdf.splitTextToSize(line, pageWidth - 30);
              pdf.text(splitLine, 15, yPosition);
              yPosition += splitLine.length * 5;
            });
          }
          
          if (rev.notes) {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(80, 80, 80);
            const splitNotes = pdf.splitTextToSize(`Observaciones: ${rev.notes}`, pageWidth - 30);
            pdf.text(splitNotes, 15, yPosition);
            yPosition += splitNotes.length * 5 + 2;
          }
          yPosition += 5;
        });
      }

      // Pie de página
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Descargar
      pdf.save(`Revisiones_${equipment.brand}_${equipment.model}_${format(new Date(), 'yyyyMMdd')}.pdf`);
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
          Informe Revisiones
        </>
      )}
    </Button>
  );
}