'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { APP_CONFIG_FALLBACK } from '@/config/app-config';
import type { AppConfig } from '@/types/app-config';

const AppConfigContext = createContext<AppConfig>(APP_CONFIG_FALLBACK);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState(APP_CONFIG_FALLBACK);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    let active = true;
    const load = () => fetch(`${apiUrl.replace(/\/$/, '')}/app-config`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('app-config unavailable')))
      .then((value: AppConfig) => {
        if (active && value?.contractVersion === 1 && value.key === 'relay') setConfig(value);
      })
      .catch(() => {});
    void load();
    const refresh = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    document.title = `${config.name} by Grapifly`;
  }, [config.name]);

  useEffect(() => {
    if (!config.theme.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = config.theme.faviconUrl;
  }, [config.theme.faviconUrl]);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export const useAppConfig = () => useContext(AppConfigContext);
