import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifySessionToken } from '../../shared/auth.ts';

/**
 * Desactiva (o reactiva) una entidad y todo lo relacionado con ella:
 *
 *  - Cliente → edificios, equipos, incidencias abiertas y revisiones pendientes.
 *  - Edificio → equipos, incidencias abiertas y revisiones pendientes.
 *  - Equipo → incidencias abiertas y revisiones pendientes.
 *
 * La desactivación de incidencias marca como "closed" las que estén pending/in_progress.
 * La desactivación de revisiones marca como "cancelled" las que estén pending.
 * La reactivación solo actúa sobre la propia entidad (no reactiva hijos).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { technician_email, entity_type, entity_id, activate } = body;

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type y entity_id requeridos' }, { status: 400 });
    }

    // ── Autenticación: token de sesión firmado o admin de plataforma ──
    const session = body.session_token ? await verifySessionToken(body.session_token) : null;
    let isPlatformAdmin = false;
    if (!session) {
      try {
        const me = await base44.auth.me();
        if (me && me.role === 'admin') isPlatformAdmin = true;
      } catch { /* no autenticado vía Base44 */ }
    }
    if (!session && !isPlatformAdmin) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (session && technician_email && (session.email || '').toLowerCase() !== (technician_email || '').toLowerCase()) {
      return Response.json({ error: 'La sesión no coincide con el técnico solicitado' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;
    const OPEN_INCIDENT_STATUSES = ['pending', 'in_progress'];

    // ── Reactivación: solo la propia entidad ──
    if (activate) {
      if (entity_type === 'client') {
        await svc.Client.update(entity_id, { status: 'active' });
      } else if (entity_type === 'building') {
        await svc.Building.update(entity_id, { status: 'active' });
      } else if (entity_type === 'equipment') {
        await svc.Equipment.update(entity_id, { status: 'operational' });
      } else {
        return Response.json({ error: 'entity_type no válido' }, { status: 400 });
      }
      return Response.json({ ok: true, activated: true });
    }

    // ── Desactivación en cascada ──
    const counts: Record<string, number> = {};

    const deactivateEquipment = async (equipmentId: string) => {
      await svc.Equipment.update(equipmentId, { status: 'out_of_service' });
      await svc.Incident.updateMany(
        { equipment_id: equipmentId, status: { $in: OPEN_INCIDENT_STATUSES } },
        { $set: { status: 'closed' } }
      );
      await svc.ScheduledRevision.updateMany(
        { equipment_id: equipmentId, status: 'pending' },
        { $set: { status: 'cancelled' } }
      );
    };

    const deactivateBuilding = async (buildingId: string) => {
      await svc.Building.update(buildingId, { status: 'inactive' });
      const equips = await svc.Equipment.filter({ building_id: buildingId });
      for (const e of equips) {
        await deactivateEquipment(e.id);
      }
      counts.equipment = (counts.equipment || 0) + equips.length;
      await svc.Incident.updateMany(
        { building_id: buildingId, status: { $in: OPEN_INCIDENT_STATUSES } },
        { $set: { status: 'closed' } }
      );
      await svc.ScheduledRevision.updateMany(
        { building_id: buildingId, status: 'pending' },
        { $set: { status: 'cancelled' } }
      );
    };

    if (entity_type === 'client') {
      await svc.Client.update(entity_id, { status: 'inactive' });
      const buildings = await svc.Building.filter({ client_id: entity_id });
      for (const b of buildings) {
        await deactivateBuilding(b.id);
      }
      counts.buildings = buildings.length;
      // Incidencias y revisiones vinculadas directamente al cliente (sin edificio/equipo)
      await svc.Incident.updateMany(
        { client_id: entity_id, status: { $in: OPEN_INCIDENT_STATUSES } },
        { $set: { status: 'closed' } }
      );
      await svc.ScheduledRevision.updateMany(
        { client_id: entity_id, status: 'pending' },
        { $set: { status: 'cancelled' } }
      );
    } else if (entity_type === 'building') {
      await deactivateBuilding(entity_id);
    } else if (entity_type === 'equipment') {
      await deactivateEquipment(entity_id);
    } else {
      return Response.json({ error: 'entity_type no válido' }, { status: 400 });
    }

    return Response.json({ ok: true, deactivated: true, counts });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});