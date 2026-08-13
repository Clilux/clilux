import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen text-foreground bg-background">
      {children}
    </div>
  );
}