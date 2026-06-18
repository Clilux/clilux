import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { format, addDays, isBefore } from 'date-fns';
import { AlertTriangle, Wind, Shield, Wrench, ChevronRight } from 'lucide-react';

// GWP table (subset)
const GWP_TABLE = {
  'R32': 675, 'R134a': 1430, 'R404A': 3922, 'R407C': 1774, 'R407F': 1825,
  'R407H': 1495, 'R410A': 2088, 'R448A': 1387, 'R449A': 1397, 'R452B': 676,
  'R454B': 466, 'R507A': 3985, 'R513A': 631, 'R290': 0, 'R744': 1, 'R717': 0,
  'R1234yf': 0.501, 'R1234ze': 1.37, 'R23': 14800, 'R125': 3500, 'R143a': 4470,
};

function getLeakCheckMonths(tco2eq) {
  if (tco2eq >= 500) return 3;
  if (tco2eq >= 50) return 6;
  if (tco2eq >= 5) return 12;
  return null;
}

export default function FGasAlertas({ equipment = [], isAdmin = false }) {
  const alertDays = 30;
  const today = new Date();
  const alertDate = addDays(today, alertDays);

  // Cargar registros F-Gas recientes y registros de instalador
  const { data: fgasRegistros = [] } = useQuery({
    queryKey: ['fgas-all-alertas'],
    queryFn: () => base44.entities.RegistroFGas.list('-fecha_intervencion', 200),
    enabled: isAdmin,
    staleTime: 60000,
  });

  const { data: libroRegistros = [] } = useQuery({
    queryKey: ['libro-all-alertas'],
    queryFn: () => base44.entities.RegistroInstalador.list('-fecha_intervencion', 200),
    enabled: isAdmin,
    staleTime: 60000,
  });

  if (!isAdmin) return null;

  // Alertas de control de fugas (F-Gas): próxima revisión en ≤ 30 días
  const alertasFugas = [];
  fgasRegistros.forEach(r => {
    if (!r.proxima_revision_fecha) return;
    const fecha = new Date(r.proxima_revision_fecha);
    if (isBefore(fecha, alertDate)) {
      const eq = equipment.find(e => e.id === r.equipment_id);
      if (eq) {
        alertasFugas.push({
          type: 'fgas',
          equipmentId: r.equipment_id,
          equipmentName: eq.reference_name || `${eq.brand} ${eq.model}`,
          fecha,
          label: 'Control de Fugas F-Gas',
          vencida: isBefore(fecha, today),
        });
      }
    }
  });

  // Alertas de equipos con F-Gas pero sin ningún registro aún (próxima = fecha actual si tco2eq >= 5)
  equipment.forEach(eq => {
    if (!eq.refrigerant_type || !eq.refrigerant_charge_kg) return;
    const gwp = GWP_TABLE[eq.refrigerant_type] ?? eq.gwp ?? 0;
    const tco2 = (eq.refrigerant_charge_kg * gwp) / 1000;
    const months = getLeakCheckMonths(tco2);
    if (!months) return;
    // Si el equipo tiene next_leak_check_date configuro alerta
    if (eq.next_leak_check_date) return; // ya gestionado por registros F-Gas
    // Sin registros: alertar si tco2 >= 5
    if (tco2 >= 5) {
      const alreadyAlerting = alertasFugas.some(a => a.equipmentId === eq.id);
      if (!alreadyAlerting) {
        alertasFugas.push({
          type: 'fgas_sinregistro',
          equipmentId: eq.id,
          equipmentName: eq.reference_name || `${eq.brand} ${eq.model}`,
          fecha: today,
          label: 'Sin registro F-Gas (obligatorio)',
          vencida: true,
        });
      }
    }
  });

  // Alertas de OCA y frigorista (Libro de Registro)
  const alertasOCA = [];
  const alertasFrigorista = [];
  libroRegistros.forEach(r => {
    const eq = equipment.find(e => e.id === r.equipment_id);
    if (!eq) return;
    if (r.proxima_inspeccion_oca_fecha) {
      const fecha = new Date(r.proxima_inspeccion_oca_fecha);
      if (isBefore(fecha, alertDate)) {
        alertasOCA.push({ equipmentId: r.equipment_id, equipmentName: eq.reference_name || `${eq.brand} ${eq.model}`, fecha, vencida: isBefore(fecha, today) });
      }
    }
    if (r.proxima_revision_frigorista_fecha) {
      const fecha = new Date(r.proxima_revision_frigorista_fecha);
      if (isBefore(fecha, alertDate)) {
        alertasFrigorista.push({ equipmentId: r.equipment_id, equipmentName: eq.reference_name || `${eq.brand} ${eq.model}`, fecha, vencida: isBefore(fecha, today) });
      }
    }
  });

  // Alertas de fuga no subsanada
  const alertasFugasNoSubsanadas = libroRegistros.filter(r => {
    if (r.control_fugas_resultado !== 'no_pasa' || r.fuga_subsanada) return false;
    if (!r.fuga_plazo_subsanacion) return false;
    const eq = equipment.find(e => e.id === r.equipment_id);
    return !!eq;
  }).map(r => {
    const eq = equipment.find(e => e.id === r.equipment_id);
    return { equipmentId: r.equipment_id, equipmentName: eq.reference_name || `${eq.brand} ${eq.model}`, fecha: new Date(r.fuga_plazo_subsanacion), vencida: isBefore(new Date(r.fuga_plazo_subsanacion), today) };
  });

  const total = alertasFugas.length + alertasOCA.length + alertasFrigorista.length + alertasFugasNoSubsanadas.length;
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-slate-800 font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Alertas Normativas F-Gas / RSIF
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{total}</span>
      </h2>

      {alertasFugasNoSubsanadas.map((a, i) => (
        <Link key={`ns-${i}`} to={createPageUrl(`EquipmentDetail?id=${a.equipmentId}`)}>
          <Card className="bg-red-50 border-red-300 p-3 hover:bg-red-100 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-slate-800 text-sm font-bold">{a.equipmentName}</p>
                  <p className="text-red-700 text-xs">⛔ Fuga sin subsanar · Plazo límite: {format(a.fecha, 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </Card>
        </Link>
      ))}

      {alertasFugas.slice(0, 5).map((a, i) => (
        <Link key={`fg-${i}`} to={createPageUrl(`EquipmentDetail?id=${a.equipmentId}`)}>
          <Card className={`p-3 hover:opacity-90 transition-colors cursor-pointer ${a.vencida ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wind className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-slate-800 text-sm font-medium">{a.equipmentName}</p>
                  <p className="text-slate-600 text-xs">{a.label} · {a.vencida ? '⚠ Vencido' : `Vence ${format(a.fecha, 'dd/MM/yyyy')}`}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </Card>
        </Link>
      ))}

      {alertasOCA.slice(0, 3).map((a, i) => (
        <Link key={`oca-${i}`} to={createPageUrl(`EquipmentDetail?id=${a.equipmentId}`)}>
          <Card className={`p-3 hover:opacity-90 transition-colors cursor-pointer ${a.vencida ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-slate-800 text-sm font-medium">{a.equipmentName}</p>
                  <p className="text-slate-600 text-xs">Inspección OCA · {a.vencida ? '⚠ Vencida' : `Vence ${format(a.fecha, 'dd/MM/yyyy')}`}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </Card>
        </Link>
      ))}

      {alertasFrigorista.slice(0, 3).map((a, i) => (
        <Link key={`fr-${i}`} to={createPageUrl(`EquipmentDetail?id=${a.equipmentId}`)}>
          <Card className={`p-3 hover:opacity-90 transition-colors cursor-pointer ${a.vencida ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-slate-800 text-sm font-medium">{a.equipmentName}</p>
                  <p className="text-slate-600 text-xs">Revisión Frigorista · {a.vencida ? '⚠ Vencida' : `Vence ${format(a.fecha, 'dd/MM/yyyy')}`}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}