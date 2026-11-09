import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Image as ImageIcon, Plus, Trash2, Download, Loader2,
  Folder, FolderOpen, ChevronLeft, FolderPlus, MoreVertical, Move
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ObraDocumentosPanel({
  obra,
  puedeEditar,
  uploadFile,        // async (file) => url
  onSaveDocumentos,  // (newDocumentosArray) => void
  onSaveFotos,       // (newFotosArray) => void
  onSaveCarpetas,    // (newCarpetasArray) => void
}) {
  const [carpetaActual, setCarpetaActual] = useState(null); // null = raíz (todas las carpetas + sin carpeta)
  const [nuevaCarpeta, setNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [menuDocIdx, setMenuDocIdx] = useState(null);
  const fileInputRef = useRef(null);
  const fotoInputRef = useRef(null);

  const documentos = obra.documentos || [];
  const fotos = obra.fotos || [];

  // Carpetas explícitas de la obra + las referenciadas por documentos (por si acaso)
  const carpetas = useMemo(() => {
    const set = new Set(obra.carpetas || []);
    documentos.forEach(d => { if (d.carpeta) set.add(d.carpeta); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [obra.carpetas, documentos]);

  // Subir varios archivos (docs o fotos según esImagen)
  const subirArchivos = useCallback(async (files, esImagen = false) => {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    const arr = Array.from(files);
    try {
      const urls = await Promise.all(arr.map(f => uploadFile(f)));
      if (esImagen) {
        const nuevasFotos = [...fotos, ...urls];
        onSaveFotos(nuevasFotos);
        toast.success(`${urls.length} foto(s) añadida(s)`);
      } else {
        const hoy = format(new Date(), 'yyyy-MM-dd');
        const destinoCarpeta = carpetaActual === '__sin_carpeta__' ? '' : (carpetaActual || '');
        const nuevosDocs = arr.map((f, i) => ({
          nombre: f.name,
          url: urls[i],
          tipo: f.type,
          fecha: hoy,
          carpeta: destinoCarpeta || '',
        }));
        onSaveDocumentos([...documentos, ...nuevosDocs]);
        toast.success(`${nuevosDocs.length} documento(s) subido(s)`);
      }
    } catch (err) {
      toast.error('Error al subir archivos');
    } finally {
      setSubiendo(false);
    }
  }, [documentos, fotos, carpetaActual, uploadFile, onSaveDocumentos, onSaveFotos]);

  const handleDrop = useCallback((e, esImagen = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!puedeEditar) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    subirArchivos(files, esImagen);
  }, [puedeEditar, subirArchivos]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };

  const crearCarpeta = () => {
    const nombre = nuevaCarpeta.trim();
    if (!nombre) return;
    if (carpetas.includes(nombre)) {
      toast.error('Ya existe una carpeta con ese nombre');
      return;
    }
    const nuevas = [...(obra.carpetas || []), nombre];
    onSaveCarpetas(nuevas);
    setCreandoCarpeta(false);
    setNuevaCarpeta('');
    setCarpetaActual(nombre);
    toast.success('Carpeta creada');
  };

  const eliminarCarpeta = (nombre) => {
    if (!puedeEditar) return;
    const nuevasCarpetas = (obra.carpetas || []).filter(c => c !== nombre);
    onSaveCarpetas(nuevasCarpetas);
    const nuevos = documentos.map(d => d.carpeta === nombre ? { ...d, carpeta: '' } : d);
    onSaveDocumentos(nuevos);
    if (carpetaActual === nombre) setCarpetaActual(null);
    toast.success('Carpeta eliminada (documentos movidos a raíz)');
  };

  const eliminarDoc = (idx) => {
    onSaveDocumentos(documentos.filter((_, i) => i !== idx));
    setMenuDocIdx(null);
  };

  const moverDoc = (idx, carpetaDestino) => {
    const nuevos = documentos.map((d, i) => i === idx ? { ...d, carpeta: carpetaDestino } : d);
    onSaveDocumentos(nuevos);
    setMenuDocIdx(null);
  };

  const eliminarFoto = (idx) => {
    onSaveFotos(fotos.filter((_, i) => i !== idx));
  };

  // Docs a mostrar según carpeta actual
  const docsVisibles = carpetaActual === null
    ? documentos
    : carpetaActual === '__sin_carpeta__'
      ? documentos.filter(d => !d.carpeta)
      : documentos.filter(d => d.carpeta === carpetaActual);

  return (
    <div className="space-y-4">
      {/* Documentos */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        {/* Breadcrumb / navegación de carpetas */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />Documentos
            </h3>
            {carpetaActual !== null && (
              <button
                onClick={() => setCarpetaActual(null)}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors ml-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />Raíz
              </button>
            )}
            {carpetaActual && carpetaActual !== '__sin_carpeta__' && (
              <>
                <span className="text-slate-300">/</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <FolderOpen className="h-4 w-4 text-amber-500" />{carpetaActual}
                </span>
              </>
            )}
            {carpetaActual === '__sin_carpeta__' && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-500">Sin carpeta</span>
              </>
            )}
          </div>
          {puedeEditar && carpetaActual === null && (
            <Button size="sm" variant="outline" onClick={() => setCreandoCarpeta(v => !v)} className="gap-1.5">
              <FolderPlus className="h-4 w-4" />Nueva carpeta
            </Button>
          )}
        </div>

        {/* Crear carpeta inline */}
        {creandoCarpeta && (
          <div className="flex gap-2 mb-3">
            <Input
              autoFocus
              value={nuevaCarpeta}
              onChange={e => setNuevaCarpeta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') crearCarpeta(); if (e.key === 'Escape') setCreandoCarpeta(false); }}
              placeholder="Nombre de la carpeta"
              className="text-sm max-w-xs"
            />
            <Button size="sm" className="bg-blue-600 text-white" onClick={crearCarpeta}>Crear</Button>
            <Button size="sm" variant="outline" onClick={() => setCreandoCarpeta(false)}>Cancelar</Button>
          </div>
        )}

        {/* Vista de carpetas (raíz) */}
        {carpetaActual === null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {carpetas.map(c => {
              const count = documentos.filter(d => d.carpeta === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setCarpetaActual(c)}
                  className="group relative flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl transition-colors"
                >
                  <Folder className="h-10 w-10 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700 truncate w-full text-center">{c}</span>
                  <span className="text-xs text-slate-400">{count} doc(s)</span>
                  {puedeEditar && (
                    <span
                      onClick={(e) => { e.stopPropagation(); eliminarCarpeta(c); }}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
            {/* Sin carpeta */}
            {documentos.some(d => !d.carpeta) && (
              <button
                onClick={() => setCarpetaActual('__sin_carpeta__')}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                <Folder className="h-10 w-10 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Sin carpeta</span>
                <span className="text-xs text-slate-400">{documentos.filter(d => !d.carpeta).length} doc(s)</span>
              </button>
            )}
          </div>
        )}

        {/* Zona de drop */}
        {puedeEditar && (
          <div
            onDrop={(e) => handleDrop(e, false)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
              className="hidden"
              onChange={(e) => {
                subirArchivos(e.target.files, false);
                e.target.value = '';
              }}
            />
            {subiendo ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />Subiendo archivos...
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <FileText className="h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-600 font-medium">
                  Arrastra archivos aquí o haz clic para subir
                </p>
                <p className="text-xs text-slate-400">Puedes seleccionar varios a la vez</p>
              </div>
            )}
          </div>
        )}

        {/* Lista de documentos en carpeta actual */}
        {carpetaActual !== null && (
          docsVisibles.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Esta carpeta está vacía</p>
          ) : (
            <div className="space-y-2">
              {docsVisibles.map((d, i) => {
                const realIdx = documentos.indexOf(d);
                const esImagen = d.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(d.nombre);
                return (
                  <div key={realIdx} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg text-sm group">
                    {esImagen
                      ? <ImageIcon className="h-4 w-4 text-purple-400 shrink-0" />
                      : <FileText className="h-4 w-4 text-blue-400 shrink-0" />}
                    <span className="flex-1 truncate text-slate-700">{d.nombre}</span>
                    <span className="text-xs text-slate-400 shrink-0">{d.fecha}</span>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                      <Download className="h-4 w-4" />
                    </a>
                    {puedeEditar && (
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setMenuDocIdx(menuDocIdx === realIdx ? null : realIdx)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuDocIdx === realIdx && (
                          <div className="absolute right-0 top-6 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-44">
                            <div className="px-3 py-1 text-xs text-slate-400 border-b border-slate-100">Mover a carpeta</div>
                            <button
                              onClick={() => moverDoc(realIdx, '')}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Folder className="h-3.5 w-3.5 text-slate-400" />Sin carpeta
                            </button>
                            {carpetas.filter(c => c !== carpetaActual).map(c => (
                              <button
                                key={c}
                                onClick={() => moverDoc(realIdx, c)}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Folder className="h-3.5 w-3.5 text-amber-500" />{c}
                              </button>
                            ))}
                            <div className="border-t border-slate-100 mt-1 pt-1">
                              <button
                                onClick={() => eliminarDoc(realIdx)}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* En raíz sin carpetas y sin docs */}
        {carpetaActual === null && documentos.length === 0 && carpetas.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">Sin documentos. Sube archivos con el botón de arriba.</p>
        )}
      </Card>

      {/* Fotos */}
      <Card className="p-4 bg-white border-0 shadow-sm">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <ImageIcon className="h-4 w-4 text-purple-600" />Fotos ({fotos.length})
        </h3>
        {puedeEditar && (
          <div
            onDrop={(e) => handleDrop(e, true)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fotoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors mb-4 ${
              dragOver ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fotoInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                subirArchivos(e.target.files, true);
                e.target.value = '';
              }}
            />
            {subiendo ? (
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <Loader2 className="h-5 w-5 animate-spin" />Subiendo fotos...
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <ImageIcon className="h-7 w-7 text-slate-400" />
                <p className="text-sm text-slate-600 font-medium">Arrastra fotos aquí o haz clic</p>
                <p className="text-xs text-slate-400">Puedes subir varias a la vez</p>
              </div>
            )}
          </div>
        )}
        {fotos.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Sin fotos</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotos.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-1 left-1 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600" />
                </a>
                {puedeEditar && (
                  <button
                    onClick={() => eliminarFoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}