'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RelayBrand } from '@/components/brand/RelayBrand';
import { useAppConfig } from '@/providers/AppConfigProvider';

export default function LoginPage() {
  const appConfig = useAppConfig();
  const grapiflyIdUrl = process.env.NEXT_PUBLIC_GRAPIFLY_ID_URL ?? 'http://localhost:3101';
  return (
    <Stack spacing={2}>
      <Box display={{ xs: 'flex', md: 'none' }} justifyContent="center" mb={1}><RelayBrand /></Box>
      <Card variant="outlined" sx={{ borderRadius: 5, borderColor: 'rgba(17,17,22,.08)', boxShadow: '0 24px 70px rgba(25,20,45,.1)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Stack spacing={2.5}>
            <Typography sx={{ fontSize: 32, fontWeight: 720, letterSpacing: '-.045em' }}>Welcome back.</Typography>
            <Typography color="text.secondary" variant="body2">
              Grapifly ID is the only account you need to access {appConfig.name}.
            </Typography>
            <Button
              component="a"
              href={`${grapiflyIdUrl.replace(/\/$/, '')}/auth/sso/relay`}
              variant="contained"
              fullWidth
              sx={{ py: 1.35 }}
            >
              Continue with Grapifly ID
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Identity, organizations and access are securely managed by Grapifly.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
