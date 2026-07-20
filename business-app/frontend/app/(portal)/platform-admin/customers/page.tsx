'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  RowActions,
  SearchToolbar,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { usePlatformAdminCustomers } from '@/hooks/api/usePlatformAdminCustomers';
import type { BiCustomerListItem } from '@/types/platform-admin-customer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DataQualityCell({ item }: { item: BiCustomerListItem }) {
  const count = item.dataQualityIssueCount;
  if (count === 0) {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <CheckCircleOutlineIcon fontSize="small" color="success" />
        <Typography variant="body2" color="success.main">Healthy</Typography>
      </Box>
    );
  }
  return (
    <Tooltip
      title={
        item.dataQualityIssues && item.dataQualityIssues.length > 0
          ? item.dataQualityIssues.join(', ')
          : `${count} issue${count === 1 ? '' : 's'}`
      }
    >
      <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: 'default' }}>
        <WarningAmberOutlinedIcon fontSize="small" color="warning" />
        <Typography variant="body2" color="warning.main">
          {count === 1 ? '1 issue' : `${count} issues`}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function RecipientsCell({ item }: { item: BiCustomerListItem }) {
  if (item.emailRecipientCount === 0 && item.smsRecipientCount === 0) {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  return (
    <Box display="flex" flexDirection="column" justifyContent="center" sx={{ lineHeight: 1.4 }}>
      {item.emailRecipientCount > 0 && (
        <Typography variant="caption">Email: {item.emailRecipientCount}</Typography>
      )}
      {item.smsRecipientCount > 0 && (
        <Typography variant="caption">SMS: {item.smsRecipientCount}</Typography>
      )}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformAdminCustomersPage() {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [businessIdFilter, setBusinessIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'company' | 'individual'>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [hasContactsFilter, setHasContactsFilter] = useState<'' | 'true' | 'false'>('');
  const [hasLocationsFilter, setHasLocationsFilter] = useState<'' | 'true' | 'false'>('');
  const [hasCommFilter, setHasCommFilter] = useState<'' | 'true' | 'false'>('');
  const [hasDqFilter, setHasDqFilter] = useState<'' | 'true' | 'false'>('');

  const params = {
    page: page + 1,
    limit: pageSize,
    search: search || undefined,
    businessId: businessIdFilter || undefined,
    customerType: (typeFilter || undefined) as 'company' | 'individual' | undefined,
    isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
    hasContacts: hasContactsFilter !== '' ? hasContactsFilter === 'true' : undefined,
    hasLocations: hasLocationsFilter !== '' ? hasLocationsFilter === 'true' : undefined,
    hasCommunicationConfiguration: hasCommFilter !== '' ? hasCommFilter === 'true' : undefined,
    hasDataQualityIssues: hasDqFilter !== '' ? hasDqFilter === 'true' : undefined,
  };

  const { data, isLoading, error, refetch } = usePlatformAdminCustomers(params);

  // Map API errors to a friendly message — never show raw "Request failed with status code 503"
  const friendlyError: Error | null = error
    ? Object.assign(new Error(
        'Customer analytics are temporarily unavailable.\n' +
        'Please verify that the Business Intelligence service is running.',
      ), { cause: error })
    : null;

  // DataTable requires rows to have { id?: string }; use customerId as the stable row key.
  type BiRow = BiCustomerListItem & { id: string };
  const rows: BiRow[] = (data?.items ?? []).map((item) => ({ ...item, id: item.customerId }));

  const hasActiveFilters =
    search !== '' ||
    businessIdFilter !== '' ||
    typeFilter !== '' ||
    activeFilter !== '' ||
    hasContactsFilter !== '' ||
    hasLocationsFilter !== '' ||
    hasCommFilter !== '' ||
    hasDqFilter !== '';

  function clearFilters() {
    setSearch('');
    setBusinessIdFilter('');
    setTypeFilter('');
    setActiveFilter('');
    setHasContactsFilter('');
    setHasLocationsFilter('');
    setHasCommFilter('');
    setHasDqFilter('');
    setPage(0);
  }

  // ─── Columns ────────────────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1.5,
      minWidth: 160,
    },
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
      field: 'customerType',
      headerName: 'Type',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'company' ? 'Company' : 'Individual'}
          size="small"
          variant="outlined"
          color={params.value === 'company' ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'abn',
      headerName: 'ABN',
      width: 130,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {params.value as string}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 90,
      renderCell: (params: GridRenderCellParams) => (
        <StatusBadge active={params.value as boolean} />
      ),
    },
    {
      field: 'contactCount',
      headerName: 'Contacts',
      width: 90,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'locationCount',
      headerName: 'Locations',
      width: 95,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'communicationPurposeCount',
      headerName: 'Comm. Purposes',
      width: 140,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: '_recipients',
      headerName: 'Recipients',
      width: 120,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <RecipientsCell item={params.row as BiCustomerListItem} />
      ),
    },
    {
      field: '_dataQuality',
      headerName: 'Data Quality',
      width: 130,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <DataQualityCell item={params.row as BiCustomerListItem} />
      ),
    },
    {
      field: 'sourceUpdatedAt',
      headerName: 'Source Updated',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          {fmtDate(params.value as string | null)}
        </Typography>
      ),
    },
    {
      field: 'syncedAt',
      headerName: 'BI Synced',
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
        const row = params.row as BiCustomerListItem;
        return (
          <RowActions onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View customer">
              <IconButton
                size="small"
                aria-label="View customer"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/platform-admin/customers/${row.customerId}?businessId=${row.businessId}`);
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

  // ─── Mobile card config ────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<BiCustomerListItem> = {
    primaryText: 'customerName',
    secondaryText: (row) => row.businessName ?? '',
    badge: (row) => <StatusBadge active={row.isActive} />,
    fields: [
      {
        field: 'customerType',
        label: 'Type',
        render: (v) => (
          <Chip
            label={v === 'company' ? 'Company' : 'Individual'}
            size="small"
            variant="outlined"
          />
        ),
      },
      { field: 'abn', label: 'ABN' },
      {
        field: 'dataQualityIssueCount',
        label: 'Data Quality',
        render: (v, row) => <DataQualityCell item={row as BiCustomerListItem} />,
      },
    ],
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Customers"
        count={data?.total}
        subtitle="Read-only cross-tenant customer view from Business Intelligence."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Customers' }]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onRowClick={(row) =>
          router.push(`/platform-admin/customers/${row.customerId}?businessId=${row.businessId}`)
        }
        loading={isLoading}
        error={friendlyError}
        onRetry={() => refetch()}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        height="calc(100vh - 270px)"
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search name, ABN, contact…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(0); }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="company">Company</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={activeFilter}
                label="Status"
                onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Contacts</InputLabel>
              <Select
                value={hasContactsFilter}
                label="Contacts"
                onChange={(e) => { setHasContactsFilter(e.target.value as typeof hasContactsFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Has contacts</MenuItem>
                <MenuItem value="false">No contacts</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Locations</InputLabel>
              <Select
                value={hasLocationsFilter}
                label="Locations"
                onChange={(e) => { setHasLocationsFilter(e.target.value as typeof hasLocationsFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Has locations</MenuItem>
                <MenuItem value="false">No locations</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Comm. Config</InputLabel>
              <Select
                value={hasCommFilter}
                label="Comm. Config"
                onChange={(e) => { setHasCommFilter(e.target.value as typeof hasCommFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Configured</MenuItem>
                <MenuItem value="false">Not configured</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Data Quality</InputLabel>
              <Select
                value={hasDqFilter}
                label="Data Quality"
                onChange={(e) => { setHasDqFilter(e.target.value as typeof hasDqFilter); setPage(0); }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="true">Has issues</MenuItem>
                <MenuItem value="false">Healthy</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
        emptyState={
          <EmptyState
            title="No customers found"
            description={
              hasActiveFilters
                ? 'No customers match the current filters. Try adjusting your search.'
                : 'No customer data has been synced to Business Intelligence yet.'
            }
            icon={BusinessOutlinedIcon}
          />
        }
      />
    </Box>
  );
}
