import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Save } from 'lucide-react';

const PERMISOS_CONFIG = [
  { key: 'ver_clientes',      label: 'Ver clientes',         group: 'Clientes' },
  { key: 'editar_clientes',   label: 'Crear / editar clientes', group: 'Clientes' },
  { key: 'ver_edificios',     label: 'Ver edificios',        group: 'Edificios & Equipos' },
  { key: 'ver_equipos',       label: 'Ver equipos',          group: 'Edificios & Equipos' },
  { key: 'editar_equipos',    label: 'Crear / editar equipos', group: 'Edificios & Equipos' },
  { key: 'ver_incidencias',   label: 'Ver incidencias',      group: 'Incidencias' },
  { key: 'editar_incidencias',label: 'Gestionar incidencias', group: 'Incidencias' },
  { key: 'ver_revisiones',    label: 'Ver revisiones',       group: 'Revisiones' },
  { key: 'editar_revisiones', label: 'Completar revisiones', group: 'Revisiones' },
  { key: 'ver_horario',       label: 'Control horario',      group: 'Horario' },
  { key: 'ver_ausencias',     label: 'Solicitar ausencias',  group: 'Horario' },
  { key: 'ver_documentacion', label: 'Documentación técnica', group: 'Otros' },
  { key: 'ver_contratos',     label: 'Ver contratos',        group: 'Otros' },
  { key: 'ver_scada',         label: 'Acceso SCADA',         group: 'Otros' },
];

const DEFAULTS = {
  ver_clientes: true, editar_clientes: false,
  ver_edificios: true,
  ver_equipos: true, editar_equipos: false,
  ver_incidencias: true, editar_incidencias: true,
  ver_revisiones: true, editar_revisiones: true,
  ver_horario: true, ver_ausencias: true,
  ver_documentacion: true, ver_contratos: false, ver_scada: false,
};

export default function PermisosTecnicoPanel({ technician, onUpdated, onPermisoChange }) {
  const permisos = { ...DEFAULTS, ...(technician.permisos || {}) };
  const [local, setLocal] = useState(permisos);

  const toggle = (key) => {
    const updated = { ...local, [key]: !local[key] };
    setLocal(updated);
    onPermisoChange?.(updated);
  };

  // Agrupar
  const groups = {};
  PERMISOS_CONFIG.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-slate-700 text-sm">Permisos de {technician.name}</span>
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{group}</p>
          <div className="space-y-2">
            {items.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-50">
                <span className="text-sm text-slate-700">{label}</span>
                <Switch
                  checked={!!local[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}