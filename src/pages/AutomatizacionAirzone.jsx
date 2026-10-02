import React from 'react';
import AutomatizacionLayout from '@/components/automatizacion/AutomatizacionLayout';
import ControlClimatizacion from '@/pages/ControlClimatizacion';

export default function AutomatizacionAirzone() {
  return (
    <AutomatizacionLayout active="airzone">
      <ControlClimatizacion embedded />
    </AutomatizacionLayout>
  );
}