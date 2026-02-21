import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Wrench } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import NavHeader from '../components/navigation/NavHeader';

export default function ScanEquipmentTech() {
  const navigate = useNavigate();



  const handleScanQR = async () => {
    // Aquí implementaríamos el escaneo de QR
    toast.info('Funcionalidad de escaneo QR próximamente');
  };

  const handleSearchEquipment = () => {
    navigate(createPageUrl('Equipment'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <NavHeader title="Acceso Rápido a Equipos" />

        <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
              <Wrench className="h-10 w-10 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Acceso Rápido a Equipos
              </h2>
              <p className="text-slate-400 text-sm">
                Accede directamente a un equipo
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleScanQR}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="h-5 w-5 mr-2" />
                Escanear Código QR
              </Button>
              <Button 
                variant="outline"
                onClick={handleSearchEquipment}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Wrench className="h-5 w-5 mr-2" />
                Buscar Equipo Manualmente
              </Button>
            </div>
          </div>
        </Card>


      </div>
    </div>
  );
}