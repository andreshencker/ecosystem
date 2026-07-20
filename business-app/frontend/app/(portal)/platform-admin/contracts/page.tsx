'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  RowActions,
  SearchToolbar,
  type MobileCardConfig,
} from '@/components/shared';
import {
  usePlatformAdminContractSummary,
  usePlatformAdminContracts,
  usePlatformAdminContract,
  usePlatformAdminContractIssues,
} from '@/hooks/api/usePlatformAdminContracts';
import type {
  BiContractAdminListItem,
  BiContractAdminDetail,
  BiContractSupportIssue,
} from '@/types/platform-admin-contract';
import {
  fmtConfigStatus,
  fmtIssueCount,
  fmtCalendarStatus,
  fmtRatio,
  fmtDate,
} from '@/types/platform-admin-contract';

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  loading,
  color,
}: {
  label: string;
  value: string | number | null | undefined;
  loading: boolean;
  color?: 'success' | 'warning' | 'error' | 'info';
}) {
  const colorMap: Record<string, string> = {
    success: 'success.main',
    warning: 'warning.main',
    error:   'error.main',
    info:    'info.main',
  };
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={60} height={36} />
        ) : (
          <Typography
            variant="h5"
            fontWeight={700}
            color={color ? colorMap[color] : 'text.primary'}
          >
            {value ?? '—'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Config status chip ────────────────────────────────────────────────────────

function ConfigChip({ status }: { status: 'complete' | 'warning' | 'invalid' }) {
  const map = {
    complete: { color: 'success' as const, icon: <CheckCircleOutlineIcon fontSize="small" /> },
    warning:  { color: 'warning' as const, icon: <WarningAmberOutlinedIcon fontSize="small" /> },
    invalid:  { color: 'error' as const,   icon: <ErrorOutlineIcon fontSize="small" /> },
  };
  const { color, icon } = map[status] ?? map.invalid;
  return (
    <Chip
      icon={icon}
      label={fmtConfigStatus(status)}
      color={color}
      size="small"
      variant="outlined"
    />
  );
}

// ─── Issue count cell ─────────────────────────────────────────────────────────

function IssueCountCell({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <CheckCircleOutlineIcon fontSize="small" color="success" />
        <Typography variant="body2" color="success.main">No issues</Typography>
      </Box>
    );
  }
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      {count > 1 ? (
        <ErrorOutlineIcon fontSize="small" color="error" />
      ) : (
        <WarningAmberOutlinedIcon fontSize="small" color="warning" />
      )}
      <Typography variant="body2" color={count > 1 ? 'error.main' : 'warning.main'}>
        {fmtIssueCount(count)}
      </Typography>
    </Box>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box mb={1.5}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box mb={3}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
        {title.toUpperCase()}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Box>
  );
}

function IssueRow({ issue }: { issue: BiContractSupportIssue }) {
  const isInvalid = issue.severity === 'invalid';
  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap={1}
      mb={1}
      p={1.5}
      sx={{
        borderRadius: 1,
        bgcolor: isInvalid ? 'error.50' : 'warning.50',
        border: '1px solid',
        borderColor: isInvalid ? 'error.200' : 'warning.200',
      }}
    >
      {isInvalid ? (
        <ErrorOutlineIcon fontSize="small" color="error" sx={{ mt: 0.2 }} />
      ) : (
        <WarningAmberOutlinedIcon fontSize="small" color="warning" sx={{ mt: 0.2 }} />
      )}
      <Box>
        <Typography variant="body2" fontWeight={600} color={isInvalid ? 'error.main' : 'warning.main'}>
          {issue.field}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace' }}>
          {issue.code}
        </Typography>
        <Typography variant="body2">{issue.message}</Typography>
      </Box>
    </Box>
  );
}

