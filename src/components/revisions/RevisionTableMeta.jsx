import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Cabecera común de la tabla: fecha de realización y técnico para todas las filas
export default function RevisionTableMeta({ completionDate, onCompletionDate, technicianName, onTechnicianName, technicians, summary }) {
  const knownTech = technicians.find((t) => t.name === technicianName);

  return (
    <Card className="p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-slate-700 mb-2">Fecha de realización</Label>
          <Input type="date" value={completionDate} onChange={(e) => onCompletionDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-slate-700 mb-2">Técnico que realiza las revisiones</Label>
          {technicians.length > 0 ? (
            <div className="space-y-2">
              <select
                value={knownTech ? technicianName : '__manual__'}
                onChange={(e) => onTechnicianName(e.target.value === '__manual__' ? '' : e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-md px-2 bg-background"
              >
                <option value="">— Seleccionar técnico —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}{t.specialty ? ` · ${t.specialty}` : ''}</option>
                ))}
                <option value="__manual__">✏️ Escribir manualmente...</option>
              </select>
              {!knownTech && (
                <Input
                  value={technicianName}
                  onChange={(e) => onTechnicianName(e.target.value)}
                  placeholder="Nombre del técnico"
                />
              )}
            </div>
          ) : (
            <Input
              value={technicianName}
              onChange={(e) => onTechnicianName(e.target.value)}
              placeholder="Nombre del técnico"
            />
          )}
        </div>
        <div className="flex items-end">
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {summary}
          </p>
        </div>
      </div>
    </Card>
  );
}