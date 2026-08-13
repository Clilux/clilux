import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Upload, Building, Plus, Trash2, Users, Download, UploadCloud, Eye, EyeOff, Send, Plug } from 'lucide-react';
import IntegracionesTab from '@/components/settings/IntegracionesTab';
import TechniciansTab from '@/components/settings/TechniciansTab';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import EliminarCuentaDialog from '@/components/settings/EliminarCuentaDialog';

export default function Settings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  const myOwnTechRecord = technicians.find(t => t.user_email === currentUser?.email || t.email === currentUser?.email);

  const handleAccountDeleted = () => {
    try { base44.auth.logout('/MenuInicio'); } catch { window.location.href = '/MenuInicio'; }
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || {
        setting_key: 'main',
        logo_url: '',
        company_name: '',
        equipment_types: [],
        revision_fields: [],
        client_fields: [],
        client_users: [],
      };
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const [formData, setFormData] = useState(settings || {});

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.AppSettings.update(settings.id, data);
      }
      return base44.entities.AppSettings.create({ ...data, setting_key: 'main' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('logo_url', result.file_url);
      toast.success('Logo subido');
    } catch {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleWatermarkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('watermark_url', result.file_url);
      toast.success('Marca de agua subida');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => saveMutation.mutate(formData);

  // Client users
  const addClientUser = () => {
    setFormData(prev => ({ ...prev, client_users: [...(prev.client_users || []), { email: '', password: '', client_id: '', can_edit: false }] }));
  };
  const updateClientUser = (index, field, value) => {
    const updated = [...(formData.client_users || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, client_users: updated }));
  };
  const removeClientUser = (index) => {
    setFormData(prev => ({ ...prev, client_users: (prev.client_users || []).filter((_, i) => i !== index) }));
  };

  const sendAccessEmail = async (user) => {
    const client = clients.find(c => c.id === user.client_id);
    if (!user.email || !user.password) { toast.error('El usuario debe tener email y contraseña configurados'); return; }
    try {
      if (settings?.id) await base44.entities.AppSettings.update(settings.id, formData);
      else await base44.entities.AppSettings.create({ ...formData, setting_key: 'main' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch { toast.error('Error al guardar antes de enviar'); return; }

    const portalUrl = window.location.origin + '/MenuInicio';
    const companyName = formData.company_name || 'la empresa';
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Acceso a tu Portal Cliente - ${companyName}`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <h2 style="color: #1e293b;">${companyName} - Acceso Portal Cliente</h2>
  <p>Estimado/a ${client ? client.name : 'cliente'},</p>
  <p>Ya puedes acceder a tu portal de cliente para consultar el estado de tus equipos, incidencias y revisiones.</p>
  <table width="100%" cellpadding="12" cellspacing="0" style="border: 2px solid #3b82f6; border-radius: 8px; background-color: #eff6ff; margin: 24px 0;">
    <tr><td>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">USUARIO (EMAIL)</p>
      <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #0f172a;">${user.email}</p>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">CONTRASEÑA DE ACCESO</p>
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${user.password}</p>
    </td></tr>
  </table>
  <p style="margin: 24px 0;"><a href="${portalUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acceder al Portal</a></p>
  <p style="color: #94a3b8; font-size: 12px;">Si tienes problemas, responde a este email.</p>
</div>`,
      });
      toast.success(`Email enviado a ${user.email}`);
    } catch { toast.error('Error al enviar el email'); }
  };

  const handleExportBackup = async () => {
    try {
      const [clientsData, buildingsData, equipmentData, revisionsData, incidentsData, settingsData, techniciansData] = await Promise.all([
        base44.entities.Client.list(), base44.entities.Building.list(), base44.entities.Equipment.list(),
        base44.entities.ScheduledRevision.list(), base44.entities.Incident.list(),
        base44.entities.AppSettings.list(), base44.entities.Technician.list(),
      ]);
      const backup = { version: '1.0', date: new Date().toISOString(), data: { clients: clientsData, buildings: buildingsData, equipment: equipmentData, revisions: revisionsData, incidents: incidentsData, settings: settingsData, technicians: techniciansData } };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `clilux_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Copia de seguridad descargada');
    } catch { toast.error('Error al crear copia de seguridad'); }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.version || !backup.data) throw new Error('Formato de backup inválido');
      if (backup.data.clients?.length) await base44.entities.Client.bulkCreate(backup.data.clients.map(({ id, created_date, updated_date, ...rest }) => rest));
      if (backup.data.buildings?.length) await base44.entities.Building.bulkCreate(backup.data.buildings.map(({ id, created_date, updated_date, ...rest }) => rest));
      if (backup.data.equipment?.length) await base44.entities.Equipment.bulkCreate(backup.data.equipment.map(({ id, created_date, updated_date, ...rest }) => rest));
      toast.success('Copia restaurada.');
      queryClient.invalidateQueries();
    } catch (error) { toast.error('Error al restaurar: ' + error.message); }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <NavHeader title="Configuración" />
          <Card className="p-8 bg-card border-0 shadow-sm">
            <div className="text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">Datos de tu empresa</h3>
              <p className="text-slate-500 text-sm mb-6">Solo lectura — el administrador gestiona la configuración.</p>
              <div className="text-left space-y-3 bg-background rounded-lg p-4">
                {settings?.company_name && <div><p className="text-xs text-slate-400">Empresa</p><p className="font-medium text-slate-700">{settings.company_name}</p></div>}
                {settings?.company_cif && <div><p className="text-xs text-slate-400">CIF</p><p className="font-medium text-slate-700">{settings.company_cif}</p></div>}
                {settings?.company_address && <div><p className="text-xs text-slate-400">Dirección</p><p className="font-medium text-slate-700">{settings.company_address}</p></div>}
                {settings?.company_phone && <div><p className="text-xs text-slate-400">Teléfono</p><p className="font-medium text-slate-700">{settings.company_phone}</p></div>}
                {settings?.company_email && <div><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-700">{settings.company_email}</p></div>}
                {settings?.logo_url && <div className="pt-2"><img src={settings.logo_url} alt="Logo" className="h-12 object-contain" /></div>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Configuración" />

        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="bg-card flex-wrap">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Técnicos
            </TabsTrigger>
            <TabsTrigger value="portal" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Portal Cliente
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Copias
            </TabsTrigger>
            <TabsTrigger value="integraciones" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Integraciones
            </TabsTrigger>
          </TabsList>

          {/* ── EMPRESA ── */}
          <TabsContent value="empresa">
            <Card className="p-6 bg-card border-0 shadow-sm mb-6">
              <h3 className="font-semibold text-foreground mb-2">Datos de la Empresa</h3>
              <p className="text-sm text-slate-500 mb-6">Estos datos se utilizan en contratos, facturas y documentos PDF.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-slate-700">Nombre de la Empresa</Label><Input value={formData.company_name || ''} onChange={(e) => handleChange('company_name', e.target.value)} className="mt-1" /></div>
                <div><Label className="text-slate-700">CIF / NIF</Label><Input value={formData.company_cif || ''} onChange={(e) => handleChange('company_cif', e.target.value)} className="mt-1" placeholder="B12345678" /></div>
                <div className="md:col-span-2"><Label className="text-slate-700">Dirección</Label><Input value={formData.company_address || ''} onChange={(e) => handleChange('company_address', e.target.value)} className="mt-1" placeholder="Calle Ejemplo, 1" /></div>
                <div><Label className="text-slate-700">Ciudad</Label><Input value={formData.company_city || ''} onChange={(e) => handleChange('company_city', e.target.value)} className="mt-1" placeholder="Madrid" /></div>
                <div><Label className="text-slate-700">Código Postal</Label><Input value={formData.company_postal_code || ''} onChange={(e) => handleChange('company_postal_code', e.target.value)} className="mt-1" placeholder="28001" /></div>
                <div><Label className="text-slate-700">Teléfono</Label><Input value={formData.company_phone || ''} onChange={(e) => handleChange('company_phone', e.target.value)} className="mt-1" placeholder="+34 600 000 000" /></div>
                <div><Label className="text-slate-700">Email de Contacto</Label><Input type="email" value={formData.company_email || ''} onChange={(e) => handleChange('company_email', e.target.value)} className="mt-1" placeholder="info@empresa.com" /></div>
                <div><Label className="text-slate-700">Página Web</Label><Input value={formData.company_web || ''} onChange={(e) => handleChange('company_web', e.target.value)} className="mt-1" placeholder="www.empresa.com" /></div>
              </div>

              <h4 className="font-medium text-slate-700 mt-8 mb-4">Logo de la Empresa</h4>
              <div className="flex items-center gap-4">
                {formData.logo_url && <img src={formData.logo_url} alt="Logo" className="h-16 object-contain rounded-lg border p-1" />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-empresa" />
                <label htmlFor="logo-upload-empresa">
                  <Button type="button" variant="outline" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Subir logo</span>
                  </Button>
                </label>
              </div>

              <h4 className="font-medium text-slate-700 mt-8 mb-2">Marca de Agua para Documentos PDF</h4>
              <p className="text-sm text-slate-500 mb-3">Aparecerá como marca de agua semitransparente en los certificados y documentos PDF.</p>
              <div className="flex items-center gap-4">
                {formData.watermark_url && (
                  <div className="relative h-20 w-32 border rounded-lg overflow-hidden bg-background flex items-center justify-center">
                    <img src={formData.watermark_url} alt="Marca de agua" className="h-full w-full object-contain opacity-40" />
                    <span className="absolute bottom-1 left-1 text-xs text-slate-400 bg-card/70 px-1 rounded">Vista previa</span>
                  </div>
                )}
                <div className="space-y-2">
                  <input type="file" accept="image/*" onChange={handleWatermarkUpload} className="hidden" id="watermark-upload" />
                  <label htmlFor="watermark-upload">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Subir marca de agua</span>
                    </Button>
                  </label>
                  {formData.watermark_url && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 block" onClick={() => handleChange('watermark_url', '')}>
                      Eliminar marca de agua
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── TÉCNICOS ── */}
          <TabsContent value="technicians">
            <TechniciansTab technicians={technicians} queryClient={queryClient} />
          </TabsContent>

          {/* ── PORTAL CLIENTE ── */}
          <TabsContent value="portal">
            <Card className="p-6 bg-card border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground">Usuarios del Portal Cliente</h3>
                <Button onClick={addClientUser} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />Añadir usuario
                </Button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Configura las credenciales de acceso para el portal de clientes.</p>
              {formData.client_users?.length > 0 ? (
                <div className="space-y-4">
                  {formData.client_users.map((user, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-background">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-slate-600">Cliente</Label>
                          <select value={user.client_id} onChange={(e) => updateClientUser(index, 'client_id', e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 bg-card text-foreground text-sm">
                            <option value="">Seleccionar cliente...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Email</Label>
                          <Input type="email" value={user.email} onChange={(e) => updateClientUser(index, 'email', e.target.value)} placeholder="cliente@email.com" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Contraseña</Label>
                          <div className="relative">
                            <Input type={showPassword[index] ? 'text' : 'password'} value={user.password} onChange={(e) => updateClientUser(index, 'password', e.target.value)} placeholder="••••••••" className="mt-1 pr-10" />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1 h-8 w-8" onClick={() => setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))}>
                              {showPassword[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Permisos</Label>
                          <select value={user.can_edit ? 'edit' : 'view'} onChange={(e) => updateClientUser(index, 'can_edit', e.target.value === 'edit')} className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 bg-card text-foreground text-sm">
                            <option value="view">Solo lectura</option>
                            <option value="edit">Puede editar</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => sendAccessEmail(user)} className="text-blue-600 hover:text-blue-700 border-blue-200">
                            <Send className="h-4 w-4 mr-1" />Enviar acceso
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeClientUser(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400">No hay usuarios configurados para el portal de clientes.</p>
              )}
            </Card>
          </TabsContent>

          {/* ── COPIAS ── */}
          <TabsContent value="backup">
            <Card className="p-6 bg-card border-0 shadow-sm">
              <h3 className="font-semibold text-foreground mb-6">Copia de Seguridad y Exportación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-6 border border-slate-200 rounded-lg text-center bg-background">
                  <Download className="h-10 w-10 mx-auto text-blue-500 mb-3" />
                  <h4 className="font-medium text-foreground mb-1">Descargar Local</h4>
                  <p className="text-sm text-slate-500 mb-4">Descarga copia completa en JSON</p>
                  <Button onClick={handleExportBackup} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="h-4 w-4 mr-2" />Descargar
                  </Button>
                </div>
                <div className="p-6 border border-slate-200 rounded-lg text-center bg-background">
                  <UploadCloud className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                  <h4 className="font-medium text-foreground mb-1">Restaurar</h4>
                  <p className="text-sm text-slate-500 mb-4">Importa desde archivo JSON</p>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" id="backup-upload" />
                  <label htmlFor="backup-upload">
                    <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50" asChild>
                      <span><UploadCloud className="h-4 w-4 mr-2" />Seleccionar</span>
                    </Button>
                  </label>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800"><strong>Nota:</strong> La restauración añadirá registros sin eliminar los existentes. Se recomienda hacer copia antes de restaurar.</p>
              </div>
            </Card>
          </TabsContent>

          {/* ── INTEGRACIONES ── */}
          <TabsContent value="integraciones">
            <IntegracionesTab formData={formData} onChange={handleChange} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-slate-800 hover:bg-slate-700 text-white">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Configuración
          </Button>
        </div>

        {myOwnTechRecord && (
          <Card className="p-6 bg-card border border-red-200 mt-6">
            <h3 className="font-semibold text-foreground mb-1">Zona de peligro</h3>
            <p className="text-sm text-muted-foreground mb-4">Elimina tu cuenta de técnico de esta plataforma. Acción irreversible.</p>
            <EliminarCuentaDialog techId={myOwnTechRecord.id} onDeleted={handleAccountDeleted} />
          </Card>
        )}
      </div>
    </div>
  );
}