import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

// Envuelve un elemento y muestra una burbuja de ayuda al mantener pulsado (~450ms).
// Evita que el click se propague si la pulsación larga se disparó (p.ej. dentro de un Link).
export default function LongPressHelp({ help, children, as: Tag = 'span', className = '' }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const [anchor, setAnchor] = useState(null);

  const start = useCallback((e) => {
    firedRef.current = false;
    const el = e.currentTarget;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      const rect = el.getBoundingClientRect();
      setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    }, 450);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const onClickCapture = useCallback((e) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }, []);

  return (
    <Tag
      className={className}
      style={{ touchAction: 'manipulation' }}
      onPointerDown={start}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onClickCapture={onClickCapture}
    >
      {children}
      {anchor && help && <HelpBubble help={help} anchor={anchor} onClose={() => setAnchor(null)} />}
    </Tag>
  );
}

function HelpBubble({ help, anchor, onClose }) {
  useEffect(() => {
    const onDown = () => onClose();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onDown, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onDown, true);
    };
  }, [onClose]);

  if (!help) return null;
  const width = 280;
  const left = Math.max(12, Math.min(anchor.cx - width / 2, window.innerWidth - width - 12));
  const showAbove = anchor.top > 200;
  const top = showAbove ? anchor.top - 10 : anchor.bottom + 10;

  return createPortal(
    <div
      className="fixed z-[200]"
      style={{ left, top, width, transform: showAbove ? 'translateY(-100%)' : 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 text-xs leading-relaxed border border-slate-700">
        <p className="font-semibold text-sm mb-1 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-blue-300 shrink-0" />
          {help.title}
        </p>
        <p className="text-slate-200">{help.body}</p>
      </div>
    </div>,
    document.body
  );
}