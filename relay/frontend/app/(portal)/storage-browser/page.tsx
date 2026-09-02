'use client';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { StorageBrowser } from '@/components/domain/storage-browser';
import { useAuthStore } from '@/stores/auth.store';

export default function StorageBrowserPage() {
  const companyId = useAuthStore((s) => s.companyId);
  return (
    <Box>
      <PageHeader
        title="Files"
        subtitle="Browse everything stored under a credential's domains, like a drive."
      />
      {companyId ? (
        <StorageBrowser companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
