import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Download, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const documentTypes = [
  { value: 'manual', label: 'Manual de usuario' },
  { value: 'warranty', label: 'Garantía' },
  { value: 'certificate', label: 'Certificado' },
  { value: 'datasheet', label: 'Ficha técnica' },
  { value: 'invoice', label: 'Factura' },
  { value: 'other', label: 'Otro' },
];

export default function EquipmentDocuments({ equipment, onUpdate }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', type: 'manual', url: '' });

  const documents = equipment.documents || [];

  const updateMutation = useMutation({
    mutationFn: (docs) => base44.entities.Equipment.update(equipment.id, { documents: docs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', equipment.id] });
      onUpdate?.();
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewDoc(prev => ({ ...prev, url: result.file_url, name: prev.name || file.name }));
      toast.success('Archivo subido');
    } catch (error) {
      toast.error('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleAddDocument = () => {
    if (!newDoc.name || !newDoc.url) {
      toast.error('Completa el nombre y sube un archivo');
      return;
    }
    const updatedDocs = [...documents, newDoc];
    updateMutation.mutate(updatedDocs);
    setNewDoc({ name: '', type: 'manual', url: '' });
    setShowAddForm(false);
    toast.success('Documento añadido');
  };

  const handleRemoveDocument = (index) => {
    const updatedDocs = documents.filter((_, i) => i !== index);
    updateMutation.mutate(updatedDocs);
    toast.success('Documento eliminado');
  };

  const getTypeLabel = (type) => documentTypes.find(t => t.value === type)?.label || type;

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos ({documents.length})
        </h3>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Añadir documento
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 rounded-lg bg-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700">Nuevo documento</h4>
            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={newDoc.name}
                onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del documento"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newDoc.type} onValueChange={(v) => setNewDoc(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Archivo</Label>
              <div className="mt-1">
                <input type="file" onChange={handleFileUpload} className="hidden" id="doc-upload" />
                <label htmlFor="doc-upload">
                  <Button type="button" variant="outline" asChild disabled={uploading} className="w-full">
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {newDoc.url ? 'Archivo cargado ✓' : 'Subir archivo'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddDocument} disabled={!newDoc.name || !newDoc.url || updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar documento
            </Button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-center py-6 text-slate-400">No hay documentos adjuntos</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">{doc.name}</p>
                  <p className="text-xs text-slate-500">{getTypeLabel(doc.type)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveDocument(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}