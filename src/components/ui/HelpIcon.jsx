import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

// Pequeño icono de interrogación (?) que abre una burbuja de ayuda al pulsarlo.
export default function HelpIcon({ help, className = '', iconClass = 'h-3.5 w-3.5 text-slate-400 hover:text-slate-700' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const toggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(prev => {
      if (!prev && btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <span ref={btnRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors p-0.5"
        aria-label="Ayuda"
      >
        <HelpCircle className={iconClass} />
      </button>
      {open && anchor && help && <HelpBubble help={help} anchor={anchor} />}
    </span>
  );
}

function HelpBubble({ help, anchor }) {
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