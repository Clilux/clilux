import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sesionPortal } from '@/hooks/useBuildingDocuments';

/**
 * Registros auxiliares (F-Gas, limpieza/desinfección e instalador) de un año
 * para los libros anuales del edificio, acotados a sus equipos.
 */
export function useBuildingYearRecords({ buildingId, clientId, year, equipmentIds }) {
  const email = sesionPortal();
  const isSession = !!email;
  const desde = `${year}-01-01`;
  const hasta = `${year + 1}-01-01`;

  const acotar = (lista) => lista.filter(
    (r) => !r.equipment_id || (equipmentIds ? equipmentIds.has(r.equipment_id) : true),
  );

  const { data } = useQuery({
    queryKey: ['building-year-records', buildingId, clientId, year, isSession],
    queryFn: async () => {
      if (isSession) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: email, entity: 'building_year_records', building_id: buildingId, desde, hasta,
        });
        const d = res.data?.data || {};
        return { fgas: acotar(d.fgas || []), ld: acotar(d.ld || []), instalador: acotar(d.instalador || []) };
      }
      const [fgas, ld, inst] = await Promise.all([
        base44.entities.RegistroFGas.filter(
          { client_id: clientId, fecha_intervencion: { $gte: desde, $lt: hasta } },
          { sort: '-fecha_intervencion', limit: 500 },
        ),
        base44.entities.RegistroLD.filter(
          { client_id: clientId, fecha: { $gte: desde, $lt: hasta } },
          { sort: '-fecha', limit: 500 },
        ),
        base44.entities.RegistroInstalador.filter(
          { client_id: clientId, fecha_intervencion: { $gte: desde, $lt: hasta } },
          { sort: '-fecha_intervencion', limit: 500 },
        ),
      ]);
      return {
        fgas: acotar(fgas.items),
        ld: acotar(ld.items),
        instalador: acotar(inst.items),
      };
    },
    enabled: !!buildingId && (isSession || !!clientId),
  });

  return data || { fgas: [], ld: [], instalador: [] };
}