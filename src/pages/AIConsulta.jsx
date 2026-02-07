import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Send } from 'lucide-react';
import NavHeader from '../components/navigation/NavHeader';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function AIConsulta() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const userQuery = query;
    setQuery('');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un asistente experto en climatización y sistemas HVAC. 
        Ayuda al técnico a diagnosticar averías, interpretar códigos de error, 
        recomendar soluciones y proporcionar información técnica sobre equipos de climatización.
        
        Pregunta del técnico: ${userQuery}
        
        Responde de forma clara, concisa y técnica. Si es necesario, proporciona pasos de diagnóstico.`,
        add_context_from_internet: true,
      });

      setHistory(prev => [...prev, { query: userQuery, response: result }]);
      setResponse(result);
    } catch (error) {
      toast.error('Error al consultar la IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <NavHeader title="Consulta IA - Diagnóstico de Averías" />

        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Asistente IA Técnico</h2>
              <p className="text-sm text-slate-400">Consulta diagnósticos, códigos de error y soluciones técnicas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ejemplo: ¿Qué significa el código de error E3 en un split Mitsubishi? ¿Cómo diagnosticar una fuga de refrigerante?"
              className="min-h-32 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
              disabled={loading}
            />
            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Consultar IA
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Response */}
        {response && (
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-white">Respuesta</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown className="text-slate-200 leading-relaxed">
                {response}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Historial de Consultas</h3>
            {history.slice().reverse().map((item, index) => (
              <Card key={index} className="p-4 bg-white/5 backdrop-blur-sm border-white/10">
                <div className="mb-2">
                  <p className="text-sm font-medium text-blue-400">Pregunta:</p>
                  <p className="text-white">{item.query}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-400">Respuesta:</p>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown className="text-slate-300 text-sm">
                      {item.response}
                    </ReactMarkdown>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}