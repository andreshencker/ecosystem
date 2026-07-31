'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RefreshOutlinedIcon    from '@mui/icons-material/RefreshOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, ErrorState, LoadingButton, type MobileCardConfig } from '@/components/shared';
import { usePendingInvoiceGroups, useApproveInvoiceMutation } from '@/hooks/api/useInvoices';
import type { PendingInvoiceGroup, PendingGroupStatus } from '@/types/invoice';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/invoice';
import { ReviewDrawer } from './components/ReviewDrawer';
import { formatCurrency, formatHours, formatPeriod } from './lib/format';

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: PendingGroupStatus }) {
  return (
    <Chip
      label={STATUS_LABELS[status]}
      color={STATUS_COLORS[status]}
      size="small"
      variant="outlined"
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceApprovalPage() {
  const { data, isLoading, isError, refetch, isFetching, error } = usePendingInvoiceGroups();
  const approveMutation = useApproveInvoiceMutation();

  const [reviewGroup, setReviewGroup] = useState<PendingInvoiceGroup | null>(null);
  const [approvingId, setApprovingId]  = useState<string | null>(null);
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // DataTable requires T extends { id?: string } — map groupId to id.
  const groups = (data?.groups ?? []).map((g) => ({ ...g, id: g.groupId }));

  // ── Approve handler ────────────────────────────────────────────────────────

  function handleApprove(group: PendingInvoiceGroup) {
    if (!group.isApprovable) return;
    setApprovingId(group.groupId);
    approveMutation.mutate(
      {
        groupId:     group.groupId,
        customerId:  group.customerId,
        contractId:  group.contractId,
        periodStart: group.periodStart,
        periodEnd:   group.periodEnd,
      },
      { onSettled: () => setApprovingId(null) },
    );
  }

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1.5,
      minWidth: 160,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => (
        <Stack>
          <Typography variant="body2" fontWeight={600}>{row.customerName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.contractTitle}</Typography>
        </Stack>
      ),
    },
    {
      field: 'periodStart',
      headerName: 'Billing Period',
      flex: 1.5,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => (
        <Typography variant="body2">{formatPeriod(row.periodStart, row.periodEnd)}</Typography>
      ),
    },
    {
      field: 'totalWorkedHours',
      headerName: 'Worked Hours',
      flex: 1,
      minWidth: 130,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => (
        <Typography variant="body2">{formatHours(row.totalWorkedHours)}</Typography>
      ),
    },
    {
      field: 'total',
      headerName: 'Income',
      flex: 1,
      minWidth: 140,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => (
        <Typography variant="body2" fontWeight={600}>
          {formatCurrency(row.total, row.currency)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 110,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => <StatusChip status={row.status} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }: { row: PendingInvoiceGroup }) => {
        const isApproving = approvingId === row.groupId && approveMutation.isPending;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Review calculation">
              <IconButton size="small" onClick={() => setReviewGroup(row)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <LoadingButton
              size="small"
              variant="contained"
              color="primary"
              loading={isApproving}
              disabled={!row.isApprovable || approveMutation.isPending}
              startIcon={<CheckCircleOutlineIcon />}
              onClick={() => handleApprove(row)}
              sx={{ fontSize: '0.75rem' }}
            >
              Approve
            </LoadingButton>
          </Stack>
        );
      },
    },
  ];

  // ── Mobile card config ─────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<PendingInvoiceGroup> = {
    primaryText:   (row) => row.customerName,
    secondaryText: (row) => formatPeriod(row.periodStart, row.periodEnd),
    badge:         (row) => <StatusChip status={row.status} />,
    fields: [
      {
        field: 'totalWorkedHours',
        label: 'Worked Hours',
        render: (v) => formatHours(String(v ?? '')),
      },
      {
        field: 'total',
        label: 'Income',
        render: (v, row) => formatCurrency(String(v ?? ''), row.currency),
      },
    ],
    actions: (row) => (
      <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => setReviewGroup(row)}
          sx={{ flex: 1 }}
        >
          Review
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!row.isApprovable || approveMutation.isPending}
          startIcon={<CheckCircleOutlineIcon />}
          onClick={() => handleApprove(row)}
          sx={{ flex: 1 }}
        >
          Approve
        </Button>
      </Stack>
    ),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const subtitle = data
    ? `${data.totalGroups} group${data.totalGroups !== 1 ? 's' : ''} · ${data.approvableGroups} approvable`
    : undefined;

  return (
    <Box>
      <PageHeader
        title="Invoice Approval"
        subtitle={subtitle}
        actions={
          <Tooltip title="Refresh from BI">
            <IconButton onClick={() => refetch()} disabled={isFetching} size="small">
              {isFetching ? <CircularProgress size={18} /> : <RefreshOutlinedIcon />}
            </IconButton>
          </Tooltip>
        }
      />

      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState
          title="No pending invoices"
          description="All confirmed shifts have been invoiced, or no confirmed shifts are available yet."
        />
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <DataTable
          columns={columns}
          rows={groups}
          total={groups.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          loading={isFetching}
          error={isError ? (error as Error) : null}
          getRowId={(row) => row.id ?? row.groupId}
          mobileCardConfig={mobileCardConfig}
          height="calc(100vh - 220px)"
        />
      )}

      {isError && !isLoading && (
        <ErrorState
          title="Could not load pending invoices"
          description="The Business Intelligence service may be unavailable. Try refreshing."
          action={
            <Button variant="outlined" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <ReviewDrawer
        group={reviewGroup}
        open={reviewGroup !== null}
        onClose={() => setReviewGroup(null)}
      />
    </Box>
  );
}
