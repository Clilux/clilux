import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const all = await base44.entities.AppSettings.filter({ setting_key: 'main' });
        if (all[0]) {
          setSettings(all[0]);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const bgColor = settings?.background_color || '#0f172a';
  const textColor = settings?.text_color || '#ffffff';
  const buttonColor = settings?.button_color || '#3b82f6';
  const iconColor = settings?.icon_color || '#60a5fa';

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, minHeight: '100vh' }}>
      <style>
        {`
          :root {
            --custom-bg: ${bgColor};
            --custom-text: ${textColor};
            --custom-button: ${buttonColor};
            --custom-icon: ${iconColor};
          }
          
          .text-white { color: ${textColor} !important; }
          .text-slate-400, .text-slate-300 { color: ${textColor}dd !important; }
          .text-slate-500 { color: ${textColor}99 !important; }
          
          .bg-slate-800, .bg-slate-900 { background-color: ${bgColor} !important; }
          .hover\\:bg-slate-700:hover { background-color: ${buttonColor} !important; }
          
          .bg-blue-600, .bg-blue-500 { background-color: ${buttonColor} !important; }
          .hover\\:bg-blue-700:hover { background-color: ${buttonColor}dd !important; }
          
          .text-blue-400, .text-blue-500, .text-emerald-400, .text-purple-400 { 
            color: ${iconColor} !important; 
          }
          
          svg { color: ${iconColor}; }
          
          .bg-gradient-to-br {
            background: linear-gradient(to bottom right, ${bgColor}, ${bgColor}ee) !important;
          }
        `}
      </style>
      {children}
    </div>
  );
}