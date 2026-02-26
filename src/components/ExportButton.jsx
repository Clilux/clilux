import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportButton({ data, fileName, columns, label = "Exportar Excel" }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    if (!columns || columns.length === 0) {
      toast.error('No hay columnas definidas');
      return;
    }

    // Si se proporcionan columnas, usarlas, si no, usar las claves del primer objeto
    let headers, rows;
    
    if (columns && columns.length > 0) {
      headers = columns.map(col => col.label).join(';');
      rows = data.map(item => 
        columns.map(col => {
          let value = item[col.key];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          value = String(value).replace(/"/g, '""');
          if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          return value;
        }).join(';')
      ).join('\n');
    } else {
      // Si no hay columnas, usar las claves del primer objeto
      const keys = Object.keys(data[0]);
      headers = keys.join(';');
      rows = data.map(item =>
        keys.map(key => {
          let value = item[key];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          value = String(value).replace(/"/g, '""');
          if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          return value;
        }).join(';')
      ).join('\n');
    }

    const csvContent = '\uFEFF' + headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado correctamente');
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}