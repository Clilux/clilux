import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function RevisionReport({ equipment, revisions, building, client, onClose, fieldConfigs = [] }) {
  const reportRef = useRef(null);

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

  const handlePrint = () => {
    const content = reportRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Informe de Revisiones - ${equipment.brand} ${equipment.model}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #475569; margin-top: 30px; }
            h3 { color: #64748b; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .info-item { margin-bottom: 8px; }
            .info-label { font-size: 12px; color: #64748b; }
            .info-value { font-weight: 500; }
            .revision-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
            .revision-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
            .status-good { background: #dcfce7; color: #166534; }
            .status-acceptable { background: #dbeafe; color: #1e40af; }
            .status-needs_repair { background: #fef3c7; color: #92400e; }
            .status-critical { background: #fee2e2; color: #991b1b; }
            .data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px; }
            .data-item { font-size: 13px; padding: 8px; background: #f8fafc; border-radius: 4px; }
            .notes { background: #f8fafc; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 13px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vista previa del informe</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
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