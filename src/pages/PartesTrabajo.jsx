import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TechnicianSidebar from '@/components/horario/TechnicianSidebar';
import ParteTrabajoCard from '@/components/partes/ParteTrabajoCard';
import ParteTrabajoForm from '@/components/partes/ParteTrabajoForm';
import { usePartesTrabajo } from '@/hooks/usePartesTrabajo';
import { ChevronLeft, ChevronRight, ClipboardList, Clock, Euro, Loader2, Plus, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PartesTrabajo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));
  const [workerFilter, setWorkerFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const {
    partes, isLoading, technicians, techRecord, isAdmin, veTodo, hideRates,
    isSessionTech, effEmail, deleteParte, refresh,
  } = usePartesTrabajo({ month: mes });

  const mesDate = new Date(`${mes}-01T12:00:00`);

  const filtered = useMemo(
    () => (workerFilter === 'all' ? partes : partes.filter(p => p.technician_email === workerFilter)),
    [partes, workerFilter]
  );

  const totalHoras = filtered.reduce((s, p) => s + (Number(p.horas) || 0), 0);
  const totalCoste = filtered.reduce((s, p) => s + (Number(p.coste_total) || 0), 0);

  // Resumen de horas y coste por trabajador (solo para quien ve todo el equipo)
  const porTrabajador = useMemo(() => {
    const map = {};
    partes.forEach(p => {
      const key = p.technician_email || 'sin';
      if (!map[key]) map[key] = { email: key, name: p.technician_name || p.technician_email, horas: 0, coste: 0, partes: 0 };
      map[key].horas += Number(p.horas) || 0;
      map[key].coste += Number(p.coste_total) || 0;
      map[key].partes += 1;
    });
    return Object.values(map).sort((a, b) => b.horas - a.horas);
  }, [partes]);

  const handleDelete = async (parte) => {
    if (!window.confirm(`¿Eliminar el parte del ${parte.fecha} de ${parte.technician_name || ''}?`)) return;
    await deleteParte(parte.id);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_email');
    sessionStorage.removeItem('technician_id');
    localStorage.removeItem('clilux_tech_email');
    localStorage.removeItem('clilux_tech_password');
    if (isSessionTech) navigate(createPageUrl('MenuInicio'));
    else base44.auth.logout(createPageUrl('MenuInicio'));
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <TechnicianSidebar
        isSessionTech={isSessionTech}
        isAdmin={isAdmin}
        isLoading={false}
        onLogout={handleLogout}
        techEmail={effEmail} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(createPageUrl('HomeTecnico'))} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
            <ChevronLeft className="h-4 w-4" />Volver al inicio
          </button>

          <Card className="p-5 bg-white border-0 shadow-sm mb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Partes de trabajo</h1>
                  <p className="text-sm text-slate-500">
                    {veTodo ? 'Horas del equipo por cliente y obra, con su coste.' : 'Registra tus horas diarias por cliente y obra.'}
                  </p>
                </div>
              </div>
              <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />Nuevo parte
              </Button>
            </div>
          </Card>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMes(format(new Date(mesDate.getFullYear(), mesDate.getMonth() - 1, 1), 'yyyy-MM'))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-slate-700 text-sm min-w-40 text-center capitalize">{format(mesDate, 'MMMM yyyy', { locale: es })}</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMes(format(new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 1), 'yyyy-MM'))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {veTodo && (
              <Select value={workerFilter} onValueChange={setWorkerFilter}>
                <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="Todos los trabajadores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los trabajadores</SelectItem>
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.email || t.user_email}>{t.name || t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Resumen */}
          <div className={`grid grid-cols-1 ${hideRates ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 mb-5`}>
            <Card className="p-4 bg-white border-0 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-700">{filtered.length}</p>
              <p className="text-xs text-slate-500">Partes del mes</p>
            </Card>
            <Card className="p-4 bg-white border-0 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />{totalHoras.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-slate-500">Horas registradas</p>
            </Card>
            {!hideRates && (
              <Card className="p-4 bg-white border-0 shadow-sm text-center">
                <p className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1">
                  <Euro className="h-4 w-4" />{totalCoste.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500">Coste de mano de obra</p>
              </Card>
            )}
          </div>

          {/* Horas por trabajador */}
          {veTodo && porTrabajador.length > 0 && (
            <Card className="bg-white border-0 shadow-sm mb-5 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Horas por trabajador</span>
                <span className="text-xs text-slate-400 ml-auto capitalize">{format(mesDate, 'MMMM yyyy', { locale: es })}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {porTrabajador.map(t => (
                  <div key={t.email} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="flex-1 text-sm text-slate-700 truncate">{t.name}</span>
                    <Badge variant="secondary" className="text-xs">{t.partes} partes</Badge>
                    <span className="text-sm font-semibold text-blue-600 w-16 text-right">{t.horas.toLocaleString('es-ES')} h</span>
                    {!hideRates && (
                      <span className="text-sm text-slate-600 w-24 text-right">
                        {t.coste.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Listado */}
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Partes registrados</span>
              <span className="text-xs text-slate-400">{filtered.length} partes</span>
            </div>
            {isLoading ? (
              <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <ClipboardList className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                No hay partes este mes. Crea el primero con el botón «Nuevo parte».
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <ParteTrabajoCard
                    key={p.id}
                    parte={p}
                    hideRates={hideRates}
                    showWorker={veTodo}
                    canEdit={isAdmin || p.technician_email === effEmail}
                    onEdit={(x) => { setEditing(x); setShowForm(true); }}
                    onDelete={handleDelete} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showForm && (
        <ParteTrabajoForm
          parte={editing}
          onClose={() => { setShowForm(false); setEditing(null); refresh(); queryClient.invalidateQueries({ queryKey: ['partes-obra'] }); }} />
      )}
    </div>
  );
}