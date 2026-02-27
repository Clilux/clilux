import React from 'react';
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, LayoutList } from 'lucide-react';

export default function ViewModeToggle({ viewMode, onChange }) {
  const modes = [
    { id: 'list', icon: List, label: 'Lista' },
    { id: 'grid', icon: LayoutGrid, label: 'Cuadrícula' },
    { id: 'compact', icon: LayoutList, label: 'Compacto' },
  ];

  return (
    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
      {modes.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon"
          title={label}
          onClick={() => onChange(id)}
          className={`rounded-none h-9 w-9 ${viewMode === id ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}