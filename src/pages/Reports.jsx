import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Filter, Calendar, Building2, Thermometer, AlertCircle, Loader2 } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function Reports() {
  const [reportType, setReportType] = useState('maintenance');
  const [filters, setFilters] = useState({
    clientId: '',
    buildingId: '',
    equipmentId: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [generating, setGenerating] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list()
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list()
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => base44.entities.Revision.list('-revision_date')
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date')
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-maintenance_date')
  });

  const filteredBuildings = filters.clientId 
    ? buildings.filter(b => b.client_id === filters.clientId)
    : buildings;

  const filteredEquipment = filters.buildingId
    ? equipment.filter(e => e.building_id === filters.buildingId)
    : filters.clientId
    ? equipment.filter(e => e.client_id === filters.clientId)
    : equipment;

  const applyFilters = (data, dateField) => {
    return data.filter(item => {
      if (filters.clientId && item.client_id !== filters.clientId) return false;
      if (filters.buildingId && item.building_id !== filters.buildingId) return false;
      if (filters.equipmentId && item.equipment_id !== filters.equipmentId) return false;
      if (filters.status && item.status !== filters.status) return false;
      
      if (filters.dateFrom && item[dateField]) {
        const itemDate = new Date(item[dateField]);
        const fromDate = new Date(filters.dateFrom);
        if (itemDate < fromDate) return false;
      }
      
      if (filters.dateTo && item[dateField]) {
        const itemDate = new Date(item[dateField]);
        const toDate = new Date(filters.dateTo);
        if (itemDate > toDate) return false;
      }
      
      return true;
    });
  };

  const getReportData = () => {
    switch (reportType) {
      case 'maintenance':
        return applyFilters(maintenance, 'maintenance_date');
      case 'revisions':
        return applyFilters(revisions, 'revision_date');
      case 'incidents':
        return applyFilters(incidents, 'created_date');
      case 'equipment':
        return filters.clientId
          ? equipment.filter(e => e.client_id === filters.clientId)
          : filters.buildingId
          ? equipment.filter(e => e.building_id === filters.buildingId)
          : equipment;
      default:
        return [];
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const data = getReportData();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header con diseño elegante
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('Clilux M', 20, 15);
      
      doc.setFontSize(14);
      const reportTitles = {
        maintenance: 'Historial de Mantenimiento',
        revisions: 'Historial de Revisiones',
        incidents: 'Registro de Incidencias',
        equipment: 'Inventario de Equipos'
      };
      doc.text(reportTitles[reportType], 20, 25);
      
      // Fecha de generación
      doc.setFontSize(9);
      doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - 20, 15, { align: 'right' });
      
      // Resetear color de texto
      doc.setTextColor(0, 0, 0);
      
      // Filters applied
      doc.setFontSize(10);
      let yPos = 45;
      
      if (filters.clientId) {
        const client = clients.find(c => c.id === filters.clientId);
        doc.text(`Cliente: ${client?.name || 'N/A'}`, 20, yPos);
        yPos += 6;
      }
      
      if (filters.buildingId) {
        const building = buildings.find(b => b.id === filters.buildingId);
        doc.text(`Edificio: ${building?.name || 'N/A'}`, 20, yPos);
        yPos += 6;
      }
      
      if (filters.dateFrom) {
        doc.text(`Desde: ${format(new Date(filters.dateFrom), 'dd/MM/yyyy')}`, 20, yPos);
        yPos += 6;
      }
      
      if (filters.dateTo) {
        doc.text(`Hasta: ${format(new Date(filters.dateTo), 'dd/MM/yyyy')}`, 20, yPos);
        yPos += 6;
      }
      
      // Total de registros en un recuadro destacado
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(20, yPos, pageWidth - 40, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Total de registros: ${data.length}`, 25, yPos + 6);
      doc.setFont(undefined, 'normal');
      yPos += 15;
      
      // Data table
      doc.setFontSize(9);
      const pageHeight = doc.internal.pageSize.height;
      
      if (reportType === 'maintenance') {
        data.forEach((item, index) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          
          const eq = equipment.find(e => e.id === item.equipment_id);
          const building = buildings.find(b => b.id === item.building_id);
          
          // Recuadro para cada registro
          doc.setDrawColor(203, 213, 225); // slate-300
          doc.roundedRect(20, yPos, pageWidth - 40, 20, 2, 2, 'S');
          
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}. ${format(new Date(item.maintenance_date), 'dd/MM/yyyy')}`, 25, yPos + 6);
          doc.setFont(undefined, 'normal');
          doc.text(`${eq?.brand || ''} ${eq?.model || ''} - ${building?.name || ''}`, 25, yPos + 11);
          doc.text(`Tipo: ${item.maintenance_type} | Técnico: ${item.technician_name || 'N/A'}`, 25, yPos + 16);
          yPos += 25;
        });
      } else if (reportType === 'revisions') {
        data.forEach((item, index) => {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
          }
          
          const eq = equipment.find(e => e.id === item.equipment_id);
          const building = buildings.find(b => b.id === item.building_id);
          
          // Recuadro con header destacado
          doc.setFillColor(248, 250, 252); // slate-50
          doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(20, yPos, pageWidth - 40, 35, 2, 2, 'S');
          
          // Cabecera del registro
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}. ${format(new Date(item.revision_date), 'dd/MM/yyyy')} - ${eq?.brand || ''} ${eq?.model || ''}`, 25, yPos + 5);
          doc.setFont(undefined, 'normal');
          
          // Datos del equipo
          doc.setFontSize(8);
          doc.text(`Edificio: ${building?.name || 'N/A'}`, 25, yPos + 13);
          doc.text(`Ubicación: ${eq?.location || 'N/A'}`, 25, yPos + 18);
          doc.text(`Estado: ${item.general_status} | Tipo: ${item.revision_type}`, 25, yPos + 23);
          
          if (item.observations) {
            doc.text(`Observaciones: ${item.observations.substring(0, 80)}...`, 25, yPos + 28);
          }
          
          doc.setFontSize(9);
          yPos += 40;
        });
      } else if (reportType === 'incidents') {
        data.forEach((item, index) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          const client = clients.find(c => c.id === item.client_id);
          
          doc.text(`${index + 1}. ${item.title}`, 20, yPos);
          doc.text(`Cliente: ${client?.name || 'N/A'}`, 25, yPos + 5);
          doc.text(`Estado: ${item.status} | Prioridad: ${item.priority}`, 25, yPos + 10);
          yPos += 18;
        });
      } else if (reportType === 'equipment') {
        data.forEach((item, index) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          
          const building = buildings.find(b => b.id === item.building_id);
          
          doc.text(`${index + 1}. ${item.brand} ${item.model}`, 20, yPos);
          doc.text(`Ubicación: ${item.location} - ${building?.name || 'N/A'}`, 25, yPos + 5);
          doc.text(`Estado: ${item.status || 'N/A'}`, 25, yPos + 10);
          yPos += 18;
        });
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount} - Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          20,
          pageHeight - 10
        );
      }
      
      doc.save(`informe_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Informe generado correctamente');
    } catch (error) {
      toast.error('Error al generar el informe');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const reportData = getReportData();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <NavHeader title="Informes Personalizados" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <Card className="p-6 bg-white border-0 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Filtros</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Tipo de Informe</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="revisions">Revisiones</SelectItem>
                    <SelectItem value="incidents">Incidencias</SelectItem>
                    <SelectItem value="equipment">Equipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cliente</Label>
                <Select
                  value={filters.clientId}
                  onValueChange={(value) => setFilters({ ...filters, clientId: value, buildingId: '', equipmentId: '' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Edificio</Label>
                <Select
                  value={filters.buildingId}
                  onValueChange={(value) => setFilters({ ...filters, buildingId: value, equipmentId: '' })}
                  disabled={!filters.clientId && filteredBuildings.length > 50}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos los edificios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {filteredBuildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportType !== 'equipment' && (
                <div>
                  <Label>Equipo</Label>
                  <Select
                    value={filters.equipmentId}
                    onValueChange={(value) => setFilters({ ...filters, equipmentId: value })}
                    disabled={!filters.buildingId && filteredEquipment.length > 50}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos los equipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      {filteredEquipment.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.brand} {e.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType !== 'equipment' && (
                <>
                  <div>
                    <Label>Desde</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Hasta</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {(reportType === 'incidents' || reportType === 'equipment') && (
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      {reportType === 'incidents' ? (
                        <>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">En progreso</SelectItem>
                          <SelectItem value="resolved">Resuelto</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="operational">Operativo</SelectItem>
                          <SelectItem value="maintenance_needed">Mantenimiento</SelectItem>
                          <SelectItem value="out_of_service">Fuera de servicio</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={() => setFilters({
                  clientId: '',
                  buildingId: '',
                  equipmentId: '',
                  dateFrom: '',
                  dateTo: '',
                  status: ''
                })}
                variant="outline"
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </Card>

          {/* Resultados */}
          <Card className="p-6 bg-white border-0 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-600" />
                <div>
                  <h3 className="font-semibold text-slate-800">Resultados</h3>
                  <p className="text-sm text-slate-500">{reportData.length} registros encontrados</p>
                </div>
              </div>
              <Button onClick={generatePDF} disabled={generating || reportData.length === 0}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar PDF
              </Button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {reportData.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No hay datos para mostrar con los filtros aplicados</p>
                </div>
              ) : reportType === 'maintenance' ? (
                reportData.map(item => {
                  const eq = equipment.find(e => e.id === item.equipment_id);
                  const building = buildings.find(b => b.id === item.building_id);
                  return (
                    <div key={item.id} className="p-4 rounded-lg border hover:bg-slate-50 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800">
                            {format(new Date(item.maintenance_date), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-slate-600">{eq?.brand} {eq?.model}</p>
                          <p className="text-xs text-slate-500">{building?.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {item.maintenance_type}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{item.technician_name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : reportType === 'revisions' ? (
                reportData.map(item => {
                  const eq = equipment.find(e => e.id === item.equipment_id);
                  const building = buildings.find(b => b.id === item.building_id);
                  return (
                    <div key={item.id} className="p-4 rounded-lg border hover:bg-slate-50 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800">
                            {format(new Date(item.revision_date), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-slate-600">{eq?.brand} {eq?.model}</p>
                          <p className="text-xs text-slate-500">{building?.name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.general_status === 'good' ? 'bg-green-100 text-green-700' :
                            item.general_status === 'acceptable' ? 'bg-blue-100 text-blue-700' :
                            item.general_status === 'needs_repair' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.general_status}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{item.revision_type}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : reportType === 'incidents' ? (
                reportData.map(item => {
                  const client = clients.find(c => c.id === item.client_id);
                  return (
                    <div key={item.id} className="p-4 rounded-lg border hover:bg-slate-50 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.title}</p>
                          <p className="text-sm text-slate-600">{client?.name}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(item.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{item.priority}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                reportData.map(item => {
                  const building = buildings.find(b => b.id === item.building_id);
                  return (
                    <div key={item.id} className="p-4 rounded-lg border hover:bg-slate-50 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.brand} {item.model}</p>
                          <p className="text-sm text-slate-600">{item.location}</p>
                          <p className="text-xs text-slate-500">{building?.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'operational' ? 'bg-green-100 text-green-700' :
                          item.status === 'maintenance_needed' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}