import React, { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Scatter, ResponsiveContainer, Label
} from 'recharts';

// Datos aproximados de la curva de saturación (líquido saturado + vapor saturado) para cada refrigerante
// Formato: { h: entalpía kJ/kg, p: presión absoluta bar }
const SATURATION_CURVES = {
  R410A: {
    liquido: [
      { h: 150, p: 2.0 }, { h: 168, p: 3.73 }, { h: 185, p: 5.05 }, { h: 200, p: 6.7 },
      { h: 220, p: 9.54 }, { h: 238, p: 12.7 }, { h: 256, p: 16.65 }, { h: 273, p: 21.45 },
      { h: 290, p: 27.2 }, { h: 307, p: 34.05 }, { h: 325, p: 42.15 }
    ],
    vapor: [
      { h: 430, p: 2.0 }, { h: 425, p: 3.73 }, { h: 422, p: 5.05 }, { h: 418, p: 6.7 },
      { h: 413, p: 9.54 }, { h: 407, p: 12.7 }, { h: 400, p: 16.65 }, { h: 392, p: 21.45 },
      { h: 383, p: 27.2 }, { h: 372, p: 34.05 }, { h: 360, p: 42.15 }
    ]
  },
  R32: {
    liquido: [
      { h: 130, p: 2.0 }, { h: 153, p: 4.77 }, { h: 175, p: 6.82 }, { h: 198, p: 9.48 },
      { h: 220, p: 12.85 }, { h: 244, p: 17.05 }, { h: 270, p: 22.2 }, { h: 298, p: 28.45 },
      { h: 328, p: 35.95 }, { h: 362, p: 44.85 }
    ],
    vapor: [
      { h: 530, p: 2.0 }, { h: 525, p: 4.77 }, { h: 520, p: 6.82 }, { h: 513, p: 9.48 },
      { h: 506, p: 12.85 }, { h: 497, p: 17.05 }, { h: 486, p: 22.2 }, { h: 473, p: 28.45 },
      { h: 458, p: 35.95 }, { h: 440, p: 44.85 }
    ]
  },
  R134A: {
    liquido: [
      { h: 145, p: 0.5 }, { h: 165, p: 0.84 }, { h: 185, p: 1.32 }, { h: 205, p: 2.0 },
      { h: 225, p: 2.93 }, { h: 246, p: 4.15 }, { h: 267, p: 5.72 }, { h: 290, p: 7.72 },
      { h: 313, p: 10.24 }, { h: 337, p: 13.36 }, { h: 363, p: 17.18 }
    ],
    vapor: [
      { h: 430, p: 0.5 }, { h: 428, p: 0.84 }, { h: 425, p: 1.32 }, { h: 421, p: 2.0 },
      { h: 416, p: 2.93 }, { h: 410, p: 4.15 }, { h: 403, p: 5.72 }, { h: 395, p: 7.72 },
      { h: 385, p: 10.24 }, { h: 373, p: 13.36 }, { h: 358, p: 17.18 }
    ]
  },
  R404A: {
    liquido: [
      { h: 155, p: 2.0 }, { h: 170, p: 3.73 }, { h: 186, p: 5.32 }, { h: 204, p: 7.38 },
      { h: 222, p: 10.02 }, { h: 241, p: 13.35 }, { h: 261, p: 17.5 }, { h: 283, p: 22.6 },
      { h: 307, p: 28.8 }, { h: 332, p: 36.2 }
    ],
    vapor: [
      { h: 420, p: 2.0 }, { h: 415, p: 3.73 }, { h: 410, p: 5.32 }, { h: 404, p: 7.38 },
      { h: 397, p: 10.02 }, { h: 389, p: 13.35 }, { h: 380, p: 17.5 }, { h: 369, p: 22.6 },
      { h: 357, p: 28.8 }, { h: 342, p: 36.2 }
    ]
  },
  R407C: {
    liquido: [
      { h: 150, p: 2.0 }, { h: 168, p: 3.5 }, { h: 185, p: 5.0 }, { h: 202, p: 6.95 },
      { h: 220, p: 9.45 }, { h: 240, p: 12.6 }, { h: 260, p: 16.5 }, { h: 281, p: 21.3 },
      { h: 303, p: 27.1 }, { h: 328, p: 34.0 }
    ],
    vapor: [
      { h: 435, p: 2.0 }, { h: 430, p: 3.5 }, { h: 426, p: 5.0 }, { h: 420, p: 6.95 },
      { h: 414, p: 9.45 }, { h: 406, p: 12.6 }, { h: 397, p: 16.5 }, { h: 387, p: 21.3 },
      { h: 375, p: 27.1 }, { h: 361, p: 34.0 }
    ]
  },
  R22: {
    liquido: [
      { h: 150, p: 1.0 }, { h: 165, p: 2.36 }, { h: 181, p: 3.45 }, { h: 196, p: 4.95 },
      { h: 212, p: 6.95 }, { h: 228, p: 9.55 }, { h: 245, p: 12.85 }, { h: 262, p: 16.95 },
      { h: 280, p: 21.95 }, { h: 299, p: 27.95 }, { h: 319, p: 35.15 }
    ],
    vapor: [
      { h: 410, p: 1.0 }, { h: 408, p: 2.36 }, { h: 406, p: 3.45 }, { h: 403, p: 4.95 },
      { h: 399, p: 6.95 }, { h: 394, p: 9.55 }, { h: 388, p: 12.85 }, { h: 381, p: 16.95 },
      { h: 372, p: 21.95 }, { h: 362, p: 27.95 }, { h: 349, p: 35.15 }
    ]
  }
};

