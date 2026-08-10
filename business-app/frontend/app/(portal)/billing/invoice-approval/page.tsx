'use client';

import { useEffect, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState, FormDrawer, LoadingButton } from '@/components/shared';
import {
  useAddInvoiceConceptMutation,
  useApproveInvoiceMutation,
  useDeleteInvoiceConceptMutation,
  usePendingInvoiceGroups,
} from '@/hooks/api/useInvoices';
import type { PendingInvoiceGroup } from '@/types/invoice';
import { formatCurrency, formatDate, formatHours, formatPeriod } from './lib/format';

function InfoCard({ icon, label, value, secondary }: { icon: ReactNode; label: string; value: string; secondary?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: '1 1 230px', minWidth: 0 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ color: 'primary.main', display: 'flex', mt: 0.25 }}>{icon}</Box>
        <Box minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.04em">
            {label}
          </Typography>
          <Typography variant="body1" fontWeight={600} noWrap title={value}>{value}</Typography>
          {secondary && <Typography variant="body2" color="text.secondary" noWrap title={secondary}>{secondary}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

export default function InvoiceReviewPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = usePendingInvoiceGroups();
  const approve = useApproveInvoiceMutation();
  const addConcept = useAddInvoiceConceptMutation();
  const deleteConcept = useDeleteInvoiceConceptMutation();
  const groups = data?.groups ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [date, setDate] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!groups.length) setSelectedId('');
    else if (!groups.some((group) => group.groupId === selectedId)) setSelectedId(groups[0].groupId);
  }, [groups, selectedId]);

  const selected = groups.find((group) => group.groupId === selectedId) ?? null;

  function submitConcept() {
    if (!selected || !date || !concept.trim() || !amount) return;
    addConcept.mutate(
      { groupId: selected.groupId, date, concept: concept.trim(), amount },
      { onSuccess: () => { setDrawerOpen(false); setDate(''); setConcept(''); setAmount(''); } },
    );
  }

  function approveInvoice(group: PendingInvoiceGroup) {
    approve.mutate({
      groupId: group.groupId,
      customerId: group.customerId,
      contractId: group.contractId,
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
    });
  }

  return (
    <Box>
      <PageHeader
        title="Invoice Review"
        count={groups.length}
        subtitle="Review the live calculation before approval."
        actions={selected ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setDate(selected.periodEnd); setDrawerOpen(true); }}>
            Add Concept
          </Button>
        ) : undefined}
      />

      {isLoading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}
      {isError && !isLoading && (
        <ErrorState title="Could not load pending invoices" description={(error as Error)?.message ?? 'Try again.'} action={<Button onClick={() => refetch()}>Retry</Button>} />
      )}
      {!isLoading && !isError && !groups.length && (
        <EmptyState title="No invoices to review" description="Approved invoices disappear from this list automatically." />
      )}

      {selected && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <TextField
              select
              size="small"
              label="Customer and billing period"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              sx={{ width: { xs: '100%', sm: 540 } }}
            >
              {groups.map((group) => (
                <MenuItem key={group.groupId} value={group.groupId}>
                  {group.customerName} — {formatPeriod(group.periodStart, group.periodEnd)}
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <InfoCard
              icon={<BusinessOutlinedIcon fontSize="small" />}
              label="Customer"
              value={selected.customerName}
              secondary={[selected.customerEmail, selected.customerPhone].filter(Boolean).join(' · ') || 'No contact details'}
            />
            <InfoCard
              icon={<CalendarMonthOutlinedIcon fontSize="small" />}
              label="Billing period"
              value={formatPeriod(selected.periodStart, selected.periodEnd)}
            />
            <InfoCard
              icon={<EventAvailableOutlinedIcon fontSize="small" />}
              label="Due date"
              value={selected.dueDate ? formatDate(selected.dueDate) : 'Not configured'}
            />
            <InfoCard
              icon={<ArticleOutlinedIcon fontSize="small" />}
              label="Contract"
              value={selected.contractTitle}
              secondary={selected.currency}
            />
            <InfoCard
              icon={<ReceiptLongOutlinedIcon fontSize="small" />}
              label="Invoice number"
              value={selected.invoiceNumber}
              secondary="Assigned when approved"
            />
          </Stack>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table sx={{ '& th': { color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', bgcolor: 'background.default' }, '& td': { fontSize: '0.875rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell><TableCell>Concept</TableCell><TableCell>Start time</TableCell><TableCell>End time</TableCell>
                  <TableCell align="right">Worked hours</TableCell><TableCell align="right">Rate</TableCell><TableCell align="right">Balance</TableCell><TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {selected.shiftDetails.map((row) => (
                  <TableRow key={row.shiftId}>
                    <TableCell>{formatDate(row.workDate)}</TableCell>
                    <TableCell>{row.description || selected.contractTitle}</TableCell>
                    <TableCell>{row.startTime ?? '—'}</TableCell>
                    <TableCell>{row.endTime ?? '—'}</TableCell>
                    <TableCell align="right">{formatHours(row.billableHours)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.appliedRate, row.currency)}/h</TableCell>
                    <TableCell align="right">{formatCurrency(row.amount, row.currency)}</TableCell><TableCell />
                  </TableRow>
                ))}
                {selected.additionalConcepts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.date)}</TableCell><TableCell>{row.concept}</TableCell><TableCell>—</TableCell><TableCell>—</TableCell>
                    <TableCell align="right">—</TableCell><TableCell align="right">—</TableCell>
                    <TableCell align="right">{formatCurrency(row.amount, selected.currency)}</TableCell>
                    <TableCell><IconButton size="small" aria-label="Remove concept" onClick={() => deleteConcept.mutate(row.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" alignItems={{ sm: 'flex-end' }} gap={2}>
            <Paper variant="outlined" sx={{ minWidth: { xs: '100%', sm: 340 }, p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between"><Typography>Subtotal</Typography><Typography>{formatCurrency(selected.subtotal, selected.currency)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography>GST</Typography><Typography>{formatCurrency(selected.taxAmount, selected.currency)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" mt={1}><Typography fontWeight={700}>Total</Typography><Typography fontWeight={700}>{formatCurrency(selected.total, selected.currency)}</Typography></Stack>
              <LoadingButton fullWidth sx={{ mt: 2 }} variant="contained" loading={approve.isPending} disabled={!selected.isApprovable || isFetching} onClick={() => approveInvoice(selected)}>Approve Invoice</LoadingButton>
            </Paper>
          </Stack>
        </Stack>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add Concept"
        actions={<><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><LoadingButton variant="contained" loading={addConcept.isPending} disabled={!date || !concept.trim() || !amount} onClick={submitConcept}>Add</LoadingButton></>}
      >
        <Stack spacing={2}>
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
          <TextField label="Concept" value={concept} onChange={(e) => setConcept(e.target.value)} required autoFocus />
          <TextField label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ min: 0, step: '0.01' }} required />
        </Stack>
      </FormDrawer>
    </Box>
  );
}
