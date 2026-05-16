import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STATUS = {
  ok: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Correcto' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Revisar' },
  bad: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Crítico' },
};

const Item = ({ label, value, unit, status, mensaje, recomendacion }) => {
  const s = STATUS[status] || STATUS.ok;
  const Icon = s.icon;
  return (
    <div className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${s.color} flex-shrink-0`} />
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.bg} ${s.color} border ${s.border}`}>{s.label}</span>
          </div>
          <p className="text-xs text-slate-600">{mensaje}</p>
          {recomendacion && status !== 'ok' && (
            <p className="text-xs font-medium text-slate-700 mt-1">→ {recomendacion}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-xl font-bold ${s.color}`}>{value}</span>
          <span className="text-xs text-slate-500 ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default function DiagnosticoCOP({ results }) {
  if (!results) return null;

  const recap = parseFloat(results.recalentamiento);
  const subenfr = parseFloat(results.subenfriamiento);
  const copFrio = parseFloat(results.copFrio);
  const copCalor = parseFloat(results.copCalor);
  const tDesc = parseFloat(results.inputs?.temp_descarga || 0);
  const tCond = parseFloat(results.inputs?.temp_condensacion || 0);
  const tEvap = parseFloat(results.inputs?.temp_evaporacion || 0);
  const tAsp = parseFloat(results.inputs?.temp_aspiracion || 0);

  // Ratio de presiones
  const pAlta = parseFloat(results.inputs?.presion_alta || 0);
  const pBaja = parseFloat(results.inputs?.presion_baja || 0);
  const ratioPres = pAlta > 0 && pBaja > 0 ? ((pAlta + 1.013) / (pBaja + 1.013)) : 0;

  // Diferencia condensación-evaporación (spread térmico)
  const spread = tCond - tEvap;

  // Temperatura descarga vs condensación
  const sobrecalDescarga = tDesc - tCond;

  const checks = [
    {
      label: 'Recalentamiento',
      value: recap,
      unit: '°C',
      status: recap >= 4 && recap <= 12 ? 'ok' : recap < 4 ? 'bad' : recap <= 20 ? 'warn' : 'bad',
      mensaje: recap < 4
        ? 'Recalentamiento insuficiente: riesgo de retorno de líquido al compresor.'
        : recap > 20
          ? 'Recalentamiento excesivo: pérdida de eficiencia volumétrica.'
          : recap > 12
            ? 'Recalentamiento algo elevado, posible restricción en expansión o carga baja.'
            : 'Recalentamiento en rango óptimo (4-12°C).',
      recomendacion: recap < 4
        ? 'Ajustar válvula de expansión (abrir ligeramente) o comprobar carga de refrigerante.'
        : recap > 20
          ? 'Cerrar válvula de expansión o revisar carga de refrigerante (posible falta).'
          : 'Ajustar la válvula de expansión para reducir recalentamiento.',
    },
    {
      label: 'Subenfriamiento',
      value: subenfr,
      unit: '°C',
      status: subenfr >= 3 && subenfr <= 10 ? 'ok' : subenfr < 0 ? 'bad' : subenfr < 3 ? 'warn' : subenfr <= 15 ? 'warn' : 'bad',
      mensaje: subenfr < 0
        ? 'Subenfriamiento negativo: posible presencia de vapor en la línea de líquido (falta de carga).'
        : subenfr < 3
          ? 'Subenfriamiento bajo: riesgo de flash-gas antes de la expansión.'
          : subenfr > 15
            ? 'Subenfriamiento excesivo: posible sobrecarga de refrigerante o problema en condensador.'
            : 'Subenfriamiento en rango óptimo (3-10°C).',
      recomendacion: subenfr < 3
        ? 'Revisar carga de refrigerante o mejorar la disipación del condensador.'
        : 'Revisar posible exceso de carga de refrigerante.',
    },
    {
      label: 'COP Frío',
      value: copFrio.toFixed(2),
      unit: '',
      status: copFrio >= 3.5 ? 'ok' : copFrio >= 2.5 ? 'warn' : 'bad',
      mensaje: copFrio >= 3.5
        ? 'Rendimiento frigorífico bueno. El sistema opera eficientemente.'
        : copFrio >= 2.5
          ? 'Rendimiento frigorífico aceptable pero mejorable.'
          : 'Rendimiento frigorífico bajo. Investigar causas de pérdida de eficiencia.',
      recomendacion: copFrio < 3.5
        ? 'Optimizar recalentamiento, subenfriamiento y limpiar intercambiadores.'
        : '',
    },
    {
      label: 'COP Calor',
      value: copCalor.toFixed(2),
      unit: '',
      status: copCalor >= 4.0 ? 'ok' : copCalor >= 3.0 ? 'warn' : 'bad',
      mensaje: copCalor >= 4.0
        ? 'Rendimiento en modo calefacción óptimo.'
        : copCalor >= 3.0
          ? 'Rendimiento en calefacción aceptable.'
          : 'Rendimiento en calefacción bajo.',
      recomendacion: copCalor < 4.0
        ? 'Revisar limpieza del condensador y temperaturas de trabajo.'
        : '',
    },
    {
      label: 'Ratio de Compresión',
      value: ratioPres.toFixed(2),
      unit: '',
      status: ratioPres >= 2 && ratioPres <= 6 ? 'ok' : ratioPres < 2 || ratioPres > 8 ? 'bad' : 'warn',
      mensaje: ratioPres > 8
        ? 'Ratio de compresión muy elevado: exceso de trabajo del compresor, riesgo de averías.'
        : ratioPres > 6
          ? 'Ratio de compresión algo alto: temperatura de descarga elevada probable.'
          : ratioPres < 2
            ? 'Ratio de compresión muy bajo: posible cortocircuito de presiones o exceso de carga.'
            : `Ratio de compresión normal (P_alta/P_baja = ${ratioPres.toFixed(2)}).`,
      recomendacion: ratioPres > 6
        ? 'Mejorar ventilación del condensador, revisar limpieza de intercambiadores.'
        : '',
    },
    {
      label: 'Spread Térmico (T_cond - T_evap)',
      value: spread.toFixed(1),
      unit: '°C',
      status: spread >= 30 && spread <= 55 ? 'ok' : spread > 60 ? 'bad' : 'warn',
      mensaje: spread > 60
        ? 'Diferencia de temperaturas excesiva: el sistema trabaja en condiciones extremas.'
        : spread > 55
          ? 'Diferencia de temperaturas alta: reducir si es posible.'
          : spread < 30
            ? 'Diferencia de temperaturas baja: verificar que las condiciones son correctas.'
            : 'Diferencia térmica entre circuitos correcta.',
      recomendacion: spread > 55 ? 'Mejorar disipación del condensador o aumentar temperatura de evaporación.' : '',
    },
    ...(tDesc > 0 ? [{
      label: 'T. Descarga Compresor',
      value: tDesc,
      unit: '°C',
      status: tDesc <= 90 ? 'ok' : tDesc <= 110 ? 'warn' : 'bad',
      mensaje: tDesc > 110
        ? 'Temperatura de descarga crítica: riesgo de degradación del aceite y fallo del compresor.'
        : tDesc > 90
          ? 'Temperatura de descarga elevada: vigilar de cerca.'
          : 'Temperatura de descarga correcta (<90°C).',
      recomendacion: tDesc > 90
        ? 'Reducir la temperatura de condensación, mejorar ventilación o revisar el recalentamiento.'
        : '',
    }] : []),
  ];

  const numOk = checks.filter(c => c.status === 'ok').length;
  const numWarn = checks.filter(c => c.status === 'warn').length;
  const numBad = checks.filter(c => c.status === 'bad').length;

  const scoreColor = numBad > 0 ? 'text-red-600' : numWarn > 1 ? 'text-amber-600' : 'text-green-600';
  const scoreLabel = numBad > 0 ? 'Sistema con problemas críticos' : numWarn > 1 ? 'Sistema mejorable' : 'Sistema en buen estado';

  return (
    <div className="space-y-3">
      {/* Resumen general */}
      <div className="flex gap-3 p-3 bg-slate-50 rounded-lg border text-sm">
        <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> <span className="font-semibold">{numOk}</span> correctos</div>
        <div className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> <span className="font-semibold">{numWarn}</span> a revisar</div>
        <div className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> <span className="font-semibold">{numBad}</span> críticos</div>
        <div className={`ml-auto font-semibold ${scoreColor}`}>{scoreLabel}</div>
      </div>

      {checks.map((c, i) => (
        <Item key={i} {...c} />
      ))}
    </div>
  );
}