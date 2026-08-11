import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, FileText, MapPin, Clock } from 'lucide-react';

// Resumen de cumplimiento normativo del registro de jornada según la legislación
// española vigente:
//   - Art. 34 y 35 del Estatuto de los Trabajadores (ET)
//   - RD-ley 8/2019 (registro diario obligatorio de jornada)
//   - RD-ley 5/2023 (transparencia en las condiciones de trabajo; uso de
//     geolocalización respetando la dignidad del trabajador y solo durante
//     la jornada)
//   - Ley 10/2021 de trabajo a distancia (registro del momento de prestación)
//   - Criterio ITSS: conservación de los registros durante 4 años
//   - Derecho del trabajador a recibir copia mensual de su registro (Art. 34.9 ET)
export default function ComplianceBanner({ jornadaIniciada }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-700">Registro de jornada conforme a normativa</p>
          <p className="text-xs text-slate-500">
            {jornadaIniciada
              ? 'Jornada registrada hoy · cumple RD-ley 8/2019 y RD-ley 5/2023'
              : 'RD-ley 8/2019 · RD-ley 5/2023 · Conservación 4 años'}
          </p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Registro diario obligatorio.</span> Se
              anota el inicio y fin de la jornada (Art. 34.9 ET · RD-ley 8/2019). Las modificaciones
              quedan registradas en el historial con motivo y autor, garantizando la inalterabilidad
              del registro.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Geolocalización únicamente en jornada.</span>
              El GPS solo se usa para verificar el cumplimiento de la jornada, durante el horario de
              trabajo y respetando la dignidad de la persona trabajadora (RD-ley 5/2023). No se
              rastrea fuera del fichaje.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Copia mensual y conservación.</span>{" "}
              Puedes descargar tu copia mensual del registro (Art. 34.9 ET). Los registros se
              conservan <span className="font-semibold">4 años</span> (criterio ITSS).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}