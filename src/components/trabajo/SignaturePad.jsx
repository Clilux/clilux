import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Save } from 'lucide-react';

export default function SignaturePad({ onSave, existingUrl }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d');

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = getCtx();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = getCtx();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = getCtx();
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const save = () => {
    if (!hasInk) return;
    const url = canvasRef.current.toDataURL('image/png');
    onSave && onSave(url);
  };

  return (
    <div>
      {existingUrl && !hasInk ? (
        <div className="space-y-2">
          <img src={existingUrl} alt="Firma" className="max-h-32 rounded-lg border border-slate-200 bg-white p-2" />
          <Button type="button" size="sm" variant="outline" onClick={clear}>
            <Eraser className="h-4 w-4 mr-1" />Rehacer firma
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={140}
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white touch-none"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={clear} disabled={!hasInk}>
              <Eraser className="h-4 w-4 mr-1" />Limpiar
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!hasInk}>
              <Save className="h-4 w-4 mr-1" />Guardar firma
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}