import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen text-slate-900" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {children}
    </div>
  );
}