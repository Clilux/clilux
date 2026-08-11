import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { pin, action } = body;

    if (!pin || !action) {
      return Response.json({ error: 'pin y action requeridos' }, { status: 400 });
    }

    // Buscar técnico por PIN (service role). El PIN actúa como factor de autenticación del kiosko.
    const techs = await base44.asServiceRole.entities.Technician.filter({ pin: String(pin) });
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
    };

    // Registro de hoy
    const existing = await base44.asServiceRole.entities.RegistroHorario.filter({ technician_email: tech.email, fecha });
    const todayRecord = existing[0] || null;

    // ── lookup: validar PIN y devolver estado ──────────────────
    if (action === 'lookup') {
      return Response.json({ technician: techPublic, todayRecord });
    }

    // ── entrada: abrir un nuevo intervalo ─────────────────────
    if (action === 'entrada') {
      const now = nowStr();
      const nuevoIntervalo = { entrada: now, salida: null };
      if (todayRecord) {
        const intervalos = [...(todayRecord.intervalos || []), nuevoIntervalo];
        const updated = await base44.asServiceRole.entities.RegistroHorario.update(todayRecord.id, {
          intervalos, hora_salida: null, finalizada: false,
        });
        return Response.json({ technician: techPublic, todayRecord: updated, action: 'entrada', hora: now });
      }
      const created = await base44.asServiceRole.entities.RegistroHorario.create({
        technician_email: tech.email,
        technician_name: tech.name,
        technician_id: tech.id || '',
        company_id: tech.company_id || '',
        fecha,
        hora_entrada: now,
        tipo_jornada: 'normal',
        pausas: [],
        intervalos: [nuevoIntervalo],
      });
      return Response.json({ technician: techPublic, todayRecord: created, action: 'entrada', hora: now });
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
      return Response.json({ technician: techPublic, todayRecord: updated, action: 'pausa', hora: now });
    }

    // ── salida: cerrar intervalo, calcular totales y finalizar ─
    if (action === 'salida') {
      if (!todayRecord) return Response.json({ error: 'No hay jornada iniciada hoy' }, { status: 400 });
      const now = nowStr();
      const intervalos = (todayRecord.intervalos || []).map((t, i, arr) =>
        i === arr.length - 1 && !t.salida ? { ...t, salida: now } : t
      );
      const calcs = calcularHoras({ ...todayRecord, intervalos, hora_salida: now }, jornadaDiaria);
      const updated = await base44.asServiceRole.entities.RegistroHorario.update(todayRecord.id, {
        intervalos, hora_salida: now, finalizada: true, ...calcs,
      });
      return Response.json({ technician: techPublic, todayRecord: updated, action: 'salida', hora: now, calcs });
    }

    return Response.json({ error: 'action no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}