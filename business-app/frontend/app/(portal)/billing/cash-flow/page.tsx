'use client';

import { useMemo, useState } from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { PageHeader } from '@/components/layout';
import { DataTable, ErrorState, type MobileCardConfig } from '@/components/shared';
import { useCustomers } from '@/hooks/api/useCustomers';
import { useInvoiceCashFlow } from '@/hooks/api/useInvoices';
import type { CustomerPaymentBehavior } from '@/types/invoice';
import { formatCurrency } from '../invoice-approval/lib/format';

const currentYear = new Date().getFullYear();
const riskColor = (risk: CustomerPaymentBehavior['risk']) => risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : risk === 'low' ? 'success' : 'default';
const days = (value: string | null, suffix = ' days') => value == null ? '—' : `${Number(value).toFixed(1)}${suffix}`;

export default function CashFlowPage() {
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const customersQuery = useCustomers({ limit: 200, active: true });
  const filters = useMemo(() => ({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, customerId: customerId || undefined }), [dateFrom, dateTo, customerId]);
  const query = useInvoiceCashFlow(filters);
  const data = query.data;
  const currency = data?.currency ?? 'AUD';
  const timeline = (data?.timeline ?? []).map((item) => ({ ...item, received: Number(item.received), expected: Number(item.expected), projected: Number(item.projected) }));
  const cards = [
    { label: 'Received', value: data?.received, detail: 'Payments in selected period', icon: <PaidOutlinedIcon />, color: 'success.main' },
    { label: 'Expected in 7 days', value: data?.expectedNext7Days, detail: 'Upcoming due dates', icon: <CalendarMonthOutlinedIcon />, color: 'primary.main' },
    { label: 'Expected in 30 days', value: data?.expectedNext30Days, detail: 'Upcoming cash inflow', icon: <AccountBalanceWalletOutlinedIcon />, color: 'primary.main' },
    { label: 'Overdue', value: data?.overdue, detail: 'Expected but not received', icon: <ErrorOutlineOutlinedIcon />, color: 'error.main' },
  ];
  const columns: GridColDef<CustomerPaymentBehavior>[] = [
    { field: 'customerName', headerName: 'Customer', minWidth: 190, flex: 1.2 },
    { field: 'averagePaymentDays', headerName: 'Avg. payment time', minWidth: 150, renderCell: ({ row }) => days(row.averagePaymentDays) },
    { field: 'averageDelayDays', headerName: 'Avg. delay', minWidth: 125, renderCell: ({ row }) => row.averageDelayDays == null ? '—' : `${Number(row.averageDelayDays).toFixed(1)} days` },
    { field: 'onTimeRate', headerName: 'On-time rate', minWidth: 120, renderCell: ({ row }) => row.onTimeRate == null ? '—' : `${Number(row.onTimeRate).toFixed(1)}%` },
    { field: 'paymentFrequencyDays', headerName: 'Pays every', minWidth: 120, renderCell: ({ row }) => days(row.paymentFrequencyDays) },
    { field: 'outstanding', headerName: 'Outstanding', minWidth: 135, align: 'right', headerAlign: 'right', renderCell: ({ row }) => formatCurrency(row.outstanding, currency) },
    { field: 'overdue', headerName: 'Overdue', minWidth: 125, align: 'right', headerAlign: 'right', renderCell: ({ row }) => formatCurrency(row.overdue, currency) },
    { field: 'risk', headerName: 'Risk', minWidth: 100, renderCell: ({ row }) => <Chip label={row.risk === 'unknown' ? 'No history' : row.risk} color={riskColor(row.risk)} size="small" variant="outlined" /> },
  ];
  const mobileCardConfig: MobileCardConfig<CustomerPaymentBehavior> = {
    primaryText: (row) => row.customerName,
    badge: (row) => <Chip label={row.risk === 'unknown' ? 'No history' : row.risk} color={riskColor(row.risk)} size="small" variant="outlined" />,
    fields: [
      { field: 'averagePaymentDays', label: 'Avg. payment time', render: (_value, row) => days(row.averagePaymentDays) },
      { field: 'averageDelayDays', label: 'Avg. delay', render: (_value, row) => days(row.averageDelayDays) },
      { field: 'outstanding', label: 'Outstanding', render: (_value, row) => formatCurrency(row.outstanding, currency) },
      { field: 'overdue', label: 'Overdue', render: (_value, row) => formatCurrency(row.overdue, currency) },
    ],
  };

  return <Box>
    <PageHeader title="Cash Flow" subtitle="Expected and received invoice cash inflows." />
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <TextField select size="small" label="Customer" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPage(0); }} sx={{ width: { xs: '100%', sm: 220 } }}><MenuItem value="">All customers</MenuItem>{(customersQuery.data?.items ?? []).map((customer) => <MenuItem key={customer.id} value={customer.id}>{customer.displayName}</MenuItem>)}</TextField>
      <TextField size="small" label="From" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 155 } }} />
      <TextField size="small" label="To" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: dateFrom }} sx={{ width: { xs: '100%', sm: 155 } }} />
    </Stack></Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>{cards.map((card) => <Paper key={card.label} variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">{card.label}</Typography><Typography variant="h6" mt={0.5}>{formatCurrency(card.value ?? '0', currency)}</Typography><Typography variant="caption" color="text.secondary">{card.detail}</Typography></Box><Box sx={{ color: card.color }}>{card.icon}</Box></Stack></Paper>)}</Box>
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}><Typography variant="subtitle1" fontWeight={600} mb={2}>Expected vs received cash inflow</Typography><Box height={300}>{timeline.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={timeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => formatCurrency(String(value), currency)} /><Legend /><Bar dataKey="received" name="Received" fill="#2a9d8f" /><Bar dataKey="expected" name="Due date forecast" fill="#4361ee" /><Bar dataKey="projected" name="Behavior-adjusted forecast" fill="#f4a261" /></BarChart></ResponsiveContainer> : <Stack height="100%" justifyContent="center" alignItems="center"><Typography color="text.secondary">No cash-flow activity in this period.</Typography></Stack>}</Box></Paper>
    <Typography variant="h6" mb={1}>Customer payment behavior</Typography>
    {query.isError ? <ErrorState title="Could not load cash flow" description={(query.error as Error)?.message ?? 'Try again.'} /> : <DataTable columns={columns} rows={data?.customers ?? []} total={data?.customers.length ?? 0} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} loading={query.isFetching} getRowId={(row) => row.customerId} rowHeight={44} mobileCardConfig={mobileCardConfig} height={420} />}
  </Box>;
}
