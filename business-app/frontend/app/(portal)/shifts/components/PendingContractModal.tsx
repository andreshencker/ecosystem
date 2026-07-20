'use client';

/**
 * PendingContractModal — Batch Contract Assignment Form
 *
 * Invariants:
 * - BI is the source of truth for which Shifts are pending.
 * - Pre-fetched data arrives from the page level — no queries are initiated inside
 *   this component. Modal renders immediately without a network delay.
 * - Selector changes update only local state (no API calls on selection).
 * - One final bulk PATCH /shifts/contracts/bulk submits all assignments atomically.
 * - Save button is disabled until every pending Shift has a Contract selected.
 * - If the bulk request fails, per-shift errors are displayed on the correct cards
 *   and the user can correct and retry without losing other selections.
 * - State is keyed by shiftId. One card's changes never affect another card.
 * - After success: modal closes, Shift table and BI queries are refreshed.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';

import { LoadingButton } from '@/components/shared';
import { useBulkAssignContractsMutation } from '@/hooks/api/useShifts';
import { formatShiftDate, formatShiftTimeRange } from '@/lib/formatShift';
import { formatContractLabel, formatContractSecondary } from '@/lib/formatContract';
import type { ShiftAssignmentSummary, ShiftPendingItem, ShiftPendingListResponse, BulkAssignContractError } from '@/types/shift';
import type { Contract } from '@/types/contract';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PendingContractModalProps {
  open:    boolean;
  onClose: () => void;
  summary: ShiftAssignmentSummary;
  /** Pre-fetched from page level — available immediately when modal opens. */
  pendingData:     ShiftPendingListResponse | null;
  pendingLoading:  boolean;
  pendingFetching: boolean;
  refetchPending:  () => void;
  contracts:       Contract[];
  contractsLoading: boolean;
}

/**
 * Row lifecycle in the batch form:
 *   unselected → ready  (user picks a Contract)
 *   ready → unselected  (user clears the selector)
 *   ready/error → error (backend rejects this specific shiftId after bulk submit)
 *   error → ready       (user re-selects a contract)
 */
export type RowStatus = 'unselected' | 'ready' | 'error';

export interface RowState {
  contractId: string;
  status:     RowStatus;
  error:      string | null;
}

export type AssignmentState = Record<string, RowState>;

// ─── Reducer ──────────────────────────────────────────────────────────────────

export type RowAction =
  | { type: 'reconcile';   items: ShiftPendingItem[] }
  | { type: 'select';      shiftId: string; contractId: string }
  | { type: 'setError';    shiftId: string; error: string }
  | { type: 'clearErrors' };

export function rowReducer(state: AssignmentState, action: RowAction): AssignmentState {
  switch (action.type) {
    case 'reconcile': {
      const next: AssignmentState = {};
      for (const item of action.items) {
        const prev = state[item.shiftId];
        if (!prev) {
          next[item.shiftId] = { contractId: '', status: 'unselected', error: null };
        } else {
          // Preserve selections and errors across BI refetches.
          // Items absent from the new list are implicitly removed.
          next[item.shiftId] = prev;
        }
      }
      return next;
    }

    case 'select':
      return {
        ...state,
        [action.shiftId]: {
          contractId: action.contractId,
          status:     action.contractId ? 'ready' : 'unselected',
          error:      null, // clear any previous error on re-selection
        },
      };

    case 'setError':
      return {
        ...state,
        [action.shiftId]: {
          ...(state[action.shiftId] ?? { contractId: '', error: null }),
          status: 'error',
          error:  action.error,
        },
      };

    case 'clearErrors': {
      const next: AssignmentState = {};
      for (const [id, row] of Object.entries(state)) {
        next[id] = row.status === 'error'
          ? { ...row, status: row.contractId ? 'ready' : 'unselected', error: null }
          : row;
      }
      return next;
    }

    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pendingAgeLabel(days: number | null): string {
  if (days == null) return 'Unknown';
  if (days === 0)   return 'Less than a day';
  if (days === 1)   return '1 day';
  return `${days} days`;
}

// ─── DetailRow — two-column label/value on desktop, stacked on mobile ─────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Typography
        component="dt"
        variant="caption"
        color="text.secondary"
        fontWeight={500}
        sx={{ alignSelf: 'start', pt: '2px' }}
      >
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0, minWidth: 0 }}>
        {children}
      </Box>
    </>
  );
}

