import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function RelayBrand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Box display="flex" alignItems="center" gap={compact ? 1.1 : 1.5}>
      <Box component="img" src="/logos/relay-mark.svg" alt="" sx={{ width: compact ? 34 : 48, height: compact ? 34 : 48 }} />
      <Box minWidth={0}>
        <Typography sx={{ color: light ? '#fff' : 'text.primary', fontSize: compact ? 18 : 27, fontWeight: 720, letterSpacing: '-0.04em', lineHeight: 1 }} noWrap>Relay</Typography>
        <Typography sx={{ color: light ? 'rgba(255,255,255,.6)' : 'text.secondary', fontSize: compact ? 9 : 11, fontWeight: 600, letterSpacing: '.04em', mt: .35 }} noWrap>BY GRAPIFLY</Typography>
      </Box>
    </Box>
  );
}
