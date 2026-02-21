import React, { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function Home() {
  useEffect(() => {
    // Redirigir siempre a MenuInicio
    window.location.href = createPageUrl('MenuInicio');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white">Cargando...</div>
    </div>
  );
}