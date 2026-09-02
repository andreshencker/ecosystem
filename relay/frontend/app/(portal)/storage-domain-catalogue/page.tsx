'use client';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { StorageDomainList } from '@/components/domain/storage-domain';
import { useAuthStore } from '@/stores/auth.store';

export default function StorageDomainCataloguePage() {
  const companyId = useAuthStore((s) => s.companyId);
  return (
    <Box>
      <PageHeader
        title="Storage Domains"
        subtitle="Each domain is the top-level folder name files land under when uploaded through storage."
      />
      {companyId ? (
        <StorageDomainList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
