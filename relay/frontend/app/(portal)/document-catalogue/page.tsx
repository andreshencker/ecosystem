'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import { PageHeader } from '@/components/layout';
import { DocumentCatalogueList } from '@/components/domain/document-catalogue';
import { useAuthStore } from '@/stores/auth.store';

function DocumentCatalogueContent({ companyId }: { companyId: string }) {
  const searchParams = useSearchParams();
  const initialDomainId = searchParams.get('documentDomainCatalogueId') ?? '';
  return <DocumentCatalogueList companyId={companyId} initialDomainId={initialDomainId} />;
}

export default function DocumentCataloguePage() {
  const companyId = useAuthStore((s) => s.companyId) ?? '';
  return (
    <Box>
      <PageHeader
        title="Document Catalogue"
        subtitle="Define document types per domain and configure their format contracts."
      />
      {companyId ? (
        <Suspense fallback={null}>
          <DocumentCatalogueContent companyId={companyId} />
        </Suspense>
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
