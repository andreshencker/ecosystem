'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { RelayBrand } from '@/components/brand/RelayBrand';
import { useAppConfig } from '@/providers/AppConfigProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const appConfig = useAppConfig();
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={(theme) => ({
        background: `radial-gradient(circle at 15% 15%, ${alpha(theme.palette.primary.main, .22)} 0, transparent 30%), radial-gradient(circle at 85% 80%, ${alpha(theme.palette.secondary.main, .18)} 0, transparent 32%), ${theme.palette.background.default}`,
      })}
    >
      <Box width="100%" maxWidth={1120} px={{ xs: 2, md: 4 }} display="grid" gridTemplateColumns={{ xs: '1fr', md: '1.1fr .9fr' }} gap={{ xs: 4, md: 10 }} alignItems="center">
        <Box display={{ xs: 'none', md: 'block' }}>
          <RelayBrand />
          <Typography sx={{ fontSize: 64, lineHeight: .98, letterSpacing: '-.06em', fontWeight: 720, mt: 4, maxWidth: 560 }}>Your services.<br />Securely in motion.</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 18, lineHeight: 1.55, mt: 3, maxWidth: 500 }}>{appConfig.description}</Typography>
        </Box>
        <Box maxWidth={460} width="100%" mx="auto">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
