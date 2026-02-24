import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function COPCalculator() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    // Punto 1: Entrada del evaporador (después válvula expansión)
    h1: '',
    // Punto 2: Salida del evaporador (entrada compresor)
    h2: '',
    // Punto 3: Salida del compresor
    h3: '',
    // Punto 4: Entrada del condensador (salida del condensador)
    h4: '',
  });

  const [results, setResults] = useState(null);

  const handleCalculate = () => {
    const h1 = parseFloat(formData.h1);
    const h2 = parseFloat(formData.h2);
    const h3 = parseFloat(formData.h3);
    const h4 = parseFloat(formData.h4);

    if (!h1 || !h2 || !h3 || !h4) {
      toast.error('Introduce todos los valores de entalpía');
      return;
    }

    // Capacidad de refrigeración (calor absorbido en el evaporador)
    const qEvaporador = h2 - h1;

    // Trabajo del compresor
    const wCompresor = h3 - h2;

    // COP (Coefficient of Performance)
    const cop = qEvaporador / wCompresor;

    // EER (Energy Efficiency Ratio)
    const eer = cop * 3.412;

    // Capacidad de condensación
    const qCondensador = h3 - h4;

    setResults({
      qEvaporador: qEvaporador.toFixed(2),
      wCompresor: wCompresor.toFixed(2),
      qCondensador: qCondensador.toFixed(2),
      cop: cop.toFixed(2),
      eer: eer.toFixed(2)
    });

    toast.success('Cálculo completado');
  };

  const handleReset = () => {
    setFormData({ h1: '', h2: '', h3: '', h4: '' });
    setResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calculator className="h-4 w-4" />
          Calcular COP/EER
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calculadora COP y EER (Método Entalpía)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instrucciones */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-2">Pasos:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Medir presiones y temperaturas en los 4 puntos del ciclo</li>
                  <li>Usar diagrama P-h o tablas del refrigerante para obtener entalpías (kJ/kg)</li>
                  <li>Introducir los valores de entalpía en los campos correspondientes</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Diagrama del ciclo */}
          <Card className="p-4 bg-slate-50">
            <h4 className="font-medium text-slate-800 mb-3">Puntos del Ciclo de Refrigeración:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-slate-700">h₁ - Entrada Evaporador</p>
                <p className="text-xs text-slate-500">Después de válvula de expansión</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-slate-700">h₂ - Salida Evaporador</p>
                <p className="text-xs text-slate-500">Entrada del compresor</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-slate-700">h₃ - Salida Compresor</p>
                <p className="text-xs text-slate-500">Entrada del condensador</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-slate-700">h₄ - Salida Condensador</p>
                <p className="text-xs text-slate-500">Entrada válvula expansión</p>
              </div>
            </div>
          </Card>

          {/* Formulario de entradas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>h₁ - Entrada Evaporador (kJ/kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ej: 250.5"
                value={formData.h1}
                onChange={(e) => setFormData({ ...formData, h1: e.target.value })}
              />
            </div>
            <div>
              <Label>h₂ - Salida Evaporador (kJ/kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ej: 405.2"
                value={formData.h2}
                onChange={(e) => setFormData({ ...formData, h2: e.target.value })}
              />
            </div>
            <div>
              <Label>h₃ - Salida Compresor (kJ/kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ej: 445.8"
                value={formData.h3}
                onChange={(e) => setFormData({ ...formData, h3: e.target.value })}
              />
            </div>
            <div>
              <Label>h₄ - Salida Condensador (kJ/kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="ej: 250.5"
                value={formData.h4}
                onChange={(e) => setFormData({ ...formData, h4: e.target.value })}
              />
            </div>
          </div>

          {/* Resultados */}
          {results && (
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Resultados:</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Capacidad Evaporador (Q_evap):</span>
                  <span className="font-semibold text-slate-900">{results.qEvaporador} kJ/kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Trabajo Compresor (W_comp):</span>
                  <span className="font-semibold text-slate-900">{results.wCompresor} kJ/kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Capacidad Condensador (Q_cond):</span>
                  <span className="font-semibold text-slate-900">{results.qCondensador} kJ/kg</span>
                </div>
                <div className="h-px bg-green-300 my-2"></div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded text-white">
                  <span className="font-semibold">COP (Coefficient of Performance):</span>
                  <span className="text-2xl font-bold">{results.cop}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500 to-green-600 rounded text-white">
                  <span className="font-semibold">EER (Energy Efficiency Ratio):</span>
                  <span className="text-2xl font-bold">{results.eer}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded border text-xs text-slate-600">
                <p className="font-medium mb-1">Fórmulas aplicadas:</p>
                <p>• COP = (h₂ - h₁) / (h₃ - h₂) = {results.qEvaporador} / {results.wCompresor}</p>
                <p>• EER = COP × 3.412 = {results.cop} × 3.412</p>
              </div>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Limpiar
            </Button>
            <Button onClick={handleCalculate} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}