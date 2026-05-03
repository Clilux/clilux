import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function StelClientosTab() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('stelProxy', {
        action: 'listClients',
        payload: { limit: 100, offset: 0 }
      });
      setClientes(res.data?.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  return (
    <div className="w-full p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Clientes STEL</h2>
        <Button
          onClick={cargarClientes}
          disabled={loading}
          className="flex gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {clientes.length === 0 && !loading && (
        <p className="text-gray-500">No hay clientes disponibles</p>
      )}

      {clientes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre del Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{cliente.id}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{cliente.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}