'use client';

import { useMemo, useState } from 'react';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, ErrorState, RowActions, SearchToolbar } from '@/components/shared';
import { useApprovedInvoices, useMarkInvoiceSentMutation, useReceivablesSummary, useRecordInvoiceReminderMutation } from '@/hooks/api/useInvoices';
import type { ApprovedInvoiceListItem } from '@/types/invoice';
import type { MobileCardConfig } from '@/components/shared';
import { formatCurrency, formatDate, formatPeriod } from '../invoice-approval/lib/format';
import { InvoicePreviewDrawer, MarkPaidDrawer, VoidInvoiceDrawer } from './components/InvoiceActionDrawers';
import { ReceivablesCards } from './components/ReceivablesCards';
import { InvoiceCharts } from './components/InvoiceCharts';

type StatusFilter = '' | 'approved' | 'sent' | 'overdue' | 'paid' | 'voided' | 'send_failed';
type TimePreset = 'all' | 'this_month' | 'previous_month' | 'this_quarter' | 'previous_quarter' | 'this_year' | 'custom';

const isoDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

function getPresetRange(preset: TimePreset): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (preset === 'all' || preset === 'custom') return { from: '', to: '' };
  if (preset === 'this_month') return { from: isoDate(year, month, 1), to: isoDate(year, month + 1, 0) };
  if (preset === 'previous_month') return { from: isoDate(year, month - 1, 1), to: isoDate(year, month, 0) };
  if (preset === 'this_year') return { from: isoDate(year, 0, 1), to: isoDate(year, 11, 31) };
  const quarterStart = Math.floor(month / 3) * 3;
  if (preset === 'this_quarter') return { from: isoDate(year, quarterStart, 1), to: isoDate(year, quarterStart + 3, 0) };
  const previousStart = quarterStart - 3;
  return { from: isoDate(year, previousStart, 1), to: isoDate(year, previousStart + 3, 0) };
}

function isOverdue(invoice: ApprovedInvoiceListItem) {
  return invoice.status === 'sent' && !!invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10) && Number(invoice.balance) > 0;
}

function dueDays(invoice: ApprovedInvoiceListItem): { label: string; level: 'none' | 'safe' | 'warning' | 'overdue' | 'critical' } {
  if (!invoice.dueDate || ['paid', 'voided'].includes(invoice.status) || Number(invoice.balance) <= 0) return { label: '—', level: 'none' };
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const due = new Date(`${invoice.dueDate.slice(0, 10)}T00:00:00Z`).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days === 0) return { label: 'Due today', level: 'warning' };
  if (days < 0) return { label: `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`, level: days < -30 ? 'critical' : 'overdue' };
  return { label: `${days} day${days === 1 ? '' : 's'} left`, level: days <= 7 ? 'warning' : 'safe' };
}

function StatusChip({ invoice }: { invoice: ApprovedInvoiceListItem }) {
  if (invoice.status === 'paid') return <Chip label="Paid" color="success" size="small" variant="outlined" />;
  if (invoice.status === 'voided') return <Chip label="Voided" color="default" size="small" variant="outlined" />;
  if (isOverdue(invoice)) return <Chip label="Overdue" color="error" size="small" variant="outlined" />;
  if (invoice.status === 'sent') return <Chip label="Sent" color="info" size="small" variant="outlined" />;
  if (invoice.status === 'send_failed') return <Chip label="Send Failed" color="error" size="small" variant="outlined" />;
  return <Chip label="Approved" color="warning" size="small" variant="outlined" />;
}

