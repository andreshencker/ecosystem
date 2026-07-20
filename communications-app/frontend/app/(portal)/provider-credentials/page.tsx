'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { CredentialList } from '@/components/domain/credential';
import { useAuthStore } from '@/stores/auth.store';

export default function ProviderCredentialsPage() {
  const companyId = useAuthStore((s) => s.companyId);

  return (
    <Box>
      <PageHeader
        title="Credentials"
        subtitle="Encrypted credentials for each channel provider."
      />
      {companyId ? (
        <CredentialList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
