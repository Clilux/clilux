import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Tablas de propiedades para refrigerantes (simplificadas)
const getRefrigerantProperties = (refrigerante, presion, temperatura) => {
  // Tablas aproximadas para R410A
  const r410aProps = {
    // Presión (bar) -> Temperatura saturación (°C), h_liquido (kJ/kg), h_vapor (kJ/kg)
    saturation: {
      5: { tsat: -10, hl: 200, hv: 398 },
      7: { tsat: 0, hl: 220, hv: 405 },
      9: { tsat: 10, hl: 240, hv: 412 },
      11: { tsat: 18, hl: 255, hv: 418 },
      15: { tsat: 28, rl: 275, hv: 425 },
      20: { tsat: 38, hl: 295, hv: 430 },
      25: { tsat: 46, hl: 310, hv: 435 },
      30: { tsat: 53, hl: 325, hv: 438 },
    }
  };

  return r410aProps;
};

export default function COPCalculator() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    presion_baja: '',
    presion_alta: '',
    temp_entrada_compresor: '',
    temp_salida_compresor: '',
    temp_evaporador: '',
    temp_condensador: '',
    tension: '',
    corriente: '',
    tipo_corriente: 'monofasico',
    refrigerante: 'R410A',
    caudal_masico: '' // kg/s - opcional, se puede estimar
  });

  const [results, setResults] = useState(null);

  const handleCalculate = () => {
    const pBaja = parseFloat(formData.presion_baja);
    const pAlta = parseFloat(formData.presion_alta);
    const tEntrada = parseFloat(formData.temp_entrada_compresor);
    const tSalida = parseFloat(formData.temp_salida_compresor);
    const tEvap = parseFloat(formData.temp_evaporador);
    const tCond = parseFloat(formData.temp_condensador) || 40;
    const voltaje = parseFloat(formData.tension);
    const corriente = parseFloat(formData.corriente);
    const caudalInput = parseFloat(formData.caudal_masico);

    if (!pBaja || !pAlta || !tEntrada || !tSalida || !tEvap || !voltaje || !corriente) {
      toast.error('Introduce todos los valores obligatorios');
      return;
    }

    // CÁLCULO DE ENTALPÍAS (R410A - correlaciones mejoradas)
    
    // h1: Salida condensador (líquido saturado o subenfriado a presión alta)
    // Aproximación: h_liquido_sat = 200 + (P_alta - 10) * 8.5
    const h1 = 200 + (pAlta - 10) * 8.5;
    
    // h2: Entrada compresor (vapor sobrecalentado a presión baja)
    // h_vapor_sat_baja + cp * sobrecalentamiento
    const tSatBaja = -15 + (pBaja - 5) * 5; // Temp saturación aprox.
    const sobrecalentamiento = tEntrada - tSatBaja;
    const hVaporSatBaja = 390 + (pBaja - 5) * 3;
    const h2 = hVaporSatBaja + sobrecalentamiento * 1.0; // cp vapor ≈ 1 kJ/kg·K
    
    // h3: Salida compresor (vapor sobrecalentado a presión alta)
    const tSatAlta = 30 + (pAlta - 20) * 2.5;
    const sobrecalentamientoAlta = tSalida - tSatAlta;
    const hVaporSatAlta = 410 + (pAlta - 20) * 2.5;
    const h3 = hVaporSatAlta + sobrecalentamientoAlta * 1.1;
    
    // h4 = h1 (válvula de expansión - isoentálpico)
    const h4 = h1;

    // EFECTOS TÉRMICOS
    const qEvaporador = h2 - h1; // Calor absorbido en evaporador (kJ/kg)
    const wCompresor = h3 - h2; // Trabajo del compresor (kJ/kg)
    const qCondensador = h3 - h4; // Calor rechazado en condensador (kJ/kg)

    // POTENCIA ELÉCTRICA CONSUMIDA
    let potenciaElectrica;
    let cosPhi;
    if (formData.tipo_corriente === 'trifasico') {
      cosPhi = 0.85;
      potenciaElectrica = (Math.sqrt(3) * voltaje * corriente * cosPhi) / 1000;
    } else {
      cosPhi = 0.90;
      potenciaElectrica = (voltaje * corriente * cosPhi) / 1000;
    }

    // CAUDAL MÁSICO
    let caudalMasico;
    if (caudalInput && caudalInput > 0) {
      caudalMasico = caudalInput; // kg/s
    } else {
      // Estimar caudal másico desde potencia mecánica
      // Potencia_mecanica = m_dot * w_compresor
      // Asumiendo rendimiento motor ≈ 0.88
      const potenciaMecanica = potenciaElectrica * 0.88; // kW
      caudalMasico = potenciaMecanica / wCompresor; // kg/s
    }

    // CAPACIDAD FRIGORÍFICA
    const capacidadFrigorifica = qEvaporador * caudalMasico; // kW

    // CAPACIDAD CALORÍFICA (condensador)
    const capacidadCalorifica = qCondensador * caudalMasico; // kW

    // COP Y EER
    const cop = capacidadFrigorifica / potenciaElectrica;
    const eer = cop * 3.412; // BTU/h por Watt

    // VERIFICACIÓN BALANCE ENERGÉTICO
    const balanceEnergia = capacidadCalorifica - (capacidadFrigorifica + potenciaElectrica);
    const errorBalance = Math.abs(balanceEnergia);

    setResults({
      // Entalpías
      h1: h1.toFixed(1),
      h2: h2.toFixed(1),
      h3: h3.toFixed(1),
      h4: h4.toFixed(1),
      
      // Temperaturas de saturación
      tSatBaja: tSatBaja.toFixed(1),
      tSatAlta: tSatAlta.toFixed(1),
      sobrecalentamiento: sobrecalentamiento.toFixed(1),
      
      // Efectos
      qEvaporador: qEvaporador.toFixed(2),
      wCompresor: wCompresor.toFixed(2),
      qCondensador: qCondensador.toFixed(2),
      
      // Potencias
      potenciaElectrica: potenciaElectrica.toFixed(2),
      cosPhi: cosPhi.toFixed(2),
      capacidadFrigorifica: capacidadFrigorifica.toFixed(2),
      capacidadCalorifica: capacidadCalorifica.toFixed(2),
      
      // Caudal
      caudalMasico: caudalMasico.toFixed(4),
      caudalEstimado: !caudalInput,
      
      // Rendimiento
      cop: cop.toFixed(2),
      eer: eer.toFixed(2),
      
      // Balance
      errorBalance: errorBalance.toFixed(2),
      
      // Datos de entrada
      inputs: { ...formData }
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
      temp_condensador: '',
      tension: '',
      corriente: '',
      tipo_corriente: 'monofasico',
      refrigerante: 'R410A',
      caudal_masico: ''
    });
    setResults(null);
  };

  const generateReport = () => {
    if (!results) return;

    const reportContent = `
INFORME DE CÁLCULO COP Y EER
========================================

DATOS DE ENTRADA:
----------------
Refrigerante: ${formData.refrigerante}
Presión de Baja: ${formData.presion_baja} bar
Presión de Alta: ${formData.presion_alta} bar
Temperatura Entrada Compresor: ${formData.temp_entrada_compresor} °C
Temperatura Salida Compresor: ${formData.temp_salida_compresor} °C
Temperatura Evaporador: ${formData.temp_evaporador} °C
${formData.temp_condensador ? `Temperatura Condensador: ${formData.temp_condensador} °C` : ''}

SISTEMA ELÉCTRICO:
-----------------
Tipo: ${formData.tipo_corriente === 'trifasico' ? 'Trifásico' : 'Monofásico'}
Tensión: ${formData.tension} V
Corriente: ${formData.corriente} A
Factor de Potencia (cos φ): ${results.cosPhi}

CÁLCULO DE ENTALPÍAS:
--------------------
Temperatura saturación baja presión: ${results.tSatBaja} °C
Temperatura saturación alta presión: ${results.tSatAlta} °C
Sobrecalentamiento: ${results.sobrecalentamiento} °C

h₁ (Salida Condensador): ${results.h1} kJ/kg
h₂ (Entrada Compresor): ${results.h2} kJ/kg
h₃ (Salida Compresor): ${results.h3} kJ/kg
h₄ (Entrada Evaporador): ${results.h4} kJ/kg

EFECTOS TÉRMICOS ESPECÍFICOS:
-----------------------------
Efecto Frigorífico (q_evap = h₂ - h₁): ${results.qEvaporador} kJ/kg
Trabajo Compresor (w_comp = h₃ - h₂): ${results.wCompresor} kJ/kg
Calor Condensador (q_cond = h₃ - h₄): ${results.qCondensador} kJ/kg

CAUDAL MÁSICO:
-------------
Caudal másico ${results.caudalEstimado ? '(estimado)' : '(medido)'}: ${results.caudalMasico} kg/s

POTENCIAS Y CAPACIDADES:
-----------------------
${formData.tipo_corriente === 'trifasico' 
  ? `Potencia Eléctrica = √3 × ${formData.tension} × ${formData.corriente} × ${results.cosPhi} / 1000`
  : `Potencia Eléctrica = ${formData.tension} × ${formData.corriente} × ${results.cosPhi} / 1000`}
Potencia Eléctrica Consumida: ${results.potenciaElectrica} kW

Capacidad Frigorífica = q_evap × ṁ = ${results.qEvaporador} × ${results.caudalMasico}
Capacidad Frigorífica: ${results.capacidadFrigorifica} kW

Capacidad Calorífica = q_cond × ṁ = ${results.qCondensador} × ${results.caudalMasico}
Capacidad Calorífica: ${results.capacidadCalorifica} kW

RENDIMIENTO:
-----------
COP = Capacidad Frigorífica / Potencia Eléctrica
COP = ${results.capacidadFrigorifica} / ${results.potenciaElectrica}
COP = ${results.cop}

EER = COP × 3.412
EER = ${results.cop} × 3.412
EER = ${results.eer} BTU/h·W

BALANCE ENERGÉTICO:
------------------
Q_condensador = Q_evaporador + W_eléctrico
${results.capacidadCalorifica} kW = ${results.capacidadFrigorifica} kW + ${results.potenciaElectrica} kW
Error de balance: ${results.errorBalance} kW ${parseFloat(results.errorBalance) < 0.5 ? '✓ Aceptable' : '⚠ Revisar mediciones'}

NOTAS:
------
- Cálculo basado en propiedades aproximadas de ${formData.refrigerante}
- Factor de potencia asumido: ${results.cosPhi}
${results.caudalEstimado ? '- Caudal másico estimado desde potencia eléctrica y trabajo del compresor' : ''}
- Para mayor precisión, utilizar tablas de propiedades específicas del refrigerante

Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}
`;

    // Descargar como archivo de texto
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_COP_EER_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Informe descargado');
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
              <Label>Temp. Condensador (°C) <span className="text-xs text-slate-500">(opcional)</span></Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 40"
                value={formData.temp_condensador}
                onChange={(e) => setFormData({ ...formData, temp_condensador: e.target.value })}
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
              <Label>Caudal Másico (kg/s) <span className="text-xs text-slate-500">(opcional)</span></Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="Se estimará si no se indica"
                value={formData.caudal_masico}
                onChange={(e) => setFormData({ ...formData, caudal_masico: e.target.value })}
              />
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
                <p className="text-xs text-slate-600 font-medium mb-2">Temperaturas de Saturación:</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>T sat. baja: <span className="font-semibold">{results.tSatBaja} °C</span></div>
                  <div>T sat. alta: <span className="font-semibold">{results.tSatAlta} °C</span></div>
                </div>
                <p className="text-xs text-slate-600">Sobrecalentamiento: <span className="font-semibold">{results.sobrecalentamiento} °C</span></p>
              </div>

              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs text-slate-600 font-medium mb-2">Entalpías calculadas (kJ/kg):</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>h₁: <span className="font-semibold">{results.h1}</span></div>
                  <div>h₂: <span className="font-semibold">{results.h2}</span></div>
                  <div>h₃: <span className="font-semibold">{results.h3}</span></div>
                  <div>h₄: <span className="font-semibold">{results.h4}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Caudal Másico {results.caudalEstimado && '(estimado)'}:</span>
                  <span className="font-semibold text-slate-900">{results.caudalMasico} kg/s</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Potencia Eléctrica (cos φ={results.cosPhi}):</span>
                  <span className="font-semibold text-slate-900">{results.potenciaElectrica} kW</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Capacidad Frigorífica:</span>
                  <span className="font-semibold text-slate-900">{results.capacidadFrigorifica} kW</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Capacidad Calorífica:</span>
                  <span className="font-semibold text-slate-900">{results.capacidadCalorifica} kW</span>
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
              
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Balance energético:</span>
                  <span className={`font-semibold ${parseFloat(results.errorBalance) < 0.5 ? 'text-green-600' : 'text-amber-600'}`}>
                    Error: {results.errorBalance} kW
                  </span>
                </div>
              </div>

              <Button onClick={generateReport} className="w-full mt-3 bg-slate-700 hover:bg-slate-800">
                <FileText className="h-4 w-4 mr-2" />
                Descargar Informe Completo
              </Button>
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