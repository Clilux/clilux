import React, { useState } from 'react';
import ErpLayout from '@/components/erp/ErpLayout';
import ArticulosTab from '@/components/erp/ArticulosTab';
import FamiliasTab from '@/components/erp/FamiliasTab';

const TABS = [
  { id: 'articulos', label: 'Artículos' },
  { id: 'familias', label: 'Familias' },
];

export default function ErpArticulos() {
  const [tab, setTab] = useState('articulos');

  return (
    <ErpLayout active="articulos">
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm md:text-base font-medium transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'articulos' ? <ArticulosTab /> : <FamiliasTab />}
    </ErpLayout>
  );
}