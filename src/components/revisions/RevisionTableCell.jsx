import React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Editor compacto de un valor de revisión dentro de una celda de tabla
export default function RevisionTableCell({ field, value, onChange, disabled }) {
  if (field.type === 'checkbox') {
    return (
      <div className="flex justify-center">
        <Checkbox
          checked={value === true || value === 'true'}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background disabled:opacity-50"
      >
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  const isNumber = field.type === 'number';
  return (
    <Input
      type={isNumber ? 'number' : 'text'}
      step={isNumber ? '0.01' : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={isNumber ? '0' : ''}
      className="h-8 text-sm min-w-[110px]"
    />
  );
}