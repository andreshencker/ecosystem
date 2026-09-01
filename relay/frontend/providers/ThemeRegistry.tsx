'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { PaletteMode } from '@mui/material';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeMuiTheme } from '@/theme/mui-theme';
import { useAppConfig } from './AppConfigProvider';

const STORAGE_KEY = 'relay_theme_mode';
const ThemeModeContext = createContext<{ mode: PaletteMode; toggleMode: () => void }>({
  mode: 'light',
  toggleMode: () => {},
});

export const useAppThemeMode = () => useContext(ThemeModeContext);

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const appConfig = useAppConfig();
  const [mode, setMode] = useState<PaletteMode>('light');
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setMode(saved);
  }, []);
  const toggleMode = () => setMode((current) => {
    const next = current === 'light' ? 'dark' : 'light';
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  });
  const theme = useMemo(() => makeMuiTheme(appConfig, mode), [appConfig, mode]);
  return (
    <AppRouterCacheProvider>
      <ThemeModeContext.Provider value={{ mode, toggleMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
