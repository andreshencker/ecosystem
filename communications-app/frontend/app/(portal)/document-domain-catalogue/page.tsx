'use client';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { DocumentDomainList } from '@/components/domain/document-domain';
import { useAuthStore } from '@/stores/auth.store';

export default function DocumentDomainCataloguePage() {
  const companyId = useAuthStore((s) => s.companyId);
  return (
    <Box>
      <PageHeader
        title="Document Domains"
        subtitle="Manage document domains and their supported output formats."
      />
      {companyId ? (
        <DocumentDomainList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
