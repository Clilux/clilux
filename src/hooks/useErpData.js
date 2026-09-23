import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getSessionToken } from '@/lib/passwordHash';
import { ENTIDADES } from '@/lib/erp-config';

const VACIO = { proveedores: [], pedidos: [], compras: [], presupuestos: [], articulos: [], familias: [] };

/**
 * Datos del módulo ERP. Con sesión de trabajador propio carga vía erpProxy
 * (aislado por empresa); con sesión Base44 de administrador usa la API directa.
 */
export function useErpData() {
  const queryClient = useQueryClient();
  const sessionTechEmail = sessionStorage.getItem('technician_email');
  const isSessionTech = !!sessionTechEmail;

  const { data: base44User } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !isSessionTech,
    retry: false,
  });

  const { data: myTechRecord } = useQuery({
    queryKey: ['tech-me', sessionTechEmail],
    queryFn: () => base44.functions.invoke('getCompanyData', {
      technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'me',
    }).then(r => r.data?.data || null),
    enabled: isSessionTech,
  });

  const isAdmin = (!isSessionTech && base44User?.role === 'admin') || !!myTechRecord?.is_admin;

  const { data: erp = VACIO, isLoading } = useQuery({
    queryKey: ['erp-data', isSessionTech ? 'tech' : 'admin'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('erpProxy', {
          technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'erp_list',
        });
        if (res.data?.error) throw new Error(res.data.error);
        return { ...VACIO, ...(res.data?.data || {}) };
      }
      const [proveedores, pedidos, compras, presupuestos, articulos, familias] = await Promise.all([
        base44.entities.Proveedor.list('-created_date'),
        base44.entities.Pedido.list('-created_date'),
        base44.entities.Compra.list('-created_date'),
        base44.entities.Presupuesto.list('-created_date'),
        base44.entities.CatalogoProducto.list('-created_date'),
        base44.entities.FamiliaProducto.list('nombre'),
      ]);
      return { proveedores, pedidos, compras, presupuestos, articulos, familias };
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['erp-clients', isSessionTech ? 'tech' : 'admin'],
    queryFn: async () => {
      if (isSessionTech) {
        const res = await base44.functions.invoke('getCompanyData', {
          technician_email: sessionTechEmail, session_token: getSessionToken(), entity: 'clients',
        });
        return res.data?.data || [];
      }
      return base44.entities.Client.list('-created_date');
    },
  });

  const call = async (entity, extra = {}) => {
    const res = await base44.functions.invoke('erpProxy', {
      technician_email: sessionTechEmail, session_token: getSessionToken(), entity, ...extra,
    });
    if (res.data?.error) throw new Error(res.data.error);
    return res.data?.data;
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['erp-data'] });

  const saveDocumento = async (tipo, record, id) => {
    let data;
    if (isSessionTech) {
      data = await call(id ? 'erp_update' : 'erp_create', id ? { tipo, record_id: id, updates: record } : { tipo, record });
    } else if (id) {
      data = await base44.entities[ENTIDADES[tipo]].update(id, record);
    } else {
      data = await base44.entities[ENTIDADES[tipo]].create(record);
    }
    invalidate();
    return data;
  };

  // Alta masiva de artículos (importación de tarifas)
  const saveArticulosBulk = async (records) => {
    const data = isSessionTech
      ? await call('erp_bulk_create', { tipo: 'articulo', records })
      : await base44.entities.CatalogoProducto.bulkCreate(records);
    invalidate();
    return data;
  };

  const deleteDocumento = async (tipo, id) => {
    if (isSessionTech) {
      await call('erp_delete', { tipo, record_id: id });
    } else {
      await base44.entities[ENTIDADES[tipo]].delete(id);
    }
    invalidate();
  };

  return {
    erp,
    clients,
    isLoading,
    isSessionTech,
    isAdmin,
    myTechRecord,
    effectiveEmail: sessionTechEmail || base44User?.email,
    saveDocumento,
    deleteDocumento,
    refresh: invalidate,
    saveProveedor: (record, id) => saveDocumento('proveedor', record, id),
    deleteProveedor: (id) => deleteDocumento('proveedor', id),
    saveArticulo: (record, id) => saveDocumento('articulo', record, id),
    saveArticulosBulk,
    deleteArticulo: (id) => deleteDocumento('articulo', id),
    saveFamilia: (record, id) => saveDocumento('familia', record, id),
    deleteFamilia: (id) => deleteDocumento('familia', id),
  };
}