import React, { useRef, useState } from 'react';
import { ICONOS, tamanoDe } from '@/lib/scada';

/**
 * Lienzo de un panel SCADA: imagen de fondo + elementos colocados por
 * coordenadas en porcentaje. En modo edición los elementos se arrastran.
 */
export default function ScadaCanvas({ scada, editable = false, selectedId, onSelect, onMove, onDoubleClick }) {
  const ref = useRef(null);
  const [ratio, setRatio] = useState('16 / 10');
  const elementos = scada?.elementos || [];

  const startDrag = (e, el) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.(el.id);
    const rect = ref.current.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = el.x;
    const oy = el.y;
    const move = (ev) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      onMove?.(el.id, Math.min(99, Math.max(1, ox + dx)), Math.min(99, Math.max(1, oy + dy)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={ref}
      onPointerDown={() => editable && onSelect?.(null)}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200"
      style={{ aspectRatio: ratio, background: scada?.fondo_color || '#0F172A' }}
    >
      {scada?.imagen_url && (
        <img
          src={scada.imagen_url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.target;
            if (w && h) setRatio(`${w} / ${h}`);
          }}
          className="absolute inset-0 w-full h-full object-contain select-none"
          style={{ opacity: scada.imagen_opacidad ?? 1 }}
        />
      )}

      {elementos.map((el) => {
        const Icon = ICONOS[el.icono] || ICONOS.zap;
        const t = tamanoDe(el.tamano);
        const sel = el.id === selectedId;
        const esEtiqueta = el.tipo === 'etiqueta';
        return (
          <button
            key={el.id}
            type="button"
            onPointerDown={(e) => startDrag(e, el)}
            onDoubleClick={() => onDoubleClick?.(el)}
            className={`absolute flex flex-col items-center gap-1 ${editable ? 'cursor-move' : 'cursor-pointer'} ${sel ? 'z-20' : 'z-10'}`}
            style={{ left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {esEtiqueta ? (
              <span className={`px-2 py-1 rounded-lg shadow-lg bg-slate-900/75 ${sel ? 'ring-2 ring-white' : ''}`}>
                <span className={`${t.text} font-semibold text-white`}>{el.etiqueta}</span>
              </span>
            ) : (
              <>
                <span
                  className={`${t.box} rounded-2xl flex items-center justify-center shadow-lg ${sel ? 'ring-2 ring-white' : ''}`}
                  style={{ background: el.color }}
                >
                  <Icon className={t.icon} style={{ color: '#fff' }} />
                </span>
                {el.etiqueta && (
                  <span className={`${t.text} font-medium text-white px-1.5 py-0.5 rounded bg-slate-900/70 max-w-[140px] truncate`}>
                    {el.etiqueta}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}

      {editable && !scada?.imagen_url && elementos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm px-6 text-center">
          Sube una imagen de fondo (plano o esquema) y coloca encima los elementos
        </div>
      )}
    </div>
  );
}