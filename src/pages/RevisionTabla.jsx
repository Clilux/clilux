import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Save, AlertCircle, AlertTriangle } from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import RevisionTableMeta from '@/components/revisions/RevisionTableMeta';
import RevisionGroupTable from '@/components/revisions/RevisionGroupTable';
import { buildColumns, nextRevisionDate, revisionTypeLabels } from '@/lib/revision-utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentTechnician } from '@/hooks/useCurrentTechnician';

const fechaCorta = (value) => String(value || '').slice(0, 10);

export default function RevisionTabla() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date') || new Date().toISOString().split('T')[0];
  const buildingFilter = urlParams.get('building_id') || '';

  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isTechSession = !!sessionTechEmail;
  const mode = isTechSession ? 'proxy' : 'direct';
  const { technician, user } = useCurrentTechnician();

  const [entries, setEntries] = useState({});
  const [completionDate, setCompletionDate] = useState(dateParam);
  const [technicianName, setTechnicianName] = useState('');
  const [saving, setSaving] = useState(false);

  const proxyFetch = async (entity) => {
    const res = await base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity });
    return res.data?.data || [];
  };

  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['scheduled-revisions', mode],
    queryFn: () => isTechSession ? proxyFetch('revisions') : base44.entities.ScheduledRevision.list(),
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', mode],
    queryFn: () => isTechSession ? proxyFetch('equipment') : base44.entities.Equipment.list(),
  });
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', mode],
    queryFn: () => isTechSession ? proxyFetch('buildings') : base44.entities.Building.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', mode],
    queryFn: () => isTechSession ? proxyFetch('clients') : base44.entities.Client.list(),
  });
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', mode],
    queryFn: () => isTechSession ? proxyFetch('technicians') : base44.entities.Technician.filter({ status: 'active' }),
  });

  // Revisiones pendientes del día seleccionado y las vencidas anteriores,
  // para poder cerrarlas también desde la tabla (y desbloquear las siguientes)
  const rows = useMemo(() => {
    return revisions
      .filter((rev) => rev.status === 'pending' && !rev.is_unified_revision)
      // Con un edificio seleccionado se muestran todas sus revisiones pendientes;
      // sin filtro de edificio, solo las que vencen hasta la fecha elegida.
      .filter((rev) => buildingFilter ? rev.building_id === buildingFilter : fechaCorta(rev.scheduled_date) <= dateParam)
      .map((rev) => ({
        revision: rev,
        vencida: fechaCorta(rev.scheduled_date) < dateParam,
        vencidaLabel: format(new Date(rev.scheduled_date), 'd MMM', { locale: es }),
        equipment: equipment.find((e) => e.id === rev.equipment_id) || null,
        building: buildings.find((b) => b.id === rev.building_id) || null,
        client: clients.find((c) => c.id === rev.client_id) || null,
      }));
  }, [revisions, equipment, buildings, clients, dateParam, buildingFilter]);

  // Equipos con revisiones anteriores sin completar: no se pueden cerrar todavía
  const blockedIds = useMemo(() => {
    const blocked = new Set();
    rows.forEach(({ revision }) => {
      const hayAnterior = revisions.some((r) =>
        r.equipment_id === revision.equipment_id &&
        r.id !== revision.id &&
        r.status === 'pending' &&
        fechaCorta(r.scheduled_date) < fechaCorta(revision.scheduled_date));
      if (hayAnterior) blocked.add(revision.id);
    });
    return blocked;
  }, [rows, revisions]);

  // Agrupa por edificio y tipo de revisión (los campos dependen del tipo)
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = `${row.revision.building_id || 'sin-edificio'}|${row.revision.revision_type}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return Array.from(map.entries()).map(([key, groupRows]) => ({
      key,
      title: groupRows[0].building?.name || groupRows[0].client?.name || 'Sin edificio',
      subtitle: [revisionTypeLabels[groupRows[0].revision.revision_type] || groupRows[0].revision.revision_type, groupRows[0].client?.name]
        .filter(Boolean).join(' · '),
      rows: [...groupRows].sort((a, b) =>
        (a.equipment?.reference_name || '').localeCompare(b.equipment?.reference_name || '')),
      columns: buildColumns(groupRows),
    }));
  }, [rows]);

  const rowsKey = rows.map((r) => r.revision.id).sort().join(',');

  useEffect(() => {
    if (!rows.length) return;
    setEntries((prev) => {
      const next = { ...prev };
      rows.forEach(({ revision }) => {
        if (!next[revision.id]) {
          next[revision.id] = {
            data: { ...(revision.revision_data || {}) },
            notes: revision.notes || '',
            nextNotes: revision.next_revision_notes || '',
          };
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey]);

  useEffect(() => {
    if (technicianName) return;
    if (isTechSession) {
      const matched = technicians.find((t) => t.email === sessionTechEmail || t.portal_email === sessionTechEmail);
      if (matched?.name) setTechnicianName(matched.name);
    } else if (technician?.name || user?.full_name) {
      setTechnicianName(technician?.name || user?.full_name || '');
    }
  }, [technician, user, technicians, isTechSession, sessionTechEmail, technicianName]);

  const setCell = (revisionId, key, value) => setEntries((prev) => ({
    ...prev,
    [revisionId]: { ...prev[revisionId], data: { ...(prev[revisionId]?.data || {}), [key]: value } },
  }));

  const setEntry = (revisionId, field, value) => setEntries((prev) => ({
    ...prev,
    [revisionId]: { ...prev[revisionId], [field]: value },
  }));

  const editableRows = rows.filter(({ revision }) => !blockedIds.has(revision.id));

  const handleSave = async () => {
    if (!editableRows.length) {
      toast.error('No hay revisiones que se puedan completar');
      return;
    }
    setSaving(true);
    try {
      const completedDate = completionDate || dateParam;
      const techName = technicianName || technician?.name || user?.full_name || '';
      const techEmail = user?.email || sessionTechEmail || '';

      const updates = editableRows.map(({ revision }) => {
        const entry = entries[revision.id] || {};
        return {
          id: revision.id,
          status: 'completed',
          completed_date: completedDate,
          revision_data: entry.data || {},
          notes: entry.notes || '',
          next_revision_notes: entry.nextNotes || '',
          technician_name: techName,
          technician_id: technician?.id || '',
          technician_email: techEmail,
        };
      });

      const nextRecords = editableRows.map(({ revision }) => {
        const nextDate = nextRevisionDate(completedDate, revision.revision_type);
        if (!nextDate) return null;
        return {
          equipment_id: revision.equipment_id,
          client_id: revision.client_id,
          building_id: revision.building_id,
          revision_type: revision.revision_type,
          scheduled_date: nextDate,
          status: 'pending',
          previous_revision_notes: entries[revision.id]?.nextNotes || '',
        };
      }).filter(Boolean);

      if (isTechSession) {
        await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail,
          entity: 'revisions_bulk_complete',
          updates,
          next_records: nextRecords,
          technician_name: techName,
        });
      } else {
        await base44.entities.ScheduledRevision.bulkUpdate(updates);
        if (nextRecords.length) await base44.entities.ScheduledRevision.bulkCreate(nextRecords);
      }

      queryClient.invalidateQueries({ queryKey: ['scheduled-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success(`${editableRows.length} revisión${editableRows.length !== 1 ? 'es' : ''} completada${editableRows.length !== 1 ? 's' : ''}`);
      navigate(-1);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Error al guardar las revisiones');
    } finally {
      setSaving(false);
    }
  };

  const vencidasCount = rows.filter((r) => r.vencida).length;
  const summary = `${rows.length} equipo${rows.length !== 1 ? 's' : ''} · ${groups.length} visita${groups.length !== 1 ? 's' : ''} · ${format(new Date(dateParam), "d 'de' MMMM", { locale: es })}${vencidasCount ? ` · ${vencidasCount} vencida${vencidasCount !== 1 ? 's' : ''}` : ''}`;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <NavHeader title="Revisión en tabla" />

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-slate-600">No hay revisiones pendientes para el {format(new Date(dateParam), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </Card>
        ) : (
          <>
            <RevisionTableMeta
              completionDate={completionDate}
              onCompletionDate={setCompletionDate}
              technicianName={technicianName}
              onTechnicianName={setTechnicianName}
              technicians={technicians}
              summary={summary}
            />

            {blockedIds.size > 0 && (
              <Card className="p-3 mb-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {blockedIds.size} equipo{blockedIds.size !== 1 ? 's' : ''} tiene{blockedIds.size !== 1 ? 'n' : ''} revisiones anteriores sin completar y no se cerrará{blockedIds.size !== 1 ? 'n' : ''} en esta tabla. Complétalas primero desde su ficha.
                </p>
              </Card>
            )}

            {groups.map((group) => (
              <RevisionGroupTable
                key={group.key}
                title={group.title}
                subtitle={group.subtitle}
                columns={group.columns}
                rows={group.rows}
                entries={entries}
                blockedIds={blockedIds}
                onCell={setCell}
                onEntry={setEntry}
              />
            ))}

            <Card className="sticky bottom-2 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <p className="text-sm text-slate-500">
                Se completarán {editableRows.length} revisión{editableRows.length !== 1 ? 'es' : ''} y se programará la siguiente de cada equipo.
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate(-1)}>Cancelar</Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !editableRows.length}
                  className="bg-green-600 flex-1 sm:flex-none"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Completar revisiones</>
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}