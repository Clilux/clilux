import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS = {
  nomina: 'Nómina',
  contrato: 'Contrato',
  baja_medica: 'Baja médica',
  documento_empresa: 'Documento empresa',
  otro: 'Otro',
};

export default function WorkerDocumentsPanel({ sessionEmail, targetEmail, canEdit }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('nomina');
  const [fecha, setFecha] = useState('');
  const [uploading, setUploading] = useState(false);

  const invoke = (entity, extra = {}) =>
    base44.functions.invoke('getCompanyData', { technician_email: sessionEmail, entity, ...extra });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['worker-documents', sessionEmail, targetEmail],
    queryFn: async () => {
      const res = await invoke('worker_documents', { target_email: targetEmail });
      return res.data?.data || [];
    },
    enabled: !!sessionEmail && !!targetEmail,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      await invoke('worker_document_create', {
        record: {
          technician_email: targetEmail,
          title: title || file.name,
          document_type: docType,
          file_url: up.file_url,
          fecha: fecha || new Date().toISOString().slice(0, 10),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['worker-documents', sessionEmail, targetEmail] });
      setTitle(''); setFecha(''); setDocType('nomina');
      toast.success('Documento añadido');
    } catch (err) {
      toast.error('Error al subir el documento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.title}"?`)) return;
    try {
      await invoke('worker_document_delete', { document_id: doc.id });
      queryClient.invalidateQueries({ queryKey: ['worker-documents', sessionEmail, targetEmail] });
      toast.success('Documento eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card className="p-5 bg-card border-0 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-1">Añadir documento</h3>
          <p className="text-xs text-slate-400 mb-4">Nóminas, contratos, certificados u otros documentos del trabajador.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-600 mb-1">Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nómina enero 2026" />
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Tipo</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-600 mb-1">Fecha</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="w-full cursor-pointer">
                <span className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 px-4 text-sm font-medium w-full">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</> : <><Upload className="h-4 w-4" />Subir archivo</>}
                </span>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-card border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <h3 className="font-semibold text-slate-700">Documentos</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : docs.length === 0 ? (
          <p className="text-slate-400 text-sm text-center p-6">Sin documentos</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {docs.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{d.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[d.document_type] || d.document_type}</Badge>
                      {d.fecha && <span className="text-xs text-slate-400">{d.fecha}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={d.file_url} target="_blank" rel="noreferrer" download>
                    <Button variant="ghost" size="icon" title="Descargar"><Download className="h-4 w-4 text-slate-500" /></Button>
                  </a>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} title="Eliminar"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}