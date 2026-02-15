import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        // Usuario autenticado (técnico/admin)
        window.location.href = createPageUrl('HomeTecnico');
      } catch {
        // No autenticado, ir a MenuInicio
        window.location.href = createPageUrl('MenuInicio');
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white">Cargando...</div>
    </div>
  );
}