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
    temp_evaporacion: '',
    presion_alta: '',
    temp_condensacion: '',
    temp_aspiracion: '',
    temp_liquido: '',
    temp_descarga: '',
    refrigerante: 'R410A',
    // Entalpías (opcionales - se pueden introducir manualmente si se tienen)
    h1_manual: '',
    h2_manual: '',
    h3_manual: '',
    h4_manual: ''
  });

  const [results, setResults] = useState(null);

  const handleCalculate = () => {
    const pBaja = parseFloat(formData.presion_baja);
    const pAlta = parseFloat(formData.presion_alta);
    const tEvap = parseFloat(formData.temp_evaporacion);
    const tCond = parseFloat(formData.temp_condensacion);
    const tAsp = parseFloat(formData.temp_aspiracion);
    const tLiq = parseFloat(formData.temp_liquido);
    const tDesc = parseFloat(formData.temp_descarga);

    if (!pBaja || !pAlta || !tEvap || !tCond || !tAsp || !tLiq || !tDesc) {
      toast.error('Introduce todos los valores medidos por Testo');
      return;
    }

    // CÁLCULO DE ENTALPÍAS según procedimiento estándar
    // Usar valores manuales si se proporcionan, sino calcular aproximaciones
    
    let h1, h2, h3, h4;
    
    if (formData.h1_manual) {
      h1 = parseFloat(formData.h1_manual);
    } else {
      // h1: Entalpía en aspiración (P_baja + T_aspiración)
      // Aproximación para R410A: vapor saturado + sobrecalentamiento
      const hVaporSatBaja = 390 + (pBaja - 5) * 3;
      const sobrecalentamiento = tAsp - tEvap;
      h1 = hVaporSatBaja + sobrecalentamiento * 1.0;
    }

    if (formData.h3_manual) {
      h3 = parseFloat(formData.h3_manual);
    } else {
      // h3: Entalpía a salida del condensador (P_alta + T_líquido)
      // Líquido saturado o subenfriado
      const hLiquidoSatAlta = 200 + (pAlta - 10) * 8.5;
      const subenfriamiento = tCond - tLiq;
      h3 = hLiquidoSatAlta - subenfriamiento * 4.2; // cp líquido ≈ 4.2 kJ/kg·K
    }

    if (formData.h4_manual) {
      h4 = parseFloat(formData.h4_manual);
    } else {
      // h4: Tras expansión (h4 = h3 - proceso isoentálpico)
      h4 = h3;
    }

    if (formData.h2_manual) {
      h2 = parseFloat(formData.h2_manual);
    } else {
      // h2: Salida del compresor (P_alta + T_descarga)
      // Vapor sobrecalentado a alta presión
      const hVaporSatAlta = 410 + (pAlta - 20) * 2.5;
      const sobrecalentamientoDescarga = tDesc - tCond;
      h2 = hVaporSatAlta + sobrecalentamientoDescarga * 1.1;
    }

    // CÁLCULOS SEGÚN PROCEDIMIENTO
    
    // Efecto Refrigerante (Q_e)
    const efectoRefrigerante = h1 - h4;
    
    // Trabajo de Compresión (W_c)
    const trabajoCompresion = h2 - h1;
    
    // Calor en condensador
    const calorCondensador = h2 - h3;
    
    // COP FRÍO
    const copFrio = efectoRefrigerante / trabajoCompresion;
    
    // COP CALOR
    const copCalor = calorCondensador / trabajoCompresion;
    
    // EER (Energy Efficiency Ratio)
    const eer = copFrio * 3.412;
    
    // Cálculos adicionales
    const recalentamiento = tAsp - tEvap;
    const subenfriamiento = tCond - tLiq;

    setResults({
      // Entalpías
      h1: h1.toFixed(1),
      h2: h2.toFixed(1),
      h3: h3.toFixed(1),
      h4: h4.toFixed(1),
      
      // Temperaturas
      recalentamiento: recalentamiento.toFixed(1),
      subenfriamiento: subenfriamiento.toFixed(1),
      
      // Efectos específicos
      efectoRefrigerante: efectoRefrigerante.toFixed(2),
      trabajoCompresion: trabajoCompresion.toFixed(2),
      calorCondensador: calorCondensador.toFixed(2),
      
      // Rendimiento
      copFrio: copFrio.toFixed(2),
      copCalor: copCalor.toFixed(2),
      eer: eer.toFixed(2),
      
      // Datos de entrada
      inputs: { ...formData },
      entalpiasManuales: !!(formData.h1_manual || formData.h2_manual || formData.h3_manual || formData.h4_manual)
    });

    toast.success('Cálculo COP completado');
  };

  const handleReset = () => {
    setFormData({
      presion_baja: '',
      temp_evaporacion: '',
      presion_alta: '',
      temp_condensacion: '',
      temp_aspiracion: '',
      temp_liquido: '',
      temp_descarga: '',
      refrigerante: 'R410A',
      h1_manual: '',
      h2_manual: '',
      h3_manual: '',
      h4_manual: ''
    });
    setResults(null);
  };

  const generateReport = () => {
    if (!results) return;

    const reportContent = `
INFORME DE CÁLCULO COP Y EER - MÉTODO TESTO
============================================

DATOS MEDIDOS (TESTO):
---------------------
Refrigerante: ${formData.refrigerante}

Presión de Baja (P_baja): ${formData.presion_baja} bar
Temperatura de Evaporación (T_evap): ${formData.temp_evaporacion} °C

Presión de Alta (P_alta): ${formData.presion_alta} bar
Temperatura de Condensación (T_cond): ${formData.temp_condensacion} °C

Temperatura de Aspiración (T_asp): ${formData.temp_aspiracion} °C
Temperatura del Líquido (T_liq): ${formData.temp_liquido} °C
Temperatura de Descarga (T_desc): ${formData.temp_descarga} °C

PARÁMETROS CALCULADOS:
---------------------
Recalentamiento: ${results.recalentamiento} °C
Subenfriamiento: ${results.subenfriamiento} °C

ENTALPÍAS ${results.entalpiasManuales ? '(VALORES INTRODUCIDOS MANUALMENTE)' : '(ESTIMADAS)'}:
-----------
h₁ (Aspiración - Entrada Compresor): ${results.h1} kJ/kg
   [P_baja + T_aspiración]

h₂ (Descarga - Salida Compresor): ${results.h2} kJ/kg
   [P_alta + T_descarga]

h₃ (Líquido - Salida Condensador): ${results.h3} kJ/kg
   [P_alta + T_líquido]

h₄ (Evaporador - Tras Expansión): ${results.h4} kJ/kg
   [h₄ = h₃ - Proceso isoentálpico]

PROCEDIMIENTO DE CÁLCULO:
------------------------
1. Efecto Refrigerante (Q_e):
   Q_e = h₁ - h₄
   Q_e = ${results.h1} - ${results.h4}
   Q_e = ${results.efectoRefrigerante} kJ/kg

2. Trabajo de Compresión (W_c):
   W_c = h₂ - h₁
   W_c = ${results.h2} - ${results.h1}
   W_c = ${results.trabajoCompresion} kJ/kg

3. Calor en Condensador:
   Q_cond = h₂ - h₃
   Q_cond = ${results.h2} - ${results.h3}
   Q_cond = ${results.calorCondensador} kJ/kg

RESULTADOS:
----------
COP FRÍO = (h₁ - h₄) / (h₂ - h₁)
COP FRÍO = ${results.efectoRefrigerante} / ${results.trabajoCompresion}
COP FRÍO = ${results.copFrio}

COP CALOR = (h₂ - h₃) / (h₂ - h₁)
COP CALOR = ${results.calorCondensador} / ${results.trabajoCompresion}
COP CALOR = ${results.copCalor}

EER = COP FRÍO × 3.412
EER = ${results.copFrio} × 3.412
EER = ${results.eer} BTU/h·W

INTERPRETACIÓN:
--------------
- COP Frío: Por cada kW de energía consumida, se obtienen ${results.copFrio} kW de refrigeración
- COP Calor: Por cada kW de energía consumida, se obtienen ${results.copCalor} kW de calefacción
- Recalentamiento de ${results.recalentamiento}°C ${parseFloat(results.recalentamiento) > 5 && parseFloat(results.recalentamiento) < 15 ? '✓ Óptimo' : '⚠ Revisar'}
- Subenfriamiento de ${results.subenfriamiento}°C ${parseFloat(results.subenfriamiento) > 3 && parseFloat(results.subenfriamiento) < 10 ? '✓ Óptimo' : '⚠ Revisar'}

NOTAS:
------
${results.entalpiasManuales 
  ? '- Cálculo basado en entalpías introducidas manualmente desde diagrama P-h' 
  : '- Entalpías estimadas mediante correlaciones aproximadas de ' + formData.refrigerante}
- Para máxima precisión, usar diagrama Mollier o tabla P-h del refrigerante específico
- Los valores de COP dependen de las condiciones de operación

Equipo de medición: TESTO
Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_COP_${formData.refrigerante}_${new Date().toISOString().split('T')[0]}.txt`;
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
                <p className="font-medium mb-2">Datos a medir con TESTO:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>P_baja / T_evaporación:</strong> Presión y temperatura de aspiración (evaporador)</li>
                  <li><strong>P_alta / T_condensación:</strong> Presión y temperatura de descarga (condensador)</li>
                  <li><strong>T_aspiración:</strong> Temperatura real entrada del compresor (para recalentamiento)</li>
                  <li><strong>T_líquido:</strong> Temperatura salida del condensador (para subenfriamiento)</li>
                  <li><strong>T_descarga:</strong> Temperatura salida del compresor</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Formulario de entradas */}
          <div className="space-y-4">
            <div>
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
                  <SelectItem value="R407C">R407C</SelectItem>
                  <SelectItem value="R22">R22</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Presión de Baja (P_baja) - bar</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 8.5"
                  value={formData.presion_baja}
                  onChange={(e) => setFormData({ ...formData, presion_baja: e.target.value })}
                />
              </div>
              <div>
                <Label>Temp. Evaporación (T_evap) - °C</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 5"
                  value={formData.temp_evaporacion}
                  onChange={(e) => setFormData({ ...formData, temp_evaporacion: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Presión de Alta (P_alta) - bar</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 28.0"
                  value={formData.presion_alta}
                  onChange={(e) => setFormData({ ...formData, presion_alta: e.target.value })}
                />
              </div>
              <div>
                <Label>Temp. Condensación (T_cond) - °C</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 45"
                  value={formData.temp_condensacion}
                  onChange={(e) => setFormData({ ...formData, temp_condensacion: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temp. Aspiración (T_asp) - °C</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 15"
                  value={formData.temp_aspiracion}
                  onChange={(e) => setFormData({ ...formData, temp_aspiracion: e.target.value })}
                />
              </div>
              <div>
                <Label>Temp. Líquido (T_liq) - °C</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 40"
                  value={formData.temp_liquido}
                  onChange={(e) => setFormData({ ...formData, temp_liquido: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Temp. Descarga (T_desc) - °C</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 75"
                value={formData.temp_descarga}
                onChange={(e) => setFormData({ ...formData, temp_descarga: e.target.value })}
              />
            </div>

            <Card className="p-3 bg-slate-50">
              <p className="text-xs font-medium text-slate-700 mb-2">
                Entalpías (opcional - si tienes diagrama P-h):
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">h₁ (kJ/kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Auto"
                    value={formData.h1_manual}
                    onChange={(e) => setFormData({ ...formData, h1_manual: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">h₂ (kJ/kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Auto"
                    value={formData.h2_manual}
                    onChange={(e) => setFormData({ ...formData, h2_manual: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">h₃ (kJ/kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Auto"
                    value={formData.h3_manual}
                    onChange={(e) => setFormData({ ...formData, h3_manual: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">h₄ (kJ/kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Auto"
                    value={formData.h4_manual}
                    onChange={(e) => setFormData({ ...formData, h4_manual: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Resultados */}
          {results && (
            <Card className="p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Resultados del Cálculo:</h4>
              
              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs text-slate-600 font-medium mb-2">Parámetros medidos:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Recalentamiento: <span className="font-semibold">{results.recalentamiento} °C</span></div>
                  <div>Subenfriamiento: <span className="font-semibold">{results.subenfriamiento} °C</span></div>
                </div>
              </div>

              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs text-slate-600 font-medium mb-2">
                  Entalpías {results.entalpiasManuales ? '(introducidas)' : '(estimadas)'} (kJ/kg):
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>h₁ (Aspiración): <span className="font-semibold">{results.h1}</span></div>
                  <div>h₂ (Descarga): <span className="font-semibold">{results.h2}</span></div>
                  <div>h₃ (Líquido): <span className="font-semibold">{results.h3}</span></div>
                  <div>h₄ (Evaporador): <span className="font-semibold">{results.h4}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Efecto Refrigerante (Q_e):</span>
                  <span className="font-semibold text-slate-900">{results.efectoRefrigerante} kJ/kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Trabajo Compresión (W_c):</span>
                  <span className="font-semibold text-slate-900">{results.trabajoCompresion} kJ/kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm text-slate-700">Calor Condensador:</span>
                  <span className="font-semibold text-slate-900">{results.calorCondensador} kJ/kg</span>
                </div>
                <div className="h-px bg-green-300 my-2"></div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded text-white">
                  <span className="font-semibold">COP FRÍO:</span>
                  <span className="text-2xl font-bold">{results.copFrio}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded text-white">
                  <span className="font-semibold">COP CALOR:</span>
                  <span className="text-2xl font-bold">{results.copCalor}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500 to-green-600 rounded text-white">
                  <span className="font-semibold">EER:</span>
                  <span className="text-2xl font-bold">{results.eer}</span>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200 text-xs">
                <p className="font-medium text-amber-800 mb-1">Fórmulas aplicadas:</p>
                <p className="text-amber-700">• COP Frío = (h₁ - h₄) / (h₂ - h₁)</p>
                <p className="text-amber-700">• COP Calor = (h₂ - h₃) / (h₂ - h₁)</p>
                <p className="text-amber-700">• EER = COP Frío × 3.412</p>
              </div>

              <Button onClick={generateReport} className="w-full mt-3 bg-slate-700 hover:bg-slate-800">
                <FileText className="h-4 w-4 mr-2" />
                Descargar Informe Detallado
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