export default function InvoicesPage() {
  const invoicesQuery = useApprovedInvoices();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [customer, setCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [view, setView] = useState<'table' | 'charts'>('table');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [preview, setPreview] = useState<ApprovedInvoiceListItem | null>(null);
  const [paying, setPaying] = useState<ApprovedInvoiceListItem | null>(null);
  const [voiding, setVoiding] = useState<ApprovedInvoiceListItem | null>(null);
  const markSentMutation = useMarkInvoiceSentMutation();
  const reminderMutation = useRecordInvoiceReminderMutation();

  const customers = useMemo(() => Array.from(new Map((invoicesQuery.data?.items ?? []).filter((invoice) => invoice.customerId && invoice.customerName).map((invoice) => [invoice.customerId, invoice.customerName as string])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [invoicesQuery.data]);
  const dashboardFilters = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    customerId: customer || undefined,
    invoiceStatus: status || undefined,
    search: search.trim() || undefined,
  }), [dateFrom, dateTo, customer, status, search]);
  const summaryQuery = useReceivablesSummary(dashboardFilters);

  function applyTimePreset(preset: TimePreset) {
    setTimePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetRange(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
      setPage(0);
    }
  }

  const rows = useMemo(() => (invoicesQuery.data?.items ?? []).filter((invoice) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || invoice.invoiceNumber.toLowerCase().includes(needle) || (invoice.customerName ?? '').toLowerCase().includes(needle);
    const effectiveStatus = isOverdue(invoice) ? 'overdue' : invoice.status === 'outstanding' ? 'approved' : invoice.status;
    const matchesCustomer = !customer || invoice.customerId === customer;
    const matchesFrom = !dateFrom || invoice.periodEnd >= dateFrom;
    const matchesTo = !dateTo || invoice.periodStart <= dateTo;
    return matchesSearch && matchesCustomer && matchesFrom && matchesTo && (!status || effectiveStatus === status);
  }).map((invoice) => ({ ...invoice, id: invoice.invoiceId })), [invoicesQuery.data, search, status, customer, dateFrom, dateTo]);

  function primaryAction(invoice: ApprovedInvoiceListItem, fullWidth = false, iconOnly = false) {
    const common = { size: 'small' as const, variant: 'contained' as const, fullWidth };
    if (isOverdue(invoice)) return iconOnly
      ? <Tooltip title="Send payment reminder"><span><IconButton size="small" color="error" aria-label="Send payment reminder" disabled={reminderMutation.isPending} onClick={() => reminderMutation.mutate(invoice.invoiceId)}><NotificationsActiveOutlinedIcon fontSize="small" /></IconButton></span></Tooltip>
      : <Button {...common} color="error" startIcon={<NotificationsActiveOutlinedIcon />} disabled={reminderMutation.isPending} onClick={() => reminderMutation.mutate(invoice.invoiceId)}>Send Reminder</Button>;
    if (invoice.status === 'sent') return iconOnly ? <Tooltip title="Mark as Paid"><IconButton size="small" color="success" aria-label="Mark invoice as paid" onClick={() => setPaying(invoice)}><PaidOutlinedIcon fontSize="small" /></IconButton></Tooltip> : <Button {...common} color="success" startIcon={<PaidOutlinedIcon />} onClick={() => setPaying(invoice)}>Mark as Paid</Button>;
    if (invoice.status === 'send_failed' || invoice.status === 'approved' || invoice.status === 'outstanding') return iconOnly ? <Tooltip title="Send Invoice"><span><IconButton size="small" color="primary" aria-label="Send invoice" disabled={markSentMutation.isPending} onClick={() => markSentMutation.mutate({ invoiceId: invoice.invoiceId, sentAt: new Date().toISOString().slice(0, 10) })}><SendOutlinedIcon fontSize="small" /></IconButton></span></Tooltip> : <Button {...common} startIcon={<SendOutlinedIcon />} disabled={markSentMutation.isPending} onClick={() => markSentMutation.mutate({ invoiceId: invoice.invoiceId, sentAt: new Date().toISOString().slice(0, 10) })}>Send Invoice</Button>;
    return <Button {...common} variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => setPreview(invoice)}>Preview</Button>;
  }

  const columns: GridColDef[] = [
    { field: 'invoiceNumber', headerName: 'Invoice', minWidth: 110, flex: 0.7 },
    { field: 'customerName', headerName: 'Customer', minWidth: 190, flex: 1.3, renderCell: ({ row }) => <Typography variant="body2">{row.customerName ?? 'Unknown customer'}</Typography> },
    { field: 'periodStart', headerName: 'Billing Period', minWidth: 190, flex: 1.1, sortable: false, renderCell: ({ row }) => formatPeriod(row.periodStart, row.periodEnd) },
    { field: 'invoiceDate', headerName: 'Invoice Date', minWidth: 130, renderCell: ({ row }) => formatDate(row.invoiceDate) },
    { field: 'dueDate', headerName: 'Due Date', minWidth: 130, renderCell: ({ row }) => row.dueDate ? formatDate(row.dueDate) : '—' },
    { field: 'total', headerName: 'Total', minWidth: 130, align: 'right', headerAlign: 'right', renderCell: ({ row }) => formatCurrency(row.total, row.currency) },
    { field: 'balance', headerName: 'Balance', minWidth: 130, align: 'right', headerAlign: 'right', renderCell: ({ row }) => <Typography variant="body2" fontWeight={600}>{formatCurrency(row.balance, row.currency)}</Typography> },
    { field: 'dueDays', headerName: 'Days', minWidth: 145, sortable: false, renderCell: ({ row }) => { const value = dueDays(row); return value.level === 'none' ? '—' : <Chip label={value.label} size="small" color={value.level === 'safe' ? 'success' : value.level === 'warning' ? 'warning' : 'error'} variant={value.level === 'critical' ? 'filled' : 'outlined'} sx={value.level === 'critical' ? { bgcolor: 'error.dark', color: 'common.white' } : undefined} />; } },
    { field: 'status', headerName: 'Status', minWidth: 125, renderCell: ({ row }) => <StatusChip invoice={row} /> },
  ];

  const mobileCardConfig: MobileCardConfig<ApprovedInvoiceListItem & { id: string }> = {
    primaryText: (row) => `Invoice ${row.invoiceNumber}`,
    secondaryText: (row) => row.customerName ?? 'Unknown customer',
    badge: (row) => <StatusChip invoice={row} />,
    fields: [
      { field: 'invoiceDate', label: 'Invoice date', render: (_value, row) => formatDate(row.invoiceDate) },
      { field: 'periodStart', label: 'Billing period', render: (_value, row) => formatPeriod(row.periodStart, row.periodEnd) },
      { field: 'dueDate', label: 'Due date', render: (_value, row) => row.dueDate ? formatDate(row.dueDate) : '—' },
      { field: 'total', label: 'Total', render: (_value, row) => formatCurrency(row.total, row.currency) },
      { field: 'balance', label: 'Balance', render: (_value, row) => formatCurrency(row.balance, row.currency) },
      { field: 'dueDate', label: 'Days', render: (_value, row) => dueDays(row).label },
    ],
    actions: (row) => ['paid', 'voided'].includes(row.status)
      ? <Button fullWidth size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => setPreview(row)}>View</Button>
      : <Stack direction="row" spacing={1} width="100%" flexWrap="wrap"><Button size="small" variant="outlined" onClick={() => setPreview(row)}>Preview</Button><Box flex={1}>{primaryAction(row, true)}</Box>{isOverdue(row) && <Button size="small" color="success" variant="outlined" startIcon={<PaidOutlinedIcon />} onClick={() => setPaying(row)}>Paid</Button>}</Stack>,
  };

  return <Box>
    <PageHeader title="Invoices" count={rows.length} subtitle="Overview and administration of approved invoices." actions={<ToggleButtonGroup exclusive size="small" value={view} onChange={(_event, next) => next && setView(next)} aria-label="Invoice dashboard view"><ToggleButton value="table"><TableRowsOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />Table</ToggleButton><ToggleButton value="charts"><InsertChartOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />Charts</ToggleButton></ToggleButtonGroup>} />
    <SearchToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search invoice number" hasActiveFilters={!!search || !!status || !!customer || timePreset !== 'all'} onClearFilters={() => { setSearch(''); setStatus(''); setCustomer(''); setDateFrom(''); setDateTo(''); setTimePreset('all'); }}>
      <TextField select size="small" label="Customer" value={customer} onChange={(e) => { setCustomer(e.target.value); setPage(0); }} sx={{ width: { xs: '100%', sm: 190 } }}><MenuItem value="">All customers</MenuItem>{customers.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}</TextField>
      <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(0); }} sx={{ width: { xs: '100%', sm: 170 } }}>
        <MenuItem value="">All statuses</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="sent">Sent</MenuItem><MenuItem value="overdue">Overdue</MenuItem><MenuItem value="send_failed">Send failed</MenuItem><MenuItem value="paid">Paid</MenuItem><MenuItem value="voided">Voided</MenuItem>
      </TextField>
      <TextField select size="small" label="Time period" value={timePreset} onChange={(e) => applyTimePreset(e.target.value as TimePreset)} sx={{ width: { xs: '100%', sm: 185 } }}><MenuItem value="all">All time</MenuItem><MenuItem value="this_month">This month</MenuItem><MenuItem value="previous_month">Previous month</MenuItem><MenuItem value="this_quarter">This quarter</MenuItem><MenuItem value="previous_quarter">Previous quarter</MenuItem><MenuItem value="this_year">This year</MenuItem><MenuItem value="custom">Custom period</MenuItem></TextField>
      {timePreset === 'custom' && <><TextField size="small" label="From" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 155 } }} /><TextField size="small" label="To" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 155 } }} /></>}
    </SearchToolbar>
    <ReceivablesCards summary={summaryQuery.data} />
    {view === 'table' && !invoicesQuery.isLoading && !invoicesQuery.isError && !rows.length && <EmptyState title="No invoices found" description="No invoices match the selected filters." />}
    {view === 'table' && !invoicesQuery.isLoading && !invoicesQuery.isError && !!rows.length && <DataTable columns={columns} rows={rows} total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} loading={invoicesQuery.isFetching} getRowId={(row) => row.invoiceId} rowHeight={44} actionsColumnWidth={220} rowActions={(row) => <RowActions>{!['paid', 'voided'].includes(row.status) && primaryAction(row, false, true)}{isOverdue(row) && <Tooltip title="Mark as Paid"><IconButton size="small" color="success" aria-label="Mark invoice as paid" onClick={() => setPaying(row)}><PaidOutlinedIcon fontSize="small" /></IconButton></Tooltip>}<Tooltip title="View invoice"><IconButton size="small" aria-label="View invoice" onClick={() => setPreview(row)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>{!['paid', 'voided'].includes(row.status) && <Tooltip title="Void invoice"><IconButton size="small" color="error" onClick={() => setVoiding(row)}><CancelOutlinedIcon fontSize="small" /></IconButton></Tooltip>}</RowActions>} mobileCardConfig={mobileCardConfig} height="calc(100vh - 430px)" />}
    {view === 'charts' && <InvoiceCharts summary={summaryQuery.data} />}
    {invoicesQuery.isError && <ErrorState title="Could not load invoices" description={(invoicesQuery.error as Error)?.message ?? 'Try again.'} action={<Button onClick={() => invoicesQuery.refetch()}>Retry</Button>} />}
    <InvoicePreviewDrawer invoice={preview} onClose={() => setPreview(null)} />
    <MarkPaidDrawer invoice={paying} onClose={() => setPaying(null)} />
    <VoidInvoiceDrawer invoice={voiding} onClose={() => setVoiding(null)} />
  </Box>;
}
