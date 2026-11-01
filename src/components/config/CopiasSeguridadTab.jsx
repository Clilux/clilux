import React from 'react';
import { Card } from '@/components/ui/card';
import ExportDatosGerente from '@/components/company/ExportDatosGerente';
import ImportDatosEmpresa from '@/components/company/ImportDatosEmpresa';
import DriveSyncButton from '@/components/company/DriveSyncButton';
import { Download, UploadCloud, Cloud } from 'lucide-react';

/**
 * Pestaña "Copias de seguridad" de Configuración.
 * Reúne la exportación, importación y sincronización con Google Drive de los datos de la empresa.
 */
export default function CopiasSeguridadTab({ sessionTechEmail, companyName }) {
  const items = [
    {
      icon: Download,
      title: 'Exportar datos',
      desc: 'Descarga todos los datos de la empresa (trabajadores con credenciales y PIN, clientes, edificios, equipos, incidencias y revisiones) en Excel, CSV o como copia JSON completa para recuperar o migrar.',
      node: <ExportDatosGerente sessionTechEmail={sessionTechEmail} companyName={companyName} />,
    },
    {
      icon: UploadCloud,
      title: 'Importar copia',
      desc: 'Importa una copia JSON para recuperar datos o migrarlos a esta empresa (remepea los IDs automáticamente).',
      node: <ImportDatosEmpresa sessionTechEmail={sessionTechEmail} />,
    },
    {
      icon: Cloud,
      title: 'Copia en Google Drive',
      desc: 'Sube una copia completa de la empresa a Google Drive (también se ejecuta automáticamente cada día).',
      node: <DriveSyncButton sessionTechEmail={sessionTechEmail} />,
    },
  ];

  return (
    <div className="space-y-4">
      {items.map(({ icon: Icon, title, desc, node }) => (
        <Card key={title} className="p-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">{desc}</p>
              {node}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}