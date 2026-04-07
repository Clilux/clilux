import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { format, getMonth, getYear, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { GitMerge } from 'lucide-react';

const revisionTypeLabels = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annual: 'Anual'
};

const revisionTypeColors = {
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-purple-100 text-purple-700',
  biannual: 'bg-orange-100 text-orange-700',
  annual: 'bg-red-100 text-red-700',
};

export default function UnifyRevisionsModal({ open, onClose, revisions, equipment, buildings: buildingsProp, onSuccess }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [allBuildings, setAllBuildings] = useState(buildingsProp || []);

  // Reload all buildings when modal opens to ensure we have the full list
  useEffect(() => {
    if (open) {
      base44.entities.Building.list().then(data => setAllBuildings(data)).catch(() => {});
    }
  }, [open]);

  // Build list of months that have pending revisions
  const pendingRevisions = revisions.filter(r => r.status === 'pending' && !r.is_unified_revision);

  const availableMonths = [];
  const seenMonths = new Set();
  pendingRevisions.forEach(rev => {
    const d = new Date(rev.scheduled_date);
    const key = format(d, 'yyyy-MM');
    if (!seenMonths.has(key)) {
      seenMonths.add(key);
      availableMonths.push({ key, label: format(d, 'MMMM yyyy', { locale: es }), date: d });
    }
  });
  availableMonths.sort((a, b) => a.key.localeCompare(b.key));

  // Filter revisions for selected month
  const monthRevisions = selectedMonth
    ? pendingRevisions.filter(r => format(new Date(r.scheduled_date), 'yyyy-MM') === selectedMonth)
    : [];

  // Group by building
  const byBuilding = {};
  monthRevisions.forEach(rev => {
    if (!byBuilding[rev.building_id]) byBuilding[rev.building_id] = [];
    byBuilding[rev.building_id].push(rev);
  });

  const getEquipment = (id) => equipment.find(e => e.id === id);
  const getBuilding = (id) => allBuildings.find(b => b.id === id);

  const handleMonthChange = (val) => {
    setSelectedMonth(val);
    setSelectedIds([]);
    setTargetDate('');
  };

  const toggleRevision = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBuilding = (buildingId) => {
    const bRevIds = byBuilding[buildingId].map(r => r.id);
    const allSelected = bRevIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !bRevIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...bRevIds])]);
    }
  };

  const handleUnify = async () => {
    if (selectedIds.length < 2) {
      toast.error('Selecciona al menos 2 revisiones para unificar');
      return;
    }
    if (!targetDate) {
      toast.error('Selecciona la fecha para la visita unificada');
      return;
    }

    const selectedRevisions = monthRevisions.filter(r => selectedIds.includes(r.id));
    const byBuildingSelected = {};
    selectedRevisions.forEach(rev => {
      if (!byBuildingSelected[rev.building_id]) byBuildingSelected[rev.building_id] = [];
      byBuildingSelected[rev.building_id].push(rev);
    });

    setLoading(true);
    try {
      for (const [buildingId, buildingRevs] of Object.entries(byBuildingSelected)) {
        const building = getBuilding(buildingId);
        const unifiedEquipmentInfo = buildingRevs.map(rev => {
          const eq = getEquipment(rev.equipment_id);
          return {
            equipment_id: rev.equipment_id,
            equipment_name: eq ? (eq.reference_name || `${eq.brand} ${eq.model}`) : 'Equipo desconocido',
            original_revision_type: rev.revision_type
          };
        });

        await base44.entities.ScheduledRevision.create({
          client_id: buildingRevs[0].client_id,
          building_id: buildingId,
          scheduled_date: targetDate,
          revision_type: 'unified',
          status: 'pending',
          is_unified_revision: true,
          unified_equipment_info: unifiedEquipmentInfo,
          notes: `Revisión unificada del edificio ${building?.name || ''}`
        });

        for (const rev of buildingRevs) {
          await base44.entities.ScheduledRevision.delete(rev.id);
        }
      }

      toast.success('Revisiones unificadas correctamente');
      setSelectedIds([]);
      setTargetDate('');
      setSelectedMonth('');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error al unificar revisiones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-blue-600" />
            Unificar Revisiones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Select month */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">1. Selecciona el mes</label>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elige un mes con revisiones pendientes..." />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => (
                  <SelectItem key={m.key} value={m.key} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select revisions */}
          {selectedMonth && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">2. Selecciona las revisiones a unificar</label>
              {Object.entries(byBuilding).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">No hay revisiones pendientes en este mes</p>
              )}
              {Object.entries(byBuilding).map(([buildingId, bRevs]) => {
                const building = getBuilding(buildingId);
                const bRevIds = bRevs.map(r => r.id);
                const allSelected = bRevIds.every(id => selectedIds.includes(id));
                const someSelected = bRevIds.some(id => selectedIds.includes(id));
                return (
                  <div key={buildingId} className="border rounded-xl mb-3 overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleBuilding(buildingId)}
                    >
                      <Checkbox checked={allSelected} />
                      <span className="font-semibold text-slate-800 text-sm">{building?.name || 'Edificio desconocido'}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{bRevs.length} revisiones</Badge>
                    </div>
                    <div className="divide-y">
                      {bRevs.map(rev => {
                        const eq = getEquipment(rev.equipment_id);
                        const isSelected = selectedIds.includes(rev.id);
                        return (
                          <div
                            key={rev.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => toggleRevision(rev.id)}
                          >
                            <Checkbox checked={isSelected} />
                            <div className="flex-1">
                              <p className="text-sm text-slate-700">{eq ? (eq.reference_name || `${eq.brand} ${eq.model}`) : 'Equipo'}</p>
                              <p className="text-xs text-slate-400">{format(new Date(rev.scheduled_date), "d MMM yyyy", { locale: es })}</p>
                            </div>
                            <Badge className={`text-xs ${revisionTypeColors[rev.revision_type] || 'bg-blue-100 text-blue-700'}`}>
                              {revisionTypeLabels[rev.revision_type] || rev.revision_type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3: Target date */}
          {selectedIds.length >= 2 && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">3. Fecha de la visita unificada</label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleUnify}
              disabled={loading || selectedIds.length < 2 || !targetDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Unificando...' : `Unificar ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}