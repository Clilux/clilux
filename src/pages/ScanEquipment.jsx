import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, Search, CheckCircle2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function ScanEquipment() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setResult(null);

    try {
      // Subir foto
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setPhoto(uploadResult.file_url);

      // Extraer información con IA
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de una placa de equipo de climatización. 
        Extrae EXACTAMENTE:
        - brand: la marca del equipo
        - model: el modelo exacto
        - serial_number: el número de serie
        
        Si no puedes leer algún dato con claridad, devuelve null para ese campo.
        Importante: Extrae SOLO lo que ves claramente en la placa.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            brand: { type: "string" },
            model: { type: "string" },
            serial_number: { type: "string" }
          }
        }
      });

      const extractedData = aiResult;

      // Buscar equipo coincidente
      let foundEquipment = null;

      if (extractedData.serial_number) {
        foundEquipment = allEquipment.find(eq => 
          eq.serial_number?.toLowerCase().includes(extractedData.serial_number.toLowerCase()) ||
          extractedData.serial_number.toLowerCase().includes(eq.serial_number?.toLowerCase())
        );
      }

      if (!foundEquipment && extractedData.model) {
        foundEquipment = allEquipment.find(eq => 
          (eq.model?.toLowerCase().includes(extractedData.model.toLowerCase()) ||
           extractedData.model.toLowerCase().includes(eq.model?.toLowerCase())) &&
          (!extractedData.brand || eq.brand?.toLowerCase().includes(extractedData.brand.toLowerCase()))
        );
      }

      if (foundEquipment) {
        setResult({
          success: true,
          equipment: foundEquipment,
          extracted: extractedData
        });
        toast.success('¡Equipo encontrado!');
      } else {
        setResult({
          success: false,
          extracted: extractedData,
          message: 'No se encontró ningún equipo con estos datos'
        });
        toast.error('Equipo no encontrado en el sistema');
      }
    } catch (error) {
      console.error('Error scanning:', error);
      toast.error('Error al escanear la imagen');
      setResult({ success: false, message: 'Error al procesar la imagen' });
    } finally {
      setScanning(false);
    }
  };

  const handleGoToEquipment = () => {
    if (result?.equipment) {
      navigate(createPageUrl(`EquipmentDetail?id=${result.equipment.id}`));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <NavHeader title="Escanear Equipo" />

        <Card className="p-6 bg-white border-0 shadow-sm">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Camera className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Escanear Placa de Equipo
            </h2>
            <p className="text-slate-500 mb-6">
              Fotografía la placa del equipo para identificarlo automáticamente
            </p>

            {!photo && !scanning && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                  id="camera-input"
                />
                <label htmlFor="camera-input">
                  <Button className="bg-blue-600 hover:bg-blue-700 w-full" asChild>
                    <span>
                      <Camera className="h-5 w-5 mr-2" />
                      Tomar Foto
                    </span>
                  </Button>
                </label>
              </>
            )}

            {scanning && (
              <div className="py-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Analizando imagen...</p>
                <p className="text-sm text-slate-500 mt-2">Extrayendo marca, modelo y número de serie</p>
              </div>
            )}

            {photo && !scanning && (
              <div className="mt-6">
                <img 
                  src={photo} 
                  alt="Foto capturada" 
                  className="w-full rounded-lg border-2 border-slate-200 mb-4"
                />

                {result && (
                  <div className={`p-4 rounded-lg mb-4 ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {result.success ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                          <h3 className="font-semibold text-green-800">Equipo Encontrado</h3>
                        </div>
                        <div className="space-y-2 text-left bg-white p-3 rounded-lg">
                          <div>
                            <span className="text-sm text-slate-500">Marca:</span>
                            <span className="ml-2 font-medium text-slate-800">{result.equipment.brand}</span>
                          </div>
                          <div>
                            <span className="text-sm text-slate-500">Modelo:</span>
                            <span className="ml-2 font-medium text-slate-800">{result.equipment.model}</span>
                          </div>
                          {result.equipment.serial_number && (
                            <div>
                              <span className="text-sm text-slate-500">N° Serie:</span>
                              <span className="ml-2 font-medium text-slate-800">{result.equipment.serial_number}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-sm text-slate-500">Ubicación:</span>
                            <span className="ml-2 font-medium text-slate-800">{result.equipment.location}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={handleGoToEquipment}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700"
                        >
                          Ver Detalles del Equipo
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-amber-800 mb-3">Equipo no encontrado</h3>
                        {result.extracted && (
                          <div className="space-y-2 text-left bg-white p-3 rounded-lg text-sm">
                            <p className="text-slate-600 mb-2">Datos extraídos de la imagen:</p>
                            {result.extracted.brand && (
                              <div>
                                <span className="text-slate-500">Marca:</span>
                                <span className="ml-2 text-slate-800">{result.extracted.brand}</span>
                              </div>
                            )}
                            {result.extracted.model && (
                              <div>
                                <span className="text-slate-500">Modelo:</span>
                                <span className="ml-2 text-slate-800">{result.extracted.model}</span>
                              </div>
                            )}
                            {result.extracted.serial_number && (
                              <div>
                                <span className="text-slate-500">N° Serie:</span>
                                <span className="ml-2 text-slate-800">{result.extracted.serial_number}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-amber-700 mt-3">
                          Este equipo no está registrado en el sistema
                        </p>
                      </>
                    )}
                  </div>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPhoto(null);
                    setResult(null);
                  }}
                  className="w-full"
                >
                  Escanear Otro Equipo
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Consejos para mejores resultados:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Asegúrate de que la placa esté bien iluminada</li>
            <li>• Enfoca claramente la marca, modelo y número de serie</li>
            <li>• Evita reflejos y sombras sobre el texto</li>
            <li>• Mantén la cámara estable para evitar imágenes borrosas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}