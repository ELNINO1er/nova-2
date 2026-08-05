import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  const theme = {
    darkMode,
    setDarkMode,
    toggleDarkMode: () => setDarkMode(prev => !prev),
    bg: darkMode ? 'bg-slate-950' : 'bg-white',
    text: darkMode ? 'text-slate-100' : 'text-slate-900',
    card: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200',
    sub: darkMode ? 'text-slate-400' : 'text-slate-600',
    border: darkMode ? 'border-slate-800' : 'border-slate-200',
    hover: darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100',
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
