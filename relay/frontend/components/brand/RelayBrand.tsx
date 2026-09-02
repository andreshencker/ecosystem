'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAppConfig } from '@/providers/AppConfigProvider';
import { useAppThemeMode } from '@/providers/ThemeRegistry';
import { resolveLogoUrl } from '@/types/app-config';

export function RelayBrand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const appConfig = useAppConfig();
  const { mode } = useAppThemeMode();
  return (
    <Box display="flex" alignItems="center" gap={compact ? 1.1 : 1.5}>
      <Box component="img" src={resolveLogoUrl(appConfig.theme, mode) ?? '/logos/relay-mark.svg'} alt="" sx={{ width: compact ? 34 : 48, height: compact ? 34 : 48, objectFit: 'contain' }} />
      <Box minWidth={0}>
        <Typography sx={{ color: light ? '#fff' : 'text.primary', fontSize: compact ? 18 : 27, fontWeight: 720, letterSpacing: '-0.04em', lineHeight: 1 }} noWrap>{appConfig.name}</Typography>
        <Box display="flex" alignItems="center" gap={0.45} mt={0.35}>
          <Box component="img" src="/logos/grapifly-mark.svg" alt="" aria-hidden="true" sx={{ width: compact ? 10 : 12, height: compact ? 10 : 12 }} />
          <Typography sx={{ color: light ? 'rgba(255,255,255,.6)' : 'text.secondary', fontSize: compact ? 9 : 11, fontWeight: 600, letterSpacing: '.04em', lineHeight: 1 }} noWrap>BY GRAPIFLY</Typography>
        </Box>
      </Box>
    </Box>
  );
}
