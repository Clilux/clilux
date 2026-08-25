import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyPassword, isHashed, hashPassword } from '../../shared/auth.ts';

// Kiosko de fichaje: pantalla compartida donde los técnicos se identifican con su PIN.
// El PIN se valida en servidor (service role) — nunca se exponen los PINes al cliente.
// Acciones: 'lookup' (validar PIN y devolver estado de hoy), 'entrada', 'pausa', 'salida'.

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToHours(m) {
  return Math.round((m / 60) * 100) / 100;
}
// Réplica de calcularHoras del frontend (horario-utils.js)
function calcularHoras(registro, jornadaDiaria = 8) {
  const intervalos = registro.intervalos || [];
  const pausas = registro.pausas || [];
  let totalMinsTrabajados = 0;
  let minutosPausa = 0;
  if (intervalos.length > 0) {
    intervalos.forEach(tramo => {
      if (tramo.entrada && tramo.salida) {
        const diff = timeToMinutes(tramo.salida) - timeToMinutes(tramo.entrada);
        if (diff > 0) totalMinsTrabajados += diff;
      }
    });
    pausas.forEach(p => {
      if (p.inicio && p.fin) {
        minutosPausa += Math.max(0, timeToMinutes(p.fin) - timeToMinutes(p.inicio));
      }
    });
    totalMinsTrabajados = Math.max(0, totalMinsTrabajados - minutosPausa);
  } else {
    if (!registro.hora_entrada || !registro.hora_salida) {
      return { horas_trabajadas: 0, horas_efectivas: 0, horas_normales: 0, horas_extra: 0, minutos_pausa: 0 };
    }
    const totalMins = timeToMinutes(registro.hora_salida) - timeToMinutes(registro.hora_entrada);
    if (totalMins <= 0) return { horas_trabajadas: 0, horas_efectivas: 0, horas_normales: 0, horas_extra: 0, minutos_pausa: 0 };
    pausas.forEach(p => {
      if (p.inicio && p.fin) minutosPausa += Math.max(0, timeToMinutes(p.fin) - timeToMinutes(p.inicio));
    });
    totalMinsTrabajados = Math.max(0, totalMins - minutosPausa);
  }
  const jornadaMins = jornadaDiaria * 60;
  return {
    horas_trabajadas: minutesToHours(totalMinsTrabajados + minutosPausa),
    horas_efectivas: minutesToHours(totalMinsTrabajados),
    horas_normales: minutesToHours(Math.min(totalMinsTrabajados, jornadaMins)),
    horas_extra: minutesToHours(Math.max(0, totalMinsTrabajados - jornadaMins)),
    minutos_pausa: minutosPausa,
  };
}

