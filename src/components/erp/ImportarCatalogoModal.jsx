import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Sparkles, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { UNIDADES, euros, precioCompra, precioVenta } from '@/lib/erp-config';

const ESQUEMA = {
  type: 'object',
  properties: {
    articulos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre del artículo o servicio' },
          codigo: { type: 'string', description: 'Código o referencia del artículo' },
          referencia_fabricante: { type: 'string', description: 'Referencia del fabricante tal cual figura en la tarifa' },
          descripcion: { type: 'string', description: 'Descripción adicional' },
          unidad: { type: 'string', description: 'Unidad de medida: ud, m, m2, m3, kg, l, h' },
          pvp: { type: 'number', description: 'Precio unitario sin IVA' },
          familia: { type: 'string', description: 'Familia o grupo del artículo' },
          fabricante: { type: 'string', description: 'Marca o fabricante' },
        },
        required: ['nombre'],
      },
    },
  },
  required: ['articulos'],
};

const PROMPT = `Analiza el documento adjunto (tarifa, catálogo o listado de precios) y extrae TODOS los artículos que contenga.
Para cada artículo devuelve: nombre, codigo (código del artículo si aparece), referencia_fabricante (la referencia del fabricante tal cual figura, es muy importante conservarla para futuras actualizaciones de tarifa), descripcion, unidad de medida, pvp (precio unitario sin IVA, en número), familia (grupo o capítulo al que pertenece) y fabricante (marca).
Reglas: no inventes artículos que no estén en el documento; si un dato no aparece, déjalo vacío y pon 0 en el pvp; conserva los nombres tal cual figuran.`;

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/[^0-9.,-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const normalizar = (f) => ({
  nombre: String(f?.nombre || '').trim(),
  codigo: String(f?.codigo || '').trim(),
  referencia_fabricante: String(f?.referencia_fabricante || '').trim(),
  descripcion: String(f?.descripcion || '').trim(),
  unidad: UNIDADES.includes(String(f?.unidad || '').trim()) ? String(f.unidad).trim() : 'ud',
  pvp: num(f?.pvp),
  familia: String(f?.familia || '').trim(),
  fabricante: String(f?.fabricante || '').trim(),
});

/** Importación (beta) de artículos desde una tarifa en PDF, Excel o CSV. */
export default function ImportarCatalogoModal({ open, onClose, familias = [], onSaveArticulos, onCreateFamilia, onDone }) {
  const fileRef = useRef(null);
  const [paso, setPaso] = useState('config');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [file, setFile] = useState(null);
  const [descuento, setDescuento] = useState('0');
  const [margen, setMargen] = useState('0');
  const [familiaId, setFamiliaId] = useState('');
  const [nuevaFamilia, setNuevaFamilia] = useState('');
  const [filas, setFilas] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');

  const reiniciar = () => {
    setPaso('config'); setNombreArchivo(''); setFile(null); setDescuento('0'); setMargen('0');
    setFamiliaId(''); setNuevaFamilia(''); setFilas([]); setProgreso(0); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const cerrar = () => { reiniciar(); onClose(); };

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setNombreArchivo(f?.name || '');
    setError('');
  };

  const extraer = async () => {
    if (!file) { setError('Selecciona primero un fichero.'); return; }
    setPaso('extrayendo');
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const esHoja = /\.(csv|xlsx|xls|json)$/i.test(file.name);
      let salida;
      if (esHoja) {
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: ESQUEMA });
        if (res?.status === 'error') throw new Error(res.details || 'No se pudo leer el fichero');
        salida = res?.output;
      } else {
        salida = await base44.integrations.Core.InvokeLLM({
          prompt: PROMPT,
          file_urls: [file_url],
          response_json_schema: ESQUEMA,
        });
      }
      const lista = (salida?.articulos || (Array.isArray(salida) ? salida : []))
        .map(normalizar)
        .filter(f => f.nombre);
      if (!lista.length) throw new Error('No se han reconocido artículos en el documento');
      setFilas(lista);
      setPaso('preview');
    } catch (e) {
      setError(e.message || 'No se pudo procesar el documento');
      setPaso('config');
    }
  };

  const crear = async () => {
    setPaso('creando');
    setProgreso(0);
    try {
      const famSel = familias.find(f => f.id === familiaId);
      let familiaNombre = famSel?.nombre || '';
      let familiaIdFinal = famSel?.id || '';
      if (!famSel && nuevaFamilia.trim() && onCreateFamilia) {
        const creada = await onCreateFamilia({ nombre: nuevaFamilia.trim() });
        if (creada?.id) { familiaIdFinal = creada.id; familiaNombre = creada.nombre || nuevaFamilia.trim(); }
      }
      const dtoNum = Number(descuento) || 0;
      const mrgNum = Number(margen) || 0;
      const registros = filas.map(f => ({
        nombre: f.nombre,
        codigo: f.codigo,
        referencia_fabricante: f.referencia_fabricante || f.codigo,
        descripcion: f.descripcion,
        familia: familiaNombre || f.familia,
        familia_id: familiaIdFinal,
        fabricante: f.fabricante,
        unidad: f.unidad,
        pvp: f.pvp,
        descuento_compra: dtoNum,
        porcentaje_venta: mrgNum,
        precio_compra: precioCompra({ pvp: f.pvp, descuento_compra: dtoNum }),
        precio_venta: precioVenta({ pvp: f.pvp, descuento_compra: dtoNum, porcentaje_venta: mrgNum }),
        activo: true,
      }));

      const TANDA = 100;
      let creados = 0;
      try {
        for (let i = 0; i < registros.length; i += TANDA) {
          const tanda = registros.slice(i, i + TANDA);
          await onSaveArticulos(tanda);
          creados += tanda.length;
          setProgreso(creados);
        }
      } catch (e) {
        const msg = creados > 0
          ? `Se han creado ${creados} artículos, pero falló el resto: ${e.message || 'error'}`
          : (e.message || 'No se pudieron crear los artículos');
        setError(msg);
        toast.error(msg);
        setPaso('preview');
        return;
      }
      toast.success(`${creados} artículos creados en el catálogo`);
      onDone?.();
      cerrar();
    } catch (e) {
      const msg = e.message || 'No se pudieron crear los artículos';
      setError(msg);
      toast.error(msg);
      setPaso('preview');
    }
  };

  const dto = Number(descuento) || 0;
  const mrg = Number(margen) || 0;

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Importar catálogo
            <span className="text-[11px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Beta</span>
          </DialogTitle>
        </DialogHeader>

        {paso === 'config' && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-slate-500">
              Sube una tarifa en PDF, Excel o CSV y se generarán los artículos automáticamente. Indica el descuento sobre PVP y el margen de venta que quieres aplicar.
            </p>

            <div>
              <Label>Documento (PDF, Excel o CSV)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.json,application/pdf"
                onChange={elegirArchivo}
                className="hidden"
              />
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />Seleccionar archivo
                </Button>
                <span className="text-sm text-slate-500 truncate min-w-0">{nombreArchivo || 'Ningún archivo seleccionado'}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Descuento sobre PVP (%)</Label>
                <Input type="number" min="0" step="0.5" value={descuento} onChange={e => setDescuento(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Margen de venta (%)</Label>
                <Input type="number" min="0" step="0.5" value={margen} onChange={e => setMargen(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Familia destino</Label>
                <Select value={familiaId || 'sin'} onValueChange={v => setFamiliaId(v === 'sin' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin familia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin">Sin familia (o la del documento)</SelectItem>
                    {familias.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>…o crear una familia nueva para este catálogo</Label>
              <Input value={nuevaFamilia} onChange={e => setNuevaFamilia(e.target.value)} className="mt-1" placeholder="Ej. Tarifa 2026" />
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
              Ejemplo: PVP 100 €, descuento {dto} % → compra <strong>{euros(precioCompra({ pvp: 100, descuento_compra: dto }))}</strong>; margen {mrg} % → venta <strong className="text-indigo-700">{euros(precioVenta({ pvp: 100, descuento_compra: dto, porcentaje_venta: mrg }))}</strong>.
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={cerrar}>Cancelar</Button>
              <Button onClick={extraer} disabled={!file} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Sparkles className="h-4 w-4" />Generar artículos
              </Button>
            </div>
          </div>
        )}

        {paso === 'extrayendo' && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-slate-600">Analizando el documento y extrayendo los artículos…</p>
          </div>
        )}

        {paso === 'preview' && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm md:text-base text-slate-600">
                <strong className="text-slate-800">{filas.length}</strong> artículos reconocidos · descuento PVP {dto} % · margen venta {mrg} %
              </p>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={reiniciar}>
                <FileSpreadsheet className="h-3.5 w-3.5" />Otro archivo
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span className="col-span-5">Artículo</span>
                <span className="col-span-1 text-right">Ud</span>
                <span className="col-span-2 text-right">PVP</span>
                <span className="col-span-2 text-right">Compra</span>
                <span className="col-span-1 text-right">Venta</span>
                <span className="col-span-1" />
              </div>
              <div className="max-h-[45vh] overflow-y-auto">
                {filas.map((f, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-3 py-2 items-center border-t border-slate-100">
                    <div className="col-span-2 md:col-span-5 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{f.nombre}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {[f.codigo, f.referencia_fabricante, f.fabricante, f.familia || nuevaFamilia].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="md:col-span-1 md:text-right text-sm text-slate-500">{f.unidad}</span>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={f.pvp}
                        onChange={e => setFilas(prev => prev.map((x, idx) => (idx === i ? { ...x, pvp: num(e.target.value) } : x)))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <span className="md:col-span-2 md:text-right text-sm text-slate-600">{euros(precioCompra({ pvp: f.pvp, descuento_compra: dto }))}</span>
                    <span className="md:col-span-1 md:text-right text-sm font-medium text-indigo-700">{euros(precioVenta({ pvp: f.pvp, descuento_compra: dto, porcentaje_venta: mrg }))}</span>
                    <div className="md:col-span-1 flex md:justify-end">
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500" onClick={() => setFilas(prev => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={cerrar}>Cancelar</Button>
              <Button onClick={crear} disabled={filas.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Crear {filas.length} artículos
              </Button>
            </div>
          </div>
        )}

        {paso === 'creando' && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-slate-600">Creando artículos… {progreso} de {filas.length}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}