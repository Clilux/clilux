import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

/**
 * Lista de navegación agrupada (acordeón).
 * Se usa en el sidebar de escritorio y en el menú móvil.
 */
export default function MenuLateral({ menu, menuHover = 'hover:bg-brand-700', onNavigate, abrirTodo = false }) {
  const { pathname } = useLocation();
  const [abiertos, setAbiertos] = useState({});

  const grupoActual = menu.grupos.find((g) =>
    g.items.some((i) => pathname === i.to.split('?')[0])
  );

  useEffect(() => {
    if (grupoActual) setAbiertos((prev) => ({ ...prev, [grupoActual.id]: true }));
  }, [pathname]);

  const toggle = (id) => setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));

  const ItemLink = ({ item }) => {
    const Icon = item.icon;
    const activo = pathname === item.to.split('?')[0];
    return (
      <Link to={item.to} onClick={onNavigate}>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full justify-start h-11 text-[15px] font-medium ${
            activo ? 'bg-white/20 text-white' : `text-white/90 ${menuHover}`
          }`}
        >
          <Icon className="h-5 w-5 mr-3 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Button>
      </Link>
    );
  };

  const InicioIcon = menu.inicio.icon;

  return (
    <div className="space-y-1">
      {!abrirTodo && (
        <Link to={menu.inicio.to} onClick={onNavigate}>
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start h-12 text-base font-semibold ${
              pathname === menu.inicio.to.split('?')[0] ? 'bg-white/20 text-white' : `text-white ${menuHover}`
            }`}
          >
            <InicioIcon className="h-5 w-5 mr-3 shrink-0" />
            <span>{menu.inicio.label}</span>
          </Button>
        </Link>
      )}

      {menu.grupos.map((grupo) => {
        const Icon = grupo.icon;
        const abierto = abrirTodo || !!abiertos[grupo.id];
        const contieneActual = grupoActual?.id === grupo.id;
        return (
          <div key={grupo.id} className="pt-1">
            <button
              type="button"
              onClick={() => toggle(grupo.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                contieneActual ? 'text-white' : 'text-white/65 hover:text-white'
              } ${menuHover}`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-widest">{grupo.label}</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? '' : '-rotate-90'} ${abrirTodo ? 'hidden' : ''}`} />
            </button>
            {abierto && (
              <div className="space-y-0.5 pb-1">
                {grupo.items.map((item) => <ItemLink key={item.to} item={item} />)}
              </div>
            )}
          </div>
        );
      })}

      {menu.perfil && !abrirTodo && (
        <div className="pt-2 mt-1 border-t border-white/15">
          <ItemLink item={menu.perfil} />
        </div>
      )}
    </div>
  );
}