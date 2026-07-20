'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function NotFound() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <Typography variant="h4" gutterBottom>
        404 — Page Not Found
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        The page you are looking for does not exist.
      </Typography>
      <Button href="/" variant="contained" sx={{ mt: 2 }}>
        Go to Home
      </Button>
    </Box>
  );
}
