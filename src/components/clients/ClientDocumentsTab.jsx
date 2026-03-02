import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Trash2, Eye, Calendar, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientDocumentsTab({ clientId }) {
  const queryClient = useQueryClient();
  const [viewDoc, setViewDoc] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date'),
    enabled: !!clientId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] });
      toast.success('Documento eliminado');
    },
  });

  if (isLoading) {
    return <div className="p-4 text-slate-500 text-sm">Cargando documentos...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card className="p-10 text-center border-0 shadow-sm">
        <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500 mb-2">No hay documentos guardados para este cliente</p>
        <p className="text-slate-400 text-sm">Los documentos generados (certificados RITE, etc.) aparecerán aquí cuando los guardes.</p>
      </Card>
    );
  }

  const typeLabel = { certificado_rite: 'Certificado RITE', otro: 'Otro' };

  return (
    <div className="space-y-3">
      {documents.map(doc => (
        <Card key={doc.id} className="p-4 bg-white border-0 shadow-sm">
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
              <Button
                variant="ghost" size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => deleteMutation.mutate(doc.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {/* Modal detalle documento */}
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

              {/* Datos del formulario si existen */}
              {viewDoc.form_data && (
                <div className="border rounded-lg p-4">
                  <p className="font-semibold text-slate-700 mb-3">Datos del certificado</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Titular', viewDoc.form_data.titular_nombre],
                      ['NIF/CIF', viewDoc.form_data.titular_nif],
                      ['Dirección titular', viewDoc.form_data.titular_direccion],
                      ['Email titular', viewDoc.form_data.titular_email],
                      ['Teléfono', viewDoc.form_data.titular_telefono],
                      ['Emplazamiento', viewDoc.form_data.inst_emplazamiento],
                      ['Dirección instalación', viewDoc.form_data.inst_direccion],
                      ['Empresa mantenedora', viewDoc.form_data.empresa_nombre],
                      ['Núm. R.I.', viewDoc.form_data.empresa_ri],
                      ['Director obra', viewDoc.form_data.director_nombre],
                      ['Pot. frío (kW)', viewDoc.form_data.pot_frio],
                      ['Pot. calor (kW)', viewDoc.form_data.pot_calor],
                      ['Nº gen. frío', viewDoc.form_data.num_gen_frio],
                      ['Nº gen. calor', viewDoc.form_data.num_gen_calor],
                      ['Tipos gen. frío', viewDoc.form_data.tipos_gen_frio],
                      ['Tipos gen. calor', viewDoc.form_data.tipos_gen_calor],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-400">{label}</p>
                        <p className="font-medium text-slate-700">{value}</p>
                      </div>
                    ))}
                  </div>
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