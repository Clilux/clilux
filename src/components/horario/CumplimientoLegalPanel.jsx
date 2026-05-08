import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldCheck, AlertTriangle, CheckCircle2, Mail, Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { formatHoras } from '@/lib/horario-utils';
import { useToast } from '@/components/ui/use-toast';

// RD-ley 8/2019 límites legales
const MAX_HORAS_EXTRA_ANUALES = 80;
const MAX_HORAS_DIARIAS = 9;

function EstadoBadge({ estado }) {
  if (estado === 'ok') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3 w-3" />Correcto</Badge>;
  if (estado === 'aviso') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><AlertTriangle className="h-3 w-3" />Aviso</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1"><AlertTriangle className="h-3 w-3" />Exceso</Badge>;
}

export default function CumplimientoLegalPanel({ technicians, myTechRecord }) {
  const { toast } = useToast();
  const [refDate, setRefDate] = useState(new Date());
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const mes = format(refDate, 'MMMM yyyy', { locale: es });
  const dateStart = format(startOfMonth(refDate), 'yyyy-MM-dd');
  const dateEnd = format(endOfMonth(refDate), 'yyyy-MM-dd');

  // Para calcular extras anuales, necesitamos el año completo
  const yearStart = format(new Date(refDate.getFullYear(), 0, 1), 'yyyy-MM-dd');
  const yearEnd = format(new Date(refDate.getFullYear(), 11, 31), 'yyyy-MM-dd');

  const companyTechs = technicians.filter(t =>
    !myTechRecord?.company_id || t.company_id === myTechRecord?.company_id
  );

  const { data: registrosMes = [], isLoading: loadingMes } = useQuery({
    queryKey: ['cumplimiento-mes', dateStart, dateEnd],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 2000);
      return all.filter(r => r.fecha >= dateStart && r.fecha <= dateEnd);
    },
  });

  const { data: registrosAnio = [], isLoading: loadingAnio } = useQuery({
    queryKey: ['cumplimiento-anio', yearStart, yearEnd],
    queryFn: async () => {
      const all = await base44.entities.RegistroHorario.list('-fecha', 5000);
      return all.filter(r => r.fecha >= yearStart && r.fecha <= yearEnd);
    },
  });

  const isLoading = loadingMes || loadingAnio;

  const datosPorTecnico = useMemo(() => {
    return companyTechs.map(tech => {
      const email = tech.user_email || tech.email;
      const jornadaDiaria = tech.horas_jornada_diaria || 8;

      const recsMes = registrosMes.filter(r => r.technician_email === email);
      const recsAnio = registrosAnio.filter(r => r.technician_email === email);

      const diasTrabajados = new Set(recsMes.map(r => r.fecha)).size;
      const horasNormalesMes = recsMes.reduce((a, r) => a + (r.horas_normales || 0), 0);
      const horasExtraMes = recsMes.reduce((a, r) => a + (r.horas_extra || 0), 0);
      const horasExtraAnio = recsAnio.reduce((a, r) => a + (r.horas_extra || 0), 0);

      // Jornadas con más de MAX_HORAS_DIARIAS
      const jornadasExcesivas = recsMes.filter(r => (r.horas_efectivas || 0) > MAX_HORAS_DIARIAS);

      // Estado de horas extra anuales
      const pctExtra = (horasExtraAnio / MAX_HORAS_EXTRA_ANUALES) * 100;
      let estadoExtra = 'ok';
      if (horasExtraAnio >= MAX_HORAS_EXTRA_ANUALES) estadoExtra = 'exceso';
      else if (pctExtra >= 75) estadoExtra = 'aviso';

      const estadoJornada = jornadasExcesivas.length > 0 ? 'exceso' : 'ok';

      return {
        id: tech.id,
        name: tech.name,
        email,
        diasTrabajados,
        horasNormalesMes,
        horasExtraMes,
        horasExtraAnio,
        jornadasExcesivas: jornadasExcesivas.length,
        estadoExtra,
        estadoJornada,
        pctExtra: Math.min(100, Math.round(pctExtra)),
        jornadaDiaria,
      };
    }).filter(t => t.diasTrabajados > 0 || t.horasExtraAnio > 0);
  }, [companyTechs, registrosMes, registrosAnio]);

  const totalAlertas = datosPorTecnico.filter(t => t.estadoExtra !== 'ok' || t.estadoJornada !== 'ok').length;

  const navMes = (dir) => {
    setRefDate(d => subMonths(new Date(d.getFullYear(), d.getMonth(), 1), -dir));
  };

  const sendEmail = async (tech) => {
    setSendingId(tech.id);
    try {
      await base44.functions.invoke('enviarResumenHorario', {
        email: tech.email,
        name: tech.name,
        mes,
        diasTrabajados: tech.diasTrabajados,
        horasNormalesMes: formatHoras(tech.horasNormalesMes),
        horasExtraMes: formatHoras(tech.horasExtraMes),
        horasExtraAnio: formatHoras(tech.horasExtraAnio),
        pctExtra: tech.pctExtra,
        jornadasExcesivas: tech.jornadasExcesivas,
        estadoExtra: tech.estadoExtra,
      });
      toast({ title: 'Email enviado', description: `Resumen enviado a ${tech.email}` });
    } catch (e) {
      toast({ title: 'Error al enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const sendAllEmails = async () => {
    setSendingAll(true);
    let ok = 0;
    for (const tech of datosPorTecnico) {
      try {
        await base44.functions.invoke('enviarResumenHorario', {
          email: tech.email,
          name: tech.name,
          mes,
          diasTrabajados: tech.diasTrabajados,
          horasNormalesMes: formatHoras(tech.horasNormalesMes),
          horasExtraMes: formatHoras(tech.horasExtraMes),
          horasExtraAnio: formatHoras(tech.horasExtraAnio),
          pctExtra: tech.pctExtra,
          jornadasExcesivas: tech.jornadasExcesivas,
          estadoExtra: tech.estadoExtra,
        });
        ok++;
      } catch (e) {
        console.error('Error enviando a', tech.email, e);
      }
    }
    setSendingAll(false);
    toast({ title: `${ok} resúmenes enviados`, description: `Resúmenes mensuales enviados a ${ok} de ${datosPorTecnico.length} técnicos.` });
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-800 text-base">Cumplimiento RD-ley 8/2019</h2>
            <p className="text-xs text-slate-500">Control de registro horario · Límite 80h extra/año · Máx. 9h/jornada</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold text-slate-700 min-w-36 text-center capitalize">{mes}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navMes(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{datosPorTecnico.length}</p>
          <p className="text-xs text-slate-500">Técnicos activos</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-500">
            {formatHoras(datosPorTecnico.reduce((a, t) => a + t.horasExtraMes, 0))}
          </p>
          <p className="text-xs text-slate-500">H. extra en {format(refDate, 'MMMM', { locale: es })}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">
            {datosPorTecnico.reduce((a, t) => a + t.jornadasExcesivas, 0)}
          </p>
          <p className="text-xs text-slate-500">Jornadas &gt;9h este mes</p>
        </Card>
        <Card className={`p-4 border-0 shadow-sm text-center ${totalAlertas > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className={`text-2xl font-bold ${totalAlertas > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{totalAlertas}</p>
          <p className="text-xs text-slate-500">Alertas activas</p>
        </Card>
      </div>

      {/* Info legal */}
      <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          Según el <strong>RD-ley 8/2019</strong>, las empresas deben llevar un registro diario de jornada. Las horas extraordinarias no pueden superar <strong>80h anuales</strong> y la jornada ordinaria máxima es de <strong>9 horas diarias</strong>. El registro debe conservarse durante 4 años.
        </span>
      </div>

      {/* Tabla por técnico */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm">Estado por técnico · {mes}</h3>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={sendAllEmails}
            disabled={sendingAll || datosPorTecnico.length === 0}
          >
            {sendingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Enviar resumen a todos
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />Cargando datos...
          </div>
        ) : datosPorTecnico.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Sin registros para este período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 text-slate-500 font-medium">Técnico</th>
                  <th className="text-center p-3 text-slate-500 font-medium">Días trabajados</th>
                  <th className="text-center p-3 text-slate-500 font-medium">H. normales mes</th>
                  <th className="text-center p-3 text-slate-500 font-medium">H. extra mes</th>
                  <th className="text-center p-3 text-slate-500 font-medium">H. extra año</th>
                  <th className="text-center p-3 text-slate-500 font-medium">% límite 80h</th>
                  <th className="text-center p-3 text-slate-500 font-medium">Jornadas &gt;9h</th>
                  <th className="text-center p-3 text-slate-500 font-medium">Estado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {datosPorTecnico.map((t) => {
                  const estadoGlobal = t.estadoExtra === 'exceso' || t.estadoJornada === 'exceso' ? 'exceso'
                    : t.estadoExtra === 'aviso' ? 'aviso' : 'ok';
                  return (
                    <tr key={t.id} className={`border-b border-slate-50 hover:bg-slate-50 ${estadoGlobal === 'exceso' ? 'bg-red-50/30' : estadoGlobal === 'aviso' ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-3">
                        <p className="font-medium text-slate-700">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.email}</p>
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700">{t.diasTrabajados}</td>
                      <td className="p-3 text-center font-semibold text-blue-600">{formatHoras(t.horasNormalesMes)}</td>
                      <td className="p-3 text-center font-semibold text-orange-500">{t.horasExtraMes > 0 ? formatHoras(t.horasExtraMes) : '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${t.estadoExtra === 'exceso' ? 'text-red-600' : t.estadoExtra === 'aviso' ? 'text-amber-600' : 'text-slate-700'}`}>
                          {formatHoras(t.horasExtraAnio)}
                        </span>
                        <span className="text-xs text-slate-400"> / 80h</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${t.pctExtra >= 100 ? 'bg-red-500' : t.pctExtra >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${t.pctExtra}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{t.pctExtra}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {t.jornadasExcesivas > 0
                          ? <span className="font-bold text-red-600">{t.jornadasExcesivas}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        <EstadoBadge estado={estadoGlobal} />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50 px-2 whitespace-nowrap"
                          onClick={() => sendEmail(t)}
                          disabled={sendingId === t.id || sendingAll}
                        >
                          {sendingId === t.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Mail className="h-3 w-3" />}
                          Enviar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}