'use client';

import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullOutlinedIcon from '@mui/icons-material/OpenInFullOutlined';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';

import type { ReceivablesSummary } from '@/types/invoice';

const COLORS = ['#4361ee', '#2a9d8f', '#f4a261', '#e76f51', '#7b2cbf', '#6c757d'];
const money = (value: unknown) => `AUD ${Number(value ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type TabKey = 'overview' | 'customers' | 'receivables' | 'payments';
type ChartKey = 'trend' | 'status' | 'collection' | 'customerIncome' | 'customerDebt' | 'aging' | 'paymentTrend' | 'customerPayments' | 'customerRevenueTime' | 'customerFinancialTime' | 'customerGrowth' | 'customerShareTime';

const chartTitles: Record<ChartKey, string> = {
  trend: 'Income over time', status: 'Invoices by status', collection: 'Collection progress',
  customerIncome: 'Income by customer', customerDebt: 'Outstanding by customer', aging: 'Receivables aging',
  paymentTrend: 'Payments received over time', customerPayments: 'Payments by customer',
  customerRevenueTime: 'Customer income over time', customerFinancialTime: 'Billed, paid and outstanding over time',
  customerGrowth: 'Customer growth: current vs previous period', customerShareTime: 'Customer revenue share over time',
};

function ChartContent({ chart, summary }: { chart: ChartKey; summary: ReceivablesSummary }) {
  const trend = summary.trend.map((item) => ({ ...item, totalIncome: Number(item.totalIncome), paid: Number(item.paid), outstanding: Number(item.outstanding) }));
  const statuses = summary.statuses.map((item) => ({ ...item, value: Number(item.value) }));
  const customers = summary.customers.map((item) => ({ ...item, totalIncome: Number(item.totalIncome), paid: Number(item.paid), outstanding: Number(item.outstanding), overdue: Number(item.overdue) }));
  const aging = summary.aging.map((item) => ({ ...item, value: Number(item.value) }));
  const payments = summary.paymentTrend.map((item) => ({ ...item, paid: Number(item.paid) }));
  const collection = [{ label: 'Paid', value: Number(summary.paid) }, { label: 'Outstanding', value: Number(summary.outstanding) }];
  const timelineCustomers = Array.from(new Set(summary.customerTimeline.map((item) => item.customer))).slice(0, 8);
  const timelinePeriods = Array.from(new Set(summary.customerTimeline.map((item) => item.label))).sort();
  const customerTimeline = timelinePeriods.map((label) => {
    const row: Record<string, string | number> = { label };
    summary.customerTimeline.filter((item) => item.label === label).forEach((item) => { row[item.customer] = Number(item.totalIncome); });
    return row;
  });
  const customerShare = timelinePeriods.map((label) => {
    const row: Record<string, string | number> = { label };
    summary.customerTimeline.filter((item) => item.label === label).forEach((item) => { row[item.customer] = Number(item.share); });
    return row;
  });
  const customerFinancial = timelinePeriods.map((label) => summary.customerTimeline.filter((item) => item.label === label).reduce((row, item) => ({ label, totalIncome: row.totalIncome + Number(item.totalIncome), paid: row.paid + Number(item.paid), outstanding: row.outstanding + Number(item.outstanding) }), { label, totalIncome: 0, paid: 0, outstanding: 0 }));
  const customerGrowth = summary.customerGrowth.map((item) => ({ ...item, current: Number(item.current), previous: Number(item.previous) }));
  const vertical = ['customerIncome', 'customerDebt', 'customerPayments'].includes(chart);
  const source = chart === 'customerIncome' || chart === 'customerDebt' || chart === 'customerPayments' ? customers : chart === 'aging' ? aging : chart === 'paymentTrend' ? payments : trend;

  if (chart === 'status' || chart === 'collection') {
    const data = chart === 'status' ? statuses : collection;
    return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey={chart === 'status' ? 'count' : 'value'} nameKey="label" innerRadius="48%" outerRadius="75%" paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />)}</Pie><ChartTooltip formatter={(value) => chart === 'status' ? [`${value} invoices`, 'Count'] : [money(value), 'Amount']} /><Legend /></PieChart></ResponsiveContainer>;
  }

  if (chart === 'customerRevenueTime' || chart === 'customerShareTime') {
    const isShare = chart === 'customerShareTime';
    return <ResponsiveContainer width="100%" height="100%"><LineChart data={isShare ? customerShare : customerTimeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => isShare ? `${v}%` : `${Math.round(v / 1000)}k`} /><ChartTooltip formatter={(value) => isShare ? [`${Number(value).toFixed(2)}%`, 'Share'] : money(value)} /><Legend />{timelineCustomers.map((customer, index) => <Line key={customer} type="monotone" dataKey={customer} name={customer} stroke={COLORS[index % COLORS.length]} strokeWidth={2} connectNulls />)}</LineChart></ResponsiveContainer>;
  }

  if (chart === 'customerFinancialTime') {
    return <ResponsiveContainer width="100%" height="100%"><LineChart data={customerFinancial}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><ChartTooltip formatter={(value) => money(value)} /><Legend /><Line type="monotone" dataKey="totalIncome" name="Total income" stroke="#4361ee" strokeWidth={2} /><Line type="monotone" dataKey="paid" name="Paid" stroke="#2a9d8f" strokeWidth={2} /><Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f4a261" strokeWidth={2} /></LineChart></ResponsiveContainer>;
  }

  if (chart === 'customerGrowth') {
    return <ResponsiveContainer width="100%" height="100%"><BarChart data={customerGrowth} layout="vertical" margin={{ left: 25 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><YAxis type="category" dataKey="label" width={115} /><ChartTooltip formatter={(value) => money(value)} /><Legend /><Bar dataKey="previous" name="Previous period" fill="#a8b2d1" /><Bar dataKey="current" name="Current period" fill="#4361ee" /></BarChart></ResponsiveContainer>;
  }

  return <ResponsiveContainer width="100%" height="100%"><BarChart data={source} layout={vertical ? 'vertical' : 'horizontal'} margin={vertical ? { left: 25 } : undefined}><CartesianGrid strokeDasharray="3 3" vertical={!vertical} horizontal={vertical} />{vertical ? <><XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><YAxis type="category" dataKey="label" width={115} /></> : <><XAxis dataKey="label" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /></>}<ChartTooltip formatter={(value) => money(value)} /><Legend />
    {chart === 'trend' && <><Bar dataKey="totalIncome" name="Total income" fill="#4361ee" /><Bar dataKey="paid" name="Paid" fill="#2a9d8f" /><Bar dataKey="outstanding" name="Outstanding" fill="#f4a261" /></>}
    {chart === 'customerIncome' && <><Bar dataKey="totalIncome" name="Total income" fill="#4361ee" /><Bar dataKey="paid" name="Paid" fill="#2a9d8f" /></>}
    {chart === 'customerDebt' && <><Bar dataKey="outstanding" name="Outstanding" fill="#f4a261" /><Bar dataKey="overdue" name="Overdue" fill="#e76f51" /></>}
    {chart === 'aging' && <Bar dataKey="value" name="Outstanding" fill="#e76f51" />}
    {chart === 'paymentTrend' && <Bar dataKey="paid" name="Paid" fill="#2a9d8f" />}
    {chart === 'customerPayments' && <Bar dataKey="paid" name="Paid" fill="#2a9d8f" />}
  </BarChart></ResponsiveContainer>;
}

function ChartCard({ chart, summary, onExpand }: { chart: ChartKey; summary: ReceivablesSummary; onExpand: () => void }) {
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}><Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}><Typography variant="subtitle2" fontWeight={600}>{chartTitles[chart]}</Typography><Tooltip title="View larger"><IconButton size="small" onClick={onExpand}><OpenInFullOutlinedIcon fontSize="small" /></IconButton></Tooltip></Stack><Box height={225}><ChartContent chart={chart} summary={summary} /></Box></Paper>;
}

export function InvoiceCharts({ summary }: { summary?: ReceivablesSummary }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [expanded, setExpanded] = useState<ChartKey | null>(null);
  const charts: Record<TabKey, ChartKey[]> = {
    overview: ['trend', 'status', 'collection'],
    customers: ['customerRevenueTime', 'customerFinancialTime', 'customerGrowth', 'customerShareTime', 'customerIncome', 'customerDebt'],
    receivables: ['aging', 'customerDebt', 'status'],
    payments: ['paymentTrend', 'customerPayments', 'collection'],
  };

  if (!summary?.invoiceCount) return <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}><Typography color="text.secondary">No chart data for the selected filters.</Typography></Paper>;

  return <Stack spacing={2}>
    <Paper variant="outlined" sx={{ px: 1, borderRadius: 2 }}><Tabs value={tab} onChange={(_event, value: TabKey) => setTab(value)} variant="scrollable" scrollButtons="auto"><Tab value="overview" label="Overview" /><Tab value="customers" label="Customers" /><Tab value="receivables" label="Receivables" /><Tab value="payments" label="Payments" /></Tabs></Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>{charts[tab].map((chart) => <ChartCard key={chart} chart={chart} summary={summary} onExpand={() => setExpanded(chart)} />)}</Box>
    <Dialog open={!!expanded} onClose={() => setExpanded(null)} fullWidth maxWidth="lg"><DialogTitle sx={{ pr: 6 }}>{expanded ? chartTitles[expanded] : ''}<IconButton onClick={() => setExpanded(null)} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton></DialogTitle><DialogContent dividers><Box height={{ xs: 380, md: 520 }}>{expanded && <ChartContent chart={expanded} summary={summary} />}</Box></DialogContent></Dialog>
  </Stack>;
}
