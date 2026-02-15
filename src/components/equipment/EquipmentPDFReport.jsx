import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EquipmentPDFReport({ equipment, building, client, revisions, interventions }) {
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
      pdf.text('Informe de Mantenimiento', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;

      // Datos del equipo
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Datos del Equipo', 15, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const equipmentData = [
        ['Marca:', equipment.brand || 'N/A'],
        ['Modelo:', equipment.model || 'N/A'],
        ['Nº Serie:', equipment.serial_number || 'N/A'],
        ['Tipo:', equipment.equipment_type || 'N/A'],
        ['Ubicación:', equipment.location || 'N/A'],
        ['Potencia Frío:', equipment.cooling_power_kw ? `${equipment.cooling_power_kw} kW` : 'N/A'],
        ['Potencia Calor:', equipment.heating_power_kw ? `${equipment.heating_power_kw} kW` : 'N/A'],
        ['Refrigerante:', equipment.refrigerant_type || 'N/A'],
        ['Carga:', equipment.refrigerant_charge_kg ? `${equipment.refrigerant_charge_kg} kg` : 'N/A'],
      ];

      equipmentData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 60, yPosition);
        yPosition += 6;
      });

      yPosition += 5;

      // Cliente y edificio
      if (client) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(client.name || 'N/A', 35, yPosition);
        yPosition += 6;
      }

      if (building) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Edificio:', 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(building.name || 'N/A', 35, yPosition);
        yPosition += 6;
      }

      yPosition += 10;

      // Historial de revisiones
      if (revisions && revisions.length > 0) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Historial de Revisiones', 15, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        const completedRevisions = revisions.filter(r => r.status === 'completed').slice(-10);
        
        completedRevisions.forEach(rev => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${rev.revision_type} - ${format(new Date(rev.completed_date || rev.scheduled_date), 'dd/MM/yyyy')}`, 15, yPosition);
          yPosition += 5;
          
          if (rev.notes) {
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            const splitNotes = pdf.splitTextToSize(rev.notes, pageWidth - 30);
            pdf.text(splitNotes, 20, yPosition);
            yPosition += splitNotes.length * 4 + 2;
          }
          yPosition += 3;
        });
      }

      yPosition += 10;

      // Últimas intervenciones
      if (interventions && interventions.length > 0) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Últimas Intervenciones', 15, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        const lastInterventions = interventions.slice(-5);
        
        lastInterventions.forEach(int => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${int.type || 'Intervención'} - ${format(new Date(int.date || int.created_date), 'dd/MM/yyyy')}`, 15, yPosition);
          yPosition += 5;
          
          if (int.description) {
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            const splitDesc = pdf.splitTextToSize(int.description, pageWidth - 30);
            pdf.text(splitDesc, 20, yPosition);
            yPosition += splitDesc.length * 4 + 2;
          }
          yPosition += 3;
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
      pdf.save(`Informe_${equipment.brand}_${equipment.model}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Informe PDF generado');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el PDF');
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
      className="gap-2"
    >
      {generating ? (
        <>
          <FileText className="h-4 w-4 animate-pulse" />
          Generando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Descargar Informe PDF
        </>
      )}
    </Button>
  );
}