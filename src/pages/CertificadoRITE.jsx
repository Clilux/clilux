import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileCheck, Download } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CertificadoRITE() {
  const [selectedClient, setSelectedClient] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || { company_name: 'Clilux M' };
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
    enabled: !!selectedClient,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list(),
    enabled: !!selectedClient,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !!selectedClient,
  });

  const handleGenerateCertificate = async () => {
    if (!selectedClient) {
      toast.error('Selecciona un cliente');
      return;
    }

    setGenerating(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      const client = clients.find(c => c.id === selectedClient);
      const companyName = settings?.company_name || 'Clilux M';
      
      // Filtrar equipos del cliente
      const clientEquipment = equipment.filter(e => e.client_id === selectedClient);
      
      // Filtrar revisiones del año seleccionado
      const yearRevisions = revisions.filter(r => 
        r.client_id === selectedClient && 
        new Date(r.revision_date).getFullYear() === year
      );

      // Encabezado del certificado
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 50, 'F');
      
      if (settings?.logo_url) {
        try {
          pdf.addImage(settings.logo_url, 'PNG', margin, 15, 30, 20);
        } catch (e) {}
      }

      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('CERTIFICADO DE MANTENIMIENTO', pageWidth / 2, 25, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Según IT-3 del Reglamento RITE', pageWidth / 2, 35, { align: 'center' });
      
      yPos = 65;

      // Información del certificado
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Nº Certificado: RITE-${year}-${client?.cif || '000'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Fecha de emisión: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, margin, yPos);
      yPos += 15;

      // Datos del cliente
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('DATOS DEL TITULAR', margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      
      const clientData = [
        ['Razón Social:', client?.name || ''],
        ['CIF/NIF:', client?.cif || ''],
        ['Dirección:', client?.address || ''],
        ['Ciudad:', `${client?.postal_code || ''} ${client?.city || ''}, ${client?.province || ''}`.trim()],
        ['Teléfono:', client?.phone || ''],
      ];

      clientData.forEach(([label, value]) => {
        if (value) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(71, 85, 105);
          pdf.text(label, margin, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(51, 65, 85);
          pdf.text(value, margin + 40, yPos);
          yPos += 6;
        }
      });

      yPos += 10;

      // Certificación
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('CERTIFICACIÓN', margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      
      const certText = `Por medio del presente certificado, ${companyName} certifica que durante el año ${year} se han realizado las operaciones de mantenimiento preventivo sobre las instalaciones térmicas del titular arriba indicado, de acuerdo con lo establecido en la Instrucción Técnica IT-3 del Reglamento de Instalaciones Térmicas en los Edificios (RITE).`;
      
      const certLines = pdf.splitTextToSize(certText, pageWidth - 2 * margin);
      pdf.text(certLines, margin, yPos);
      yPos += certLines.length * 5 + 10;

      // Listado de equipos mantenidos
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('EQUIPOS MANTENIDOS', margin, yPos);
      yPos += 10;

      if (clientEquipment.length > 0) {
        // Encabezado tabla
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 65, 85);
        pdf.text('Tipo Equipo', margin + 2, yPos);
        pdf.text('Marca/Modelo', margin + 50, yPos);
        pdf.text('Ubicación', margin + 100, yPos);
        pdf.text('Revisiones', margin + 145, yPos);
        yPos += 8;

        // Equipos
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        clientEquipment.forEach((eq, index) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = margin;
          }

          const building = buildings.find(b => b.id === eq.building_id);
          const eqRevisions = yearRevisions.filter(r => r.equipment_id === eq.id);
          
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
          }

          pdf.setTextColor(51, 65, 85);
          pdf.text(eq.equipment_type.substring(0, 15), margin + 2, yPos);
          pdf.text(`${eq.brand} ${eq.model}`.substring(0, 25), margin + 50, yPos);
          pdf.text((eq.location || building?.name || '').substring(0, 20), margin + 100, yPos);
          pdf.text(eqRevisions.length.toString(), margin + 150, yPos);
          
          yPos += 7;
        });
      } else {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text('No hay equipos registrados para este cliente', margin, yPos);
      }

      yPos += 15;

      // Total de revisiones
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`TOTAL DE REVISIONES REALIZADAS EN ${year}: ${yearRevisions.length}`, margin, yPos);
      yPos += 10;

      // Conclusión
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      
      const conclusionText = `Las operaciones de mantenimiento han sido realizadas por personal técnico cualificado de ${companyName}, cumpliendo con los requisitos establecidos en la normativa vigente IT-3 del RITE para garantizar el correcto funcionamiento, seguridad y eficiencia energética de las instalaciones.`;
      
      const conclusionLines = pdf.splitTextToSize(conclusionText, pageWidth - 2 * margin);
      pdf.text(conclusionLines, margin, yPos);
      yPos += conclusionLines.length * 5 + 20;

      // Firma
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = margin;
      }

      yPos = pageHeight - 60;
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, yPos, margin + 70, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Firma y Sello de la Empresa', margin, yPos);
      pdf.text(companyName, margin, yPos + 5);

      // Pie de página
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        'Certificado conforme al RITE - Reglamento de Instalaciones Térmicas en Edificios',
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
      );
      pdf.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy')} por ${companyName}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      pdf.save(`certificado-rite-${year}-${client?.name.replace(/\s+/g, '-')}.pdf`);
      toast.success('Certificado generado correctamente');
    } catch (error) {
      console.error('Error generando certificado:', error);
      toast.error('Error al generar el certificado');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Certificado Anual RITE" />

        <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <FileCheck className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Certificado de Mantenimiento RITE</h2>
              <p className="text-slate-400">Documento oficial anual según IT-3</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-slate-300">Cliente *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Año del Certificado *</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min="2020"
                max={new Date().getFullYear()}
                className="bg-white/5 border-white/20 text-white mt-1"
              />
            </div>

            {selectedClient && (
              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <h4 className="text-white font-medium mb-2">Vista Previa</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• Cliente: {clients.find(c => c.id === selectedClient)?.name}</p>
                  <p>• Equipos: {equipment.filter(e => e.client_id === selectedClient).length}</p>
                  <p>• Revisiones en {year}: {revisions.filter(r => r.client_id === selectedClient && new Date(r.revision_date).getFullYear() === year).length}</p>
                </div>
              </Card>
            )}

            <div className="pt-4 border-t border-white/10">
              <p className="text-slate-400 text-sm mb-4">
                El certificado incluirá el listado completo de equipos mantenidos durante {year}, 
                las revisiones realizadas y la certificación de cumplimiento según la IT-3 del RITE.
              </p>
              <Button
                onClick={handleGenerateCertificate}
                disabled={!selectedClient || generating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando Certificado...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generar Certificado PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Contenido del Certificado</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">✓</span>
              <span>Datos completos del cliente y empresa mantenedora</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">✓</span>
              <span>Listado detallado de equipos con tipo, marca, modelo y ubicación</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">✓</span>
              <span>Número total de revisiones realizadas durante el año</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">✓</span>
              <span>Certificación de cumplimiento normativo según IT-3 RITE</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">✓</span>
              <span>Formato profesional listo para entregar al cliente o presentar ante inspecciones</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}