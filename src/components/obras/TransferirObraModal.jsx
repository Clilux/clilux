import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Building2, FileCheck2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { generarInformeObraPDF } from '@/lib/obra-informe-pdf';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Traspasa una obra finalizada a un edificio de mantenimiento:
 * crea (o reutiliza) el edificio y adjunta el informe de obra a su documentación.
 */
export default function TransferirObraModal({ open, onClose, obra, isSessionTech, effectiveEmail, techName, verEconomia, verCostes, onDone }) {
  const yaTieneEdificio = !!obra?.building_id;
  const [form, setForm] = useState({ nombre: '', address: '', city: '', postal_code: '', province: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !obra) return;
    setForm({
      nombre: obra.building_name || obra.nombre || '',
      address: obra.building_address || '',
      city: '',
      postal_code: '',
      province: '',
      notes: `Obra de origen: ${obra.nombre || ''}`,
    });
  }, [open, obra]);

  // Si la obra ya tiene edificio, lo cargamos para mostrarlo.
  const { data: edificioExistente } = useQuery({
    queryKey: ['edificio-obra', obra?.building_id, isSessionTech ? effectiveEmail : 'direct'],
    queryFn: async () => {
      if (!obra?.building_id) return null;
      if (isSessionTech && effectiveEmail) {
        const res = await base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'buildings' });
        return (res.data?.data || []).find((b) => b.id === obra.building_id) || null;
      }
      const list = await base44.entities.Building.filter({ id: obra.building_id });
      return list[0] || null;
    },
    enabled: open && !!obra?.building_id,
  });

  const cargarDetalle = async () => {
    let tareas, observaciones, albaranes, partes;
    if (isSessionTech && effectiveEmail) {
      const [t, o, a, p] = await Promise.all([
        base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_tareas', obra_id: obra.id }),
        base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'obra_observaciones', obra_id: obra.id }),
        base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'albaran_obra_by_obra', obra_id: obra.id }),
        base44.functions.invoke('getCompanyData', { technician_email: effectiveEmail, entity: 'partes_by_obra', obra_id: obra.id }),
      ]);
      tareas = t.data?.data || [];
      observaciones = o.data?.data || [];
      albaranes = a.data?.data || [];
      partes = p.data?.data || [];
    } else {
      [tareas, observaciones, albaranes, partes] = await Promise.all([
        base44.entities.ObraTarea.filter({ obra_id: obra.id }),
        base44.entities.ObraObservacion.filter({ obra_id: obra.id }),
        base44.entities.AlbaranObra.filter({ obra_id: obra.id }),
        base44.entities.ParteTrabajo.filter({ obra_id: obra.id }, { sort: '-fecha' }).then((r) => (Array.isArray(r) ? r : r.items || [])),
      ]);
    }
    return { tareas, observaciones, albaranes, partes };
  };

  const crearEdificio = async () => {
    if (isSessionTech && effectiveEmail) {
      const res = await base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail,
        entity: 'building_create',
        record: {
          client_id: obra.client_id,
          name: form.nombre,
          address: form.address || 'Sin dirección',
          city: form.city,
          postal_code: form.postal_code,
          province: form.province,
          notes: form.notes,
          created_by_name: techName,
        },
      });
      return res.data?.data;
    }
    return base44.entities.Building.create({
      client_id: obra.client_id,
      name: form.nombre,
      address: form.address || 'Sin dirección',
      city: form.city,
      postal_code: form.postal_code,
      province: form.province,
      notes: form.notes,
      created_by_name: techName,
    });
  };

  const vincularEdificio = async (buildingId, buildingName) => {
    if (isSessionTech && effectiveEmail) {
      await base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail, entity: 'obra_update',
        record_id: obra.id, updates: { building_id: buildingId, building_name: buildingName },
      });
    } else {
      await base44.entities.Obra.update(obra.id, { building_id: buildingId, building_name: buildingName });
    }
  };

  const adjuntarInforme = async (buildingId, detalle) => {
    const doc = generarInformeObraPDF(obra, { ...detalle, verCostes });
    const blob = doc.output('blob');
    const filename = `informe_obra_${(obra.nombre || obra.id || 'obra').replace(/\s+/g, '_').toLowerCase()}.pdf`;
    const base64 = await blobToBase64(blob);

    const resumen = [
      `Informe de obra "${obra.nombre}" finalizada.`,
      `Cliente: ${obra.client_name || '—'}.`,
      `${detalle.tareas.length} trabajos, ${detalle.observaciones.length} observaciones, ${detalle.albaranes.length} partes, ${detalle.partes.length} partes de horas.`,
    ].join(' ');

    if (isSessionTech && effectiveEmail) {
      await base44.functions.invoke('getCompanyData', {
        technician_email: effectiveEmail,
        entity: 'building_document_upload',
        building_id: buildingId,
        filename,
        file_base64: base64,
        content_type: 'application/pdf',
        record: { tipo: 'otro', titulo: `Informe de obra - ${obra.nombre}`, resumen },
      });
    } else {
      const up = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], filename, { type: 'application/pdf' }) });
      await base44.entities.BuildingDocument.create({
        building_id: buildingId,
        client_id: obra.client_id,
        tipo: 'otro',
        titulo: `Informe de obra - ${obra.nombre}`,
        file_uri: up.file_uri,
        nombre_original: filename,
        resumen,
        generated_by_name: techName,
      });
    }
  };

  const handleSubmit = async () => {
    if (!yaTieneEdificio && !form.nombre.trim()) { toast.error('Indica el nombre del edificio'); return; }
    setSubmitting(true);
    try {
      const detalle = await cargarDetalle();

      let buildingId = obra.building_id;
      let buildingName = obra.building_name || form.nombre;

      if (!yaTieneEdificio) {
        const building = await crearEdificio();
        buildingId = building.id;
        buildingName = building.name || form.nombre;
        await vincularEdificio(buildingId, buildingName);
      }

      await adjuntarInforme(buildingId, detalle);

      toast.success(yaTieneEdificio ? 'Informe adjuntado a la documentación del edificio' : 'Obra traspasada a mantenimiento e informe adjuntado');
      onDone?.({ building_id: buildingId, building_name: buildingName });
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo completar el traspaso');
    } finally {
      setSubmitting(false);
    }
  };

  if (!obra) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </span>
            Traspasar a mantenimiento
          </DialogTitle>
          <DialogDescription>
            Convierte esta obra finalizada en un edificio para su mantenimiento y adjunta el informe de obra a su documentación.
          </DialogDescription>
        </DialogHeader>

        {yaTieneEdificio && edificioExistente ? (
          <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-800">La obra ya está vinculada a un edificio</p>
              <p className="text-emerald-700">{edificioExistente.name} — {edificioExistente.address || 'Sin dirección'}</p>
              <p className="text-emerald-600 text-xs mt-1">Se generará el informe y se adjuntará a su documentación.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre del edificio *</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className="mt-1" placeholder="Ej. Edificio C/ Mayor 12" />
            </div>
            <div>
              <Label className="text-xs">Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="mt-1" placeholder="Calle, número, ciudad" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código postal</Label>
                <Input value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Provincia</Label>
                <Input value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {yaTieneEdificio ? 'Adjuntar informe' : 'Crear edificio e informar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}