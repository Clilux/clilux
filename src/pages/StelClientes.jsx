import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Plus, Pencil, Phone, Mail, MapPin, Building2, ExternalLink, RefreshCw } from 'lucide-react';
import NavHeader from '@/components/navigation/NavHeader';
import StelClientFormModal from '@/components/stel/StelClientFormModal';
import { toast } from 'sonner';

export default function StelClientes() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['stel-clients', search],
    queryFn: async () => {
      const res = await base44.functions.invoke('stelProxy', {
        action: 'listClients',
        payload: { limit: 100, search },
      });
      return res.data?.clients || [];
    },
    staleTime: 60_000,
  });

  const clients = data || [];

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['stel-clients'] });
    toast.success('Lista actualizada');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <NavHeader title="Clientes STEL Order" />

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Buscar por nombre..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-white"
            />
            <Button variant="outline" onClick={handleSearch} disabled={isFetching} className="px-3">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Actualizar" className="text-slate-400">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
          <Building2 className="h-4 w-4" />
          <span>{isLoading ? '...' : `${clients.length} clientes`}</span>
          {search && (
            <Badge variant="secondary" className="ml-2">
              Filtro: "{search}"
              <button className="ml-1 hover:text-slate-800" onClick={() => { setSearch(''); setSearchInput(''); }}>×</button>
            </Badge>
          )}
          <a
            href="https://app.stelorder.com"
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-blue-600 hover:underline text-xs"
          >
            <ExternalLink className="h-3 w-3" /> Abrir STEL Order
          </a>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No se encontraron clientes</p>
            {search && <p className="text-sm mt-1">Prueba con otro término de búsqueda</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map(client => (
              <Card key={client.id} className="p-4 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 truncate">{client.name}</h3>
                      {client.tradeName && client.tradeName !== client.name && (
                        <span className="text-xs text-slate-400">({client.tradeName})</span>
                      )}
                      {client.fiscalId && (
                        <Badge variant="outline" className="text-xs font-mono shrink-0">{client.fiscalId}</Badge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Mail className="h-3.5 w-3.5" />{client.email}
                        </a>
                      )}
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone className="h-3.5 w-3.5" />{client.phone}
                        </a>
                      )}
                      {(client.city || client.province) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[client.city, client.province].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>

                    {client.notes && (
                      <p className="mt-1.5 text-xs text-slate-400 truncate">{client.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-300 font-mono hidden sm:block">#{client.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                      title="Editar"
                      onClick={() => handleEdit(client)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <StelClientFormModal
          client={editingClient}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}