import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, AlertTriangle } from 'lucide-react';
import RevisionTableCell from '@/components/revisions/RevisionTableCell';
import { rowFieldKeys } from '@/lib/revision-utils';

// Tabla de una visita (edificio + tipo de revisión): una fila por equipo
export default function RevisionGroupTable({ title, subtitle, columns, rows, entries, blockedIds, onCell, onEntry }) {
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
            {title}
          </p>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        <Badge className="bg-blue-100 text-blue-700 shrink-0">
          {rows.length} equipo{rows.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left px-3 py-2 font-medium text-slate-500 sticky left-0 bg-white min-w-[220px] z-10 border-r border-slate-100">
                Equipo
              </th>
              {columns.map((col) => (
                <th key={col.key} className="text-left px-3 py-2 font-medium text-slate-500 min-w-[130px]">
                  {col.label}
                </th>
              ))}
              <th className="text-left px-3 py-2 font-medium text-slate-500 min-w-[190px]">Observaciones</th>
              <th className="text-left px-3 py-2 font-medium text-slate-500 min-w-[190px]">Indicaciones próxima revisión</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ revision, equipment, vencida, vencidaLabel }) => {
              const entry = entries[revision.id] || { data: {}, notes: '', nextNotes: '' };
              const blocked = blockedIds.has(revision.id);
              const fieldKeys = rowFieldKeys(equipment, revision.revision_type);

              return (
                <tr key={revision.id} className={`border-b last:border-0 ${blocked ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}>
                  <td className="px-3 py-2 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                    <p className="font-medium text-slate-800 truncate">
                      {equipment?.reference_name || `${equipment?.brand || ''} ${equipment?.model || ''}`.trim() || 'Equipo'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {equipment?.brand} {equipment?.model}
                      {equipment?.location ? ` · ${equipment.location}` : ''}
                    </p>
                    {blocked && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Revisión anterior pendiente
                      </p>
                    )}
                    {vencida && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Vencida · {vencidaLabel}
                      </p>
                    )}
                  </td>

                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 align-middle">
                      {fieldKeys.has(col.key) ? (
                        <RevisionTableCell
                          field={col}
                          value={entry.data?.[col.key]}
                          onChange={(value) => onCell(revision.id, col.key, value)}
                          disabled={blocked}
                        />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}

                  <td className="px-3 py-2 align-middle">
                    <Input
                      value={entry.notes || ''}
                      onChange={(e) => onEntry(revision.id, 'notes', e.target.value)}
                      disabled={blocked}
                      placeholder="Sin observaciones"
                      className="h-8 text-sm min-w-[170px]"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Input
                      value={entry.nextNotes || ''}
                      onChange={(e) => onEntry(revision.id, 'nextNotes', e.target.value)}
                      disabled={blocked}
                      placeholder="Para la próxima visita"
                      className="h-8 text-sm min-w-[170px]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}