import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const TIPO_LABELS = {
  control_fugas: 'Control Fugas',
  carga_gas: 'Carga Gas',
  recuperacion_gas: 'Recuperación',
  mantenimiento: 'Mantenimiento',
  reparacion: 'Reparación',
  instalacion: 'Instalación',
  desguace: 'Desguace',
  trasvase: 'Trasvase',
  eliminacion: 'Eliminación',
};

const TIPO_COLORS = {
  carga_gas: 'bg-blue-100 text-blue-800',
  recuperacion_gas: 'bg-amber-100 text-amber-800',
  control_fugas: 'bg-emerald-100 text-emerald-800',
  trasvase: 'bg-purple-100 text-purple-800',
  eliminacion: 'bg-red-100 text-red-800',
  instalacion: 'bg-cyan-100 text-cyan-800',
  desguace: 'bg-slate-100 text-slate-800',
  mantenimiento: 'bg-indigo-100 text-indigo-800',
  reparacion: 'bg-orange-100 text-orange-800',
};

export default function LibroFGasTable({ registros, equipmentMap, clientMap, onEdit, onDelete, isAdmin }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!registros || registros.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
        <p className="text-sm">No hay operaciones registradas con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-brand-600 text-white">
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Nº</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Fecha</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Tipo</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Equipo / Cliente</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Refrig.</th>
            <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Carga (kg)</th>
            <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Gas añ. (kg)</th>
            <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Gas rec. (kg)</th>
            <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">tCO₂eq</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Técnico</th>
            <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Empresa</th>
            <th className="px-2 py-2 text-center font-semibold">·</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r, idx) => {
            const expanded = expandedId === r.id;
            const eq = equipmentMap?.[r.equipment_id];
            const cliente = r.client_id ? clientMap?.[r.client_id] : null;
            const equipoText = eq?.reference_name || eq?.brand + ' ' + eq?.model || r.equipment_name || '';
            const clienteText = cliente?.name || r.client_name || '';
            return (
              <React.Fragment key={r.id}>
                <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60 border-b border-slate-100'}>
                  <td className="px-2 py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.fecha_intervencion ? format(new Date(r.fecha_intervencion), 'dd/MM/yy', { locale: es }) : ''}</td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TIPO_COLORS[r.tipo_intervencion] || 'bg-slate-100 text-slate-700'}`}>
                      {TIPO_LABELS[r.tipo_intervencion] || r.tipo_intervencion}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 max-w-[200px]">
                    <p className="truncate font-medium text-slate-700">{equipoText || <span className="text-slate-400 italic">— (sin equipo)</span>}</p>
                    {clienteText && <p className="text-[10px] text-slate-400 truncate">{clienteText}</p>}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.refrigerante_tipo || '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.carga_total_kg ? Number(r.carga_total_kg).toFixed(2) : '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-blue-600">{r.gas_anyadido_kg ? `+${Number(r.gas_anyadido_kg).toFixed(2)}` : ''}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-amber-600">{r.gas_recuperado_kg ? `−${Number(r.gas_recuperado_kg).toFixed(2)}` : ''}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{r.co2_equivalent_tons ? Number(r.co2_equivalent_tons).toFixed(3) : '—'}</td>
                  <td className="px-2 py-1.5 max-w-[120px]">
                    <p className="truncate">{r.tecnico_nombre || '—'}</p>
                    {r.tecnico_cert_num && <p className="text-[9px] text-slate-400">Cert: {r.tecnico_cert_num}</p>}
                  </td>
                  <td className="px-2 py-1.5 max-w-[120px]">
                    <p className="truncate text-[11px]">{r.empresa_mantenedora || '—'}</p>
                    {r.empresa_cert_num && <p className="text-[9px] text-slate-400">{r.empresa_cert_num}</p>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {isAdmin && (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(r)}>
                            <Edit className="h-3 w-3 text-slate-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(r)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </>
                      )}
                      <button onClick={() => setExpandedId(expanded ? null : r.id)}>
                        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100/60'}>
                    <td colSpan={12} className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        {r.tipo_gas_anyadido && r.gas_anyadido_kg > 0 && <div><p className="text-slate-400">Tipo gas añadido</p><p className="font-medium capitalize">{r.tipo_gas_anyadido}</p></div>}
                        {r.gwp && <div><p className="text-slate-400">GWP</p><p className="font-medium">{r.gwp}</p></div>}
                        {r.control_fugas_resultado && r.control_fugas_resultado !== 'no_aplica' && <div><p className="text-slate-400">Control fugas</p><p className="font-medium capitalize">{r.control_fugas_resultado}</p></div>}
                        {r.fuga_ubicacion && <div><p className="text-slate-400">Ubicación fuga</p><p className="font-medium text-red-600">{r.fuga_ubicacion}</p></div>}
                        {r.fuga_fecha_reparacion && <div><p className="text-slate-400">Reparación fuga</p><p className="font-medium">{format(new Date(r.fuga_fecha_reparacion), 'dd/MM/yyyy')}</p></div>}
                        {r.cilindro_origen && <div><p className="text-slate-400">Cilindro origen</p><p className="font-medium">{r.cilindro_origen}</p></div>}
                        {r.cilindro_destino && <div><p className="text-slate-400">Cilindro destino</p><p className="font-medium">{r.cilindro_destino}</p></div>}
                        {r.destino_gas_recuperado && <div><p className="text-slate-400">Destino gas</p><p className="font-medium capitalize">{r.destino_gas_recuperado}</p></div>}
                        {r.gestor_residuos && <div><p className="text-slate-400">Gestor residuos</p><p className="font-medium">{r.gestor_residuos} {r.gestor_residuos_num && `(${r.gestor_residuos_num})`}</p></div>}
                        {r.proxima_revision_fecha && <div><p className="text-slate-400">Próxima revisión</p><p className="font-medium text-amber-600">{format(new Date(r.proxima_revision_fecha), 'dd/MM/yyyy')}</p></div>}
                        {r.observaciones && <div className="col-span-full"><p className="text-slate-400">Observaciones</p><p className="font-medium">{r.observaciones}</p></div>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}