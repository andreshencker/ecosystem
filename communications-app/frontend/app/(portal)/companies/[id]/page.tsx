'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  StatusBadge,
  DataTable,
  EmptyState,
  ConfirmDialog,
  PermissionGuard,
  RowActions,
  FormDrawer,
  type MobileCardConfig,
} from '@/components/shared';
import { CompanyForm } from '@/components/domain/company';
import { DomainList } from '@/components/domain/domain';
import { CredentialList } from '@/components/domain/credential';
import { TemplateList } from '@/components/domain/template';
import { EventCatalogueList } from '@/components/domain/event';
import {
  useCompanyById,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} from '@/hooks/api/useCompanies';
import { useUsers } from '@/hooks/api/useUsers';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import type { Company, User } from '@/types/api';
import type { UpdateCompanyFormData } from '@/lib/schemas/company.schema';

// ─── Key-value detail row ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box display="flex" gap={2} py={0.75} alignItems="flex-start">
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 160, flexShrink: 0, pt: 0.1 }}
      >
        {label}
      </Typography>
      <Box flex={1}>
        {value != null ? (
          typeof value === 'string' || typeof value === 'number' ? (
            <Typography variant="body2">{value}</Typography>
          ) : (
            value
          )
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      display="block"
      mb={1}
      sx={{ letterSpacing: '0.08em', lineHeight: 1 }}
    >
      {children}
    </Typography>
  );
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return (
    <Box role="tabpanel" hidden={value !== index} pt={3}>
      {value === index && children}
    </Box>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CompanyDetailSkeleton() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={2} mb={3}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={200} height={32} />
      </Stack>
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1, mb: 3 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="text" width={`${70 + i * 3}%`} height={28} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}

// ─── Mobile card for users tab ────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  company_owner: 'Owner',
  company_admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
};

const usersMobileCardConfig: MobileCardConfig<User> = {
  primaryText: (row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
  secondaryText: 'email',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    { field: 'role', label: 'Role', render: (v) => ROLE_LABELS[v as string] ?? String(v) },
    {
      field: 'createdAt',
      label: 'Joined',
      render: (v) => v ? new Date(v as string).toLocaleDateString() : '—',
    },
  ],
};

// ─── General tab ──────────────────────────────────────────────────────────────

