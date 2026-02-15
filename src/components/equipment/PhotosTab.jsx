import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Star, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function PhotosTab({ equipment, equipmentId }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const photos = equipment?.photos || [];
  const mainPhoto = equipment?.photo_url;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.update(equipmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      toast.success('Galería actualizada');
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const updatedPhotos = [...photos, file_url];
      
      // Si es la primera foto, establecerla como principal
      if (updatedPhotos.length === 1 && !mainPhoto) {
        updateMutation.mutate({
          photos: updatedPhotos,
          photo_url: file_url
        });
      } else {
        updateMutation.mutate({ photos: updatedPhotos });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetMain = (photoUrl) => {
    updateMutation.mutate({ photo_url: photoUrl });
  };

  const handleDelete = (photoUrl) => {
    const updatedPhotos = photos.filter(p => p !== photoUrl);
    const updateData = { photos: updatedPhotos };
    
    // Si la foto eliminada era la principal, limpiar o asignar otra
    if (mainPhoto === photoUrl) {
      updateData.photo_url = updatedPhotos.length > 0 ? updatedPhotos[0] : '';
    }
    
    updateMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Galería de Imágenes</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir Imagen
              </>
            )}
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <Card className="p-12 bg-slate-50 border-2 border-dashed">
          <div className="text-center">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">No hay imágenes</p>
            <p className="text-sm text-slate-400">Sube fotos del equipo para crear una galería</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {mainPhoto === photo && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                    <Star className="h-3 w-3 fill-current" />
                    Principal
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {mainPhoto !== photo && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetMain(photo)}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Principal
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(photo)}
                    className="bg-red-500/90 hover:bg-red-600 text-white border-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> La imagen marcada como "Principal" se mostrará en las tarjetas e informes del equipo.
          </p>
        </Card>
      )}
    </div>
  );
}