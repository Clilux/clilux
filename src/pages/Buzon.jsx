import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Archive, Trash2, Inbox, ArchiveRestore, CheckCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import NavHeader from '@/components/navigation/NavHeader';
import PullToRefresh from '@/components/PullToRefresh';
import { toast } from 'sonner';
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  archivarNotificacion,
  eliminarNotificacion,
} from '@/lib/buzon';

const VALID_ROUTES = new Set([
  'AIConsulta','BuildingDetail','BuildingForm','Buildings','Calendar','CertificadoRITE',
  'ClientBuildings','ClientDetail','ClientEquipment','ClientEquipmentDetail','ClientForm',
  'ClientIncidentDetail','ClientIncidents','ClientReportIncident','ClientRevisions','Clients',
  'Documentacion','EditScheduledRevision','Equipment','EquipmentDetail','EquipmentForm',
  'Home','HomeCliente','HomeTecnico','IncidentDetail','IncidentForm','Incidents',
  'LibroMantenimientoRITE','Maps','MemoriaTecnicaRITE','MenuCustomization','MenuInicio',
  'Reports','RevisionForm','ScanEquipment','ScanEquipmentTech','Settings',
  'TechnicianManagement','Technicians','TutorialEquipo','ClientDocuments',
  'VetaCatalogo','ContratoMantenimiento','CarpetaContratos','ControlClimatizacion',
  'ControlLoxone','AdminPanel','ControlHorario','GestionAusencias','TechnicianProfile',
  'StelClientes','StelClientosTab','ClientScada','ImportEquipment','ControlObras',
  'ObraDetail','PanelEdificios','NfcReader','KioskoFichaje','GestionTrabajo','Buzon',
]);

export default function Buzon() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const email =
    sessionStorage.getItem('technician_email') ||
    sessionStorage.getItem('client_id') ||
    localStorage.getItem('user_email') ||
    '';
  const [tab, setTab] = useState('recibidas');

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['buzon', email] });
  };

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['buzon', email],
    queryFn: () => listarNotificaciones(email),
    enabled: !!email,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const recibidas = notifs.filter(n => !n.archived);
  const archivadas = notifs.filter(n => n.archived);
  const lista = tab === 'recibidas' ? recibidas : archivadas;
  const noLeidas = recibidas.filter(n => !n.leida).length;

  const abrir = async (n) => {
    if (!n.leida) await marcarNotificacionLeida(email, n.id);
    queryClient.invalidateQueries({ queryKey: ['buzon', email] });
    if (n.link) {
      const base = n.link.replace(/^\/+/, '').split('?')[0].split('/')[0];
      navigate(VALID_ROUTES.has(base) ? n.link : '/ControlHorario');
    }
  };

  const onArchivar = async (n, archivar = true) => {
    try {
      await archivarNotificacion(email, n.id, archivar);
      queryClient.invalidateQueries({ queryKey: ['buzon', email] });
      toast.success(archivar ? 'Notificación archivada' : 'Notificación restaurada');
    } catch {
      toast.error('No se pudo archivar');
    }
  };

  const onEliminar = async (n) => {
    try {
      await eliminarNotificacion(email, n.id);
      queryClient.invalidateQueries({ queryKey: ['buzon', email] });
      toast.success('Notificación eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const todasLeidas = async () => {
    await marcarTodasLeidas(email);
    queryClient.invalidateQueries({ queryKey: ['buzon', email] });
    toast.success('Marcadas como leídas');
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-3xl mx-auto">
          <NavHeader title="Buzón de mensajes" />

          {/* Pestañas */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
            <TabButton active={tab === 'recibidas'} onClick={() => setTab('recibidas')} icon={Inbox} label="Recibidas" count={recibidas.length} badge={noLeidas} />
            <TabButton active={tab === 'archivadas'} onClick={() => setTab('archivadas')} icon={Archive} label="Archivadas" count={archivadas.length} />
            {tab === 'recibidas' && noLeidas > 0 && (
              <button onClick={todasLeidas} className="ml-auto text-xs text-brand-600 hover:underline flex items-center gap-1">
                <CheckCheck className="h-3.5 w-3.5" />Marcar leídas
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : lista.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              {tab === 'recibidas' ? <Inbox className="h-12 w-12 mx-auto mb-3 text-slate-300" /> : <Archive className="h-12 w-12 mx-auto mb-3 text-slate-300" />}
              <p className="text-sm">{tab === 'recibidas' ? 'No hay notificaciones' : 'No hay notificaciones archivadas'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lista.map(n => (
                <div key={n.id} className={cn(
                  'rounded-xl border bg-card p-3 sm:p-4 transition-shadow hover:shadow-sm flex gap-3',
                  !n.leida && tab === 'recibidas' ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200'
                )}>
                  <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.leida ? 'bg-transparent' : 'bg-brand-500')} />
                  <button onClick={() => abrir(n)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{n.titulo}</p>
                      {n.link && <Mail className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.mensaje}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: es }) : ''}
                    </p>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    {tab === 'recibidas' ? (
                      <button onClick={() => onArchivar(n, true)} title="Archivar" className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                        <Archive className="h-4 w-4" />
                      </button>
                    ) : (
                      <button onClick={() => onArchivar(n, false)} title="Restaurar" className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                        <ArchiveRestore className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => onEliminar(n)} title="Eliminar" className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, badge }) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
      active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
    )}>
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">{count}</span>}
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
    </button>
  );
}