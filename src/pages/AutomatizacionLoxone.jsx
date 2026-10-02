import React from 'react';
import AutomatizacionLayout from '@/components/automatizacion/AutomatizacionLayout';
import ControlLoxone from '@/pages/ControlLoxone';

export default function AutomatizacionLoxone() {
  return (
    <AutomatizacionLayout active="loxone">
      <ControlLoxone embedded />
    </AutomatizacionLayout>
  );
}