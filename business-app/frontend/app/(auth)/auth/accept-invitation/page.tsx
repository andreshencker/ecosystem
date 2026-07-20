'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

/**
 * The invitation flow was updated in DEC-013 (Rev-1).
 * Invited users now receive a temporary password by email and log in directly.
 * There is no longer a token-based account activation step.
 */
export default function AcceptInvitationPage() {
  return (
    <Stack spacing={2}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <LockOutlinedIcon />
        </Box>
        <Typography variant="h5" fontWeight={600}>
          Communication Portal
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Alert severity="info">
              <AlertTitle>Use your temporary password</AlertTitle>
              Your account has already been created. Check your email for the temporary password,
              then sign in below. You will be asked to set a new password on your first login.
            </Alert>

            <Box textAlign="center">
              <Link component={NextLink} href="/auth/login" variant="button">
                Go to sign in
              </Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
