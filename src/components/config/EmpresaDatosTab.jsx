import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Loader2, Upload, Building2 } from 'lucide-react';
import { HABILITACIONES_REP } from '@/lib/rep';

/**
 * Pestaña "Empresa" de Configuración.
 * Edita los datos fiscales de la empresa (Company) vía proxy getCompanyData.
 * El logo se sube a almacenamiento público (debe verse en la app y en PDFs).
 */
export default function EmpresaDatosTab({ company, sessionTechEmail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', cif: company.cif || '', address: company.address || '',
        city: company.city || '', postal_code: company.postal_code || '', province: company.province || '',
        phone: company.phone || '', email: company.email || '', web: company.web || '',
        logo_url: company.logo_url || '', habilitacion_rep: company.habilitacion_rep || '',
      });
    }
  }, [company]);

  if (!form) return null;

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update('logo_url', file_url);
      toast.success('Logo cargado');
    } catch (err) {
      toast.error('Error al subir el logo: ' + (err?.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.cif.trim()) {
      toast.error('Nombre y CIF son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('getCompanyData', {
        technician_email: sessionTechEmail,
        entity: 'company_update',
        record: {
          name: form.name.trim(), cif: form.cif.trim(), address: form.address.trim(),
          city: form.city.trim(), postal_code: form.postal_code.trim(),
          province: form.province.trim(), phone: form.phone.trim(),
          email: form.email.trim(), web: form.web.trim(),
          logo_url: form.logo_url, habilitacion_rep: form.habilitacion_rep || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Datos de la empresa actualizados');
    } catch (err) {
      toast.error('Error al guardar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-slate-800">Datos de la empresa</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">Estos datos se usan en la app, en documentos PDF y en los libros de registro.</p>

      {/* Logo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
          {form.logo_url ? (
            <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-blue-500" />
          )}
        </div>
        <div>
          <Label className="text-xs">Logo de la empresa</Label>
          <p className="text-[11px] text-slate-400 mb-1">Se mostrará en la app y en los documentos. Se sube a almacenamiento público.</p>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-700">
            <Upload className="h-4 w-4" />
            {uploading ? 'Subiendo...' : 'Cambiar logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs">Nombre *</Label>
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">CIF *</Label>
          <Input value={form.cif} onChange={(e) => update('cif', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Teléfono</Label>
          <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="h-9 mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Dirección</Label>
          <Input value={form.address} onChange={(e) => update('address', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Código postal</Label>
          <Input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Ciudad</Label>
          <Input value={form.city} onChange={(e) => update('city', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Provincia</Label>
          <Input value={form.province} onChange={(e) => update('province', e.target.value)} className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="h-9 mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Web</Label>
          <Input value={form.web} onChange={(e) => update('web', e.target.value)} className="h-9 mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Habilitación REP (Equipos a Presión)</Label>
          <Select value={form.habilitacion_rep} onValueChange={(v) => update('habilitacion_rep', v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Seleccionar habilitación" /></SelectTrigger>
            <SelectContent>
              {HABILITACIONES_REP.map((h) => (
                <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400 mt-1">EIP-1 no puede emitir certificados en instalaciones con Σ PS × V ≥ 25.000.</p>
        </div>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar datos
        </Button>
      </div>
    </Card>
  );
}