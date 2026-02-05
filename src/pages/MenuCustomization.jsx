import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  GripVertical, Edit, Save, Home, Users, Building2, Thermometer, 
  FileText, Wrench, Calendar, AlertTriangle, Settings as SettingsIcon, 
  BarChart3, ClipboardList, Briefcase, Package, Shield, UserCog, Map 
} from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';

const iconMap = {
  'Home': Home,
  'Users': Users,
  'Building2': Building2,
  'Thermometer': Thermometer,
  'FileText': FileText,
  'Wrench': Wrench,
  'Calendar': Calendar,
  'AlertTriangle': AlertTriangle,
  'Settings': SettingsIcon,
  'BarChart3': BarChart3,
  'ClipboardList': ClipboardList,
  'Briefcase': Briefcase,
  'Package': Package,
  'Shield': Shield,
  'UserCog': UserCog,
  'Map': Map
};

const availableIcons = Object.keys(iconMap);

const availableColors = [
  { value: 'from-blue-500 to-blue-600', label: 'Azul' },
  { value: 'from-purple-500 to-purple-600', label: 'Morado' },
  { value: 'from-green-500 to-green-600', label: 'Verde' },
  { value: 'from-orange-500 to-orange-600', label: 'Naranja' },
  { value: 'from-red-500 to-red-600', label: 'Rojo' },
  { value: 'from-pink-500 to-pink-600', label: 'Rosa' },
  { value: 'from-cyan-500 to-cyan-600', label: 'Cian' },
  { value: 'from-amber-500 to-amber-600', label: 'Ámbar' },
];

const defaultMenuItems = [
  { id: '1', label: 'Clientes', page: 'Clients', icon: 'Users', color: 'from-blue-500 to-blue-600', order: 1 },
  { id: '2', label: 'Edificios', page: 'Buildings', icon: 'Building2', color: 'from-purple-500 to-purple-600', order: 2 },
  { id: '3', label: 'Equipos', page: 'ScanEquipment', icon: 'Thermometer', color: 'from-green-500 to-green-600', order: 3 },
  { id: '4', label: 'Revisiones', page: 'Revisions', icon: 'ClipboardList', color: 'from-orange-500 to-orange-600', order: 4 },
  { id: '5', label: 'Incidencias', page: 'Incidents', icon: 'AlertTriangle', color: 'from-red-500 to-red-600', order: 5 },
  { id: '6', label: 'Técnicos', page: 'TechnicianManagement', icon: 'UserCog', color: 'from-cyan-500 to-cyan-600', order: 6 },
  { id: '7', label: 'Calendario', page: 'Calendar', icon: 'Calendar', color: 'from-pink-500 to-pink-600', order: 7 },
  { id: '8', label: 'Informes', page: 'Reports', icon: 'FileText', color: 'from-amber-500 to-amber-600', order: 8 },
  { id: '9', label: 'Ajustes', page: 'Settings', icon: 'Settings', color: 'from-slate-500 to-slate-600', order: 9 },
];

export default function MenuCustomization() {
  const queryClient = useQueryClient();
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['menu-config'],
    queryFn: async () => {
      const configs = await base44.entities.MenuCustomization.filter({ setting_key: 'menu_config' });
      if (configs.length > 0) {
        setMenuItems(configs[0].menu_items);
        return configs[0];
      }
      setMenuItems(defaultMenuItems);
      return null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items) => {
      if (config) {
        return base44.entities.MenuCustomization.update(config.id, { menu_items: items });
      } else {
        return base44.entities.MenuCustomization.create({ 
          setting_key: 'menu_config',
          menu_items: items 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-config'] });
      toast.success('Menú guardado correctamente');
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setMenuItems(updatedItems);
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    const updatedItems = menuItems.map(item => 
      item.id === editingItem.id ? editingItem : item
    );
    setMenuItems(updatedItems);
    setShowEditDialog(false);
    setEditingItem(null);
  };

  const handleSaveAll = () => {
    saveMutation.mutate(menuItems);
  };

  const renderIcon = (iconName) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Home className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6 bg-white/10" />
          <Skeleton className="h-96 bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="fixed top-20 right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      <div className="max-w-4xl mx-auto relative">
        <NavHeader title="Personalizar Menú" />

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/80">Arrastra para reordenar, haz clic en editar para cambiar colores e iconos</p>
            <Button onClick={handleSaveAll} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="menu-items">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {menuItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="h-5 w-5 text-white/50 cursor-grab" />
                          </div>
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color}`}>
                            {renderIcon(item.icon)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">{item.label}</p>
                            <p className="text-sm text-white/60">{item.page}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="text-white hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Card>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar elemento del menú</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Etiqueta</Label>
                <Input
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Icono</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {availableIcons.map(iconName => {
                    const IconComponent = iconMap[iconName];
                    return (
                      <button
                        key={iconName}
                        onClick={() => setEditingItem({ ...editingItem, icon: iconName })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          editingItem.icon === iconName 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <IconComponent className="h-5 w-5 mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {availableColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingItem({ ...editingItem, color: color.value })}
                      className={`h-12 rounded-lg border-2 transition-all ${
                        editingItem.color === color.value 
                          ? 'border-slate-800 scale-105' 
                          : 'border-slate-200'
                      }`}
                    >
                      <div className={`h-full rounded-md bg-gradient-to-br ${color.value}`} />
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveEdit} className="w-full">
                Guardar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}