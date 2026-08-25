import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { RelayBrand } from '@/components/brand/RelayBrand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: 'radial-gradient(circle at 15% 15%, #FFE2CC 0, transparent 30%), radial-gradient(circle at 85% 80%, #E4DBFF 0, transparent 32%), #F7F7F9' }}
    >
      <Box width="100%" maxWidth={1120} px={{ xs: 2, md: 4 }} display="grid" gridTemplateColumns={{ xs: '1fr', md: '1.1fr .9fr' }} gap={{ xs: 4, md: 10 }} alignItems="center">
        <Box display={{ xs: 'none', md: 'block' }}>
          <RelayBrand />
          <Typography sx={{ fontSize: 64, lineHeight: .98, letterSpacing: '-.06em', fontWeight: 720, mt: 4, maxWidth: 560 }}>Your services.<br />Securely in motion.</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 18, lineHeight: 1.55, mt: 3, maxWidth: 500 }}>Connect your channels once. Relay helps your applications send, synchronize and automate the rest.</Typography>
        </Box>
        <Box maxWidth={460} width="100%" mx="auto">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
