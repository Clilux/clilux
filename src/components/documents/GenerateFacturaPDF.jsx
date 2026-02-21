import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generateFacturaPDF(factura, client, docConfig) {
  const jsPDF = (await import('jspdf')).default;
  const pdf = new jsPDF();
  
  // Generar hash VeriFacTu
  const hashData = `${factura.numero}-${factura.fecha}-${factura.total}`;
  const verifactuHash = btoa(hashData).substring(0, 20);

  // Cabecera
  pdf.setFontSize(24);
  pdf.setTextColor(80, 80, 200);
  pdf.text('FACTURA', 105, 20, { align: 'center' });
  
  // Número de factura con prefijo
  const prefijo = docConfig?.prefijo_numeracion || 'FAC-';
  const numeroCompleto = `${prefijo}${factura.numero}`;
  
  pdf.setFontSize(12);
  pdf.setTextColor(100);
  pdf.text(numeroCompleto, 105, 28, { align: 'center' });
  
  // VeriFacTu Hash
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(`Hash VeriFacTu: ${verifactuHash}`, 105, 34, { align: 'center' });
  
  // Datos del cliente
  let y = 50;
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  
  pdf.setFont(undefined, 'bold');
  pdf.text('CLIENTE:', 20, y);
  pdf.setFont(undefined, 'normal');
  y += 7;
  pdf.text(client?.name || '', 20, y);
  y += 5;
  if (client?.cif) pdf.text(`CIF: ${client.cif}`, 20, y);
  y += 5;
  if (client?.address) pdf.text(client.address, 20, y);
  y += 5;
  if (client?.city) pdf.text(`${client.postal_code || ''} ${client.city || ''}`, 20, y);
  
  // Datos de la factura
  y = 50;
  pdf.setFont(undefined, 'bold');
  pdf.text('FECHA:', 140, y);
  pdf.setFont(undefined, 'normal');
  y += 7;
  pdf.text(format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es }), 140, y);
  y += 7;
  if (factura.forma_pago) {
    pdf.setFont(undefined, 'bold');
    pdf.text('FORMA DE PAGO:', 140, y);
    pdf.setFont(undefined, 'normal');
    y += 7;
    pdf.text(factura.forma_pago.toUpperCase(), 140, y);
  }
  
  // Líneas de la factura
  y = 90;
  pdf.setFontSize(10);
  
  // Cabecera de tabla
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, y - 5, 180, 8, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.text('Concepto', 20, y);
  pdf.text('Cant.', 120, y, { align: 'right' });
  pdf.text('Precio', 145, y, { align: 'right' });
  pdf.text('Dto.', 165, y, { align: 'right' });
  pdf.text('Total', 190, y, { align: 'right' });
  pdf.setFont(undefined, 'normal');
  
  y += 10;
  
  // Líneas
  factura.lineas?.forEach((linea) => {
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }
    
    const lineTotal = linea.total || (linea.cantidad * linea.precio_unitario * (1 - (linea.descuento || 0) / 100));
    
    pdf.text(linea.concepto || '', 20, y);
    pdf.text(String(linea.cantidad || 0), 120, y, { align: 'right' });
    pdf.text(`${(linea.precio_unitario || 0).toFixed(2)}€`, 145, y, { align: 'right' });
    pdf.text(`${(linea.descuento || 0)}%`, 165, y, { align: 'right' });
    pdf.text(`${lineTotal.toFixed(2)}€`, 190, y, { align: 'right' });
    
    y += 7;
  });
  
  // Totales
  y += 10;
  pdf.setDrawColor(200);
  pdf.line(120, y, 195, y);
  y += 8;
  
  pdf.text('Subtotal:', 140, y);
  pdf.text(`${(factura.subtotal || 0).toFixed(2)}€`, 190, y, { align: 'right' });
  y += 7;
  
  pdf.text(`IVA (${factura.iva || 21}%):`, 140, y);
  pdf.text(`${((factura.subtotal || 0) * (factura.iva || 21) / 100).toFixed(2)}€`, 190, y, { align: 'right' });
  y += 10;
  
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL:', 140, y);
  pdf.text(`${(factura.total || 0).toFixed(2)}€`, 190, y, { align: 'right' });
  
  // Observaciones
  if (factura.observaciones) {
    y += 15;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('Observaciones:', 20, y);
    pdf.setFont(undefined, 'normal');
    y += 5;
    const lines = pdf.splitTextToSize(factura.observaciones, 170);
    pdf.text(lines, 20, y);
  }
  
  // Pie de página VeriFacTu
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.text('Documento compatible con VeriFacTu - AEAT', 105, pageHeight - 10, { align: 'center' });
  
  return pdf;
}