function pad(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Resumen del trabajador: últimos fichajes, horas del mes, alertas y vacaciones ──
async function buildSummary(base44, tech, allRecords) {
  const sorted = [...allRecords].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const recentRecords = sorted.slice(0, 6);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthRecords = allRecords.filter(r => (r.fecha || '').startsWith(monthPrefix));
  const monthHours = monthRecords.reduce((acc, r) => acc + (r.horas_efectivas || 0), 0);

  // Alerta: días laborables pasados (últimos 7) sin fichaje o sin cerrar
  const diasLaborables = tech.dias_laborables || [1, 2, 3, 4, 5];
  const missing = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (!diasLaborables.includes(d.getDay())) continue;
    const f = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const rec = allRecords.find(r => r.fecha === f);
    if (!rec) missing.push({ fecha: f, tipo: 'sin_fichaje' });
    else if (!rec.hora_salida && !rec.finalizada) missing.push({ fecha: f, tipo: 'sin_salida' });
  }

  // Cuenta atrás para vacaciones aprobadas
  let vacationCountdown = null;
  try {
    const ausencias = await base44.asServiceRole.entities.Ausencia.filter({
      technician_email: tech.email, tipo: 'vacaciones', estado: 'aprobada',
    });
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const future = ausencias
      .filter(a => a.fecha_inicio && new Date(a.fecha_inicio) > today0)
      .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''));
    if (future.length > 0) {
      const start = new Date(future[0].fecha_inicio);
      const days = Math.ceil((start - today0) / (1000 * 60 * 60 * 24));
      vacationCountdown = {
        fecha_inicio: future[0].fecha_inicio,
        days,
        dias_totales: future[0].dias_totales || 0,
      };
    }
  } catch (e) {}

  return { recentRecords, monthHours, missingAlert: missing.length ? missing : null, vacationCountdown };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { pin, action, hora, motivo, company_id, email, password } = body;

    // Activar kiosko: el gerente se identifica con email + contraseña y queda ligado a su empresa
    if (action === 'setup_login') {
      if (!email || !password) return Response.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
      const allTechs = await base44.asServiceRole.entities.Technician.list();
      const tech = allTechs.find(t =>
        (t.email || '').trim().toLowerCase() === String(email).trim().toLowerCase() &&
        t.status === 'active' && t.is_admin
      );
      if (!tech) return Response.json({ error: 'Gerente no válido o sin permisos' }, { status: 403 });
      const pwdOk = await verifyPassword(String(password), String(tech.portal_password || ''));
      if (!pwdOk) return Response.json({ error: 'Gerente no válido o sin permisos' }, { status: 403 });
      // Migrar contraseña legacy en texto plano a hash
      if (!isHashed(String(tech.portal_password || ''))) {
        try {
          const hashed = await hashPassword(String(password));
          await base44.asServiceRole.entities.Technician.update(tech.id, { portal_password: hashed });
        } catch { /* no bloquear */ }
      }
      let logo_url = '';
      try {
        const companies = await base44.asServiceRole.entities.Company.filter({ company_id: tech.company_id });
        logo_url = companies[0]?.logo_url || '';
      } catch {}
      return Response.json({ company_id: tech.company_id || '', company_name: tech.company_name || tech.company_id || '', logo_url, gerente_name: tech.name });
    }

    if (!pin || !action) {
      return Response.json({ error: 'pin y action requeridos' }, { status: 400 });
    }

    // Hora ajustada (opcional): el trabajador indica que ficha a una hora distinta
    // de la real. Debe justificarse (motivo). Se documenta en historial_modificaciones.
    const HORA_RE = /^\d{2}:\d{2}$/;
    let horaAjustada = null;
    if (hora && HORA_RE.test(hora)) {
      horaAjustada = hora;
      if (!motivo || !motivo.trim()) {
        return Response.json({ error: 'Debes indicar el motivo del ajuste de hora' }, { status: 400 });
      }
    }

    // Buscar técnico por PIN dentro de la empresa del kiosko (aislamiento multi-empresa).
    const techFilter = { pin: String(pin) };
    if (company_id) techFilter.company_id = String(company_id);
    const techs = await base44.asServiceRole.entities.Technician.filter(techFilter);
    const tech = techs[0];
    if (!tech || tech.status === 'inactive' || !tech.pin) {
      return Response.json({ error: 'PIN no válido' }, { status: 403 });
    }

    const fecha = todayStr();
    const jornadaDiaria = tech.horas_jornada_diaria || 8;
    const techPublic = {
      id: tech.id,
      name: tech.name,
      email: tech.email,
      company_id: tech.company_id || '',
      company_name: tech.company_name || '',
      horas_jornada_diaria: jornadaDiaria,
      is_admin: !!tech.is_admin,
    };

    // Todos los registros del técnico (se reutilizan para hoy + resumen)
    const allRecords = await base44.asServiceRole.entities.RegistroHorario.filter({ technician_email: tech.email });
    const todayRecord = allRecords.find(r => r.fecha === fecha) || null;
    const summary = await buildSummary(base44, tech, allRecords);

    // ── lookup: validar PIN y devolver estado + resumen ─────────
    if (action === 'lookup') {
      return Response.json({ technician: techPublic, todayRecord, summary });
    }

    // ── entrada: abrir un nuevo intervalo ─────────────────────
    if (action === 'entrada') {
      const realNow = nowStr();
      // No se puede fichar una entrada en el futuro
      if (horaAjustada && horaAjustada > realNow) {
        return Response.json({ error: 'La hora no puede ser posterior a la actual' }, { status: 400 });
      }
      const horaRegistro = horaAjustada || realNow;
      const nuevoIntervalo = { entrada: horaRegistro, salida: null };
      let updated;
      if (todayRecord) {
        const intervalos = [...(todayRecord.intervalos || []), nuevoIntervalo];
        const updateData = { intervalos, hora_salida: null, finalizada: false };
        if (horaAjustada) {
          updateData.historial_modificaciones = [
            ...(todayRecord.historial_modificaciones || []),
            { fecha_mod: new Date().toISOString(), usuario: tech.name, campo: 'hora_entrada', valor_anterior: realNow, valor_nuevo: horaRegistro, motivo: motivo.trim() },
          ];
        }
        updated = await base44.asServiceRole.entities.RegistroHorario.update(todayRecord.id, updateData);
      } else {
        const createData = {
          technician_email: tech.email,
          technician_name: tech.name,
          technician_id: tech.id || '',
          company_id: tech.company_id || '',
          fecha,
          hora_entrada: horaRegistro,
          tipo_jornada: 'normal',
          pausas: [],
          intervalos: [nuevoIntervalo],
        };
        if (horaAjustada) {
          createData.historial_modificaciones = [
            { fecha_mod: new Date().toISOString(), usuario: tech.name, campo: 'hora_entrada', valor_anterior: realNow, valor_nuevo: horaRegistro, motivo: motivo.trim() },
          ];
        }
        updated = await base44.asServiceRole.entities.RegistroHorario.create(createData);
      }
      return Response.json({ technician: techPublic, todayRecord: updated, summary, action: 'entrada', hora: horaRegistro });
    }

    // ── pausa: cerrar el intervalo activo sin finalizar ────────
    if (action === 'pausa') {
      if (!todayRecord) return Response.json({ error: 'No hay jornada iniciada hoy' }, { status: 400 });
      const now = nowStr();
      const intervalos = (todayRecord.intervalos || []).map((t, i, arr) =>
        i === arr.length - 1 && !t.salida ? { ...t, salida: now } : t
      );
      const updated = await base44.asServiceRole.entities.RegistroHorario.update(todayRecord.id, {
        intervalos, hora_salida: now,
      });
      return Response.json({ technician: techPublic, todayRecord: updated, summary, action: 'pausa', hora: now });
    }

    // ── salida: cerrar intervalo, calcular totales y finalizar ─
    if (action === 'salida') {
      if (!todayRecord) return Response.json({ error: 'No hay jornada iniciada hoy' }, { status: 400 });
      const realNow = nowStr();
      const intervalosActuales = todayRecord.intervalos || [];
      const ultimoTramo = intervalosActuales[intervalosActuales.length - 1];
      const entradaUltimo = ultimoTramo?.entrada;
      // La salida no puede ser anterior a la entrada del tramo ni posterior a la hora real
      if (horaAjustada) {
        if (entradaUltimo && horaAjustada < entradaUltimo) {
          return Response.json({ error: 'La salida no puede ser anterior a la entrada' }, { status: 400 });
        }
        if (horaAjustada > realNow) {
          return Response.json({ error: 'La hora no puede ser posterior a la actual' }, { status: 400 });
        }
      }
      const horaRegistro = horaAjustada || realNow;
      const intervalos = intervalosActuales.map((t, i, arr) =>
        i === arr.length - 1 && !t.salida ? { ...t, salida: horaRegistro } : t
      );
      const calcs = calcularHoras({ ...todayRecord, intervalos, hora_salida: horaRegistro }, jornadaDiaria);
      const updateData = { intervalos, hora_salida: horaRegistro, finalizada: true, ...calcs };
      if (horaAjustada) {
        updateData.historial_modificaciones = [
          ...(todayRecord.historial_modificaciones || []),
          { fecha_mod: new Date().toISOString(), usuario: tech.name, campo: 'hora_salida', valor_anterior: realNow, valor_nuevo: horaRegistro, motivo: motivo.trim() },
        ];
      }
      const updated = await base44.asServiceRole.entities.RegistroHorario.update(todayRecord.id, updateData);
      return Response.json({ technician: techPublic, todayRecord: updated, summary, action: 'salida', hora: horaRegistro, calcs });
    }

    return Response.json({ error: 'action no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}