import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportButton({ data, filename, columns, label = "Exportar Excel" }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    // Create CSV content
    const headers = columns.map(col => col.label).join(';');
    const rows = data.map(item => 
      columns.map(col => {
        let value = item[col.key];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'object') value = JSON.stringify(value);
        // Escape semicolons and quotes
        value = String(value).replace(/"/g, '""');
        if (value.includes(';') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        return value;
      }).join(';')
    ).join('\n');

    const csvContent = '\uFEFF' + headers + '\n' + rows; // BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
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