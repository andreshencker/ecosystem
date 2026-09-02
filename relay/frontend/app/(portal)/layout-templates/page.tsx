'use client';

import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { TemplateList } from '@/components/domain/template';
import { useAuthStore } from '@/stores/auth.store';

export default function LayoutTemplatesPage() {
  const companyId = useAuthStore((s) => s.companyId);

  return (
    <Box>
      <PageHeader
        title="Templates"
        subtitle="Email and PDF layout templates used by your notification events."
      />
      {companyId ? (
        <TemplateList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
