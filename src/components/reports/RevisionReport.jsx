import React, { useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusLabels = {
  good: 'Bueno',
  acceptable: 'Aceptable',
  needs_repair: 'Necesita reparación',
  critical: 'Crítico',
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

export default function RevisionReport({ equipment, revisions, building, client, onClose }) {
  const reportRef = useRef(null);
  
  // Cargar fieldConfigs independientemente en lugar de recibirlos como prop
  const { data: fieldConfigs = [] } = useQuery({
    queryKey: ['revision-field-configs'],
    queryFn: () => base44.entities.RevisionFieldConfig.list(),
  });

  // Función para obtener el label correcto de un campo
  const getFieldLabel = (fieldKey) => {
    // Buscar en todas las configuraciones de campos
    if (fieldConfigs.length > 0) {
      // Primero buscar coincidencia exacta
      for (const config of fieldConfigs) {
        if (config?.fields) {
          const fieldConfig = config.fields.find(f => f.field_key === fieldKey);
          if (fieldConfig?.field_label) {
            return fieldConfig.field_label;
          }
        }
      }
      
      // Si es un campo custom (ej: "Custom 1770144909208" o "custom_1770144909208")
      // buscar por el timestamp/número
      if (fieldKey.includes('ustom')) { // match both "Custom" and "custom"
        const customNumber = fieldKey.replace(/^[Cc]ustom[\s_]/, ''); // extraer el número
        
        for (const config of fieldConfigs) {
          if (config?.fields) {
            // Buscar campos que contengan ese número en su field_key
            const fieldConfig = config.fields.find(f => 
              f.field_key && (
                f.field_key.includes(customNumber) ||
                f.field_key.replace(/^custom_/, '') === customNumber
              )
            );
            if (fieldConfig?.field_label) {
              return fieldConfig.field_label;
            }
          }
        }
      }
    }
    
    // Fallback: si es un campo custom, mostrar solo "Campo personalizado"
    if (fieldKey.toLowerCase().includes('custom')) {
      return 'Campo personalizado';
    }
    
    // Fallback: formatear el key
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Generando PDF...');
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Configurar fuentes
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(15, 23, 42);
      
      // Título principal
      pdf.text('INFORME DE REVISIONES', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Línea separadora
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Información del equipo
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('DATOS DEL EQUIPO', margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const equipData = [
        ['Marca/Modelo:', `${equipment.brand} ${equipment.model}`],
        ['Número de Serie:', equipment.serial_number || '-'],
        ['Tipo de Equipo:', equipment.equipment_type],
        ['Ubicación:', equipment.location || '-'],
        ['Cliente:', client?.name || '-'],
        ['Edificio:', building?.name || '-'],
      ];

      if (equipment.cooling_power_kw) {
        equipData.push(['Potencia Frigorífica:', `${equipment.cooling_power_kw} kW`]);
      }
      if (equipment.refrigerant_type) {
        equipData.push(['Refrigerante:', `${equipment.refrigerant_type} (${equipment.refrigerant_charge_kg || 0} kg)`]);
      }

      equipData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(71, 85, 105);
        pdf.text(label, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(51, 65, 85);
        pdf.text(value, margin + 50, yPos);
        yPos += 6;
      });

      yPos += 10;

      // Historial de revisiones
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`HISTORIAL DE REVISIONES (${revisions.length})`, margin, yPos);
      yPos += 8;

      revisions.forEach((revision, index) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }

        // Fecha y estado
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text(format(new Date(revision.revision_date), "dd 'de' MMMM 'de' yyyy", { locale: es }), margin + 2, yPos + 2);
        
        const statusText = statusLabels[revision.general_status] || revision.general_status;
        const statusColor = revision.general_status === 'good' ? [16, 185, 129] :
                           revision.general_status === 'acceptable' ? [59, 130, 246] :
                           revision.general_status === 'needs_repair' ? [245, 158, 11] : [239, 68, 68];
        pdf.setTextColor(...statusColor);
        pdf.text(statusText, pageWidth - margin - 2, yPos + 2, { align: 'right' });
        yPos += 12;

        // Datos IT3
        if (revision.it3_data && Object.keys(revision.it3_data).length > 0) {
          pdf.setFontSize(9);
          Object.entries(revision.it3_data).forEach(([key, value]) => {
            if (!value || value === '' || value === false) return;
            
            if (yPos > pageHeight - 20) {
              pdf.addPage();
              yPos = margin;
            }

            const label = getFieldLabel(key);
            let displayValue = value;
            
            if (typeof value === 'boolean') {
              displayValue = '✓';
            } else if (typeof value === 'string' && statusLabels[value]) {
              displayValue = statusLabels[value];
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(71, 85, 105);
            pdf.text(`${label}:`, margin + 5, yPos);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(51, 65, 85);
            pdf.text(String(displayValue), margin + 80, yPos);
            yPos += 5;
          });
        }

        // Observaciones
        if (revision.observations || revision.actions_taken || revision.recommendations) {
          yPos += 3;
          if (revision.observations) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(71, 85, 105);
            pdf.text('Observaciones:', margin + 5, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(revision.observations, pageWidth - 2 * margin - 10);
            pdf.text(lines, margin + 5, yPos);
            yPos += lines.length * 4 + 3;
          }
          if (revision.actions_taken) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Acciones:', margin + 5, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(revision.actions_taken, pageWidth - 2 * margin - 10);
            pdf.text(lines, margin + 5, yPos);
            yPos += lines.length * 4 + 3;
          }
        }

        yPos += 8;
      });

      // Pie de página
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Documento generado automáticamente por Clilux M - Válido para fines de mantenimiento según RITE', 
               pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      pdf.save(`informe-revisiones-${equipment.model}-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vista previa del informe</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>

        <div ref={reportRef} className="p-8">
          <div className="header">
            <div>
              <h1>Informe de Revisiones</h1>
              <p style={{ color: '#64748b' }}>Generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
            </div>
          </div>

          <div className="info-box">
            <h2 style={{ marginTop: 0 }}>Datos del Equipo</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Marca / Modelo</div>
                <div className="info-value">{equipment.brand} {equipment.model}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Número de Serie</div>
                <div className="info-value">{equipment.serial_number || '-'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Tipo de Equipo</div>
                <div className="info-value">{equipment.equipment_type}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Ubicación</div>
                <div className="info-value">{equipment.location || '-'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Cliente</div>
                <div className="info-value">{client?.name || '-'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Edificio</div>
                <div className="info-value">{building?.name || '-'}</div>
              </div>
              {equipment.cooling_power_kw && (
                <div className="info-item">
                  <div className="info-label">Potencia Frigorífica</div>
                  <div className="info-value">{equipment.cooling_power_kw} kW</div>
                </div>
              )}
              {equipment.refrigerant_type && (
                <div className="info-item">
                  <div className="info-label">Refrigerante</div>
                  <div className="info-value">{equipment.refrigerant_type} ({equipment.refrigerant_charge_kg} kg)</div>
                </div>
              )}
            </div>
          </div>

          <h2>Historial de Revisiones ({revisions.length})</h2>

          {revisions.length === 0 ? (
            <p style={{ color: '#64748b' }}>No hay revisiones registradas para este equipo.</p>
          ) : (
            revisions.map((revision, index) => (
              <div key={revision.id} className="revision-card">
                <div className="revision-header">
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '4px' }}>
                      {format(new Date(revision.revision_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Técnico: {revision.technician_name || '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={`status-badge status-${revision.general_status}`}>
                      {statusLabels[revision.general_status] || revision.general_status}
                    </span>
                  </div>
                </div>

                {revision.it3_data && Object.keys(revision.it3_data).some(k => revision.it3_data[k]) && (
                  <div className="data-grid">
                    {Object.entries(revision.it3_data).map(([key, value]) => {
                      if (!value || value === '' || value === false) return null;
                      
                      const label = getFieldLabel(key);
                      let displayValue = value;
                      
                      if (typeof value === 'boolean') {
                        displayValue = '✓';
                      } else if (typeof value === 'string' && statusLabels[value]) {
                        displayValue = statusLabels[value];
                      } else if (typeof value === 'string') {
                        displayValue = value.charAt(0).toUpperCase() + value.slice(1);
                      }
                      
                      return (
                        <div key={key} className="data-item">
                          <div><strong>{label}:</strong></div>
                          <div>{displayValue}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(revision.observations || revision.actions_taken || revision.recommendations) && (
                  <div className="notes">
                    {revision.observations && (
                      <p><strong>Observaciones:</strong> {revision.observations}</p>
                    )}
                    {revision.actions_taken && (
                      <p><strong>Acciones realizadas:</strong> {revision.actions_taken}</p>
                    )}
                    {revision.recommendations && (
                      <p><strong>Recomendaciones:</strong> {revision.recommendations}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          <div className="footer">
            <p>Este informe ha sido generado automáticamente por Clilux M</p>
            <p>Documento válido para fines de mantenimiento según RITE</p>
          </div>
        </div>
      </div>
    </div>
  );
}