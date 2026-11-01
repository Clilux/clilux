import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Boxes, Save, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { MODULOS_INFO, getModulos } from '@/lib/modulos';

/**
 * Panel de "Módulos contratados" para el gerente.
 * Activa/desactiva los módulos extra y los bloques de normativa de su empresa.
 * El módulo base (mantenimiento) siempre está activo.
 */
export default function ModulosPanel({ company, sessionTechEmail }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      const m = getModulos(company);
      setLocal({
        automatizacion: m.automatizacion,
        erp: m.erp,
        normativa: { ...m.normativa },
      });
    }
  }, [company, company?.modulos]);

  if (!company) return null;
  if (!local) return null;

  const toggle = (dottedKey) => {
    setLocal((prev) => {
      const next = { ...prev, normativa: { ...prev.normativa } };
      if (dottedKey.startsWith('normativa.')) {
        const k = dottedKey.split('.')[1];
        next.normativa[k] = !next.normativa[k];
      } else {
        next[dottedKey] = !next[dottedKey];
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail,
        entity: 'company_update',
        record: {
          modulos: {
            base: true,
            automatizacion: local.automatizacion,
            erp: local.erp,
            normativa: { ...local.normativa },
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Módulos actualizados');
    } catch (err) {
      toast.error('Error al guardar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const activos = MODULOS_INFO.filter((m) => m.key !== 'base').filter((m) => {
    const v = m.key.startsWith('normativa.') ? local.normativa[m.key.split('.')[1]] : local[m.key];
    return v;
  }).length;

  return (
    <Card className="p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Boxes className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Módulos contratados</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Activa los módulos extra y los bloques de normativa disponibles para tu empresa.
        El módulo base de mantenimiento siempre está activo. {activos > 0 && (
          <span className="text-slate-400">· {activos} módulo{activos > 1 ? 's' : ''} extra activo{activos > 1 ? 's' : ''}.</span>
        )}
      </p>

      <div className="space-y-2">
        {MODULOS_INFO.map((m) => {
          const checked = m.key === 'base'
            ? true
            : m.key.startsWith('normativa.')
              ? local.normativa[m.key.split('.')[1]]
              : local[m.key];
          return (
            <div
              key={m.key}
              className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                m.siempreActivo ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">{m.label}</p>
                  {m.siempreActivo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      Base
                    </span>
                  )}
                  {m.normativa && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      Normativa
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{m.descripcion}</p>
              </div>
              <div className="shrink-0 mt-0.5">
                {m.siempreActivo ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Switch checked={!!checked} onCheckedChange={() => toggle(m.key)} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Los cambios se aplican a todos los trabajadores de la empresa.
        </p>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar módulos
        </Button>
      </div>
    </Card>
  );
}