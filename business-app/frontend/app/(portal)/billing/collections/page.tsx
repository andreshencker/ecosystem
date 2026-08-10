'use client';

import { useMemo, useState } from 'react';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, ErrorState, SearchToolbar } from '@/components/shared';
import { useApprovedInvoices, useReceivablesSummary, useRecordInvoiceReminderMutation } from '@/hooks/api/useInvoices';
import type { ApprovedInvoiceListItem } from '@/types/invoice';
import type { MobileCardConfig } from '@/components/shared';
import { formatCurrency, formatDate } from '../invoice-approval/lib/format';
import { MarkPaidDrawer } from '../invoices/components/InvoiceActionDrawers';
import { ReceivablesCards } from '../invoices/components/ReceivablesCards';

function daysOverdue(dueDate: string | null) {
  if (!dueDate) return 0;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const due = new Date(`${dueDate}T00:00:00Z`);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

function dueIndicator(dueDate: string | null) {
  if (!dueDate) return { label: 'No due date', color: 'default' as const, critical: false };
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const remaining = Math.round((due - today) / 86_400_000);
  if (remaining < 0) return { label: `${Math.abs(remaining)} day${remaining === -1 ? '' : 's'} overdue`, color: 'error' as const, critical: remaining < -30 };
  if (remaining === 0) return { label: 'Due today', color: 'warning' as const, critical: false };
  return { label: `${remaining} day${remaining === 1 ? '' : 's'} left`, color: remaining <= 7 ? 'warning' as const : 'success' as const, critical: false };
}

export default function CollectionsPage() {
  const invoicesQuery = useApprovedInvoices();
  const summaryQuery = useReceivablesSummary();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'overdue'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [paying, setPaying] = useState<ApprovedInvoiceListItem | null>(null);
  const reminderMutation = useRecordInvoiceReminderMutation();
  const rows = useMemo(() => (invoicesQuery.data?.items ?? []).filter((invoice) => {
    if (invoice.status !== 'sent') return false;
    if (scope === 'overdue' && daysOverdue(invoice.dueDate) === 0) return false;
    const needle = search.trim().toLowerCase();
    return !needle || invoice.invoiceNumber.toLowerCase().includes(needle) || (invoice.customerName ?? '').toLowerCase().includes(needle);
  }).map((invoice) => ({ ...invoice, id: invoice.invoiceId })), [invoicesQuery.data, search, scope]);

  const columns: GridColDef[] = [
    { field: 'customerName', headerName: 'Customer', minWidth: 210, flex: 1.3, renderCell: ({ row }) => row.customerName ?? 'Unknown customer' },
    { field: 'invoiceNumber', headerName: 'Invoice', minWidth: 110 },
    { field: 'dueDate', headerName: 'Due Date', minWidth: 140, renderCell: ({ row }) => row.dueDate ? formatDate(row.dueDate) : '—' },
    { field: 'balance', headerName: 'Balance', minWidth: 150, align: 'right', headerAlign: 'right', renderCell: ({ row }) => <Typography variant="body2" fontWeight={600}>{formatCurrency(row.balance, row.currency)}</Typography> },
    { field: 'daysOverdue', headerName: 'Days', minWidth: 150, align: 'center', renderCell: ({ row }) => { const indicator = dueIndicator(row.dueDate); return <Chip label={indicator.label} color={indicator.color} size="small" variant={indicator.critical ? 'filled' : 'outlined'} sx={indicator.critical ? { bgcolor: 'error.dark', color: 'common.white' } : undefined} />; } },
    { field: 'status', headerName: 'Status', minWidth: 120, renderCell: ({ row }) => daysOverdue(row.dueDate) ? <Chip label="Overdue" color="error" size="small" variant="outlined" /> : <Chip label="Outstanding" color="warning" size="small" variant="outlined" /> },
    { field: 'actions', headerName: 'Actions', width: 190, sortable: false, renderCell: ({ row }) => daysOverdue(row.dueDate) > 0 ? <Stack direction="row" spacing={1}><Button size="small" color="error" startIcon={<NotificationsActiveOutlinedIcon />} disabled={reminderMutation.isPending} onClick={() => reminderMutation.mutate(row.invoiceId)}>Reminder</Button><Tooltip title="Mark as Paid"><IconButton size="small" color="success" aria-label="Mark invoice as paid" onClick={() => setPaying(row)}><PaidOutlinedIcon fontSize="small" /></IconButton></Tooltip></Stack> : <Tooltip title="Mark as Paid"><IconButton size="small" color="success" aria-label="Mark invoice as paid" onClick={() => setPaying(row)}><PaidOutlinedIcon fontSize="small" /></IconButton></Tooltip> },
  ];

  const mobileCardConfig: MobileCardConfig<ApprovedInvoiceListItem & { id: string }> = {
    primaryText: (row) => `Invoice ${row.invoiceNumber}`,
    secondaryText: (row) => row.customerName ?? 'Unknown customer',
    badge: (row) => daysOverdue(row.dueDate) ? <Chip label="Overdue" color="error" size="small" variant="outlined" /> : <Chip label="Outstanding" color="warning" size="small" variant="outlined" />,
    fields: [
      { field: 'dueDate', label: 'Due date', render: (_value, row) => row.dueDate ? formatDate(row.dueDate) : '—' },
      { field: 'balance', label: 'Balance', render: (_value, row) => formatCurrency(row.balance, row.currency) },
      { field: 'dueDate', label: 'Days', render: (_value, row) => dueIndicator(row.dueDate).label },
    ],
    actions: (row) => daysOverdue(row.dueDate) ? <Stack direction="row" spacing={1} width="100%"><Button fullWidth variant="contained" color="error" startIcon={<NotificationsActiveOutlinedIcon />} disabled={reminderMutation.isPending} onClick={() => reminderMutation.mutate(row.invoiceId)}>Reminder</Button><Button fullWidth variant="outlined" color="success" startIcon={<PaidOutlinedIcon />} onClick={() => setPaying(row)}>Paid</Button></Stack> : <Button fullWidth variant="contained" color="success" startIcon={<PaidOutlinedIcon />} onClick={() => setPaying(row)}>Mark as Paid</Button>,
  };

  return <Box>
    <PageHeader title="Collections" count={rows.length} subtitle="Accounts receivable and overdue invoices." />
    <ReceivablesCards summary={summaryQuery.data} />
    <SearchToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search invoice or customer" hasActiveFilters={!!search || scope !== 'all'} onClearFilters={() => { setSearch(''); setScope('all'); }}>
      <TextField select size="small" label="Scope" value={scope} onChange={(e) => { setScope(e.target.value as 'all' | 'overdue'); setPage(0); }} sx={{ width: { xs: '100%', sm: 180 } }}><MenuItem value="all">All receivables</MenuItem><MenuItem value="overdue">Overdue only</MenuItem></TextField>
    </SearchToolbar>
    {!invoicesQuery.isLoading && !invoicesQuery.isError && !rows.length && <EmptyState title="No accounts receivable" description="There are no outstanding invoices for this filter." />}
    {!invoicesQuery.isLoading && !invoicesQuery.isError && !!rows.length && <DataTable columns={columns} rows={rows} total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} loading={invoicesQuery.isFetching} getRowId={(row) => row.invoiceId} rowHeight={44} mobileCardConfig={mobileCardConfig} height="calc(100vh - 430px)" />}
    {invoicesQuery.isError && <ErrorState title="Could not load collections" description={(invoicesQuery.error as Error)?.message ?? 'Try again.'} action={<Button onClick={() => invoicesQuery.refetch()}>Retry</Button>} />}
    <MarkPaidDrawer invoice={paying} onClose={() => setPaying(null)} />
  </Box>;
}
