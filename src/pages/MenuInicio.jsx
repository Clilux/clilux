import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Wrench, Building2, GripVertical, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const defaultOptions = [
  { id: '1', label: 'Técnico', page: 'HomeTecnico', icon: 'Wrench', color: 'bg-blue-500/20', textColor: 'text-blue-400', order: 1 },
  { id: '2', label: 'Cliente', page: 'HomeCliente', icon: 'Building2', color: 'bg-emerald-500/20', textColor: 'text-emerald-400', order: 2 },
  { id: '3', label: 'Equipos', page: 'Equipment', icon: 'Thermometer', color: 'bg-purple-500/20', textColor: 'text-purple-400', order: 3 },
];

export default function MenuInicio() {
  const queryClient = useQueryClient();
  const [options, setOptions] = useState(defaultOptions);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: config } = useQuery({
    queryKey: ['menu-inicio-config'],
    queryFn: async () => {
      const configs = await base44.entities.AppSettings.filter({ setting_key: 'menu_inicio' });
      if (configs.length > 0 && configs[0].menu_items) {
        setOptions(configs[0].menu_items);
        return configs[0];
      }
      return null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items) => {
      if (config) {
        return base44.entities.AppSettings.update(config.id, { menu_items: items });
      } else {
        return base44.entities.AppSettings.create({ 
          setting_key: 'menu_inicio',
          menu_items: items 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-inicio-config'] });
      toast.success('Orden guardado');
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setOptions(updatedItems);
    saveMutation.mutate(updatedItems);
  };

  const iconMap = {
    'Wrench': Wrench,
    'Building2': Building2,
    'Thermometer': Thermometer,
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
      <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
      <div className="fixed top-1/3 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Thermometer className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Clilux M</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestión de Climatización</p>
        </div>

        {isAdmin && (
          <div className="mb-4 text-center">
            <p className="text-xs text-slate-400">Arrastra para reordenar (solo admin)</p>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="menu-options" isDropDisabled={!isAdmin}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {options.map((option, index) => {
                  const IconComponent = iconMap[option.icon] || Wrench;
                  return (
                    <Draggable key={option.id} draggableId={option.id} index={index} isDragDisabled={!isAdmin}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <Link to={createPageUrl(option.page)}>
                            <Card className={`p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group ${
                              snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                            }`}>
                              <div className="flex items-center gap-4">
                                {isAdmin && (
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-5 w-5 text-white/30 group-hover:text-white/50" />
                                  </div>
                                )}
                                <div className={`w-16 h-16 rounded-full ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                  <IconComponent className={`h-8 w-8 ${option.textColor}`} />
                                </div>
                                <div>
                                  <h2 className="text-xl font-semibold text-white">{option.label}</h2>
                                  <p className="text-sm text-slate-400">
                                    {option.label === 'Técnico' ? 'Acceso para empresas y técnicos' : 
                                     option.label === 'Cliente' ? 'Portal de cliente para ver equipos e incidencias' :
                                     option.label === 'Equipos' ? 'Gestión completa de equipos y ubicaciones' : ''}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <p className="text-center text-slate-500 text-sm mt-8">
          © 2024 Clilux - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}