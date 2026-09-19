import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Botón reutilizable para decidir con quién se comparte un registro
 * (obra, mantenimiento o incidencia). Por defecto: todos los usuarios.
 */
export default function CompartirButton({
  record,
  entityName,
  idParam = 'record_id',
  proxyEntity,
  technicians: techniciansProp,
  canEdit = false,
  onSaved,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('todos');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const sessionTechEmail = sessionStorage.getItem('technician_email');

  const { data: loadedTechs = [] } = useQuery({
    queryKey: ['compartir-technicians', sessionTechEmail || 'direct'],
    queryFn: async () => {
      if (sessionTechEmail) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'technicians',
        });
        return res.data?.data || [];
      }
      return base44.entities.Technician.list();
    },
    enabled: open && !techniciansProp,
    staleTime: 60000,
  });
  const technicians = techniciansProp || loadedTechs;

  if (!canEdit || !record) return null;

  const shared = Array.isArray(record.shared_with) ? record.shared_with : [];
  const isTodos = shared.length === 0;

  const openDialog = () => {
    setMode(isTodos ? 'todos' : 'algunos');
    setSelected(shared);
    setOpen(true);
  };

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    const shared_with = mode === 'todos' ? [] : selected;
    if (mode === 'algunos' && shared_with.length === 0) {
      toast.error('Selecciona al menos un trabajador');
      return;
    }
    setSaving(true);
    try {
      if (sessionTechEmail && proxyEntity) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: proxyEntity,
          [idParam]: record.id,
          updates: { shared_with },
        });
        if (res.data?.error) throw new Error(res.data.error);
      } else {
        await base44.entities[entityName].update(record.id, { shared_with });
      }
      toast.success('Visibilidad actualizada');
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar la visibilidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={openDialog} className="gap-2 shrink-0">
        <Users className="h-4 w-4" />
        Compartir
        <span className="text-xs font-normal text-slate-500">
          {isTodos ? '· Todos' : `· ${shared.length}`}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir con trabajadores</DialogTitle>
            <DialogDescription>
              Elige quién puede ver este registro. Por defecto lo ven todos los usuarios.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={mode} onValueChange={setMode} className="gap-3">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="todos" id="share-todos" />
              <Label htmlFor="share-todos" className="cursor-pointer">Todos los usuarios</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="algunos" id="share-algunos" />
              <Label htmlFor="share-algunos" className="cursor-pointer">Solo algunos trabajadores</Label>
            </div>
          </RadioGroup>

          {mode === 'algunos' && (
            <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
              {technicians.length === 0 ? (
                <p className="text-sm text-slate-400">No hay trabajadores disponibles.</p>
              ) : (
                technicians.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`share-${t.id}`}
                      checked={selected.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                    />
                    <Label htmlFor={`share-${t.id}`} className="cursor-pointer text-sm font-normal">
                      {t.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}