import Box from '@mui/material/Box';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="background.default"
    >
      <Box maxWidth={480} width="100%" px={2}>
        {children}
      </Box>
    </Box>
  );
}
