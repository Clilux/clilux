import React, { useState } from 'react';
import { Clock, AlertTriangle, Check, X } from 'lucide-react';

export default function HoraConfirmModal({ tipo, horaActual, onConfirm, onClose }) {
  // tipo: 'entrada' | 'salida'
  const [mode, setMode] = useState('pregunta'); // 'pregunta' | 'ajustar'
  const [hora, setHora] = useState(horaActual);
  const [motivo, setMotivo] = useState('');

  const titulo = tipo === 'entrada' ? 'Fichar entrada' : 'Fichar salida';

  const confirmarAjustada = () => {
    if (!motivo.trim()) return;
    onConfirm({ hora, motivo: motivo.trim() });
  };

  const confirmarAhora = () => onConfirm({ hora: null, motivo: null });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-400" /> {titulo}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {mode === 'pregunta' ? (
          <>
            <div className="text-center py-6">
              <p className="text-white/70 text-lg mb-3">¿Es esta la hora real?</p>
              <p className="text-6xl font-bold text-white font-mono">{horaActual}</p>
              <p className="text-white/40 text-sm mt-3">Hora actual del sistema</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={confirmarAhora}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] transition-all rounded-2xl py-5 flex items-center justify-center gap-3 text-xl font-bold text-white shadow-lg"
              >
                <Check className="h-6 w-6" /> Sí, fichar ahora
              </button>
              <button
                onClick={() => setMode('ajustar')}
                className="w-full bg-white/10 hover:bg-white/20 active:scale-[0.99] transition-all rounded-2xl py-5 flex items-center justify-center gap-3 text-xl font-bold text-white border border-white/20"
              >
                No, marcar otra hora
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Hora real de {tipo === 'entrada' ? 'entrada' : 'salida'}</label>
                <input
                  type="time"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  className="w-full bg-slate-900 border border-white/20 rounded-xl px-4 py-4 text-3xl text-white font-mono text-center"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Motivo del ajuste <span className="text-amber-400">(obligatorio)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: Me olvidé de fichar, retraso por tráfico, etc."
                  rows={3}
                  className="w-full bg-slate-900 border border-white/20 rounded-xl px-4 py-3 text-white text-sm resize-none"
                />
                <p className="text-white/40 text-xs mt-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  El ajuste queda registrado en el historial para auditoría (cumplimiento legal).
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('pregunta')}
                  className="flex-1 bg-white/10 hover:bg-white/20 transition-all rounded-2xl py-4 text-lg font-semibold text-white border border-white/20"
                >
                  Volver
                </button>
                <button
                  onClick={confirmarAjustada}
                  disabled={!motivo.trim() || !hora}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 transition-all rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-40 shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}