import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Upload, Palette, Building, FileText, Thermometer, Plus, Trash2, Settings2, Users, Download, UploadCloud, Eye, EyeOff, Send, KeyRound } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const [showPassword, setShowPassword] = useState({});
  const [showTechPassword, setShowTechPassword] = useState({});

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  const updateTechMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Credenciales actualizadas');
    },
  });

  const [techCredentials, setTechCredentials] = useState({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || {
        setting_key: 'main',
        primary_color: '#1e293b',
        secondary_color: '#3b82f6',
        accent_color: '#10b981',
        logo_url: '',
        company_name: 'Clilux M',
        equipment_types: [],
        revision_fields: [],
        client_fields: [],
        client_users: [],
        maintenance_periods: {
          monthly: true,
          quarterly: true,
          biannual: true,
          annual: true,
        },
      };
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const [formData, setFormData] = useState(settings || {});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
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
    onError: () => {
      toast.error('Error al guardar');
    },
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
    } catch (error) {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Gestión de tipos de equipos personalizados
  const addEquipmentType = () => {
    const newType = prompt('Nombre del nuevo tipo de equipo:');
    if (newType && newType.trim()) {
      const newTypes = [...(formData.equipment_types || []), newType.trim()];
      setFormData(prev => ({ ...prev, equipment_types: newTypes }));
    }
  };

  const removeEquipmentType = (index) => {
    const filtered = (formData.equipment_types || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, equipment_types: filtered }));
  };

  // Gestión de campos personalizados de revisión
  const addRevisionField = () => {
    const newFields = [...(formData.revision_fields || []), { field_name: '', field_label: '', field_type: 'text', required: false }];
    setFormData(prev => ({ ...prev, revision_fields: newFields }));
  };

  const updateRevisionField = (index, field, value) => {
    const updated = [...(formData.revision_fields || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, revision_fields: updated }));
  };

  const removeRevisionField = (index) => {
    const filtered = (formData.revision_fields || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, revision_fields: filtered }));
  };

  // Gestión de campos personalizados de cliente
  const addClientField = () => {
    const newFields = [...(formData.client_fields || []), { field_name: '', field_label: '', field_type: 'text', required: false }];
    setFormData(prev => ({ ...prev, client_fields: newFields }));
  };

  const updateClientField = (index, field, value) => {
    const updated = [...(formData.client_fields || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, client_fields: updated }));
  };

  const removeClientField = (index) => {
    const filtered = (formData.client_fields || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, client_fields: filtered }));
  };

  // Gestión de usuarios del portal cliente
  const addClientUser = () => {
    const newUsers = [...(formData.client_users || []), { email: '', password: '', client_id: '', can_edit: false }];
    setFormData(prev => ({ ...prev, client_users: newUsers }));
  };

  const updateClientUser = (index, field, value) => {
    const updated = [...(formData.client_users || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, client_users: updated }));
  };

  const removeClientUser = (index) => {
    const filtered = (formData.client_users || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, client_users: filtered }));
  };

  const sendAccessEmail = async (user) => {
    const client = clients.find(c => c.id === user.client_id);
    if (!user.email || !user.password) {
      toast.error('El usuario debe tener email y contraseña configurados');
      return;
    }

    // Guardar automáticamente antes de enviar para asegurar que los datos están persistidos
    try {
      if (settings?.id) {
        await base44.entities.AppSettings.update(settings.id, formData);
      } else {
        await base44.entities.AppSettings.create({ ...formData, setting_key: 'main' });
      }
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch {
      toast.error('Error al guardar antes de enviar');
      return;
    }

    // Construir URL absoluta del portal: tomar la URL actual y reemplazar el hash con la página del cliente
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
    <tr>
      <td>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">USUARIO (EMAIL)</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #0f172a;">${user.email}</p>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">CONTRASENA DE ACCESO</p>
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${user.password}</p>
      </td>
    </tr>
  </table>

  <p style="margin: 24px 0;">
    <a href="${portalUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">
      Acceder al Portal
    </a>
  </p>

  <p style="color: #94a3b8; font-size: 12px;">Si tienes algún problema para acceder, contacta con nosotros respondiendo a este email.</p>
</div>`,
      });
      toast.success(`Email de acceso enviado a ${user.email}`);
    } catch (error) {
      toast.error('Error al enviar el email');
    }
  };

  // Copia de seguridad
  const handleExportBackup = async () => {
    try {
      const [clientsData, buildingsData, equipmentData, revisionsData, incidentsData, settingsData, techniciansData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Building.list(),
        base44.entities.Equipment.list(),
        base44.entities.ScheduledRevision.list(),
        base44.entities.Incident.list(),
        base44.entities.AppSettings.list(),
        base44.entities.Technician.list(),
      ]);

      const backup = {
        version: '1.0',
        date: new Date().toISOString(),
        data: {
          clients: clientsData,
          buildings: buildingsData,
          equipment: equipmentData,
          revisions: revisionsData,
          incidents: incidentsData,
          settings: settingsData,
          technicians: techniciansData,
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clilux_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Copia de seguridad descargada');
    } catch (error) {
      toast.error('Error al crear copia de seguridad');
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('Formato de backup inválido');
      }

      // Restore data
      if (backup.data.clients?.length) {
        await base44.entities.Client.bulkCreate(backup.data.clients.map(({ id, created_date, updated_date, ...rest }) => rest));
      }
      if (backup.data.buildings?.length) {
        await base44.entities.Building.bulkCreate(backup.data.buildings.map(({ id, created_date, updated_date, ...rest }) => rest));
      }
      if (backup.data.equipment?.length) {
        await base44.entities.Equipment.bulkCreate(backup.data.equipment.map(({ id, created_date, updated_date, ...rest }) => rest));
      }

      toast.success('Copia de seguridad restaurada. Algunos datos pueden requerir ajustes manuales.');
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error('Error al restaurar: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Configuración" />

        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="bg-white flex-wrap">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apariencia
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
          </TabsList>

          <TabsContent value="empresa">
            <Card className="p-6 bg-white border-0 shadow-sm mb-6">
              <h3 className="font-semibold text-slate-800 mb-2">Datos de la Empresa</h3>
              <p className="text-sm text-slate-500 mb-6">Estos datos se utilizan en los contratos, facturas y documentos generados por la aplicación.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Nombre de la Empresa</Label>
                  <Input value={formData.company_name || ''} onChange={(e) => handleChange('company_name', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>CIF / NIF</Label>
                  <Input value={formData.company_cif || ''} onChange={(e) => handleChange('company_cif', e.target.value)} className="mt-1" placeholder="B12345678" />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <Input value={formData.company_address || ''} onChange={(e) => handleChange('company_address', e.target.value)} className="mt-1" placeholder="Calle Ejemplo, 1" />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input value={formData.company_city || ''} onChange={(e) => handleChange('company_city', e.target.value)} className="mt-1" placeholder="Madrid" />
                </div>
                <div>
                  <Label>Código Postal</Label>
                  <Input value={formData.company_postal_code || ''} onChange={(e) => handleChange('company_postal_code', e.target.value)} className="mt-1" placeholder="28001" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={formData.company_phone || ''} onChange={(e) => handleChange('company_phone', e.target.value)} className="mt-1" placeholder="+34 600 000 000" />
                </div>
                <div>
                  <Label>Email de Contacto</Label>
                  <Input type="email" value={formData.company_email || ''} onChange={(e) => handleChange('company_email', e.target.value)} className="mt-1" placeholder="info@empresa.com" />
                </div>
                <div>
                  <Label>Página Web</Label>
                  <Input value={formData.company_web || ''} onChange={(e) => handleChange('company_web', e.target.value)} className="mt-1" placeholder="www.empresa.com" />
                </div>
              </div>

              <h4 className="font-medium text-slate-700 mt-8 mb-4">Logo de la Empresa</h4>
              <div className="flex items-center gap-4">
                {formData.logo_url && (
                  <img src={formData.logo_url} alt="Logo" className="h-16 object-contain rounded-lg border p-1" />
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-empresa" />
                <label htmlFor="logo-upload-empresa">
                  <Button type="button" variant="outline" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Subir logo
                    </span>
                  </Button>
                </label>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="p-6 bg-white border-0 shadow-sm mb-6">
              <h3 className="font-semibold text-slate-800 mb-6">Marca de Agua para Documentos</h3>
              <h4 className="font-medium text-slate-700 mb-2">Marca de Agua</h4>
              <p className="text-sm text-slate-500 mb-3">Esta imagen aparecerá como marca de agua semitransparente en los certificados y documentos PDF generados.</p>
              <div className="flex items-center gap-4">
                {formData.watermark_url && (
                  <div className="relative h-20 w-32 border rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={formData.watermark_url} alt="Marca de agua" className="h-full w-full object-contain opacity-40" />
                    <span className="absolute bottom-1 left-1 text-xs text-slate-400 bg-white/70 px-1 rounded">Vista previa</span>
                  </div>
                )}
                <div className="space-y-2">
                  <input type="file" accept="image/*" onChange={async (e) => {
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
                  }} className="hidden" id="watermark-upload" />
                  <label htmlFor="watermark-upload">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Subir marca de agua
                      </span>
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

            <Card className="p-6 bg-white border-0 shadow-sm mt-6">
              <h3 className="font-semibold text-slate-800 mb-6">Apariencia de la Interfaz</h3>
              <h4 className="font-medium text-slate-700 mb-4">Colores de la Interfaz</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Color de Fondo</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.background_color || '#0f172a'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.background_color || '#0f172a'}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color de Botones</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.button_color || '#3b82f6'}
                      onChange={(e) => handleChange('button_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.button_color || '#3b82f6'}
                      onChange={(e) => handleChange('button_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color de Texto</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.text_color || '#ffffff'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.text_color || '#ffffff'}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color de Iconos</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.icon_color || '#60a5fa'}
                      onChange={(e) => handleChange('icon_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.icon_color || '#60a5fa'}
                      onChange={(e) => handleChange('icon_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color Primario</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color || '#1e293b'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color || '#1e293b'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Color de Acento</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.accent_color || '#10b981'}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.accent_color || '#10b981'}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: formData.background_color || '#0f172a' }}>
                <p className="text-sm mb-3" style={{ color: formData.text_color || '#ffffff' }}>Vista previa:</p>
                <div className="flex gap-4 flex-wrap">
                  <div 
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: formData.button_color || '#3b82f6', color: '#fff' }}
                  >
                    Botón
                  </div>
                  <div 
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: formData.primary_color || '#1e293b', color: '#fff' }}
                  >
                    Primario
                  </div>
                  <div 
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: formData.accent_color || '#10b981', color: '#fff' }}
                  >
                    Acento
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="technicians">
            <Card className="p-6 bg-white border-0 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-800">Gestión de Técnicos</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Los técnicos podrán ser asignados a revisiones e incidencias
                  </p>
                </div>
                <Link to={createPageUrl('Technicians')}>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Gestionar Técnicos
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Credenciales de Portal por Técnico</h3>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Consulta y modifica el email y contraseña de acceso al portal de cada técnico.
              </p>

              {technicians.length === 0 ? (
                <p className="text-center py-6 text-slate-400">No hay técnicos registrados.</p>
              ) : (
                <div className="space-y-4">
                  {technicians.map((tech) => {
                    const creds = techCredentials[tech.id] ?? {
                      portal_email: tech.portal_email || '',
                      portal_password: tech.portal_password || '',
                    };
                    const setCreds = (field, value) => {
                      setTechCredentials(prev => ({
                        ...prev,
                        [tech.id]: { ...creds, [field]: value },
                      }));
                    };
                    return (
                      <div key={tech.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="font-medium text-slate-800">{tech.name}</span>
                            <span className="text-xs text-slate-400">{tech.email}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTechMutation.mutate({ id: tech.id, data: creds })}
                            disabled={updateTechMutation.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Email de acceso</Label>
                            <Input
                              type="email"
                              value={creds.portal_email}
                              onChange={(e) => setCreds('portal_email', e.target.value)}
                              placeholder="tecnico@portal.com"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Contraseña</Label>
                            <div className="relative mt-1">
                              <Input
                                type={showTechPassword[tech.id] ? 'text' : 'password'}
                                value={creds.portal_password}
                                onChange={(e) => setCreds('portal_password', e.target.value)}
                                placeholder="••••••••"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-10 w-10"
                                onClick={() => setShowTechPassword(prev => ({ ...prev, [tech.id]: !prev[tech.id] }))}
                              >
                                {showTechPassword[tech.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="portal">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800">Usuarios del Portal Cliente</h3>
                <Button onClick={addClientUser} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir usuario
                </Button>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">
                Configura las credenciales de acceso para el portal de clientes.
              </p>

              {formData.client_users?.length > 0 ? (
                <div className="space-y-4">
                  {formData.client_users.map((user, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Cliente</Label>
                          <select
                            value={user.client_id}
                            onChange={(e) => updateClientUser(index, 'client_id', e.target.value)}
                            className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-slate-800"
                          >
                            <option value="">Seleccionar cliente...</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Email</Label>
                          <Input
                            type="email"
                            value={user.email}
                            onChange={(e) => updateClientUser(index, 'email', e.target.value)}
                            placeholder="cliente@email.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                         <Label className="text-xs">Contraseña</Label>
                         <div className="relative">
                           <Input
                             type={showPassword[index] ? 'text' : 'password'}
                             value={user.password}
                             onChange={(e) => updateClientUser(index, 'password', e.target.value)}
                             placeholder="••••••••"
                             className="mt-1 pr-10"
                           />
                           <Button
                             type="button"
                             variant="ghost"
                             size="icon"
                             className="absolute right-0 top-1 h-8 w-8"
                             onClick={() => setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))}
                           >
                             {showPassword[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </Button>
                         </div>
                        </div>
                        <div>
                         <Label className="text-xs">Permisos</Label>
                         <select
                           value={user.can_edit ? 'edit' : 'view'}
                           onChange={(e) => updateClientUser(index, 'can_edit', e.target.value === 'edit')}
                           className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                         >
                           <option value="view">Solo lectura</option>
                           <option value="edit">Puede editar</option>
                         </select>
                        </div>
                        <div className="flex items-end gap-2">
                         <Button 
                           variant="outline"
                           size="sm"
                           onClick={() => sendAccessEmail(user)}
                           title="Enviar credenciales por email"
                           className="text-blue-600 hover:text-blue-700"
                         >
                           <Send className="h-4 w-4 mr-1" />
                           Enviar acceso
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon"
                           onClick={() => removeClientUser(index)}
                         >
                           <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-400">
                  No hay usuarios configurados para el portal de clientes.
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">Copia de Seguridad y Exportación</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-6 border rounded-lg text-center">
                  <Download className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <h4 className="font-medium text-slate-800 mb-2">Descargar Local</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Descarga copia completa en JSON
                  </p>
                  <Button onClick={handleExportBackup} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>

                <div className="p-6 border rounded-lg text-center">
                  <UploadCloud className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <h4 className="font-medium text-slate-800 mb-2">Restaurar</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Importa desde archivo JSON
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    id="backup-upload"
                  />
                  <label htmlFor="backup-upload">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Seleccionar
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="p-6 border rounded-lg text-center">
                  <svg className="h-12 w-12 mx-auto text-purple-500 mb-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                  </svg>
                  <h4 className="font-medium text-slate-800 mb-2">Google Drive</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Guarda en tu Drive personal
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    Próximamente
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> La restauración añadirá registros sin eliminar los existentes. 
                  Se recomienda hacer copia antes de restaurar.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}