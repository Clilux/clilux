import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen text-slate-900 bg-slate-50">
      {children}
    </div>
  );
}