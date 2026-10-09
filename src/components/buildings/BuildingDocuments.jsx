import React from 'react';
import { FileText } from 'lucide-react';
import BuildingDocsPanel from '@/components/buildings/BuildingDocsPanel';
import BuildingYearBooks from '@/components/buildings/BuildingYearBooks';
import { useBuildingDocuments } from '@/hooks/useBuildingDocuments';

/**
 * Apartado de documentación del edificio: archivos aportados (planos, accesos,
 * seguros...) y libros anuales generados (mantenimiento y F-Gas).
 */
export default function BuildingDocuments({ building, client, equipment = [], revisions = [] }) {
  const { documentos, company, guardarDocumento, abrir, eliminar } = useBuildingDocuments(building?.id, client);

  return (
    <div className="mb-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Documentación del edificio
      </h2>
      <BuildingDocsPanel
        building={building}
        client={client}
        documentos={documentos}
        guardarDocumento={guardarDocumento}
        abrir={abrir}
        eliminar={eliminar}
      />
      <BuildingYearBooks
        building={building}
        client={client}
        company={company}
        equipment={equipment}
        revisions={revisions}
        documentos={documentos}
        guardarDocumento={guardarDocumento}
        abrir={abrir}
        eliminar={eliminar}
      />
    </div>
  );
}