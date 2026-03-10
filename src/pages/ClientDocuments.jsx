import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Eye, Calendar, User, Building2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientDocuments() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    const savedClientId = sessionStorage.getItem('client_id');
    if (savedClientId) {
      setClientId(savedClientId);
    } else {
      navigate(createPageUrl('MenuInicio'));
    }
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date'),
    enabled: !!clientId,
  });

  const typeLabel = { certificado_rite: 'Certificado RITE', otro: 'Otro' };

  if (!clientId) return null;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('HomeCliente'))} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center">
              <FileText className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Mis Documentos</h1>
              <p className="text-xs text-slate-400">Certificados y documentos de tu instalación</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-12 text-center border shadow-sm">
            <FileText className="h-14 w-14 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium mb-1">No hay documentos disponibles</p>
            <p className="text-slate-400 text-sm">Los certificados RITE y otros documentos aparecerán aquí.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">{documents.length} documento{documents.length !== 1 ? 's' : ''}</p>
            {documents.map(doc => (
              <Card key={doc.id} className="p-4 bg-white border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-800">{doc.title}</h4>
                        <Badge variant="secondary" className="text-xs">{typeLabel[doc.document_type] || doc.document_type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                        {doc.building_name && (
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{doc.building_name}</span>
                        )}
                        {doc.tecnico_nombre && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{doc.tecnico_nombre}</span>
                        )}
                        {doc.created_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.created_date), 'dd MMM yyyy', { locale: es })}
                          </span>
                        )}
                        {doc.num_certificado && <span>Nº {doc.num_certificado}</span>}
                      </div>
                      {doc.observaciones && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{doc.observaciones}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)} className="text-slate-600">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDoc?.title}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Tipo</p>
                  <p className="font-medium">{typeLabel[viewDoc.document_type] || viewDoc.document_type}</p>
                </div>
                {viewDoc.num_certificado && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Nº Certificado</p>
                    <p className="font-medium">{viewDoc.num_certificado}</p>
                  </div>
                )}
                {viewDoc.building_name && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Instalación</p>
                    <p className="font-medium">{viewDoc.building_name}</p>
                  </div>
                )}
                {viewDoc.tecnico_nombre && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Técnico</p>
                    <p className="font-medium">{viewDoc.tecnico_nombre}</p>
                  </div>
                )}
                {viewDoc.fecha_firma && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Fecha de firma</p>
                    <p className="font-medium">{viewDoc.fecha_firma}</p>
                  </div>
                )}
                {viewDoc.created_date && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">Guardado el</p>
                    <p className="font-medium">{format(new Date(viewDoc.created_date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                  </div>
                )}
              </div>
              {viewDoc.observaciones && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="whitespace-pre-wrap">{viewDoc.observaciones}</p>
                </div>
              )}
              {viewDoc.file_url && (
                <a href={viewDoc.file_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}