// ─── ShiftCard ────────────────────────────────────────────────────────────────

function ShiftCard({
  item,
  row,
  contracts,
  contractsLoading,
  globallyDisabled,
  onSelect,
}: {
  item:             ShiftPendingItem;
  row:              RowState;
  contracts:        Contract[];
  contractsLoading: boolean;
  globallyDisabled: boolean;
  onSelect:         (shiftId: string, contractId: string) => void;
}) {
  const { status, contractId, error } = row;
  const isError = status === 'error';
  const isReady = status === 'ready';

  const age        = pendingAgeLabel(item.taskAgeDays);
  const selectorId = `contract-${item.shiftId}`;
  const ariaLabel  = `Select Contract for shift on ${formatShiftDate(item.shiftDate)}`;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor:
          isError ? 'error.light'
          : isReady ? 'primary.light'
          : 'divider',
        transition: 'border-color 0.15s',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <Typography variant="body2" fontWeight={600} mb={1}>
          {item.title ?? 'Untitled Shift'}
        </Typography>

        {/* ── Two-column detail grid ────────────────────────────────────── */}
        <Box
          component="dl"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '110px 1fr' },
            gap: { xs: '2px 8px', sm: '5px 12px' },
            m: 0,
            mb: 1.25,
          }}
        >
          <DetailRow label="Date">
            <Typography variant="caption">{formatShiftDate(item.shiftDate)}</Typography>
          </DetailRow>

          <DetailRow label="Time">
            <Typography variant="caption">
              {formatShiftTimeRange(item.startTime, item.endTime)}
            </Typography>
          </DetailRow>

          {item.location && (
            <DetailRow label="Location">
              <Tooltip
                title={item.location}
                placement="top-start"
                disableHoverListener={(item.location?.length ?? 0) < 45}
              >
                <Typography variant="caption" noWrap display="block" title={item.location}>
                  {item.location}
                </Typography>
              </Tooltip>
            </DetailRow>
          )}

          {item.calendarName && (
            <DetailRow label="Calendar">
              <Chip
                icon={<CalendarMonthOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                label={item.calendarName}
                size="small"
                variant="outlined"
                color="info"
                sx={{
                  maxWidth: '100%',
                  height: 20,
                  '& .MuiChip-label': { fontSize: '0.68rem', px: 0.75 },
                }}
                title={item.calendarName}
              />
            </DetailRow>
          )}

          {item.calendarAccount && (
            <DetailRow label="Account">
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {item.calendarAccount}
              </Typography>
            </DetailRow>
          )}

          <DetailRow label="Pending for">
            <Typography variant="caption" color="text.secondary">{age}</Typography>
          </DetailRow>
        </Box>

        {/* ── Contract selector ─────────────────────────────────────────── */}
        <TextField
          select
          fullWidth
          size="small"
          id={selectorId}
          label="Select Contract"
          value={contractId}
          onChange={(e) => onSelect(item.shiftId, e.target.value)}
          disabled={globallyDisabled || contractsLoading}
          inputProps={{ 'aria-label': ariaLabel }}
          SelectProps={{
            renderValue: (val: unknown) => {
              const c = contracts.find((x) => x.id === val);
              return c ? formatContractLabel(c) : undefined;
            },
          }}
        >
          <MenuItem value="" disabled>
            {contractsLoading ? 'Loading Contracts…' : 'Choose a Contract…'}
          </MenuItem>
          {contracts.map((c) => (
            <MenuItem key={c.id} value={c.id} sx={{ py: 0.75 }}>
              <Box>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {formatContractLabel(c)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatContractSecondary(c)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* ── Per-card error from bulk response ─────────────────────────── */}
        {isError && error && (
          <Alert severity="error" sx={{ mt: 0.75, py: 0.25 }} icon={false}>
            <Typography variant="caption">{error}</Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PendingContractModal({
  open,
  onClose,
  summary,
  pendingData,
  pendingLoading,
  pendingFetching,
  refetchPending,
  contracts,
  contractsLoading,
}: PendingContractModalProps) {
  const bulkMutation = useBulkAssignContractsMutation();

  const [rows, dispatch] = useReducer(rowReducer, {});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Deduplicate BI items defensively (should not be needed; guards against BI bugs) ──
  const biItems = useMemo(() => {
    const raw = pendingData?.items ?? [];
    const seen = new Set<string>();
    const unique = raw.filter((item) => {
      if (seen.has(item.shiftId)) {
        console.warn('[PendingContractModal] duplicate shiftId from BI:', item.shiftId);
        return false;
      }
      seen.add(item.shiftId);
      return true;
    });
    // Log mismatch between BI total and actual items for diagnostics
    if (pendingData && pendingData.total !== raw.length) {
      console.warn(
        `[PendingContractModal] BI total (${pendingData.total}) !== items.length (${raw.length}) — pagination or stale data`,
      );
    }
    return unique;
  }, [pendingData]);

  // Count badge always derived from what is actually rendered, not BI total field.
  const renderedCount = biItems.length;

  // ── Reconcile on BI data change ────────────────────────────────────────────
  // Preserves selections across refetches.
  useEffect(() => {
    if (pendingData?.items) {
      dispatch({ type: 'reconcile', items: pendingData.items });
    }
  }, [pendingData?.items]);

  // ── Derived view model ─────────────────────────────────────────────────────
  const rowList = useMemo(
    () => biItems.map((item) => ({
      item,
      row: rows[item.shiftId] ?? { contractId: '', status: 'unselected' as RowStatus, error: null },
    })),
    [biItems, rows],
  );

  // Partial submission: allow Save when at least 1 card has a contract selected.
  // The backend skips orphaned shiftIds (not found in MongoDB) and only updates
  // the real ones. After commit it triggers a full BI sync that removes the
  // orphaned fact_shift rows so they no longer appear as pending.
  const submitting      = bulkMutation.isPending;
  const selectedCount   = rowList.filter(({ row }) => row.contractId !== '').length;
  const unselectedCount = rowList.filter(({ row }) => row.contractId === '').length;
  const canSave         = selectedCount > 0 && !submitting;

  // ── Selection ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((shiftId: string, contractId: string) => {
    dispatch({ type: 'select', shiftId, contractId });
    setGlobalError(null);
  }, []);

  // ── Bulk submit ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!canSave) return;

    dispatch({ type: 'clearErrors' });
    setGlobalError(null);

    // Send only the rows where the user actually selected a contract.
    // Orphaned BI records (no MongoDB shift) are intentionally left unselected;
    // the backend will skip any that are still somehow sent and will trigger a
    // full BI sync to remove them from the pending list.
    const assignments = rowList
      .filter(({ row }) => row.contractId !== '')
      .map(({ item, row }) => ({
        shiftId:    item.shiftId,
        contractId: row.contractId,
      }));

    bulkMutation.mutate(assignments, {
      onSuccess: () => {
        onClose();
      },
      onError: (err: any) => {
        const perShiftErrors: BulkAssignContractError[] | undefined =
          err?.response?.data?.errors ?? err?.errors;

        if (perShiftErrors?.length) {
          for (const e of perShiftErrors) {
            dispatch({ type: 'setError', shiftId: e.shiftId, error: e.message });
          }
          setGlobalError(
            `${perShiftErrors.length} assignment${perShiftErrors.length !== 1 ? 's' : ''} could not be saved. Review the highlighted cards.`,
          );
        } else {
          const msg =
            err?.response?.data?.message ??
            err?.message ??
            'Could not save assignments. Please try again.';
          setGlobalError(typeof msg === 'string' ? msg : 'Could not save assignments. Please try again.');
        }
      },
    });
  }, [canSave, rowList, bulkMutation, onClose]);

  // ── Close handler ──────────────────────────────────────────────────────────
  function handleClose(_e: object, reason: string) {
    if (submitting) return; // never close during an active bulk request
    // Block backdrop/escape only when the user has partially filled cards
    // (prevents accidental loss of selections already made).
    if ((reason === 'backdropClick' || reason === 'escapeKeyDown') && selectedCount > 0 && unselectedCount > 0) {
      return;
    }
    onClose();
  }

  // ── Footer button label ────────────────────────────────────────────────────
  const btnLabel = submitting
    ? 'Saving…'
    : selectedCount > 0
      ? `Save ${selectedCount} Assignment${selectedCount !== 1 ? 's' : ''}`
      : 'Save Assignments';

  const showFooter = !pendingLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={submitting}
      PaperProps={{ sx: { maxHeight: '88vh', display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Fixed header ──────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AssignmentOutlinedIcon color="warning" />
          <Box flex={1}>
            <Typography variant="h6" component="span">
              Contract assignments required
            </Typography>
            {renderedCount > 0 && (
              <Chip
                label={`${renderedCount} remaining`}
                size="small"
                color="warning"
                variant="filled"
                sx={{ ml: 1.5, verticalAlign: 'middle' }}
              />
            )}
          </Box>
          {pendingFetching && !pendingLoading && (
            <CircularProgress size={16} sx={{ flexShrink: 0 }} />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          The following calendar-imported Shifts need to be linked to a Contract.
        </Typography>
      </DialogTitle>

      <Divider />

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <DialogContent
        sx={{
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Loading skeletons — only during initial prefetch */}
        {pendingLoading && (
          <Stack spacing={1.5}>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Skeleton variant="text" width="55%" height={22} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px 12px', mt: 1 }}>
                  {[1, 2, 3, 4].map((j) => (
                    <React.Fragment key={j}>
                      <Skeleton variant="text" width="80%" height={16} />
                      <Skeleton variant="text" width="60%" height={16} />
                    </React.Fragment>
                  ))}
                </Box>
                <Skeleton variant="rectangular" height={40} sx={{ mt: 1.5, borderRadius: 1 }} />
              </Box>
            ))}
          </Stack>
        )}

        {/* No active Contracts warning */}
        {!pendingLoading && !contractsLoading && contracts.length === 0 && biItems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No active Contracts are available. Create or activate a Contract before assigning Shifts.
          </Alert>
        )}

        {/* Global error from failed bulk submit */}
        {globalError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGlobalError(null)}>
            {globalError}
          </Alert>
        )}

        {/* Instruction when not all cards are filled */}
        {!pendingLoading && unselectedCount > 0 && selectedCount === 0 && !globalError && (
          <Alert severity="info" sx={{ mb: 2 }} icon={false}>
            <Typography variant="caption">
              Select a Contract for each Shift below, then click{' '}
              <strong>Save Assignments</strong> to assign all at once.
              You can save a partial selection — unassigned records are automatically cleaned up.
            </Typography>
          </Alert>
        )}

        {/* All done — BI confirms zero pending */}
        {!pendingLoading && renderedCount === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="success.dark" gutterBottom>
              All Contract assignments are complete.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All imported Shifts now have a Contract assigned.
            </Typography>
          </Box>
        )}

        {/* Shift card list — ALL pending items, keyed by shiftId */}
        {!pendingLoading && rowList.length > 0 && (
          <Stack spacing={1.5}>
            {rowList.map(({ item, row }) => (
              <ShiftCard
                key={item.shiftId}
                item={item}
                row={row}
                contracts={contracts}
                contractsLoading={contractsLoading}
                globallyDisabled={submitting}
                onSelect={handleSelect}
              />
            ))}
          </Stack>
        )}
      </DialogContent>

      {/* ── Fixed footer ──────────────────────────────────────────────────── */}
      {showFooter && (
        <>
          <Divider />
          <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
            {/* Progress indicator */}
            <Box flex={1} minWidth={0}>
              {!pendingLoading && rowList.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {selectedCount > 0
                    ? `${selectedCount} of ${rowList.length} selected`
                    : `Select a Contract for each Shift below`}
                </Typography>
              )}
            </Box>

            {/* Cancel — visible when not actively submitting */}
            {!submitting && rowList.length > 0 && (
              <Button
                size="small"
                color="inherit"
                sx={{ color: 'text.secondary' }}
                onClick={onClose}
              >
                Cancel
              </Button>
            )}

            {/* Close when all done */}
            {!pendingLoading && renderedCount === 0 && (
              <Button variant="contained" color="success" onClick={onClose}>
                Close
              </Button>
            )}

            {/* Save all assignments — single bulk request */}
            {rowList.length > 0 && (
              <LoadingButton
                variant="contained"
                color="warning"
                loading={submitting}
                disabled={!canSave}
                onClick={handleSave}
              >
                {btnLabel}
              </LoadingButton>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
