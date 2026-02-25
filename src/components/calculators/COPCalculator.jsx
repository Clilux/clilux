import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info, FileText } from 'lucide-react';

import { toast } from 'sonner';

// Tablas de propiedades Presión-Temperatura para refrigerantes (REMLE - Presión Manométrica en bares)
const REFRIGERANT_TABLES = {
  R410A: [
    { p: 3.73, t: -30 }, { p: 5.05, t: -20 }, { p: 6.7, t: -10 }, { p: 9.54, t: 0 },
    { p: 12.7, t: 10 }, { p: 16.65, t: 20 }, { p: 21.45, t: 30 }, { p: 27.2, t: 40 },
    { p: 34.05, t: 50 }, { p: 42.15, t: 60 }, { p: 51.6, t: 70 }
  ],
  R32: [
    { p: 4.77, t: -30 }, { p: 6.82, t: -20 }, { p: 9.48, t: -10 }, { p: 12.85, t: 0 },
    { p: 17.05, t: 10 }, { p: 22.2, t: 20 }, { p: 28.45, t: 30 }, { p: 35.95, t: 40 },
    { p: 44.85, t: 50 }, { p: 55.35, t: 60 }
  ],
  R134A: [
    { p: 0.84, t: -30 }, { p: 1.32, t: -20 }, { p: 2.0, t: -10 }, { p: 2.93, t: 0 },
    { p: 4.15, t: 10 }, { p: 5.72, t: 20 }, { p: 7.72, t: 30 }, { p: 10.24, t: 40 },
    { p: 13.36, t: 50 }, { p: 17.18, t: 60 }
  ],
  R404A: [
    { p: 3.73, t: -30 }, { p: 5.32, t: -20 }, { p: 7.38, t: -10 }, { p: 10.02, t: 0 },
    { p: 13.35, t: 10 }, { p: 17.5, t: 20 }, { p: 22.6, t: 30 }, { p: 28.8, t: 40 },
    { p: 36.2, t: 50 }, { p: 45.0, t: 60 }
  ],
  R407C: [
    { p: 3.5, t: -30 }, { p: 5.0, t: -20 }, { p: 6.95, t: -10 }, { p: 9.45, t: 0 },
    { p: 12.6, t: 10 }, { p: 16.5, t: 20 }, { p: 21.3, t: 30 }, { p: 27.1, t: 40 },
    { p: 34.0, t: 50 }, { p: 42.15, t: 60 }
  ],
  R22: [
    { p: 2.36, t: -30 }, { p: 3.45, t: -20 }, { p: 4.95, t: -10 }, { p: 6.95, t: 0 },
    { p: 9.55, t: 10 }, { p: 12.85, t: 20 }, { p: 16.95, t: 30 }, { p: 21.95, t: 40 },
    { p: 27.95, t: 50 }, { p: 35.15, t: 60 }
  ]
};

// Interpolar temperatura de saturación a partir de presión
const getTempFromPressure = (refrigerante, presion) => {
  const table = REFRIGERANT_TABLES[refrigerante];
  if (!table) return null;

  // Si la presión es exacta
  const exactMatch = table.find(entry => Math.abs(entry.p - presion) < 0.1);
  if (exactMatch) return exactMatch.t;

  // Interpolación lineal
  for (let i = 0; i < table.length - 1; i++) {
    if (presion >= table[i].p && presion <= table[i + 1].p) {
      const p1 = table[i].p, t1 = table[i].t;
      const p2 = table[i + 1].p, t2 = table[i + 1].t;
      const temp = t1 + (presion - p1) * (t2 - t1) / (p2 - p1);
      return Math.round(temp * 10) / 10;
    }
  }

  // Fuera de rango
  if (presion < table[0].p) return table[0].t;
  if (presion > table[table.length - 1].p) return table[table.length - 1].t;

  return null;
};

