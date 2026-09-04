import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Pencil, Save, X, Loader2, Upload, Phone, Mail, Globe, MapPin, BadgeCheck,
} from 'lucide-react';
import ExportDatosGerente from '@/components/company/ExportDatosGerente';

/**
 * Menú de empresa: muestra los datos de la empresa (logo + nombre arriba a la izquierda).
 * - Gerente (isGerente): puede editar datos y subir logo.
 * - Trabajador: solo visualiza logo y nombre (y datos).
 */
export default function CompanyMenuDialog({ company, isGerente, sessionTechEmail, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', cif: company.cif || '', address: company.address || '',
        city: company.city || '', postal_code: company.postal_code || '', province: company.province || '',
        phone: company.phone || '', email: company.email || '', web: company.web || '',
        logo_url: company.logo_url || '',
      });
    } else {
      setForm(null);
    }
  }, [company, open]);

  if (!company) return null;

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
        technician_email: sessionTechEmail, entity: 'company_update',
        record: {
          name: form.name.trim(), cif: form.cif.trim(), address: form.address.trim(),
          city: form.city.trim(), postal_code: form.postal_code.trim(),
          province: form.province.trim(), phone: form.phone.trim(),
          email: form.email.trim(), web: form.web.trim(),
          logo_url: form.logo_url,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['proxy-all'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Datos de la empresa actualizados');
      setEditing(false);
    } catch (err) {
      toast.error('Error al guardar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-700 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
          <DialogTitle className="text-white flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            {isGerente ? 'Mi empresa' : 'Datos de la empresa'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5">
          {/* Logo + nombre */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {form?.logo_url ? (
                <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-7 w-7 text-blue-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-lg truncate">{company.name || 'Sin nombre'}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 text-emerald-500" />
                {isGerente ? 'Perfil gerente' : 'Perfil trabajador'}
              </p>
            </div>
          </div>

          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <Field icon={Building2} label="CIF" value={company.cif} />
                <Field icon={Phone} label="Teléfono" value={company.phone} />
                <div className="col-span-2"><Field icon={MapPin} label="Dirección" value={company.address} /></div>
                <Field icon={MapPin} label="Código postal" value={company.postal_code} />
                <Field icon={MapPin} label="Ciudad" value={company.city} />
                <Field icon={MapPin} label="Provincia" value={company.province} />
                <Field icon={Mail} label="Email" value={company.email} />
                <div className="col-span-2"><Field icon={Globe} label="Web" value={company.web} /></div>
              </div>

              {isGerente && (
                <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Exporta todos los datos de la empresa (trabajadores con credenciales y PIN, clientes, edificios, equipos e incidencias) en formato Excel o CSV.</p>
                    <ExportDatosGerente sessionTechEmail={sessionTechEmail} companyName={company.name} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                      <Pencil className="h-4 w-4 mr-2" /> Editar datos
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Logo upload */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-blue-500" />
                  )}
                </div>
                <div>
                  <Label className="text-xs">Logo de la empresa</Label>
                  <label className="inline-flex items-center gap-2 mt-1 cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Subiendo...' : 'Cambiar logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={form.name} onChange={(e) => update('name', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">CIF *</Label>
                  <Input value={form.cif} onChange={(e) => update('cif', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Dirección</Label>
                  <Input value={form.address} onChange={(e) => update('address', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Código postal</Label>
                  <Input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Ciudad</Label>
                  <Input value={form.city} onChange={(e) => update('city', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Provincia</Label>
                  <Input value={form.province} onChange={(e) => update('province', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Web</Label>
                  <Input value={form.web} onChange={(e) => update('web', e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
                <Button variant="ghost" onClick={() => setEditing(false)} className="text-slate-500 h-9">
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}