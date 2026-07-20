'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { DomainList } from '@/components/domain/domain';
import { useAuthStore } from '@/stores/auth.store';

export default function DomainCataloguePage() {
  const companyId = useAuthStore((s) => s.companyId);

  return (
    <Box>
      <PageHeader
        title="Domains"
        subtitle="Manage communication domains and their channel credential assignments."
      />
      {companyId ? (
        <DomainList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