const CustomDot = ({ cx, cy, payload }) => {
  if (!payload?.label) return null;
  const colors = { h1: '#3b82f6', h2: '#ef4444', h3: '#f59e0b', h4: '#10b981' };
  const color = colors[payload.label] || '#6366f1';
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} stroke="white" strokeWidth={2} />
      <text x={cx + 12} y={cy - 8} fontSize={11} fontWeight="bold" fill={color}>{payload.label.toUpperCase()}</text>
    </g>
  );
};

export default function MollierDiagram({ results, refrigerante, pBaja, pAlta }) {
  const curves = SATURATION_CURVES[refrigerante] || SATURATION_CURVES.R410A;

  const points = useMemo(() => {
    if (!results) return [];
    return [
      { h: parseFloat(results.h1), p: parseFloat(pBaja) + 1.013, label: 'h1' },
      { h: parseFloat(results.h2), p: parseFloat(pAlta) + 1.013, label: 'h2' },
      { h: parseFloat(results.h3), p: parseFloat(pAlta) + 1.013, label: 'h3' },
      { h: parseFloat(results.h4), p: parseFloat(pBaja) + 1.013, label: 'h4' },
    ];
  }, [results, pBaja, pAlta]);

  // Ciclo como líneas entre puntos
  const cicloData = useMemo(() => {
    if (points.length < 4) return [];
    const [p1, p2, p3, p4] = points;
    return [
      // 4→1 Evaporación (presión baja)
      { h: p4.h, p: p4.p, seg: 'evap' },
      { h: p1.h, p: p1.p, seg: 'evap' },
      // 1→2 Compresión (vertical aprox)
      { h: p1.h, p: p1.p, seg: 'comp' },
      { h: p2.h, p: p2.p, seg: 'comp' },
      // 2→3 Condensación (presión alta)
      { h: p2.h, p: p2.p, seg: 'cond' },
      { h: p3.h, p: p3.p, seg: 'cond' },
      // 3→4 Expansión
      { h: p3.h, p: p3.p, seg: 'exp' },
      { h: p4.h, p: p4.p, seg: 'exp' },
    ];
  }, [points]);

  const allHValues = [...curves.liquido.map(d => d.h), ...curves.vapor.map(d => d.h), ...points.map(p => p.h)];
  const allPValues = [...curves.liquido.map(d => d.p), ...curves.vapor.map(d => d.p), ...points.map(p => p.p)];
  const hMin = Math.max(100, Math.min(...allHValues) - 20);
  const hMax = Math.min(600, Math.max(...allHValues) + 30);
  const pMin = Math.max(0.5, Math.min(...allPValues) - 1);
  const pMax = Math.min(60, Math.max(...allPValues) + 5);

  return (
    <div className="w-full">
      <p className="text-xs text-slate-500 mb-2 text-center">
        Diagrama P-h aproximado — {refrigerante} | Eje X: Entalpía (kJ/kg) · Eje Y: Presión absoluta (bar)
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="h"
            type="number"
            domain={[hMin, hMax]}
            tickCount={8}
            label={{ value: 'Entalpía h (kJ/kg)', position: 'insideBottom', offset: -10, fontSize: 12 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            dataKey="p"
            type="number"
            domain={[pMin, pMax]}
            tickCount={7}
            label={{ value: 'Presión (bar abs)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12 }}
            tick={{ fontSize: 10 }}
          />

          {/* Curva líquido saturado */}
          <Line
            data={curves.liquido}
            dataKey="p"
            type="monotone"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Líquido sat."
          />
          {/* Curva vapor saturado */}
          <Line
            data={curves.vapor}
            dataKey="p"
            type="monotone"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Vapor sat."
          />

          {/* Ciclo frigorífico */}
          {cicloData.length > 0 && [
            <Line key="evap" data={cicloData.filter(d => d.seg === 'evap')} dataKey="p" type="linear" stroke="#10b981" strokeWidth={2.5} dot={false} />,
            <Line key="comp" data={cicloData.filter(d => d.seg === 'comp')} dataKey="p" type="linear" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="6 3" dot={false} />,
            <Line key="cond" data={cicloData.filter(d => d.seg === 'cond')} dataKey="p" type="linear" stroke="#f59e0b" strokeWidth={2.5} dot={false} />,
            <Line key="exp" data={cicloData.filter(d => d.seg === 'exp')} dataKey="p" type="linear" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="4 2" dot={false} />,
          ]}

          {/* Líneas de referencia de presiones */}
          {points.length > 0 && (
            <>
              <ReferenceLine y={parseFloat(pBaja) + 1.013} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={parseFloat(pAlta) + 1.013} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
            </>
          )}

          {/* Puntos del ciclo */}
          <Scatter data={points} dataKey="p" shape={<CustomDot />} name="Puntos ciclo" />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow">
                  {d?.label && <p className="font-bold text-blue-700">{d.label.toUpperCase()}</p>}
                  <p>h = {d?.h?.toFixed(1)} kJ/kg</p>
                  <p>P = {d?.p?.toFixed(2)} bar abs</p>
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 justify-center mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> Curva saturación</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-green-500 inline-block" /> Evaporación (4→1)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-500 inline-block border-dashed" /> Compresión (1→2)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-500 inline-block" /> Condensación (2→3)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-500 inline-block" /> Expansión (3→4)</span>
      </div>
    </div>
  );
}