import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EquipmentReport({ equipment, building, client }) {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Título
      pdf.setFontSize(20);
      pdf.setTextColor(30, 58, 138);
      pdf.text('Informe de Equipo', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // Foto del equipo si existe
      if (equipment.photo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = equipment.photo_url;
          });
          const imgWidth = 80;
          const imgHeight = 60;
          pdf.addImage(img, 'JPEG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (e) {
          console.error('Error cargando imagen:', e);
        }
      }

      // Datos del equipo
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Datos del Equipo', 15, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      
      const equipmentData = [
        ['Marca:', equipment.brand || 'N/A'],
        ['Modelo:', equipment.model || 'N/A'],
        ['Nº Serie:', equipment.serial_number || 'N/A'],
        ['Tipo:', equipment.equipment_type || 'N/A'],
        ['Ubicación:', equipment.location || 'N/A'],
        ['Fecha Instalación:', equipment.installation_date ? format(new Date(equipment.installation_date), 'dd/MM/yyyy') : 'N/A'],
        ['Potencia Frío:', equipment.cooling_power_kw ? `${equipment.cooling_power_kw} kW` : 'N/A'],
        ['Potencia Calor:', equipment.heating_power_kw ? `${equipment.heating_power_kw} kW` : 'N/A'],
        ['Refrigerante:', equipment.refrigerant_type || 'N/A'],
        ['Carga:', equipment.refrigerant_charge_kg ? `${equipment.refrigerant_charge_kg} kg` : 'N/A'],
        ['Estado:', equipment.status === 'operational' ? 'Operativo' : equipment.status === 'maintenance_needed' ? 'Requiere Mantenimiento' : 'Fuera de Servicio'],
      ];

      equipmentData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        const splitValue = pdf.splitTextToSize(value, pageWidth - 70);
        pdf.text(splitValue, 65, yPosition);
        yPosition += splitValue.length * 6;
      });

      yPosition += 5;

      // Cliente y edificio
      if (client) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', 15, yPosition);
        yPosition += 7;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(client.name || 'N/A', 15, yPosition);
        yPosition += 10;
      }

      if (building) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Edificio:', 15, yPosition);
        yPosition += 7;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(building.name || 'N/A', 15, yPosition);
        yPosition += 6;
        if (building.address) {
          pdf.text(building.address, 15, yPosition);
          yPosition += 6;
        }
      }

      if (equipment.notes) {
        yPosition += 10;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Observaciones:', 15, yPosition);
        yPosition += 7;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const splitNotes = pdf.splitTextToSize(equipment.notes, pageWidth - 30);
        pdf.text(splitNotes, 15, yPosition);
      }

      // Descargar
      pdf.save(`Equipo_${equipment.brand}_${equipment.model}_${format(new Date(), 'yyyyMMdd')}.pdf`);
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
          Informe Equipo
        </>
      )}
    </Button>
  );
}