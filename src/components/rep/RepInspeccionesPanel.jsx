import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, AlertTriangle, FileText, Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import DeleteConfirmDialog from '@/components/ui/DeleteConfirmDialog';
import RepInspeccionForm from '@/components/rep/RepInspeccionForm';
import { useRepInspecciones } from '@/hooks/useRepInspecciones';
import {
  sumaPsxV, requiereProyectoTecnico, bloqueoEip1, etiquetaTipoInspeccion, etiquetaResultado,
  MENSAJE_PROYECTO, MENSAJE_EIP1, UMBRAL_REP,
} from '@/lib/rep';

const resultadoColor = {
  favorable: 'bg-emerald-100 text-emerald-800',
  condicionado: 'bg-amber-100 text-amber-800',
  desfavorable: 'bg-red-100 text-red-800',
};

/**
 * Panel REP del edificio: cómputo PS x V de la instalación, aviso de proyecto técnico
 * y registro de inspecciones de los equipos a presión.
 */
export default function RepInspeccionesPanel({ building, equipment = [], client, registradoPor }) {
  const { inspecciones, company, guardar, borrar, abrirActa } = useRepInspecciones(building?.id, client);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [borrarId, setBorrarId] = useState(null);

  const equiposPresion = equipment.filter((e) => e.es_equipo_presion);
  const totalPsxV = sumaPsxV(equipment);
  const exigeProyecto = requiereProyectoTecnico(totalPsxV);
  const habilitacion = company?.habilitacion_rep || null;
  const bloqueo = bloqueoEip1(totalPsxV, habilitacion);

  const abrirNueva = () => { setEditing(null); setFormOpen(true); };
  const abrirEditar = (insp) => { setEditing(insp); setFormOpen(true); };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100">
            <Gauge className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Equipos a Presión — REP</h3>
            <p className="text-xs text-slate-500">Reglamento de Equipos a Presión (RD 809/2021)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${exigeProyecto ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            Σ PS × V: {totalPsxV.toLocaleString('es-ES')}
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
            Habilitación: <strong>{habilitacion || 'Sin definir'}</strong>
          </div>
        </div>
      </div>

      {exigeProyecto && (
        <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>{MENSAJE_PROYECTO}.</strong> El sumatorio PS × V de la instalación alcanza {totalPsxV.toLocaleString('es-ES')} (umbral {UMBRAL_REP.toLocaleString('es-ES')}).</span>
        </div>
      )}

      {bloqueo && (
        <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-800">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>{MENSAJE_EIP1}.</strong> La emisión de certificados de instalación está bloqueada.</span>
        </div>
      )}

      {equiposPresion.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">
          Ningún equipo de este edificio está marcado como equipo a presión. Actívalo en la ficha del equipo
          («Equipos a Presión — REP») para incluirlo en el cómputo de la instalación.
        </p>
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Equipo</th>
                <th className="py-2 pr-3 font-medium">PS (bar)</th>
                <th className="py-2 pr-3 font-medium">V (l)</th>
                <th className="py-2 pr-3 font-medium">PS × V</th>
                <th className="py-2 pr-3 font-medium">Nº Registro Industria</th>
                <th className="py-2 pr-3 font-medium">Últ. inspecciones A / B / C</th>
              </tr>
            </thead>
            <tbody>
              {equiposPresion.map((eq) => (
                <tr key={eq.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-700 font-medium">{eq.reference_name}</td>
                  <td className="py-2 pr-3 text-slate-600">{eq.ps_presion_maxima ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{eq.v_volumen ?? '—'}</td>
                  <td className="py-2 pr-3">
                    <span className={`font-semibold ${Number(eq.ps_x_v) >= UMBRAL_REP ? 'text-amber-700' : 'text-slate-700'}`}>
                      {eq.ps_x_v != null ? Number(eq.ps_x_v).toLocaleString('es-ES') : '—'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{eq.numero_registro_industria || '—'}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500">
                    {[eq.fecha_ultima_inspeccion_a, eq.fecha_ultima_inspeccion_b, eq.fecha_ultima_inspeccion_c]
                      .map((f) => (f ? new Date(f).toLocaleDateString('es-ES') : '—'))
                      .join(' / ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">Historial de inspecciones</h4>
        <Button
          size="sm"
          onClick={abrirNueva}
          disabled={equiposPresion.length === 0}
          className="bg-blue-700 hover:bg-blue-800 text-white">
          <Plus className="h-4 w-4 mr-2" /> Registrar inspección
        </Button>
      </div>

      {inspecciones.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">Todavía no hay inspecciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Equipo</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Inspector</th>
                <th className="py-2 pr-3 font-medium">Resultado</th>
                <th className="py-2 pr-3 font-medium">OCA</th>
                <th className="py-2 pr-3 font-medium">Acta</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map((insp) => (
                <tr key={insp.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-700 font-medium">
                    {insp.equipment_name || equipment.find((e) => e.id === insp.equipment_id)?.reference_name || '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{etiquetaTipoInspeccion(insp.tipo_inspeccion)}</td>
                  <td className="py-2 pr-3 text-slate-600">
                    {insp.fecha_inspeccion ? new Date(insp.fecha_inspeccion).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{insp.tecnico_inspector}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${resultadoColor[insp.resultado] || 'bg-slate-100 text-slate-700'}`}>
                      {etiquetaResultado(insp.resultado)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{insp.oca || '—'}</td>
                  <td className="py-2 pr-3">
                    {insp.acta_url ? (
                      <button onClick={() => abrirActa(insp)} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs">
                        <FileText className="h-3.5 w-3.5" /> Ver acta
                      </button>
                    ) : <span className="text-xs text-slate-400">Sin acta</span>}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => abrirEditar(insp)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setBorrarId(insp.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inspecciones.some((i) => i.requiere_oca && !i.oca) && (
        <p className="mt-3 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" /> Hay inspecciones que exigen OCA y no lo tienen registrado.
        </p>
      )}

      <RepInspeccionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipos={equiposPresion}
        inspeccion={editing}
        buildingId={building?.id}
        clientId={building?.client_id}
        companyId={company?.company_id}
        registradoPor={registradoPor}
        onSave={guardar} />

      <DeleteConfirmDialog
        open={!!borrarId}
        onOpenChange={(v) => !v && setBorrarId(null)}
        title="Eliminar inspección"
        description="Se eliminará el registro de esta inspección REP."
        onConfirm={async () => { await borrar(borrarId); setBorrarId(null); }} />
    </Card>
  );
}