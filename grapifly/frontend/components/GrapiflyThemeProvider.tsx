'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface GrapiflyPalette {
  primaryColor: string;
  primaryContrastText: string;
}

interface GrapiflyTheme {
  icon: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  light: GrapiflyPalette;
  dark: GrapiflyPalette;
}

type Mode = 'light' | 'dark';
const MODE_STORAGE_KEY = 'grapifly_theme_mode';

const GrapiflyThemeContext = createContext<GrapiflyTheme | null>(null);
const GrapiflyThemeModeContext = createContext<{ mode: Mode; toggleMode: () => void }>({ mode: 'light', toggleMode: () => {} });

/** Reads Grapifly's own catalogue theme and applies it live — same pattern jtrade/Relay already use for themselves. */
export function GrapiflyThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<GrapiflyTheme | null>(null);
  const [mode, setMode] = useState<Mode>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setMode(saved);
  }, []);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
    let active = true;
    fetch(`${apiUrl}/catalog/apps/grapifly/public-config`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('grapifly public-config unavailable'))))
      .then(data => {
        if (!active || !data?.theme) return;
        setTheme({
          icon: data.theme.icon,
          logoUrl: data.theme.logoUrl,
          faviconUrl: data.theme.faviconUrl,
          fontFamily: data.theme.fontFamily,
          light: { primaryColor: data.theme.light.primaryColor, primaryContrastText: data.theme.light.primaryContrastText },
          dark: { primaryColor: data.theme.dark.primaryColor, primaryContrastText: data.theme.dark.primaryContrastText },
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    if (!theme) return;
    const palette = theme[mode];
    const root = document.documentElement.style;
    root.setProperty('--primary', palette.primaryColor);
    root.setProperty('--primary-contrast', palette.primaryContrastText);
    if (theme.fontFamily) root.setProperty('--font-family', theme.fontFamily);
  }, [theme, mode]);

  useEffect(() => {
    if (!theme?.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = theme.faviconUrl;
  }, [theme?.faviconUrl]);

  const toggleMode = () => setMode(current => {
    const next: Mode = current === 'light' ? 'dark' : 'light';
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
    return next;
  });

  return (
    <GrapiflyThemeModeContext.Provider value={{ mode, toggleMode }}>
      <GrapiflyThemeContext.Provider value={theme}>{children}</GrapiflyThemeContext.Provider>
    </GrapiflyThemeModeContext.Provider>
  );
}

export const useGrapiflyTheme = () => useContext(GrapiflyThemeContext);
export const useGrapiflyThemeMode = () => useContext(GrapiflyThemeModeContext);
