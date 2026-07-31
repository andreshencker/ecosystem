'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useRouter } from 'next/navigation';

import type {
  PendingInvoiceGroup,
  PendingShiftCalculation,
  ShiftCalcStatus,
} from '@/types/invoice';
import { formatCurrency, formatHours, formatDate, formatTimeRange } from '../lib/format';

// ─── Shift status chip ────────────────────────────────────────────────────────

const CALC_STATUS_COLORS: Record<ShiftCalcStatus, 'success' | 'warning' | 'error'> = {
  ok:      'success',
  warning: 'warning',
  error:   'error',
};

function CalcStatusChip({ status, note }: { status: ShiftCalcStatus; note: string | null }) {
  const label = status === 'ok' ? 'OK' : status.charAt(0).toUpperCase() + status.slice(1);
  const chip = <Chip label={label} color={CALC_STATUS_COLORS[status]} size="small" />;
  if (note) {
    return <Tooltip title={note}>{chip}</Tooltip>;
  }
  return chip;
}

// ─── Shift detail table ───────────────────────────────────────────────────────

function ShiftDetailTable({ rows }: { rows: PendingShiftCalculation[] }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            {[
              'Date', 'Description', 'Start', 'End', 'Break Taken',
              'Applied Break', 'Gross Hrs', 'Worked Hrs',
              'Rate', 'Amount', 'Status',
            ].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.shiftId}
              sx={{
                bgcolor: row.calculationStatus === 'error'
                  ? 'error.50'
                  : row.calculationStatus === 'warning'
                  ? 'warning.50'
                  : undefined,
              }}
            >
              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                {formatDate(row.workDate)}
              </TableCell>
              <TableCell sx={{ maxWidth: 160, fontSize: '0.75rem' }}>
                <Typography variant="caption" noWrap title={row.description ?? undefined}>
                  {row.description || '—'}
                </Typography>
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>{row.startTime ?? '—'}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                {row.endDate && row.endDate !== row.workDate
                  ? `${row.endTime} (+1)`
                  : (row.endTime ?? '—')}
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>{row.breakTaken ? 'Yes' : 'No'}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>{row.appliedBreakMinutes} min</TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>{formatHours(row.grossDurationHours)}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{formatHours(row.workedHours)}</TableCell>
              <TableCell sx={{ fontSize: '0.75rem' }}>
                {formatCurrency(row.appliedRate, row.currency)}/h
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                {formatCurrency(row.amount, row.currency)}
              </TableCell>
              <TableCell>
                <CalcStatusChip status={row.calculationStatus} note={row.calculationNote} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Stack>
  );
}

// ─── ReviewDrawer ─────────────────────────────────────────────────────────────

interface ReviewDrawerProps {
  group: PendingInvoiceGroup | null;
  open: boolean;
  onClose: () => void;
}

export function ReviewDrawer({ group, open, onClose }: ReviewDrawerProps) {
  const router = useRouter();

  if (!group) return null;

  const hasErrors   = group.errors.length > 0;
  const hasWarnings = group.warnings.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 860 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>Review Calculation</Typography>
          <Typography variant="body2" color="text.secondary">
            {group.customerName} · {group.contractTitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* ── Scrollable body ───────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>

        {/* Invoice summary ──────────────────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
          <Box flex={1}>
            <Typography variant="overline" color="text.secondary">Customer</Typography>
            <Typography variant="body1" fontWeight={600}>{group.customerName}</Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="overline" color="text.secondary">Billing Period</Typography>
            <Typography variant="body1">
              {formatDate(group.periodStart)} – {formatDate(group.periodEnd)}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="overline" color="text.secondary">Billing Cycle</Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
              {group.billingCycle.replace('_', ' ')}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="overline" color="text.secondary">Currency</Typography>
            <Typography variant="body1">{group.currency}</Typography>
          </Box>
        </Stack>

        {/* Totals ───────────────────────────────────────────────────────────── */}
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 2, mb: 3, maxWidth: 340 }}>
          <SummaryRow label="Worked Hours" value={formatHours(group.totalWorkedHours)} />
          <SummaryRow label="Subtotal"     value={formatCurrency(group.subtotal, group.currency)} />
          {group.taxRate && (
            <SummaryRow label={`Tax (${group.taxRate}%)`} value={formatCurrency(group.taxAmount, group.currency)} />
          )}
          <Divider sx={{ my: 1 }} />
          <SummaryRow label="Total" value={formatCurrency(group.total, group.currency)} bold />
        </Box>

        {/* Errors / warnings ───────────────────────────────────────────────── */}
        {hasErrors && (
          <Box sx={{ bgcolor: 'error.50', border: 1, borderColor: 'error.200', borderRadius: 1, p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WarningAmberOutlinedIcon color="error" fontSize="small" />
              <Typography variant="subtitle2" color="error.main">Blocking issues</Typography>
            </Stack>
            {group.errors.map((e, i) => (
              <Typography key={i} variant="body2" color="error.main">• {e}</Typography>
            ))}
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => router.push('/shifts')}
              >
                Go to Shifts
              </Button>
            </Box>
          </Box>
        )}

        {hasWarnings && !hasErrors && (
          <Box sx={{ bgcolor: 'warning.50', border: 1, borderColor: 'warning.200', borderRadius: 1, p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <WarningAmberOutlinedIcon color="warning" fontSize="small" />
              <Typography variant="subtitle2" color="warning.main">Warnings</Typography>
            </Stack>
            {group.warnings.map((w, i) => (
              <Typography key={i} variant="body2" color="warning.main">• {w}</Typography>
            ))}
          </Box>
        )}

        {/* Shift detail table ──────────────────────────────────────────────── */}
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Shift Breakdown ({group.shiftCount} shift{group.shiftCount !== 1 ? 's' : ''})
        </Typography>
        <ShiftDetailTable rows={group.shiftDetails} />
      </Box>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      {hasErrors && (
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => router.push('/shifts')}
          >
            Go to Shifts to fix issues
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
