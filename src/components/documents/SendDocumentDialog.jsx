import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Mail, MessageCircle, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SendDocumentDialog({ open, onOpenChange, documento, tipoDocumento, pdfBlob }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    destinatario: '',
    metodo_envio: 'email',
    notas: ''
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      // Registrar el envío
      await base44.entities.DocumentoEnvio.create({
        documento_id: documento.id,
        tipo_documento: tipoDocumento,
        destinatario: data.destinatario,
        fecha_envio: new Date().toISOString(),
        metodo_envio: data.metodo_envio,
        estado: 'enviado',
        notas: data.notas
      });

      // Si es email, enviar el documento
      if (data.metodo_envio === 'email') {
        // Subir PDF
        const file = new File([pdfBlob], `${tipoDocumento}-${documento.numero}.pdf`, { type: 'application/pdf' });
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });
        
        if (!uploadResponse.ok) throw new Error('Error al subir el PDF');
        const { file_url } = await uploadResponse.json();

        // Enviar email
        await base44.integrations.Core.SendEmail({
          to: data.destinatario,
          subject: `${tipoDocumento.charAt(0).toUpperCase() + tipoDocumento.slice(1)} ${documento.numero}`,
          body: `
            Adjunto encontrará el documento ${documento.numero}.
            
            ${data.notas ? `Notas: ${data.notas}` : ''}
            
            Puede descargar el documento en el siguiente enlace:
            ${file_url}
            
            Saludos cordiales
          `
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios'] });
      toast.success('Documento enviado correctamente');
      onOpenChange(false);
      setFormData({ destinatario: '', metodo_envio: 'email', notas: '' });
    },
    onError: (error) => {
      toast.error('Error al enviar el documento');
      console.error(error);
    }
  });

  const handleSubmit = () => {
    if (!formData.destinatario) {
      toast.error('Introduce el destinatario');
      return;
    }
    sendMutation.mutate(formData);
  };

  const handleGenerateLink = async () => {
    try {
      const file = new File([pdfBlob], `${tipoDocumento}-${documento.numero}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Copiar al portapapeles
      await navigator.clipboard.writeText(file_url);
      
      // Registrar como enviado por enlace
      await base44.entities.DocumentoEnvio.create({
        documento_id: documento.id,
        tipo_documento: tipoDocumento,
        destinatario: 'Enlace generado',
        fecha_envio: new Date().toISOString(),
        metodo_envio: 'enlace',
        estado: 'enviado',
        notas: formData.notas
      });

      toast.success('Enlace copiado al portapapeles');
      queryClient.invalidateQueries({ queryKey: ['envios'] });
    } catch (error) {
      toast.error('Error al generar el enlace');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Enviar Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Método de Envío</Label>
            <Select value={formData.metodo_envio} onValueChange={(v) => setFormData({ ...formData, metodo_envio: v })}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Destinatario *</Label>
            <Input
              type={formData.metodo_envio === 'email' ? 'email' : 'tel'}
              placeholder={formData.metodo_envio === 'email' ? 'email@ejemplo.com' : '+34 600 000 000'}
              value={formData.destinatario}
              onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
              className="bg-white/5 border-white/20 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Notas (opcional)</Label>
            <Textarea
              placeholder="Mensaje adicional..."
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="bg-white/5 border-white/20 text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerateLink}
              variant="outline"
              className="flex-1 bg-white/5 border-white/20 text-white"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Generar Enlace
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sendMutation.isPending}
              className="flex-1 bg-blue-600"
            >
              {sendMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}