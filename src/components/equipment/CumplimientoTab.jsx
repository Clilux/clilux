import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  FileText, Wind, Shield, Droplet, BookOpen, Loader2,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import {
  calcularPlazoControlFugas, proximaFechaControl, semaforoVencimiento,
  SEMAFORO_STYLES, riteRequirements, legionellaRequirements
} from '@/lib/fgas-plazos';
import { gwpDe } from '@/lib/refrigerantes';
import { generarCertificadoFugasPDF } from '@/lib/pdf-certificado-fugas';
import { generarCertificadoRitePDF } from '@/lib/pdf-certificado-rite';
import { generarMemoriaRitePDF } from '@/lib/pdf-memoria-rite';
import { generarRegistroLdPDF } from '@/lib/pdf-registro-ld';

function Semaphoro({ nivel, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${SEMAFORO_STYLES[nivel] || SEMAFORO_STYLES.gris}`}>
      {nivel === 'verde' && <CheckCircle2 className="h-3 w-3" />}
      {nivel === 'ambar' && <Clock className="h-3 w-3" />}
      {nivel === 'rojo' && <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function ComplianceCard({ icon: Icon, iconColor, title, regulation, obligatorio, semaf, children, onGenerate, generating }) {
  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#2F586E' }}>
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-white" />
          <div>
            <h4 className="text-sm font-bold text-white">{title}</h4>
            <p className="text-[10px] text-white/70">{regulation}</p>
          </div>
        </div>
        {!obligatorio && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white">No aplicable</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500">Estado próximo control</span>
          <Semaphoro nivel={semaf.nivel} label={semaf.label} />
        </div>
        {children}
        <Button
          onClick={onGenerate}
          disabled={generating}
          size="sm"
          className="w-full mt-4 bg-[#2F586E] hover:bg-[#244659] text-white">
          {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</> : <><FileText className="h-4 w-4 mr-2" />Generar documento PDF</>}
        </Button>
      </div>
    </Card>
  );
}

export default function CumplimientoTab({ equipment, equipmentId, building, client, companyInfo }) {
  const [genFugas, setGenFugas] = useState(false);
  const [genRite, setGenRite] = useState(false);
  const [genMemoria, setGenMemoria] = useState(false);
  const [genLd, setGenLd] = useState(false);

  const eq = equipment || {};

  // Calcular tCO2eq
  const gwpVal = eq.gwp ?? gwpDe(eq.refrigerant_type);
  const tco2eq = (eq.co2_equivalent_tons != null)
    ? eq.co2_equivalent_tons
    : (gwpVal != null && eq.refrigerant_charge_kg ? (Number(eq.refrigerant_charge_kg) * gwpVal) / 1000 : 0);

  // Último registro F-Gas
  const { data: fgasRegistros = [] } = useQuery({
    queryKey: ['fgas-registros', equipmentId],
    queryFn: () => base44.entities.RegistroFGas.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId && !!eq.refrigerant_type,
  });
  const ultimoFgas = [...fgasRegistros].sort((a, b) => new Date(b.fecha_intervencion) - new Date(a.fecha_intervencion))[0] || null;

  // Último registro L+D
  const { data: ldRegistros = [] } = useQuery({
    queryKey: ['ld-registros', equipmentId],
    queryFn: () => base44.entities.RegistroLD.filter({ equipment_id: equipmentId }),
    enabled: !!equipmentId && (eq.equipment_type === 'adiabatico' || eq.equipment_type === 'produccion_acs' || eq.equipment_type === 'torre_refrigeracion'),
  });
  const ultimoLd = [...ldRegistros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] || null;

  // F-Gas
  const plazoFugas = calcularPlazoControlFugas(tco2eq, eq.has_leak_detection_system, eq.is_hermetically_sealed);
  const semafFugas = semaforoVencimiento(eq.next_leak_check_date);

  // RITE
  const power = Math.max(eq.cooling_power_kw || 0, eq.heating_power_kw || 0);
  const riteReq = riteRequirements(power);
  // Próxima revisión RITE = siguiente revisión pendiente (basada en scheduled revisions first_revision_date como aproximación)
  const semafRite = eq.first_revision_date ? semaforoVencimiento(eq.first_revision_date) : { nivel: 'gris', label: 'Sin plan' };

  // Legionella
  const leg = legionellaRequirements(eq.equipment_type);
  const semafLd = ultimoLd?.proxima_revision_fecha ? semaforoVencimiento(ultimoLd.proxima_revision_fecha) : { nivel: 'gris', label: 'Sin registro' };

  // Memoria RITE — siempre disponible
  const semafMemoria = eq.installation_date ? { nivel: 'verde', label: 'Disponible' } : { nivel: 'gris', label: 'Sin datos' };

  const handleFugas = async () => {
    setGenFugas(true);
    try {
      generarCertificadoFugasPDF({ equipment: eq, building, client, intervention: ultimoFgas, companyInfo });
      toast.success('Certificado de control de fugas generado');
    } catch { toast.error('Error al generar el documento'); }
    finally { setGenFugas(false); }
  };
  const handleRite = async () => {
    setGenRite(true);
    try {
      generarCertificadoRitePDF({ equipment: eq, building, client, companyInfo });
      toast.success('Certificado RITE generado');
    } catch { toast.error('Error al generar el documento'); }
    finally { setGenRite(false); }
  };
  const handleMemoria = async () => {
    setGenMemoria(true);
    try {
      generarMemoriaRitePDF({ equipment: eq, building, client, companyInfo });
      toast.success('Memoria técnica RITE generada');
    } catch { toast.error('Error al generar el documento'); }
    finally { setGenMemoria(false); }
  };
  const handleLd = async () => {
    setGenLd(true);
    try {
      generarRegistroLdPDF({ equipment: eq, building, client, intervention: ultimoLd, companyInfo });
      toast.success('Registro L+D generado');
    } catch { toast.error('Error al generar el documento'); }
    finally { setGenLd(false); }
  };

  const tieneGas = !!eq.refrigerant_type;

  return (
    <div className="space-y-4">
      {/* Resumen ejecutivo */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <Shield className="h-4 w-4 text-[#2F586E] mt-0.5 flex-shrink-0" />
        <span>
          Panel de cumplimiento normativo unificado. Los plazos de control de fugas se calculan según el Art. 5 del
          Reglamento (UE) 2024/573 en función de las tCO₂eq, el sistema de detección de fugas y si el equipo es sellado herméticamente.
          {plazoFugas.obligatorio ? ` Próximo control: ${eq.next_leak_check_date ? format(new Date(eq.next_leak_check_date), 'dd/MM/yyyy', { locale: es }) : '—'} (${plazoFugas.label.toLowerCase()}).` : ' El equipo está por debajo del umbral de control obligatorio.'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* F-Gas */}
        {tieneGas && (
          <ComplianceCard
            icon={Wind} iconColor="text-blue-600"
            title="Control de Fugas F-Gas"
            regulation="Reg. (UE) 2024/573 — Art. 5"
            obligatorio={plazoFugas.obligatorio}
            semaf={semafFugas}
            onGenerate={handleFugas} generating={genFugas}>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between"><span>Refrigerante / GWP</span><span className="font-medium text-slate-800">{eq.refrigerant_type} · {gwpVal ?? '—'}</span></div>
              <div className="flex justify-between"><span>Carga / tCO₂eq</span><span className="font-medium text-slate-800">{eq.refrigerant_charge_kg || 0} kg · {Number(tco2eq).toFixed(3)} tCO₂eq</span></div>
              <div className="flex justify-between"><span>Detector de fugas</span><span className="font-medium text-slate-800">{eq.has_leak_detection_system ? 'Sí (duplica plazo)' : 'No'}</span></div>
              <div className="flex justify-between"><span>Sellado hermético</span><span className="font-medium text-slate-800">{eq.is_hermetically_sealed ? 'Sí (umbral 10 tCO₂eq)' : 'No'}</span></div>
              <div className="flex justify-between"><span>Periodicidad</span><span className="font-semibold text-[#2F586E]">{plazoFugas.label}</span></div>
              <div className="flex justify-between"><span>Próximo control</span><span className="font-medium text-slate-800">{eq.next_leak_check_date ? format(new Date(eq.next_leak_check_date), 'dd/MM/yyyy', { locale: es }) : '—'}</span></div>
            </div>
          </ComplianceCard>
        )}

        {/* RITE */}
        <ComplianceCard
          icon={Shield} iconColor="text-[#2F586E]"
          title="Mantenimiento RITE"
          regulation="IT.3 RITE — RD 1027/2007"
          obligatorio={!!riteReq}
          semaf={semafRite}
          onGenerate={handleRite} generating={genRite}>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>Potencia total</span><span className="font-medium text-slate-800">{power} kW</span></div>
            <div className="flex justify-between"><span>Categoría</span><span className="font-medium text-slate-800">{riteReq?.category || '—'}</span></div>
            <div className="flex justify-between"><span>Mantenimiento</span><span className="font-medium text-slate-800">{riteReq?.maintenance || '—'}</span></div>
            <div className="flex justify-between"><span>Frecuencia</span><span className="font-medium text-slate-800">{riteReq?.frequency || '—'}</span></div>
          </div>
        </ComplianceCard>

        {/* Legionella L+D */}
        {leg.obligatorio && (
          <ComplianceCard
            icon={Droplet} iconColor="text-cyan-600"
            title="Limpieza y Desinfección"
            regulation="RD 865/2003 / RD 487/2022 — Legionella"
            obligatorio={leg.obligatorio}
            semaf={semafLd}
            onGenerate={handleLd} generating={genLd}>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between"><span>Tipo equipo</span><span className="font-medium text-slate-800">{eq.equipment_type}</span></div>
              <div className="flex justify-between"><span>Frecuencia</span><span className="font-medium text-slate-800">{leg.frequency}</span></div>
              <div className="flex justify-between"><span>Última L+D</span><span className="font-medium text-slate-800">{ultimoLd?.fecha ? format(new Date(ultimoLd.fecha), 'dd/MM/yyyy', { locale: es }) : 'Sin registros'}</span></div>
              <div className="flex justify-between"><span>Próxima L+D</span><span className="font-medium text-slate-800">{ultimoLd?.proxima_revision_fecha ? format(new Date(ultimoLd.proxima_revision_fecha), 'dd/MM/yyyy', { locale: es }) : '—'}</span></div>
            </div>
          </ComplianceCard>
        )}

        {/* Memoria RITE */}
        <ComplianceCard
          icon={BookOpen} iconColor="text-[#2F586E]"
          title="Memoria Técnica RITE"
          regulation="IT.1 RITE — RD 1027/2007"
          obligatorio={true}
          semaf={semafMemoria}
          onGenerate={handleMemoria} generating={genMemoria}>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>Equipo</span><span className="font-medium text-slate-800">{eq.reference_name || `${eq.brand || ''} ${eq.model || ''}`.trim() || '—'}</span></div>
            <div className="flex justify-between"><span>Instalación</span><span className="font-medium text-slate-800">{eq.installation_date ? format(new Date(eq.installation_date), 'dd/MM/yyyy', { locale: es }) : '—'}</span></div>
            <div className="flex justify-between"><span>Documento</span><span className="font-medium text-slate-800">Memoria técnica completa</span></div>
          </div>
        </ComplianceCard>
      </div>
    </div>
  );
}