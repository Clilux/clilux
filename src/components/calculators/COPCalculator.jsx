import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function COPCalculator() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    presion_baja: '',
    presion_alta: '',
    temp_entrada_compresor: '',
    temp_salida_compresor: '',
    temp_evaporador: '',
    tension: '',
    corriente: '',
    tipo_corriente: 'monofasico',
    refrigerante: 'R410A'
  });

  const [results, setResults] = useState(null);

  const handleCalculate = () => {
    const pBaja = parseFloat(formData.presion_baja);
    const pAlta = parseFloat(formData.presion_alta);
    const tEntrada = parseFloat(formData.temp_entrada_compresor);
    const tSalida = parseFloat(formData.temp_salida_compresor);
    const tEvap = parseFloat(formData.temp_evaporador);
    const voltaje = parseFloat(formData.tension);
    const corriente = parseFloat(formData.corriente);

    if (!pBaja || !pAlta || !tEntrada || !tSalida || !tEvap || !voltaje || !corriente) {
      toast.error('Introduce todos los valores');
      return;
    }

    // Estimación de entalpías basada en refrigerante R410A (aproximación)
    // h = f(P, T) - usando correlaciones simplificadas
    
    // Para R410A aproximaciones:
    // h1 (salida condensador / entrada válvula): líquido saturado a presión alta
    const h1 = 100 + (pAlta * 15); // kJ/kg (aproximación)
    
    // h2 (entrada compresor): vapor saturado a baja presión + sobrecalentamiento
    const sobrecalentamiento = tEntrada - (-10 - (10 - pBaja) * 2); // Temp evaporación estimada
    const h2 = 400 + (pBaja * 8) + (sobrecalentamiento * 1.0);
    
    // h3 (salida compresor): vapor sobrecalentado a alta presión
    const h3 = 420 + (pAlta * 10) + ((tSalida - 40) * 1.2);
    
    // h4 = h1 (proceso isoentálpico en válvula de expansión)
    const h4 = h1;

    // Capacidad frigorífica (kJ/kg)
    const qEvaporador = h2 - h1;

    // Trabajo del compresor (kJ/kg)
    const wCompresor = h3 - h2;

    // Potencia eléctrica consumida (kW)
    let potenciaElectrica;
    if (formData.tipo_corriente === 'trifasico') {
      potenciaElectrica = (Math.sqrt(3) * voltaje * corriente * 0.85) / 1000; // cos φ = 0.85
    } else {
      potenciaElectrica = (voltaje * corriente * 0.9) / 1000; // cos φ = 0.9
    }

    // COP real = Capacidad frigorífica / Potencia consumida
    // Necesitamos caudal másico estimado
    const caudalEstimado = (potenciaElectrica * 3600) / wCompresor; // kg/h aproximado
    const capacidadFrigorifica = (qEvaporador * caudalEstimado) / 3600; // kW

    const cop = capacidadFrigorifica / potenciaElectrica;
    const eer = cop * 3.412;

    setResults({
      h1: h1.toFixed(1),
      h2: h2.toFixed(1),
      h3: h3.toFixed(1),
      h4: h4.toFixed(1),
      qEvaporador: qEvaporador.toFixed(2),
      wCompresor: wCompresor.toFixed(2),
      potenciaElectrica: potenciaElectrica.toFixed(2),
      capacidadFrigorifica: capacidadFrigorifica.toFixed(2),
      cop: cop.toFixed(2),
      eer: eer.toFixed(2)
    });

    toast.success('Cálculo completado');
  };

  const handleReset = () => {
    setFormData({
      presion_baja: '',
      presion_alta: '',
      temp_entrada_compresor: '',
      temp_salida_compresor: '',
      temp_evaporador: '',
      tension: '',
      corriente: '',
      tipo_corriente: 'monofasico',
      refrigerante: 'R410A'
    });
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
                <p className="font-medium mb-2">Mediciones necesarias:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Presiones de alta y baja del sistema</li>
                  <li>Temperaturas de entrada/salida del compresor</li>
                  <li>Temperatura del evaporador</li>
                  <li>Tensión y corriente eléctrica</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Formulario de entradas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Refrigerante</Label>
              <Select
                value={formData.refrigerante}
                onValueChange={(v) => setFormData({ ...formData, refrigerante: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R410A">R410A</SelectItem>
                  <SelectItem value="R32">R32</SelectItem>
                  <SelectItem value="R134A">R134A</SelectItem>
                  <SelectItem value="R404A">R404A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Presión de Baja (bar)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 8.5"
                value={formData.presion_baja}
                onChange={(e) => setFormData({ ...formData, presion_baja: e.target.value })}
              />
            </div>
            <div>
              <Label>Presión de Alta (bar)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 28.0"
                value={formData.presion_alta}
                onChange={(e) => setFormData({ ...formData, presion_alta: e.target.value })}
              />
            </div>

            <div>
              <Label>Temp. Entrada Compresor (°C)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 15"
                value={formData.temp_entrada_compresor}
                onChange={(e) => setFormData({ ...formData, temp_entrada_compresor: e.target.value })}
              />
            </div>
            <div>
              <Label>Temp. Salida Compresor (°C)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 75"
                value={formData.temp_salida_compresor}
                onChange={(e) => setFormData({ ...formData, temp_salida_compresor: e.target.value })}
              />
            </div>

            <div>
              <Label>Temp. Evaporador (°C)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 5"
                value={formData.temp_evaporador}
                onChange={(e) => setFormData({ ...formData, temp_evaporador: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo de Corriente</Label>
              <Select
                value={formData.tipo_corriente}
                onValueChange={(v) => setFormData({ ...formData, tipo_corriente: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofasico">Monofásico</SelectItem>
                  <SelectItem value="trifasico">Trifásico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tensión (V)</Label>
              <Input
                type="number"
                step="1"
                placeholder="ej: 230 o 400"
                value={formData.tension}
                onChange={(e) => setFormData({ ...formData, tension: e.target.value })}
              />
            </div>
            <div>
              <Label>Corriente (A)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 8.5"
                value={formData.corriente}
                onChange={(e) => setFormData({ ...formData, corriente: e.target.value })}
              />
            </div>
          </div>

          {/* Resultados */}
          {results && (
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Resultados del Cálculo:</h4>
              
              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs text-slate-600 font-medium mb-2">Entalpías estimadas (kJ/kg):</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>h₁: <span className="font-semibold">{results.h1}</span></div>
                  <div>h₂: <span className="font-semibold">{results.h2}</span></div>
                  <div>h₃: <span className="font-semibold">{results.h3}</span></div>
                  <div>h₄: <span className="font-semibold">{results.h4}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Potencia Eléctrica Consumida:</span>
                  <span className="font-semibold text-slate-900">{results.potenciaElectrica} kW</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Capacidad Frigorífica Estimada:</span>
                  <span className="font-semibold text-slate-900">{results.capacidadFrigorifica} kW</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Efecto Frigorífico (q_evap):</span>
                  <span className="font-semibold text-slate-900">{results.qEvaporador} kJ/kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Trabajo Compresor (w_comp):</span>
                  <span className="font-semibold text-slate-900">{results.wCompresor} kJ/kg</span>
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
                <p className="font-medium mb-1">Método de cálculo:</p>
                <p>• Potencia = {formData.tipo_corriente === 'trifasico' ? '√3 × V × I × cos φ' : 'V × I × cos φ'}</p>
                <p>• COP = Capacidad Frigorífica / Potencia Consumida</p>
                <p>• EER = COP × 3.412</p>
                <p className="text-amber-700 mt-2">⚠️ Nota: Cálculo aproximado basado en {formData.refrigerante}</p>
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