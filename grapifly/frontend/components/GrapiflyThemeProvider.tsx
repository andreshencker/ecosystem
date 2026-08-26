'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface GrapiflyTheme {
  icon: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  primaryColor: string;
  primaryContrastText: string;
}

const GrapiflyThemeContext = createContext<GrapiflyTheme | null>(null);

/** Reads Grapifly's own catalogue theme and applies it live — same pattern jtrade/Relay already use for themselves. */
export function GrapiflyThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<GrapiflyTheme | null>(null);

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
          primaryColor: data.theme.light.primaryColor,
          primaryContrastText: data.theme.light.primaryContrastText,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement.style;
    root.setProperty('--primary', theme.primaryColor);
    root.setProperty('--primary-contrast', theme.primaryContrastText);
    if (theme.fontFamily) root.setProperty('--font-family', theme.fontFamily);
  }, [theme]);

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

  return <GrapiflyThemeContext.Provider value={theme}>{children}</GrapiflyThemeContext.Provider>;
}

export const useGrapiflyTheme = () => useContext(GrapiflyThemeContext);
