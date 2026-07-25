import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Nfc, Loader2, CheckCircle2, AlertTriangle, ArrowRight, X, Smartphone } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function NfcReader() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const readerRef = useRef(null);

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  // Extraer equipmentId del contenido de la etiqueta
  const parseEquipmentId = (rawText) => {
    if (!rawText) return null;
    // Formato EQUIP:{id}
    const match = rawText.match(/EQUIP:(.+)/i);
    if (match) return match[1].trim();
    // URL con query param ?id=xxx
    try {
      const url = new URL(rawText);
      const id = url.searchParams.get('id');
      if (id) return id;
    } catch {
      // no es URL
    }
    return null;
  };

  const foundEquipmentId = result?.equipmentId || null;

  // Buscar datos del equipo encontrado
  const { data: foundEquipment, isLoading: loadingEquipment } = useQuery({
    queryKey: ['nfc-equipment-lookup', foundEquipmentId, isSessionTech],
    queryFn: async () => {
      if (!foundEquipmentId) return null;
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'equipment_detail',
          equipment_id: foundEquipmentId,
        });
        return res.data?.data?.equipment || null;
      }
      const items = await base44.entities.Equipment.filter({ id: foundEquipmentId });
      return items[0] || null;
    },
    enabled: !!foundEquipmentId,
  });

  const handleScan = async () => {
    if (!nfcSupported) {
      toast.error('Tu dispositivo no soporta lectura NFC (requiere Chrome en Android)');
      return;
    }
    setScanning(true);
    setResult(null);
    try {
      const ndef = new window.NDEFReader();
      readerRef.current = ndef;
      await ndef.scan();
      toast.info('Acerca la etiqueta NFC al dispositivo...');

      ndef.onreading = (event) => {
        let rawText = '';
        for (const record of event.message.records) {
          if (record.recordType === 'text' || record.recordType === 'url') {
            try {
              rawText = record.toText ? record.toText() : new TextDecoder().decode(record.data);
            } catch {
              rawText = new TextDecoder().decode(record.data);
            }
            break;
          }
        }

        setScanning(false);

        if (!rawText) {
          setResult({ success: false, message: 'La etiqueta no contiene datos legibles' });
          return;
        }

        const equipmentId = parseEquipmentId(rawText);
        if (equipmentId) {
          setResult({ success: true, equipmentId, rawText });
          toast.success('¡Etiqueta leída! Redirigiendo al equipo...');
        } else {
          setResult({ success: false, rawText, message: 'Esta etiqueta no está asociada a ningún equipo' });
          toast.error('Etiqueta no reconocida');
        }
      };

      ndef.onerror = () => {
        setScanning(false);
        toast.error('Error al leer la etiqueta NFC');
        setResult({ success: false, message: 'Error de lectura NFC' });
      };
    } catch (err) {
      setScanning(false);
      const msg = err?.message || '';
      toast.error('No se pudo iniciar el escáner NFC' + (msg ? `: ${msg}` : ''));
      setResult({ success: false, message: 'No se pudo iniciar el escáner NFC' });
    }
  };

  const handleCancel = () => {
    setScanning(false);
    if (readerRef.current) {
      readerRef.current.onreading = null;
      readerRef.current.onerror = null;
      readerRef.current = null;
    }
  };

  const handleGoToEquipment = () => {
    if (foundEquipmentId) {
      navigate(createPageUrl(`EquipmentDetail?id=${foundEquipmentId}`));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <NavHeader title="Leer Etiqueta NFC" />

        {!nfcSupported && (
          <Card className="p-5 bg-amber-50 border border-amber-200 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">NFC no disponible en este dispositivo</p>
                <p className="text-sm text-amber-700 mt-1">
                  La lectura NFC requiere Chrome en Android. En iOS no está disponible. Puedes seguir usando el escaneo por foto.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-white border-0 shadow-sm">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Nfc className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Escanear Etiqueta NFC
            </h2>
            <p className="text-slate-500 mb-6">
              Acerca una etiqueta NFC al dispositivo para abrir la ficha del equipo asociado
            </p>

            {!scanning && !result && (
              <Button
                onClick={handleScan}
                disabled={!nfcSupported}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                <Nfc className="h-5 w-5 mr-2" />
                Iniciar Escaneo
              </Button>
            )}

            {scanning && (
              <div className="py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Nfc className="h-8 w-8 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <p className="text-slate-700 font-medium">Esperando etiqueta NFC...</p>
                <p className="text-sm text-slate-500 mt-2 flex items-center justify-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  Acerca la etiqueta al dorso del móvil
                </p>
                <Button variant="outline" onClick={handleCancel} className="mt-4">
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </div>
            )}

            {result && !scanning && (
              <div className="mt-2">
                {result.success ? (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <h3 className="font-semibold text-green-800">Equipo Encontrado</h3>
                    </div>
                    {loadingEquipment ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                      </div>
                    ) : foundEquipment ? (
                      <div className="space-y-2 text-left bg-white p-3 rounded-lg">
                        <div>
                          <span className="text-sm text-slate-500">Equipo:</span>
                          <span className="ml-2 font-medium text-slate-800">
                            {foundEquipment.reference_name || `${foundEquipment.brand} ${foundEquipment.model}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500">Marca:</span>
                          <span className="ml-2 font-medium text-slate-800">{foundEquipment.brand}</span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500">Modelo:</span>
                          <span className="ml-2 font-medium text-slate-800">{foundEquipment.model}</span>
                        </div>
                        {foundEquipment.location && (
                          <div>
                            <span className="text-sm text-slate-500">Ubicación:</span>
                            <span className="ml-2 font-medium text-slate-800">{foundEquipment.location}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">ID: {result.equipmentId}</p>
                    )}
                    <Button onClick={handleGoToEquipment} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                      Ver Detalles del Equipo <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                      <h3 className="font-semibold text-amber-800">Etiqueta no reconocida</h3>
                    </div>
                    <p className="text-sm text-amber-700">{result.message}</p>
                    {result.rawText && (
                      <p className="text-xs text-amber-600 mt-2 break-all bg-amber-100/50 p-2 rounded">
                        Contenido: {result.rawText}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => { setResult(null); }}
                  className="w-full mt-4"
                >
                  Escanear Otra Etiqueta
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pulsa "Iniciar Escaneo" y acerca la etiqueta NFC al móvil</li>
            <li>• Si la etiqueta está asignada a un equipo, se abrirá su ficha</li>
            <li>• Para asignar una etiqueta a un equipo, usa el botón "Asignar NFC" en la ficha del equipo</li>
            <li>• Requiere Chrome en Android con NFC activado</li>
          </ul>
        </div>
      </div>
    </div>
  );
}