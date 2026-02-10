import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Wrench, Building2, GripVertical, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const defaultOptions = [
{ id: '1', label: 'Técnico', page: 'HomeTecnico', icon: 'Wrench', color: 'bg-blue-500/20', textColor: 'text-blue-400', order: 1 },
{ id: '2', label: 'Cliente', page: 'HomeCliente', icon: 'Building2', color: 'bg-emerald-500/20', textColor: 'text-emerald-400', order: 2 }];


export default function MenuInicio() {
  const queryClient = useQueryClient();
  const [options, setOptions] = useState(defaultOptions);
  const [user, setUser] = useState(null);
  const [loginMode, setLoginMode] = useState('tecnico'); // 'tecnico' o 'cliente'
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

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
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      return all[0] || null;
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (loginMode === 'cliente') {
      const clientUsers = settings?.client_users || [];
      const clientUser = clientUsers.find(u => u.email === credentials.email && u.password === credentials.password);
      
      if (clientUser) {
        window.location.href = createPageUrl('HomeCliente');
      } else {
        setLoginError('Credenciales incorrectas');
      }
    } else {
      try {
        await base44.auth.redirectToLogin(createPageUrl('HomeTecnico'));
      } catch {
        setLoginError('Error al iniciar sesión');
      }
    }
  };

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
    }
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
    'Thermometer': Thermometer
  };

  const isAdmin = user?.role === 'admin';

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="fixed top-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
        
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur-sm border-white/20 relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Thermometer className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
            <p className="text-slate-400 mt-1">Accede a Clilux M</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-white">Tipo de Usuario</Label>
              <Select value={loginMode} onValueChange={setLoginMode}>
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Técnico / Admin</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Email</Label>
              <Input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <Label className="text-white">Contraseña</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-sm">{loginError}</p>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Acceder
            </Button>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full bg-white/5 border-white/20 text-white"
              onClick={() => setShowLogin(false)}
            >
              Volver
            </Button>
          </form>
        </Card>
      </div>
    );
  }

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

        {isAdmin &&
        <div className="mb-4 text-center">
            <p className="text-xs text-slate-400">Arrastra para reordenar (solo admin)</p>
          </div>
        }

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="menu-options" isDropDisabled={!isAdmin}>
            {(provided) =>
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {options.map((option, index) => {
                const IconComponent = iconMap[option.icon] || Wrench;
                return (
                  <Draggable key={option.id} draggableId={option.id} index={index} isDragDisabled={!isAdmin}>
                      {(provided, snapshot) =>
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}>

                          <div onClick={() => setShowLogin(true)}>
                            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-card-foreground p-6 rounded-xl border shadow hover:bg-white/15 transition-all cursor-pointer group">


                              <div className="flex items-center gap-4">
                                {isAdmin &&
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-5 w-5 text-white/30 group-hover:text-white/50" />
                                  </div>
                            }
                                <div className={`w-16 h-16 rounded-full ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                  <IconComponent className={`h-8 w-8 ${option.textColor}`} />
                                </div>
                                <div>
                                  <h2 className="text-xl font-semibold text-white">{option.label}</h2>
                                  <p className="text-sm text-slate-400">
                                    {option.label === 'Técnico' ? 'Acceso para empresas y técnicos' :
                                option.label === 'Cliente' ? 'Portal de cliente para ver equipos e incidencias' : ''}
                                  </p>
                                </div>
                              </div>
                            </Card>
                            </div>
                            </div>
                    }
                    </Draggable>);

              })}
                {provided.placeholder}
              </div>
            }
          </Droppable>
        </DragDropContext>

        <p className="text-center text-slate-500 text-sm mt-8">
          © 2024 Clilux - Todos los derechos reservados
        </p>
      </div>
    </div>);

}