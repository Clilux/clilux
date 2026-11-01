import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Building2, Phone, Mail, Globe, MapPin, BadgeCheck, Settings,
} from 'lucide-react';

/**
 * Ficha de empresa (solo lectura).
 * El gerente configura todo desde /Configuracion; aquí solo ve los datos,
 * con un acceso directo a Configuración.
 */
export default function CompanyMenuDialog({ company, isGerente, open, onOpenChange }) {
  const navigate = useNavigate();
  if (!company) return null;

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
            {company.name || 'Empresa'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {company.logo_url ? (
                <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" />
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

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Field icon={Building2} label="CIF" value={company.cif} />
            <Field icon={Phone} label="Teléfono" value={company.phone} />
            <div className="col-span-2"><Field icon={MapPin} label="Dirección" value={company.address} /></div>
            <Field icon={MapPin} label="Código postal" value={company.postal_code} />
            <Field icon={MapPin} label="Ciudad" value={company.city} />
            <Field icon={MapPin} label="Provincia" value={company.province} />
            <Field icon={Mail} label="Email" value={company.email} />
            <div className="col-span-2"><Field icon={Globe} label="Web" value={company.web} /></div>
            <div className="col-span-2"><Field icon={BadgeCheck} label="Habilitación REP" value={company.habilitacion_rep} /></div>
          </div>

          {isGerente && (
            <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
              <Button onClick={() => { onOpenChange?.(false); navigate('/Configuracion'); }} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                <Settings className="h-4 w-4 mr-2" /> Ir a Configuración
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}