export default function COPCalculator({ equipment }) {
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
    // Mediciones eléctricas
    tension: 230,
    corriente: 0,
    // Entalpías (opcionales - se pueden introducir manualmente si se tienen)
    h1_manual: '',
    h2_manual: '',
    h3_manual: '',
    h4_manual: ''
  });

  const [results, setResults] = useState(null);

  // Auto-calcular temperaturas de saturación cuando cambian las presiones
  React.useEffect(() => {
    if (formData.presion_baja && formData.refrigerante) {
      const temp = getTempFromPressure(formData.refrigerante, parseFloat(formData.presion_baja));
      if (temp !== null) {
        setFormData(prev => ({ ...prev, temp_evaporacion: temp.toString() }));
      }
    }
  }, [formData.presion_baja, formData.refrigerante]);

  React.useEffect(() => {
    if (formData.presion_alta && formData.refrigerante) {
      const temp = getTempFromPressure(formData.refrigerante, parseFloat(formData.presion_alta));
      if (temp !== null) {
        setFormData(prev => ({ ...prev, temp_condensacion: temp.toString() }));
      }
    }
  }, [formData.presion_alta, formData.refrigerante]);

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
      tension: 230,
      corriente: 0,
      h1_manual: '',
      h2_manual: '',
      h3_manual: '',
      h4_manual: ''
    });
    setResults(null);
  };

  const generateReport = async () => {
    if (!results) return;

    try {
      // Obtener configuración de la empresa
      const settingsList = await base44.entities.AppSettings.filter({ setting_key: 'main' });
      const settings = settingsList[0] || {};

      // Obtener datos del cliente si hay equipmentId
      let clientData = null;
      if (equipment?.client_id) {
        const clients = await base44.entities.Client.filter({ id: equipment.client_id });
        clientData = clients[0];
      }

      const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
      position: relative;
    }
    .logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header p {
      font-size: 16px;
      font-weight: 300;
      opacity: 0.95;
    }
    .content {
      padding: 40px;
    }
    .client-info {
      background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
      border-left: 5px solid #667eea;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 10px;
    }
    .client-info h3 {
      color: #667eea;
      font-size: 18px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .section {
      margin-bottom: 35px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .data-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 10px;
      border-left: 4px solid #94a3b8;
    }
    .data-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .data-value {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    .result-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 15px;
      margin-bottom: 15px;
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
    }
    .result-card .label {
      font-size: 14px;
      font-weight: 400;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .result-card .value {
      font-size: 36px;
      font-weight: 700;
    }
    .formula {
      background: #fff7ed;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
      font-size: 14px;
    }
    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .timestamp {
      margin-top: 15px;
      font-weight: 600;
      color: #475569;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" class="logo" />` : ''}
      <h1>Informe COP & EER</h1>
      <p>Análisis de Rendimiento Térmico del Sistema de Climatización</p>
    </div>

    <div class="content">
      ${clientData ? `
        <div class="client-info">
          <h3>📋 Datos del Cliente</h3>
          <p><strong>${clientData.name}</strong></p>
          <p>${clientData.cif || ''}</p>
          <p>${clientData.address || ''} ${clientData.city || ''}</p>
          <p>${clientData.phone || ''} | ${clientData.email || ''}</p>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">📊 Datos Medidos (TESTO)</div>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Refrigerante</div>
            <div class="data-value">${formData.refrigerante}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Presión Baja</div>
            <div class="data-value">${formData.presion_baja} bar</div>
          </div>
          <div class="data-item">
            <div class="data-label">T. Evaporación</div>
            <div class="data-value">${formData.temp_evaporacion} °C</div>
          </div>
          <div class="data-item">
            <div class="data-label">Presión Alta</div>
            <div class="data-value">${formData.presion_alta} bar</div>
          </div>
          <div class="data-item">
            <div class="data-label">T. Condensación</div>
            <div class="data-value">${formData.temp_condensacion} °C</div>
          </div>
          <div class="data-item">
            <div class="data-label">T. Aspiración</div>
            <div class="data-value">${formData.temp_aspiracion} °C</div>
          </div>
          <div class="data-item">
            <div class="data-label">T. Líquido</div>
            <div class="data-value">${formData.temp_liquido} °C</div>
          </div>
          <div class="data-item">
            <div class="data-label">T. Descarga</div>
            <div class="data-value">${formData.temp_descarga} °C</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🔬 Parámetros Calculados</div>
        <div class="data-grid">
          <div class="data-item" style="border-left-color: #10b981;">
            <div class="data-label">Recalentamiento</div>
            <div class="data-value">${results.recalentamiento} °C</div>
          </div>
          <div class="data-item" style="border-left-color: #3b82f6;">
            <div class="data-label">Subenfriamiento</div>
            <div class="data-value">${results.subenfriamiento} °C</div>
          </div>
          <div class="data-item" style="border-left-color: #f59e0b;">
            <div class="data-label">Efecto Refrigerante</div>
            <div class="data-value">${results.efectoRefrigerante} kJ/kg</div>
          </div>
          <div class="data-item" style="border-left-color: #ef4444;">
            <div class="data-label">Trabajo Compresión</div>
            <div class="data-value">${results.trabajoCompresion} kJ/kg</div>
          </div>
        </div>

        <div class="formula">
          <strong>Fórmulas aplicadas:</strong><br/>
          COP Frío = (h₁ - h₄) / (h₂ - h₁) = ${results.efectoRefrigerante} / ${results.trabajoCompresion}<br/>
          COP Calor = (h₂ - h₃) / (h₂ - h₁) = ${results.calorCondensador} / ${results.trabajoCompresion}<br/>
          EER = COP Frío × 3.412
        </div>
      </div>

      <div class="section">
        <div class="section-title">✅ Resultados Finales</div>
        <div class="result-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
          <div class="label">COP FRÍO (Refrigeración)</div>
          <div class="value">${results.copFrio}</div>
        </div>
        <div class="result-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <div class="label">COP CALOR (Calefacción)</div>
          <div class="value">${results.copCalor}</div>
        </div>
        <div class="result-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <div class="label">EER (Energy Efficiency Ratio)</div>
          <div class="value">${results.eer}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💡 Interpretación</div>
        <p style="margin-bottom: 10px;"><strong>COP Frío:</strong> Por cada kW de energía consumida, se obtienen <strong>${results.copFrio} kW</strong> de refrigeración</p>
        <p style="margin-bottom: 10px;"><strong>COP Calor:</strong> Por cada kW de energía consumida, se obtienen <strong>${results.copCalor} kW</strong> de calefacción</p>
        <p style="margin-bottom: 10px;">Recalentamiento: <strong>${results.recalentamiento}°C</strong> ${parseFloat(results.recalentamiento) > 5 && parseFloat(results.recalentamiento) < 15 ? '✅ Óptimo' : '⚠️ Revisar'}</p>
        <p>Subenfriamiento: <strong>${results.subenfriamiento}°C</strong> ${parseFloat(results.subenfriamiento) > 3 && parseFloat(results.subenfriamiento) < 10 ? '✅ Óptimo' : '⚠️ Revisar'}</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Equipo de medición:</strong> TESTO | <strong>Método:</strong> Entalpía</p>
      <p class="timestamp">📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | 🕐 ${new Date().toLocaleTimeString('es-ES')}</p>
      ${settings.company_name ? `<p style="margin-top: 15px; font-weight: 600;">${settings.company_name}</p>` : ''}
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Informe_COP_${formData.refrigerante}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Informe descargado');
    } catch (error) {
      console.error('Error generando informe:', error);
      toast.error('Error al generar el informe');
    }
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
                <Label>Temp. Evaporación (T_evap) - °C <span className="text-xs text-green-600">(auto)</span></Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Auto desde P_baja"
                  value={formData.temp_evaporacion}
                  onChange={(e) => setFormData({ ...formData, temp_evaporacion: e.target.value })}
                  className="bg-green-50"
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
                <Label>Temp. Condensación (T_cond) - °C <span className="text-xs text-green-600">(auto)</span></Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Auto desde P_alta"
                  value={formData.temp_condensacion}
                  onChange={(e) => setFormData({ ...formData, temp_condensacion: e.target.value })}
                  className="bg-green-50"
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

            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-3">Mediciones Eléctricas (Opcional)</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tensión (V)</Label>
                  <Select
                    value={formData.tension.toString()}
                    onValueChange={(v) => setFormData({ ...formData, tension: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="230">230 V (Monofásico)</SelectItem>
                      <SelectItem value="400">400 V (Trifásico)</SelectItem>
                      <SelectItem value="220">220 V</SelectItem>
                      <SelectItem value="380">380 V</SelectItem>
                      <SelectItem value="0">No medir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Corriente (A)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="ej: 8.5"
                    value={formData.corriente}
                    onChange={(e) => setFormData({ ...formData, corriente: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {formData.tension > 0 && formData.corriente > 0 && (
                  <div className="col-span-2 p-2 bg-white rounded border border-blue-300 text-sm">
                    <span className="text-slate-700">Potencia aproximada: </span>
                    <span className="font-semibold text-blue-900">
                      {formData.tension === 400 
                        ? ((Math.sqrt(3) * formData.tension * formData.corriente * 0.85) / 1000).toFixed(2)
                        : ((formData.tension * formData.corriente * 0.9) / 1000).toFixed(2)} kW
                    </span>
                    <span className="text-xs text-slate-600 ml-2">
                      ({formData.tension === 400 ? 'Trifásico' : 'Monofásico'})
                    </span>
                  </div>
                )}
              </div>
            </Card>

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