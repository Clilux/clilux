import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, FileText, Pencil, Trash2, Eye, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import ErpLayout from '@/components/erp/ErpLayout';
import DocumentoErpForm from '@/components/erp/DocumentoErpForm';
import PresupuestoDetalle from '@/components/erp/PresupuestoDetalle';
import DocumentoErpDetalle from '@/components/erp/DocumentoErpDetalle';
import GenerarPedidoModal from '@/components/erp/GenerarPedidoModal';
import { useErpData } from '@/hooks/useErpData';
import { enviarPresupuesto } from '@/lib/presupuesto-envio';
import { DOCS, ESTADOS, euros, siguienteNumero } from '@/lib/erp-config';

const fecha = (f) => {
  if (!f) return '—';
  try { return format(parseISO(f), 'd MMM yyyy', { locale: es }); } catch { return f; }
};

/** Lista genérica de documentos ERP (presupuestos, pedidos o compras). */
export default function ErpDocumentoList({ tipo }) {
  const cfg = DOCS[tipo];
  const { erp, clients, isLoading, saveDocumento, deleteDocumento, refresh, effectiveEmail } = useErpData();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [pedidoDesde, setPedidoDesde] = useState(null);
  const [enviandoId, setEnviandoId] = useState(null);

  const lista = erp[cfg.plural.toLowerCase()] || [];
  const estados = ESTADOS[tipo];
  const esPresupuesto = tipo === 'presupuesto';

  const nombreParte = (d) => esPresupuesto ? (d.cliente_nombre || '—') : (d.proveedor_nombre || '—');
  const estadoDe = (d) => d.estado || d.status || 'borrador';

  const filtered = lista.filter(d => {
    const q = search.toLowerCase();
    const match = !q || (d.numero || '').toLowerCase().includes(q) || nombreParte(d).toLowerCase().includes(q);
    const matchEstado = filtro === 'all' || estadoDe(d) === filtro;
    return match && matchEstado;
  });

  const cambiarEstado = async (d, nuevo) => {
    try {
      await saveDocumento(tipo, esPresupuesto ? { status: nuevo } : { estado: nuevo }, d.id);
    } catch (e) {
      toast.error(e.message || 'No se pudo actualizar');
    }
  };

  const borrar = async (d) => {
    if (!window.confirm(`¿Eliminar ${d.numero}?`)) return;
    try {
      await deleteDocumento(tipo, d.id);
      toast.success('Eliminado');
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  const abrirNuevo = () => { setEditando(null); setShowForm(true); };
  const abrirEditar = (d) => { setEditando(d); setShowForm(true); };

  const clienteDe = (d) => clients.find(c => c.id === d.client_id) || null;

  const enviar = async (d) => {
    setEnviandoId(d.id);
    try {
      const res = await enviarPresupuesto({ presupuesto: d, client: clienteDe(d), sessionTechEmail: effectiveEmail });
      toast.success(`Presupuesto enviado a ${res.to}`);
      refresh();
    } catch (e) {
      toast.error(e.message || 'No se pudo enviar el presupuesto');
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <ErpLayout active={cfg.plural.toLowerCase()}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">{cfg.plural}</h1>
            <p className="text-xs md:text-base text-slate-400">{lista.length} registrados</p>
          </div>
        </div>
        <Button onClick={abrirNuevo} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />Nuevo
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número o nombre..." className="pl-9 md:h-11 md:text-base bg-white" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48 md:h-11 md:text-base bg-white"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(estados).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {Object.entries(estados).map(([k, v]) => (
          <Card
            key={k}
            onClick={() => setFiltro(filtro === k ? 'all' : k)}
            className={`p-3 border-0 shadow-sm text-center cursor-pointer hover:shadow-md transition-shadow ${filtro === k ? 'ring-2 ring-indigo-400' : ''}`}
          >
            <p className="text-xl md:text-3xl font-bold text-slate-800">{lista.filter(d => estadoDe(d) === k).length}</p>
            <p className="text-[11px] md:text-sm text-slate-500 mt-0.5">{v.label}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 md:text-lg">No hay {cfg.plural.toLowerCase()} que mostrar</p>
          <Button onClick={abrirNuevo} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => {
            const conf = estados[estadoDe(d)] || Object.values(estados)[0];
            return (
              <Card
                key={d.id}
                onClick={() => setViendo(d)}
                className="p-3.5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="md:w-40 md:shrink-0 min-w-0">
                    <p className="font-mono text-sm md:text-base font-semibold text-slate-800 truncate">{d.numero}</p>
                    <p className="text-xs text-slate-400">{fecha(d.fecha)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-lg font-medium text-slate-800 truncate">{nombreParte(d)}</p>
                    {esPresupuesto ? (
                      <p className="text-xs md:text-sm text-slate-400 truncate">{d.titulo || 'Sin título'}</p>
                    ) : (d.num_factura || d.obra_nombre) ? (
                      <p className="text-xs md:text-sm text-slate-400 truncate">{d.num_factura ? `Factura ${d.num_factura}` : d.obra_nombre}</p>
                    ) : null}
                  </div>
                  <div className="md:w-28 md:shrink-0">
                    <p className="text-sm md:text-xl font-semibold text-slate-800">{euros(d.total)}</p>
                  </div>
                  <div className="md:w-44 md:shrink-0" onClick={e => e.stopPropagation()}>
                    <Select value={estadoDe(d)} onValueChange={v => cambiarEstado(d, v)}>
                      <SelectTrigger className={`h-8 md:h-9 text-xs md:text-sm rounded-full border-0 shadow-none ${conf.color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(estados).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 md:shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title={`Ver ${cfg.label.toLowerCase()}`} onClick={() => setViendo(d)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {esPresupuesto && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Enviar al cliente"
                          disabled={enviandoId === d.id}
                          onClick={() => enviar(d)}
                        >
                          {enviandoId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50" title="Editar" onClick={() => abrirEditar(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50" title="Eliminar" onClick={() => borrar(d)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DocumentoErpForm
        tipo={tipo}
        open={showForm}
        onClose={() => setShowForm(false)}
        registro={editando}
        numero={siguienteNumero(cfg.prefix, lista)}
        clients={clients}
        proveedores={erp.proveedores}
        articulos={erp.articulos}
        familias={erp.familias}
        onSave={(record, id) => saveDocumento(tipo, record, id)}
      />

      {esPresupuesto && (
        <PresupuestoDetalle
          open={!!viendo}
          onClose={() => setViendo(null)}
          presupuesto={viendo}
          client={viendo ? clienteDe(viendo) : null}
          sessionTechEmail={effectiveEmail}
          onEdit={abrirEditar}
          onSent={refresh}
          onGenerarPedido={(p) => { setViendo(null); setPedidoDesde(p); }}
        />
      )}

      {!esPresupuesto && (
        <DocumentoErpDetalle
          open={!!viendo}
          onClose={() => setViendo(null)}
          tipo={tipo}
          documento={viendo}
          proveedor={viendo ? (erp.proveedores || []).find(p => p.id === viendo.proveedor_id) : null}
          onEdit={abrirEditar}
        />
      )}

      <GenerarPedidoModal
        open={!!pedidoDesde}
        onClose={() => setPedidoDesde(null)}
        presupuesto={pedidoDesde}
        proveedores={erp.proveedores}
        articulos={erp.articulos}
        pedidos={erp.pedidos}
        onCreated={async (record) => { await saveDocumento('pedido', record); refresh(); }}
      />
    </ErpLayout>
  );
}