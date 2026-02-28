import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Wrench, Search, X, Loader2, ScanLine } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import NavHeader from '../components/navigation/NavHeader';

export default function ScanEquipmentTech() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState('');
  const [searching, setSearching] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Limpieza al desmontar
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      // Intentar leer con BarcodeDetector si está disponible
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix'] });
        intervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            const barcodes = await detector.detect(videoRef.current).catch(() => []);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              stopCamera();
              await findEquipmentBySerial(raw);
            }
          }
        }, 600);
      } else {
        toast.info('Lectura automática no disponible en este navegador. Usa búsqueda manual.');
      }
    } catch (err) {
      toast.error('No se pudo acceder a la cámara');
    }
  };

  const findEquipmentBySerial = async (serial) => {
    setSearching(true);
    setManualSerial(serial);
    const results = await base44.entities.Equipment.list();
    const found = results.find(e => e.serial_number && e.serial_number.trim().toLowerCase() === serial.trim().toLowerCase());
    setSearching(false);
    if (found) {
      toast.success(`Equipo encontrado: ${found.brand} ${found.model}`);
      navigate(createPageUrl(`EquipmentDetail?id=${found.id}`));
    } else {
      toast.error(`No se encontró equipo con S/N: ${serial}`);
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualSerial.trim()) return;
    await findEquipmentBySerial(manualSerial.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-lg mx-auto">
        <NavHeader title="Escanear Equipo" />

        {/* Cámara */}
        <Card className="p-0 bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden mb-4">
          {scanning ? (
            <div className="relative">
              <video ref={videoRef} className="w-full rounded-xl" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-blue-400 rounded-lg w-2/3 h-1/2 flex items-center justify-center">
                  <ScanLine className="h-8 w-8 text-blue-400 animate-pulse" />
                </div>
              </div>
              <Button
                onClick={stopCamera}
                className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 h-9 w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
                Apunta al código de barras / QR del equipo
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-10 w-10 text-blue-400" />
              </div>
              <p className="text-slate-300 text-sm mb-5">Escanea la etiqueta o código de barras del equipo para acceder directamente a su ficha</p>
              <Button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700 h-11">
                <Camera className="h-5 w-5 mr-2" />
                Abrir cámara y escanear
              </Button>
            </div>
          )}
        </Card>

        {/* Búsqueda manual por número de serie */}
        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
          <p className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4" /> O busca por número de serie
          </p>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <Input
              placeholder="Número de serie..."
              value={manualSerial}
              onChange={(e) => setManualSerial(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 flex-1"
            />
            <Button type="submit" disabled={searching || !manualSerial.trim()} className="bg-slate-700 hover:bg-slate-600 shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
          <Button
            variant="ghost"
            className="w-full mt-3 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10"
            onClick={() => navigate(createPageUrl('Equipment'))}
          >
            Ver todos los equipos
          </Button>
        </Card>
      </div>
    </div>
  );
}