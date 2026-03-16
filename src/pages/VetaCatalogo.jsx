import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Loader2, ExternalLink, Tag, Info, ShoppingCart, AlertCircle } from 'lucide-react';

export default function BusquedaPVP() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(query.trim());

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca información técnica y el PVP (precio de venta al público) del siguiente producto de climatización, refrigeración, fontanería o instalaciones: "${query.trim()}"

Consulta específicamente estas webs especializadas en España:
- https://www.acae.es/ (distribuidor de climatización y refrigeración)
- https://www.erfri.com/ (distribuidor de refrigeración)
- https://www.pecomark.com/es/ecommerce (distribuidor de climatización)
- https://generadordeprecios.info/ (generador de precios de construcción e instalaciones)
- También busca en otros distribuidores españoles conocidos como climamarket, suministros industriales, etc.

Proporciona:
1. Nombre completo y descripción del producto
2. Fabricante/marca
3. Especificaciones técnicas principales
4. PVP exacto o aproximado en euros encontrado en esas webs (indica en qué web lo encontraste)
5. Rango de precios si hay variaciones entre distribuidores
6. Links o referencias de dónde comprar
7. Equivalencias o productos similares si no encuentras el exacto`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            descripcion: { type: "string" },
            fabricante: { type: "string" },
            especificaciones: {
              type: "array",
              items: { type: "string" }
            },
            pvp_aproximado: { type: "string" },
            rango_precios: { type: "string" },
            distribuidores: {
              type: "array",
              items: { type: "string" }
            },
            notas_adicionales: { type: "string" },
            encontrado: { type: "boolean" }
          }
        }
      });
      setResults(response);
    } catch (err) {
      setError('No se pudo obtener información. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gray-700 px-6 py-4 border-b border-white/10">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('HomeTecnico'))} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 rounded-full w-10 h-10 flex items-center justify-center">
              <Tag className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Búsquedas de PVP</h1>
              <p className="text-xs text-slate-400">Consulta precios en ACAE, ERFRI, Pecomark y más</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Search */}
        <Card className="p-6 bg-white border shadow-sm">
          <p className="text-sm text-slate-600 mb-4">
            Introduce una <strong>referencia</strong> de producto o una <strong>descripción</strong> y buscaremos información técnica y precio online.
          </p>
          <div className="flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: R410A, válvula de expansión Danfoss, termostato Honeywell T6..."
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            💡 Puedes buscar por código de referencia, descripción del producto, marca o modelo.
          </p>
        </Card>

        {/* Loading */}
        {loading && (
          <Card className="p-10 text-center bg-white border shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Buscando información online...</p>
            <p className="text-slate-400 text-sm mt-1">Consultando distribuidores y fabricantes</p>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200 border">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">Resultados para:</p>
              <Badge variant="secondary" className="text-sm">{searched}</Badge>
              {!results.encontrado && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Resultado aproximado</Badge>
              )}
            </div>

            {/* Nombre y descripción */}
            <Card className="p-6 bg-white border shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-50 shrink-0">
                  <Info className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{results.nombre || searched}</h2>
                  {results.fabricante && (
                    <p className="text-sm text-slate-500 mt-0.5">Fabricante: <strong>{results.fabricante}</strong></p>
                  )}
                </div>
              </div>
              {results.descripcion && (
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{results.descripcion}</p>
              )}
            </Card>

            {/* Precio */}
            {(results.pvp_aproximado || results.rango_precios) && (
              <Card className="p-6 bg-amber-50 border-amber-200 border shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                    <ShoppingCart className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-1">Precio orientativo</h3>
                    {results.pvp_aproximado && (
                      <p className="text-2xl font-bold text-amber-700">{results.pvp_aproximado}</p>
                    )}
                    {results.rango_precios && (
                      <p className="text-sm text-amber-600 mt-1">{results.rango_precios}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Especificaciones */}
            {results.especificaciones?.length > 0 && (
              <Card className="p-6 bg-white border shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3">Especificaciones técnicas</h3>
                <ul className="space-y-2">
                  {results.especificaciones.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {spec}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Distribuidores */}
            {results.distribuidores?.length > 0 && (
              <Card className="p-6 bg-white border shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Dónde comprar
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.distribuidores.map((dist, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1 px-3">{dist}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Notas adicionales */}
            {results.notas_adicionales && (
              <Card className="p-6 bg-slate-50 border shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-2">Información adicional</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{results.notas_adicionales}</p>
              </Card>
            )}

            <p className="text-xs text-slate-400 text-center">
              ⚠️ Los precios son orientativos y pueden variar según distribuidor, cantidad y momento de compra.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}