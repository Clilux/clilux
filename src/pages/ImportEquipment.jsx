import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, CheckCircle2, AlertCircle, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

const TEMPLATE_FIELDS = [
  { key: 'reference_name',     label: 'Nombre de referencia',       example: 'Climatizador Planta 1', required: true },
  { key: 'client_id',          label: 'ID Cliente',                  example: '(déjalo vacío, se asigna al importar)', required: false },
  { key: 'building_id',        label: 'ID Edificio',                 example: '(déjalo vacío, se asigna al importar)', required: false },
  { key: 'equipment_type',     label: 'Tipo de equipo',              example: 'Climatizadora / Torre de refrigeración / Bomba de calor', required: true },
  { key: 'brand',              label: 'Marca',                       example: 'Daikin', required: true },
  { key: 'model',              label: 'Modelo',                      example: 'EWAD-AJYNN', required: true },
  { key: 'serial_number',      label: 'Número de serie',             example: 'SN-123456', required: false },
  { key: 'location',           label: 'Ubicación',                   example: 'Cubierta edificio A', required: false },
  { key: 'installation_date',  label: 'Fecha instalación (AAAA-MM-DD)', example: '2020-06-15', required: false },
  { key: 'cooling_power_kw',   label: 'Potencia frigorífica (kW)',   example: '120', required: false },
  { key: 'heating_power_kw',   label: 'Potencia calorífica (kW)',    example: '130', required: false },
  { key: 'refrigerant_type',   label: 'Tipo de refrigerante',        example: 'R410A', required: false },
  { key: 'refrigerant_charge_kg', label: 'Carga refrigerante (kg)', example: '12.5', required: false },
  { key: 'balsa_litros',       label: 'Volumen balsa (litros)',       example: '500', required: false },
  { key: 'status',             label: 'Estado',                      example: 'operational / maintenance_needed / out_of_service', required: false },
  { key: 'notes',              label: 'Observaciones',               example: 'Revisión anual pendiente', required: false },
  { key: 'warranty_end',       label: 'Fin garantía (AAAA-MM-DD)',   example: '2025-06-15', required: false },
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Hoja de datos
  const headers = TEMPLATE_FIELDS.map(f => f.label);
  const examples = TEMPLATE_FIELDS.map(f => f.example);
  const required = TEMPLATE_FIELDS.map(f => f.required ? 'OBLIGATORIO' : 'Opcional');

  const wsData = [headers, required, examples];
  // Añadir 10 filas vacías para rellenar
  for (let i = 0; i < 10; i++) wsData.push(TEMPLATE_FIELDS.map(() => ''));

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Anchos de columna
  ws['!cols'] = TEMPLATE_FIELDS.map(() => ({ wch: 28 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');

  // Hoja de instrucciones
  const instrData = [
    ['INSTRUCCIONES DE IMPORTACIÓN'],
    [''],
    ['1. Rellena los datos en la hoja "Equipos" a partir de la fila 4.'],
    ['2. Las filas 1 (cabecera), 2 (obligatorio/opcional) y 3 (ejemplo) son informativas, no las borres.'],
    ['3. Los campos marcados como OBLIGATORIO deben estar rellenos.'],
    ['4. El campo "Estado" acepta solo: operational, maintenance_needed, out_of_service'],
    ['5. Las fechas deben tener formato AAAA-MM-DD (ej: 2024-03-15)'],
    ['6. Los campos numéricos (kW, kg, litros) deben ser números sin unidades.'],
    ['7. Sube el archivo relleno en la aplicación para importar los equipos.'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_importacion_equipos.xlsx');
}

export default function ImportEquipment() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // Subir el archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Llamar a la función de importación
      const res = await base44.functions.invoke('importEquipment', { file_url });
      setResults(res.data);
    } catch (err) {
      setResults({ error: err.message || 'Error al importar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/Equipment">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Importar Equipos</h1>
          <p className="text-sm text-slate-500">Importa equipos masivamente desde una hoja Excel</p>
        </div>
      </div>

      {/* Paso 1 */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 mb-1">Descarga la plantilla Excel</h2>
            <p className="text-sm text-slate-500 mb-3">
              Contiene todos los campos disponibles con instrucciones y ejemplos. Rellena a partir de la fila 4.
            </p>
            <Button onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
          </div>
        </div>
      </Card>

      {/* Paso 2 */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 mb-1">Sube el Excel relleno</h2>
            <p className="text-sm text-slate-500 mb-3">
              Selecciona el archivo Excel con los equipos y pulsa "Importar".
            </p>
            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors mb-3">
              <FileSpreadsheet className="h-6 w-6 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500">
                {file ? file.name : 'Haz clic para seleccionar un archivo .xlsx'}
              </span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Importando...' : 'Importar equipos'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Resultados */}
      {results && (
        <Card className="p-5">
          {results.error ? (
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al importar</p>
                <p className="text-sm">{results.error}</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-emerald-600 mb-3">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Importación completada</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-700">{results.created}</p>
                  <p className="text-xs text-slate-500">Creados</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
                  <p className="text-xs text-slate-500">Omitidos</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{results.errors?.length || 0}</p>
                  <p className="text-xs text-slate-500">Con error</p>
                </div>
              </div>
              {results.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-red-600 mb-1">Filas con error:</p>
                  {results.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">· Fila {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}