function ContractDetailDrawer({
  contractId,
  businessId,
  onClose,
}: {
  contractId: string | null;
  businessId: string | null;
  onClose: () => void;
}) {
  const open = !!contractId;
  const { data: detail, isLoading: detailLoading } = usePlatformAdminContract(
    contractId ?? '',
    { businessId: businessId ?? undefined, enabled: open },
  );
  const { data: issuesData, isLoading: issuesLoading } = usePlatformAdminContractIssues(
    contractId ?? '',
    { businessId: businessId ?? undefined, enabled: open },
  );

  const invalidIssues = issuesData?.supportIssues.filter((i) => i.severity === 'invalid') ?? [];
  const warningIssues = issuesData?.supportIssues.filter((i) => i.severity === 'warning') ?? [];

  function skeleton(lines = 2) {
    return Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" height={24} sx={{ mb: 1 }} />
    ));
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3, overflowY: 'auto' } }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Contract Detail
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Box>

      {detailLoading ? (
        <Box>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box key={i} mb={3}>
              <Skeleton variant="text" width={100} height={20} sx={{ mb: 1 }} />
              <Divider sx={{ mb: 1 }} />
              {skeleton(3)}
            </Box>
          ))}
        </Box>
      ) : detail ? (
        <>
          {/* 1. Identity */}
          <DrawerSection title="Identity">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField label="Position" value={detail.positionName} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Business" value={detail.businessName} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Customer" value={detail.customerName} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Work Type" value={detail.workType} />
              </Grid>
              <Grid item xs={12}>
                <DetailField
                  label="Status"
                  value={
                    <Chip
                      label={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                      size="small"
                      variant="outlined"
                      color={detail.status === 'active' ? 'success' : 'default'}
                    />
                  }
                />
              </Grid>
            </Grid>
          </DrawerSection>

          {/* 2. Duration */}
          <DrawerSection title="Duration">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField label="Start Date" value={fmtDate(detail.startDate)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="End Date"
                  value={detail.isOpenEnded ? 'Open-ended' : fmtDate(detail.endDate)}
                />
              </Grid>
            </Grid>
          </DrawerSection>

          {/* 3. Billing and Rates */}
          <DrawerSection title="Billing and Rates">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField label="Billing Cycle" value={detail.billingCycle} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Currency" value={detail.currency} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Rate Type" value={detail.rateType} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Rate"
                  value={
                    detail.minHourlyRate !== null && detail.maxHourlyRate !== null
                      ? detail.minHourlyRate === detail.maxHourlyRate
                        ? `$${detail.minHourlyRate}/hr`
                        : `$${detail.minHourlyRate}–$${detail.maxHourlyRate}/hr`
                      : null
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Payment Schedule"
                  value={
                    detail.paymentScheduleMode === 'terms'
                      ? `${detail.paymentTermsDays ?? '?'} day terms`
                      : `Scheduled – ${detail.scheduledPaymentDay ?? '?'}`
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Minimum Hours"
                  value={detail.minimumHours !== null ? `${detail.minimumHours} hrs` : null}
                />
              </Grid>
            </Grid>
          </DrawerSection>

          {/* 4. Tax and Superannuation */}
          <DrawerSection title="Tax and Superannuation">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="GST"
                  value={detail.chargeGst ? `Yes — ${detail.gstRate ?? '?'}%` : 'No'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Superannuation"
                  value={
                    detail.superannuationEnabled
                      ? `Yes — ${detail.superannuationRate ?? '?'}% (${detail.superannuationPaymentFrequency ?? '?'})`
                      : 'No'
                  }
                />
              </Grid>
            </Grid>
          </DrawerSection>

          {/* 5. Calendar Configuration */}
          <DrawerSection title="Calendar Configuration">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Holiday Rules"
                  value={detail.holidayRulesEnabled ? 'Enabled' : 'Disabled'}
                />
              </Grid>
              {detail.holidayRulesEnabled && (
                <>
                  <Grid item xs={12} sm={6}>
                    <DetailField
                      label="Holiday Calendar"
                      value={detail.holidayCalendarName ?? detail.holidayCalendarId}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailField label="Holiday Behaviour" value={detail.holidayBehaviour} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailField
                      label="Holiday Calendar Status"
                      value={fmtCalendarStatus(detail.holidayCalendarStatus)}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <DetailField
                  label="Payment Calendar"
                  value={detail.paymentCalendarEnabled ? 'Enabled' : 'Disabled'}
                />
              </Grid>
              {detail.paymentCalendarEnabled && (
                <Grid item xs={12} sm={6}>
                  <DetailField
                    label="Payment Calendar Status"
                    value={fmtCalendarStatus(detail.paymentCalendarStatus)}
                  />
                </Grid>
              )}
            </Grid>
          </DrawerSection>

          {/* 6. Configuration Health */}
          <DrawerSection title="Configuration Health">
            <Box mb={1.5}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Status
              </Typography>
              <ConfigChip status={detail.configurationStatus} />
            </Box>
          </DrawerSection>

          {/* 7. Data Freshness */}
          <DrawerSection title="Data Freshness">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DetailField label="Source Created" value={fmtDate(detail.sourceCreatedAt)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="Source Updated" value={fmtDate(detail.sourceUpdatedAt)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailField label="BI Synced" value={fmtDate(detail.syncedAt)} />
              </Grid>
            </Grid>
          </DrawerSection>

          {/* Support Issues */}
          <DrawerSection title="Support Issues">
            {issuesLoading ? (
              skeleton(3)
            ) : issuesData?.supportIssueCount === 0 ? (
              <Typography variant="body2" color="text.secondary">
                This Contract has no detected configuration issues.
              </Typography>
            ) : (
              <>
                {invalidIssues.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" color="error.main" fontWeight={600} display="block" gutterBottom>
                      INVALID ({invalidIssues.length})
                    </Typography>
                    {invalidIssues.map((issue) => (
                      <IssueRow key={issue.code} issue={issue} />
                    ))}
                  </Box>
                )}
                {warningIssues.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="warning.main" fontWeight={600} display="block" gutterBottom>
                      WARNINGS ({warningIssues.length})
                    </Typography>
                    {warningIssues.map((issue) => (
                      <IssueRow key={issue.code} issue={issue} />
                    ))}
                  </Box>
                )}
              </>
            )}
          </DrawerSection>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Contract analytics record not found.
        </Typography>
      )}
    </Drawer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformAdminContractsPage() {
  // ── List filters ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [businessIdFilter, setBusinessIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [billingCycleFilter, setBillingCycleFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [configStatusFilter, setConfigStatusFilter] = useState('');
  const [gstFilter, setGstFilter] = useState<'' | 'true' | 'false'>('');
  const [superFilter, setSuperFilter] = useState<'' | 'true' | 'false'>('');
  const [holidayFilter, setHolidayFilter] = useState<'' | 'true' | 'false'>('');
  const [payCalFilter, setPayCalFilter] = useState<'' | 'true' | 'false'>('');

  // ── Drawer state ──────────────────────────────────────────────────────────────
  const [drawerContractId, setDrawerContractId] = useState<string | null>(null);
  const [drawerBusinessId, setDrawerBusinessId] = useState<string | null>(null);

  // ── Query params ──────────────────────────────────────────────────────────────
  const listParams = {
    page: page + 1,
    limit: pageSize,
    search: search || undefined,
    businessId: businessIdFilter || undefined,
    status: statusFilter || undefined,
    workType: workTypeFilter || undefined,
    billingCycle: billingCycleFilter || undefined,
    currency: currencyFilter || undefined,
    configurationStatus: configStatusFilter || undefined,
    chargeGst: gstFilter !== '' ? gstFilter === 'true' : undefined,
    superEnabled: superFilter !== '' ? superFilter === 'true' : undefined,
    holidayRulesEnabled: holidayFilter !== '' ? holidayFilter === 'true' : undefined,
    paymentCalendarEnabled: payCalFilter !== '' ? payCalFilter === 'true' : undefined,
  };

  const summaryParams = {
    businessId: businessIdFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data: summary, isLoading: summaryLoading } = usePlatformAdminContractSummary(summaryParams);
  const { data, isLoading, error, refetch } = usePlatformAdminContracts(listParams);

  const friendlyError: Error | null = error
    ? Object.assign(new Error(
        'Contract analytics are temporarily unavailable.\n' +
        'Please verify that the Business Intelligence service is running.',
      ), { cause: error })
    : null;

  type BiRow = BiContractAdminListItem & { id: string };
  const rows: BiRow[] = (data?.items ?? []).map((item) => ({ ...item, id: item.contractId }));

  const hasActiveFilters =
    search !== '' ||
    businessIdFilter !== '' ||
    statusFilter !== '' ||
    workTypeFilter !== '' ||
    billingCycleFilter !== '' ||
    currencyFilter !== '' ||
    configStatusFilter !== '' ||
    gstFilter !== '' ||
    superFilter !== '' ||
    holidayFilter !== '' ||
    payCalFilter !== '';

  function clearFilters() {
    setSearch('');
    setBusinessIdFilter('');
    setStatusFilter('');
    setWorkTypeFilter('');
    setBillingCycleFilter('');
    setCurrencyFilter('');
    setConfigStatusFilter('');
    setGstFilter('');
    setSuperFilter('');
    setHolidayFilter('');
    setPayCalFilter('');
    setPage(0);
  }

  function openDrawer(contractId: string, businessId: string) {
    setDrawerContractId(contractId);
    setDrawerBusinessId(businessId);
  }

  function closeDrawer() {
    setDrawerContractId(null);
    setDrawerBusinessId(null);
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'businessName',
      headerName: 'Business',
      flex: 1.2,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Typography variant="body2">{params.value as string}</Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1.2,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Typography variant="body2">{params.value as string}</Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'positionName',
      headerName: 'Position',
      flex: 1.5,
      minWidth: 150,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={(params.value as string)?.charAt(0).toUpperCase() + (params.value as string)?.slice(1)}
          size="small"
          variant="outlined"
          color={params.value === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'workType',
      headerName: 'Work Type',
      width: 120,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Typography variant="body2">{params.value as string}</Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'billingCycle',
      headerName: 'Billing Cycle',
      width: 120,
    },
    {
      field: 'currency',
      headerName: 'Currency',
      width: 90,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Chip label={params.value as string} size="small" variant="outlined" />
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'configurationStatus',
      headerName: 'Configuration',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <ConfigChip status={params.value as 'complete' | 'warning' | 'invalid'} />
      ),
    },
    {
      field: 'supportIssueCount',
      headerName: 'Issues',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <IssueCountCell count={params.value as number} />
      ),
    },
    {
      field: 'sourceUpdatedAt',
      headerName: 'Updated',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {fmtDate(params.value as string | null)}
        </Typography>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 60,
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as BiContractAdminListItem;
        return (
          <RowActions onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View contract">
              <IconButton
                size="small"
                aria-label="View contract"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer(row.contractId, row.businessId);
                }}
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </RowActions>
        );
      },
    },
  ];

  // ── Mobile card config ─────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<BiContractAdminListItem> = {
    primaryText: 'positionName',
    secondaryText: (row) => row.businessName ?? '',
    badge: (row) => <ConfigChip status={row.configurationStatus} />,
    fields: [
      { field: 'customerName', label: 'Customer' },
      { field: 'status',        label: 'Status' },
      { field: 'billingCycle',  label: 'Billing Cycle' },
      { field: 'currency',      label: 'Currency' },
      {
        field: 'supportIssueCount',
        label: 'Issues',
        render: (v) => <IssueCountCell count={v as number} />,
      },
      {
        field: 'sourceUpdatedAt',
        label: 'Updated',
        render: (v) => fmtDate(v as string | null),
      },
    ],
    actions: (row) => (
      <Tooltip title="View contract">
        <IconButton
          size="small"
          aria-label="View contract"
          onClick={() => openDrawer(row.contractId, row.businessId)}
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Contracts"
        count={data?.total}
        subtitle="Monitor contract configuration, lifecycle and support issues across Businesses."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Contracts' }]}
      />

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Total Contracts"
            value={summary?.totalContracts}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Active Contracts"
            value={summary?.activeContracts}
            loading={summaryLoading}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Contracts with Warnings"
            value={summary?.warningContracts}
            loading={summaryLoading}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Invalid Contracts"
            value={summary?.invalidContracts}
            loading={summaryLoading}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Secondary metrics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard
            label="Open-ended Contracts"
            value={summary?.openEndedContracts}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard
            label="Contracts with GST"
            value={summary?.contractsWithGst}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard
            label="With Superannuation"
            value={summary?.contractsWithSuperannuation}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard
            label="Holiday Calendar Coverage"
            value={fmtRatio(summary?.holidayCalendarCoverage ?? null)}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard
            label="Payment Calendar Coverage"
            value={fmtRatio(summary?.paymentCalendarCoverage ?? null)}
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onRowClick={(row) => openDrawer(row.contractId, row.businessId)}
        loading={isLoading}
        error={friendlyError}
        onRetry={() => refetch()}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        height="calc(100vh - 530px)"
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search position, business, customer…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="finished">Finished</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Configuration</InputLabel>
              <Select
                value={configStatusFilter}
                label="Configuration"
                onChange={(e) => { setConfigStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="complete">Complete</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="invalid">Invalid</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Work Type</InputLabel>
              <Select
                value={workTypeFilter}
                label="Work Type"
                onChange={(e) => { setWorkTypeFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="contractor">Contractor</MenuItem>
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Billing Cycle</InputLabel>
              <Select
                value={billingCycleFilter}
                label="Billing Cycle"
                onChange={(e) => { setBillingCycleFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="per_shift">Per Shift</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="fortnightly">Fortnightly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>GST</InputLabel>
              <Select
                value={gstFilter}
                label="GST"
                onChange={(e) => { setGstFilter(e.target.value as typeof gstFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">With GST</MenuItem>
                <MenuItem value="false">Without GST</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Superannuation</InputLabel>
              <Select
                value={superFilter}
                label="Superannuation"
                onChange={(e) => { setSuperFilter(e.target.value as typeof superFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Enabled</MenuItem>
                <MenuItem value="false">Disabled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Holiday Rules</InputLabel>
              <Select
                value={holidayFilter}
                label="Holiday Rules"
                onChange={(e) => { setHolidayFilter(e.target.value as typeof holidayFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Enabled</MenuItem>
                <MenuItem value="false">Disabled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Payment Calendar</InputLabel>
              <Select
                value={payCalFilter}
                label="Payment Calendar"
                onChange={(e) => { setPayCalFilter(e.target.value as typeof payCalFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Enabled</MenuItem>
                <MenuItem value="false">Disabled</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
        emptyState={
          <EmptyState
            title="No Contracts found"
            description={
              hasActiveFilters
                ? 'No Contracts match the current filters. Try adjusting your search.'
                : 'No Contract data has been synced to Business Intelligence yet.'
            }
            icon={ArticleOutlinedIcon}
          />
        }
      />

      <ContractDetailDrawer
        contractId={drawerContractId}
        businessId={drawerBusinessId}
        onClose={closeDrawer}
      />
    </Box>
  );
}
