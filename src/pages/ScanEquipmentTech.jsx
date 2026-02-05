import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Loader2, CheckCircle2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import NavHeader from '../components/navigation/NavHeader';

export default function ScanEquipmentTech() {
  const [photo, setPhoto] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      toast.error('No se pudo acceder a la cámara');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'equipment-photo.jpg', { type: 'image/jpeg' });
        setPhoto(file);
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
    }
  };

  const processPhoto = async () => {
    if (!photo) return;

    setIsProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta ficha técnica de equipo de climatización y extrae todos los datos que puedas.
        
        Extrae información como:
        - Marca (brand)
        - Modelo (model)
        - Número de serie (serial_number)
        - Tipo de equipo (equipment_type: uno de "split", "cassette", "conductos", "VRV", "fancoil", "bomba_calor", "enfriadora", "otro")
        - Potencia frigorífica en kW (cooling_power_kw)
        - Potencia calorífica en kW (heating_power_kw)
        - Tipo de refrigerante (refrigerant_type)
        - Carga de refrigerante en kg (refrigerant_charge_kg)
        - Cualquier otra información técnica relevante
        
        Devuelve solo los campos que encuentres con certeza. Si no estás seguro de algo, no lo incluyas.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            brand: { type: "string" },
            model: { type: "string" },
            serial_number: { type: "string" },
            equipment_type: { type: "string" },
            cooling_power_kw: { type: "number" },
            heating_power_kw: { type: "number" },
            refrigerant_type: { type: "string" },
            refrigerant_charge_kg: { type: "number" },
            notes: { type: "string" }
          }
        }
      });

      setExtractedData({ ...result, photo_url: file_url });
      toast.success('Datos extraídos correctamente');
    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToForm = () => {
    const params = new URLSearchParams();
    Object.entries(extractedData).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    navigate(createPageUrl(`EquipmentForm?${params.toString()}`));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <NavHeader title="Escanear Ficha Técnica" />

        {!photo && !showCamera && (
          <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                <Camera className="h-10 w-10 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Escanear Ficha Técnica
                </h2>
                <p className="text-slate-400 text-sm">
                  Toma una foto de la ficha técnica del equipo y extraeremos los datos automáticamente
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={startCamera}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Abrir Cámara
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Subir Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        )}

        {showCamera && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex gap-3">
                <Button 
                  onClick={capturePhoto}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capturar
                </Button>
                <Button 
                  variant="outline"
                  onClick={stopCamera}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </Card>
        )}

        {photo && !extractedData && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="space-y-4">
              <img 
                src={URL.createObjectURL(photo)} 
                alt="Preview"
                className="w-full rounded-lg"
              />
              <div className="flex gap-3">
                <Button 
                  onClick={processPhoto}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Extraer Datos
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setPhoto(null)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {extractedData && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Datos Extraídos</h3>
                  <p className="text-sm text-slate-400">Revisa y completa en el formulario</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(extractedData).map(([key, value]) => {
                  if (!value || key === 'photo_url') return null;
                  const labels = {
                    brand: 'Marca',
                    model: 'Modelo',
                    serial_number: 'Nº Serie',
                    equipment_type: 'Tipo',
                    cooling_power_kw: 'Potencia Frío (kW)',
                    heating_power_kw: 'Potencia Calor (kW)',
                    refrigerant_type: 'Refrigerante',
                    refrigerant_charge_kg: 'Carga (kg)',
                    notes: 'Notas'
                  };
                  return (
                    <div key={key} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-slate-400">{labels[key] || key}</p>
                      <p className="text-sm text-white font-medium">{value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleContinueToForm}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Continuar al Formulario
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setPhoto(null);
                    setExtractedData(null);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Nueva Foto
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}