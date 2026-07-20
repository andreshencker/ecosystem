'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { EventCatalogueList } from '@/components/domain/event';
import { useAuthStore } from '@/stores/auth.store';

export default function EventCataloguePage() {
  const companyId = useAuthStore((s) => s.companyId) ?? '';

  return (
    <Box>
      <PageHeader
        title="Events"
        subtitle="Define notification events per domain and configure their channel templates."
      />
      {companyId ? (
        <EventCatalogueList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
