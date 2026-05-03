import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import {
  Users, UserCheck, UserPlus, Send, Building2,
  Shield, Loader2, Trash2, RefreshCw, Link2
} from 'lucide-react';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'user', techName: '', companyName: '' });
  const [linkData, setLinkData] = useState({ techId: '', companyName: '', companyId: '' });
  const [sending, setSending] = useState(false);

  const { data: technicians = [], isLoading: loadingTechs } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Technician.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Técnico eliminado');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acceso restringido</h2>
          <p className="text-slate-500">Solo los administradores pueden acceder a este panel.</p>
        </Card>
      </div>
    );
  }

  const handleInviteTechnician = async () => {
    if (!inviteData.email) return;
    setSending(true);
    try {
      // Invite the user to the platform
      await base44.users.inviteUser(inviteData.email, 'user');

      // Create or update the Technician record
      const existing = technicians.find(t => t.email === inviteData.email || t.user_email === inviteData.email);
      if (existing) {
        await base44.entities.Technician.update(existing.id, {
          user_email: inviteData.email,
          invited_at: new Date().toISOString(),
          ...(inviteData.companyName && { company_name: inviteData.companyName, company_id: inviteData.companyName.toLowerCase().replace(/\s+/g, '_') }),
        });
      } else {
        await base44.entities.Technician.create({
          name: inviteData.techName || inviteData.email,
          email: inviteData.email,
          user_email: inviteData.email,
          company_name: inviteData.companyName || '',
          company_id: inviteData.companyName ? inviteData.companyName.toLowerCase().replace(/\s+/g, '_') : '',
          status: 'active',
          invited_at: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(`Invitación enviada a ${inviteData.email}`);
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'user', techName: '', companyName: '' });
    } catch (err) {
      toast.error('Error al enviar la invitación: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };

  const handleLinkCompany = async () => {
    if (!linkData.techId || !linkData.companyName) return;
    setSending(true);
    try {
      const companyId = linkData.companyId || linkData.companyName.toLowerCase().replace(/\s+/g, '_');
      await base44.entities.Technician.update(linkData.techId, {
        company_name: linkData.companyName,
        company_id: companyId,
      });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Empresa vinculada correctamente');
      setShowLinkDialog(false);
      setLinkData({ techId: '', companyName: '', companyId: '' });
    } catch (err) {
      toast.error('Error al vincular empresa: ' + (err.message || ''));
    } finally {
      setSending(false);
    }
  };

  const handleReinvite = async (tech) => {
    const email = tech.user_email || tech.email;
    if (!email) return;
    try {
      await base44.users.inviteUser(email, 'user');
      await base44.entities.Technician.update(tech.id, { invited_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success(`Invitación reenviada a ${email}`);
    } catch {
      toast.error('Error al reenviar la invitación');
    }
  };

  // Group technicians by company
  const companies = {};
  technicians.forEach(t => {
    const key = t.company_id || '__sin_empresa__';
    const label = t.company_name || 'Sin empresa';
    if (!companies[key]) companies[key] = { label, techs: [] };
    companies[key].techs.push(t);
  });

  const clientsByTech = (techEmail) =>
    clients.filter(c => c.assigned_technician === techEmail || c.company_id === technicians.find(t => t.email === techEmail)?.company_id).length;

  // Empresas únicas ya existentes en técnicos
  const existingCompanies = [...new Map(
    technicians.filter(t => t.company_id && t.company_name)
      .map(t => [t.company_id, { id: t.company_id, name: t.company_name }])
  ).values()];

  // Técnicos sin empresa asignada
  const techsWithoutCompany = technicians.filter(t => !t.company_id);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Panel de Administración" />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{technicians.length}</p>
                <p className="text-xs text-slate-500">Técnicos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{technicians.filter(t => t.invited_at).length}</p>
                <p className="text-xs text-slate-500">Con acceso</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
                <p className="text-xs text-slate-500">Clientes</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mb-5">
          {techsWithoutCompany.length > 0 && (
            <Button
              onClick={() => setShowLinkDialog(true)}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Vincular empresa ({techsWithoutCompany.length})
            </Button>
          )}
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar técnico
          </Button>
        </div>

        {/* Technicians grouped by company */}
        <div className="space-y-6">
          {Object.entries(companies).map(([companyId, { label, techs }]) => (
            <div key={companyId}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-400" />
                <h3 className="font-semibold text-slate-700">{label}</h3>
                <Badge variant="secondary" className="text-xs">{techs.length} técnico{techs.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {techs.map(tech => {
                  const accessEmail = tech.user_email || tech.email;
                  const hasAccess = !!tech.invited_at;
                  return (
                    <Card key={tech.id} className="p-4 bg-white border-0 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                            ${hasAccess ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {tech.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{tech.name}</p>
                            <p className="text-xs text-slate-500">{accessEmail}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{clientsByTech(tech.email)} cliente{clientsByTech(tech.email) !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {hasAccess ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                              Pendiente
                            </Badge>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600"
                              title="Reenviar invitación"
                              onClick={() => handleReinvite(tech)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-500"
                              onClick={() => { if (window.confirm('¿Eliminar técnico?')) deleteMutation.mutate(tech.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {technicians.length === 0 && !loadingTechs && (
            <Card className="p-8 text-center bg-white border-0 shadow-sm">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">Aún no hay técnicos registrados</p>
              <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Invitar primer técnico
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Link company dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular técnico a empresa existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Técnico sin empresa</Label>
              <Select value={linkData.techId} onValueChange={(v) => setLinkData(p => ({ ...p, techId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona un técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {techsWithoutCompany.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa</Label>
              {existingCompanies.length > 0 ? (
                <Select
                  value={linkData.companyId}
                  onValueChange={(v) => {
                    const found = existingCompanies.find(c => c.id === v);
                    setLinkData(p => ({ ...p, companyId: v, companyName: found?.name || '' }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona empresa existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__nueva__">+ Nueva empresa...</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(linkData.companyId === '__nueva__' || existingCompanies.length === 0) && (
                <Input
                  className="mt-2"
                  placeholder="Nombre de la nueva empresa"
                  value={linkData.companyName}
                  onChange={(e) => setLinkData(p => ({ ...p, companyName: e.target.value, companyId: '' }))}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleLinkCompany}
                disabled={!linkData.techId || !linkData.companyName || sending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Vincular empresa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar técnico al sistema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nombre del técnico</Label>
              <Input
                value={inviteData.techName}
                onChange={(e) => setInviteData(p => ({ ...p, techName: e.target.value }))}
                placeholder="Juan García"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData(p => ({ ...p, email: e.target.value }))}
                placeholder="tecnico@empresa.com"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">Recibirá un email para crear su cuenta</p>
            </div>
            <div>
              <Label>Empresa / Grupo</Label>
              <Input
                value={inviteData.companyName}
                onChange={(e) => setInviteData(p => ({ ...p, companyName: e.target.value }))}
                placeholder="Nombre de la empresa"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">Los técnicos de la misma empresa comparten clientes</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleInviteTechnician}
                disabled={!inviteData.email || sending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar invitación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}