function GeneralTab({ company }: { company: Company }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Stack spacing={0}>
      <Grid container spacing={4}>
        {/* Identity */}
        <Grid item xs={12} md={6}>
          <SectionLabel>Identity</SectionLabel>
          <Stack spacing={0} divider={<Divider />}>
            <InfoRow label="Status" value={<StatusBadge active={company.isActive} />} />
            <InfoRow label="Company Key" value={
              <Typography variant="body2" fontFamily="monospace">{company.companyKey}</Typography>
            } />
            <InfoRow label="Display Name" value={company.displayName} />
            <InfoRow label="Legal Name" value={company.legalName} />
            <InfoRow label="Tagline" value={company.tagline} />
            <InfoRow label="Timezone" value={company.timezone} />
          </Stack>
        </Grid>

        {/* Contact */}
        <Grid item xs={12} md={6}>
          <SectionLabel>Contact</SectionLabel>
          <Stack spacing={0} divider={<Divider />}>
            <InfoRow label="Support Email" value={company.supportEmail} />
            <InfoRow label="Support Phone" value={company.supportPhone} />
            <InfoRow label="Support Hours" value={company.supportHours} />
          </Stack>

          <Box mt={3}>
            <SectionLabel>System</SectionLabel>
            <Stack spacing={0} divider={<Divider />}>
              <InfoRow label="Created" value={formatDate(company.createdAt)} />
              <InfoRow label="Updated" value={formatDate(company.updatedAt)} />
            </Stack>
          </Box>
        </Grid>

        {/* URLs */}
        {(company.webBaseUrl || company.apiBaseUrl || company.helpCenterUrl) && (
          <Grid item xs={12}>
            <SectionLabel>URLs</SectionLabel>
            <Stack spacing={0} divider={<Divider />}>
              {company.webBaseUrl && <InfoRow label="Web" value={
                <Typography variant="body2" color="primary" component="a" href={company.webBaseUrl} target="_blank" rel="noopener noreferrer">
                  {company.webBaseUrl}
                </Typography>
              } />}
              {company.apiBaseUrl && <InfoRow label="API" value={company.apiBaseUrl} />}
              {company.helpCenterUrl && <InfoRow label="Help Center" value={company.helpCenterUrl} />}
            </Stack>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}

// ─── Owner tab ────────────────────────────────────────────────────────────────

function OwnerTab({ companyId }: { companyId: string }) {
  // Fetch company users and find the company_owner
  const { data: usersData, isLoading } = useUsers({ companyId, limit: 100 });
  const owner = useMemo(
    () => usersData?.items.find((u) => u.role === 'company_owner') ?? null,
    [usersData],
  );

  if (isLoading) {
    return <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 2 }} />;
  }

  if (!owner) {
    return (
      <EmptyState
        icon={PersonOutlinedIcon}
        title="No owner assigned"
        description="This company has no company_owner user. Use 'Create Company' flow to assign one."
      />
    );
  }

  return (
    <Box maxWidth={480}>
      <Stack spacing={0} divider={<Divider />}>
        <InfoRow label="Name" value={[owner.firstName, owner.lastName].filter(Boolean).join(' ') || '—'} />
        <InfoRow label="Email" value={
          <Typography variant="body2" fontFamily="monospace">{owner.email}</Typography>
        } />
        <InfoRow label="Role" value={<Chip label="Company Owner" size="small" variant="outlined" />} />
        <InfoRow label="Status" value={<StatusBadge active={owner.isActive} />} />
        <InfoRow label="Email Verified" value={
          <Chip
            label={owner.isEmailVerified ? 'Verified' : 'Not verified'}
            size="small"
            color={owner.isEmailVerified ? 'success' : 'warning'}
            variant="outlined"
          />
        } />
        {owner.createdAt && (
          <InfoRow label="Member since" value={new Date(owner.createdAt).toLocaleDateString()} />
        )}
      </Stack>
    </Box>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ companyId }: { companyId: string }) {
  const list = useListState({ defaultPageSize: 25 });

  const { data, isLoading, error } = useUsers({
    companyId,
    page: list.page + 1,
    limit: list.pageSize,
    search: list.debouncedSearch || undefined,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<GridColDef<User>[]>(() => [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 130,
      valueGetter: (_v, row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={500} noWrap>{p.value as string}</Typography>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={12} noWrap>
          {p.row.email}
        </Typography>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (p) => (
        <Chip label={ROLE_LABELS[p.row.role] ?? p.row.role} size="small" variant="outlined" />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 110,
      renderCell: (p) => <StatusBadge active={p.row.isActive} />,
    },
    {
      field: 'isEmailVerified',
      headerName: 'Verified',
      width: 100,
      renderCell: (p) => (
        <Chip
          label={p.row.isEmailVerified ? 'Yes' : 'No'}
          size="small"
          color={p.row.isEmailVerified ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      width: 110,
      renderCell: (p) => p.row.createdAt ? new Date(p.row.createdAt).toLocaleDateString() : '—',
    },
  ], []);

  return (
    <DataTable<User>
      columns={columns}
      rows={rows}
      total={total}
      page={list.page}
      pageSize={list.pageSize}
      onPageChange={list.setPage}
      onPageSizeChange={(ps) => { list.setPageSize(ps); list.setPage(0); }}
      loading={isLoading}
      error={error instanceof Error ? error : null}
      mobileCardConfig={usersMobileCardConfig}
      getRowId={(row) => row.id}
      noRowsLabel="No users in this company."
      emptyState={
        <EmptyState
          icon={GroupOutlinedIcon}
          title="No users yet"
          description="Invite users to this company from the Team page."
        />
      }
    />
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ label, note }: { label: string; note?: string }) {
  return (
    <Box py={4} textAlign="center">
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      {note && (
        <Typography variant="body2" color="text.disabled" maxWidth={440} mx="auto">
          {note}
        </Typography>
      )}
    </Box>
  );
}

// ─── Company detail page ──────────────────────────────────────────────────────

const TABS = ['General', 'Owner', 'Users', 'Domains', 'Credentials', 'Templates', 'Events', 'Audit'];

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const { data: company, isLoading, error } = useCompanyById(companyId);
  const { canEditCompany, canDeleteCompany } = usePermissions();

  const updateMutation = useUpdateCompanyMutation();
  const deleteMutation = useDeleteCompanyMutation();

  const handleEdit = useCallback(async (data: UpdateCompanyFormData) => {
    if (!company) return;
    try {
      setFormError(undefined);
      await updateMutation.mutateAsync({ companyKey: company.companyKey, ...data });
      setEditOpen(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [company, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!company) return;
    await deleteMutation.mutateAsync(company.companyKey);
    router.push('/companies');
  }, [company, deleteMutation, router]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <CompanyDetailSkeleton />;

  if (error || !company) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Company not found.'}
        </Alert>
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title={company.displayName}
        breadcrumbs={[{ label: 'Companies', href: '/companies' }, { label: company.displayName }]}
        subtitle={company.companyKey}
        actions={
          <Stack direction="row" gap={1}>
            <PermissionGuard allowed={canDeleteCompany}>
              <Tooltip title="Delete company">
                <IconButton
                  color="error"
                  onClick={() => setDeleteOpen(true)}
                  size="small"
                >
                  <DeleteOutlineOutlinedIcon />
                </IconButton>
              </Tooltip>
            </PermissionGuard>
            <PermissionGuard allowed={canEditCompany}>
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={() => { setFormError(undefined); setEditOpen(true); }}
                size="small"
              >
                Edit
              </Button>
            </PermissionGuard>
          </Stack>
        }
      />

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v as number)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((tab) => (
            <Tab key={tab} label={tab} />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <TabPanel value={activeTab} index={0}>
        <GeneralTab company={company} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <OwnerTab companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <UsersTab companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Domains are scoped by companyId — engineClient sends x-api-key so platform_admin can view any company */}
        <DomainList companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <CredentialList companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <TemplateList companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <EventCatalogueList companyId={companyId} />
      </TabPanel>

      <TabPanel value={activeTab} index={7}>
        {/* TODO: Audit log endpoint (GET /audit-logs?companyId=) */}
        <PlaceholderTab
          label="Audit Log"
          note="Audit log requires a dedicated backend endpoint. Coming in a future sprint."
        />
      </TabPanel>

      {/* ── Edit drawer ──────────────────────────────────────────────────── */}
      <CompanyForm
        mode="edit"
        open={editOpen}
        company={company}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        loading={updateMutation.isPending}
        error={formError}
      />

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        title={`Delete "${company.displayName}"?`}
        description="This action cannot be undone. All associated data will be permanently removed."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
