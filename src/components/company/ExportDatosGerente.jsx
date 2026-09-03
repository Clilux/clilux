import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

/**
 * Exportación completa de los datos de la empresa a Excel (solo gerente).
 * Hojas: Trabajadores (con credenciales y PIN), Clientes, Edificios y Equipos.
 * Los datos se obtienen a través del proxy seguro (getCompanyData), filtrados
 * por la empresa del gerente que realiza la exportación.
 */
export default function ExportDatosGerente({ sessionTechEmail, companyName }) {
  const [exporting, setExporting] = useState(false);

  const invoke = (entity, extra = {}) =>
    base44.functions.invoke('getCompanyData', { technician_email: sessionTechEmail, entity, ...extra });

  const handleExport = async () => {
    setExporting(true);
    try {
      const [allRes, techsRes] = await Promise.all([
        invoke('all'),
        invoke('technicians'),
      ]);
      const all = allRes.data || {};
      const workers = techsRes.data?.data || [];
      const clients = all.clients || [];
      const buildings = all.buildings || [];
      const equipment = all.equipment || [];

      const clientName = (id) => clients.find(c => c.id === id)?.name || '';
      const buildingName = (id) => buildings.find(b => b.id === id)?.name || '';

      const wb = XLSX.utils.book_new();

      // Trabajadores / usuarios (con credenciales)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workers.map(w => ({
        'Nombre': w.name || '',
        'Email': w.email || '',
        'Email portal': w.portal_email || w.email || '',
        'Contraseña': w.portal_password || '',
        'PIN kiosko': w.pin || '',
        'Tipo': w.worker_type === 'administracion' ? 'Administración' : 'Técnico',
        'Rol': w.is_admin ? 'Gerente' : 'Trabajador',
        'Estado': w.status === 'active' ? 'Activo' : 'Inactivo',
        'Teléfono': w.phone || '',
        'Horas jornada': w.horas_jornada_diaria ?? '',
        'Cert. F-Gas': w.fgas_cert_num || '',
        'Cert. RITE': w.rite_cert_num || '',
      }))), 'Trabajadores');

      // Clientes
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients.map(c => ({
        'Nombre': c.name || '',
        'CIF': c.cif || '',
        'Email': c.email || '',
        'Teléfono': c.phone || '',
        'Contacto': c.contact_person || '',
        'Dirección': c.address || '',
        'Ciudad': c.city || '',
        'Provincia': c.province || '',
        'Estado': c.status || '',
      }))), 'Clientes');

      // Edificios
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildings.map(b => ({
        'Cliente': clientName(b.client_id),
        'Nombre': b.name || '',
        'Dirección': b.address || '',
        'Ciudad': b.city || '',
        'Provincia': b.province || '',
        'Contacto': b.contact_person || '',
        'Teléfono': b.contact_phone || '',
        'Estado': b.status || '',
      }))), 'Edificios');

      // Equipos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(equipment.map(e => ({
        'Cliente': clientName(e.client_id),
        'Edificio': buildingName(e.building_id),
        'Referencia': e.reference_name || '',
        'Tipo': e.equipment_type || '',
        'Marca': e.brand || '',
        'Modelo': e.model || '',
        'Nº serie': e.serial_number || '',
        'Ubicación': e.location || '',
        'Refrigerante': e.refrigerant_type || '',
        'Carga (kg)': e.refrigerant_charge_kg ?? '',
        'Potencia frig. (kW)': e.cooling_power_kw ?? '',
        'Estado': e.status || '',
        'Notas': e.notes || '',
      }))), 'Equipos');

      const fileBase = (companyName || 'empresa').replace(/[^\w\-]+/g, '_');
      XLSX.writeFile(wb, `datos_${fileBase}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Datos exportados a Excel');
    } catch (err) {
      toast.error('Error al exportar: ' + (err?.response?.data?.error || err?.message || ''));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
      {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {exporting ? 'Exportando...' : 'Exportar todo a Excel'}
    </Button>
  );
}