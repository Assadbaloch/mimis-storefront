'use client';
import { createContext, useContext, useEffect, useState } from 'react';

// Light/dark for the reference design, ported from its ThemeContext.
//
// Same storage key ('mimi-theme') and the same .dark/.light classes on <html>
// as the reference used, so a visitor's saved preference carries over. The
// class on <html> is also what re-resolves the --mimis-* remap in globals.css,
// which is how the cart and checkout follow the toggle without any code of
// their own.

const ThemeCtx = createContext({ theme: 'light', toggleTheme: () => {} });
const STORAGE_KEY = 'mimi-theme';

export function useReferenceTheme() {
  return useContext(ThemeCtx);
}

export default function ReferenceTheme({ children }) {
  // Starts 'light' to match what the server rendered; the effect below corrects
  // it before paint. Reading localStorage during render would desync hydration.
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    let initial = 'light';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') initial = saved;
      else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) initial = 'dark';
    } catch {
      /* private mode: fall through to light */
    }
    setTheme(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme !== 'dark');
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}
