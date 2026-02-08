import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { FileText, FileCheck, FileSpreadsheet, Book } from 'lucide-react';
import { createPageUrl } from '@/utils';
import NavHeader from '../components/navigation/NavHeader';

export default function Documentacion() {
  const documentos = [
    {
      id: 'certificado-rite',
      title: 'Certificado RITE',
      description: 'Certificados de mantenimiento RITE',
      icon: FileCheck,
      page: 'CertificadoRITE',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      id: 'informes',
      title: 'Informes de Revisión',
      description: 'Reportes de mantenimiento',
      icon: FileText,
      page: 'Reports',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'manuales',
      title: 'Manuales Técnicos',
      description: 'Documentación de equipos',
      icon: Book,
      page: 'ManualesTecnicos',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      id: 'plantillas',
      title: 'Plantillas',
      description: 'Documentos y formatos',
      icon: FileSpreadsheet,
      page: 'Plantillas',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Documentación" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documentos.map(doc => {
            const Icon = doc.icon;
            return (
              <Link key={doc.id} to={createPageUrl(doc.page)}>
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-full ${doc.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-8 w-8 ${doc.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{doc.title}</h3>
                      <p className="text-slate-400 text-sm">{doc.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="mt-8 p-6 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Gestión Documental</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Centraliza toda la documentación técnica, certificados, manuales e informes 
                en un solo lugar. Accede rápidamente a la información que necesitas.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}