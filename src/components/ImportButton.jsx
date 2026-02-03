import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportButton({ onImport, label = "Importar Excel" }) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('El archivo está vacío o no tiene el formato correcto');
        return;
      }

      // Parse CSV
      const headers = lines[0].split(';').map(h => h.trim().replace(/^\uFEFF/, ''));
      const data = lines.slice(1).map(line => {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
              currentValue += '"';
              i++;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ';' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());
        
        const obj = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          // Try to parse as JSON if it looks like an object/array
          if ((value.startsWith('{') || value.startsWith('[')) && (value.endsWith('}') || value.endsWith(']'))) {
            try {
              value = JSON.parse(value);
            } catch {}
          }
          obj[header] = value;
        });
        return obj;
      });

      await onImport(data);
      toast.success(`${data.length} registros importados`);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Error al importar: ' + error.message);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileChange}
        className="hidden"
        id="import-file"
      />
      <label htmlFor="import-file">
        <Button variant="outline" asChild>
          <span>
            <Upload className="h-4 w-4 mr-2" />
            {label}
          </span>
        </Button>
      </label>
    </>
  );
}