'use client';

// Chart of Accounts — route: /accounting/chart-of-accounts
//
// Full CRUD for the canonical Accounting Chart of Accounts resource.
// Provider/connection context is managed by AccountingProvider (accounting/layout.tsx).
// No provider-specific branches in this file — all provider rules live in the backend adapter.

import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FormDrawer,
  LoadingButton,
  RowActions,
} from '@/components/shared';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import {
  useAccounts,
  useAccount,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useArchiveAccountMutation,
  useDeleteAccountMutation,
} from '@/hooks/api/useAccounting';
import { extractApiMessage } from '@/lib/mapApiError';
import type {
  AccountSummary,
  AccountDetail,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/types/accounting';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_KEY = 'chartOfAccounts';
const MAX_LIMIT      = 100;
const DEFAULT_PAGE_SIZE = 25;

// ─── Xero account type catalogue ─────────────────────────────────────────────
// These labels are canonical Chart of Accounts resource metadata.
// Provider-specific rendering rules live in the backend adapter.

const ACCOUNT_TYPE_OPTIONS = [
  { value: '',             label: 'All Types' },
  { value: 'BANK',         label: 'Bank' },
  { value: 'CURRENT',      label: 'Current Asset' },
  { value: 'CURRLIAB',     label: 'Current Liability' },
  { value: 'DEPRECIATN',   label: 'Depreciation' },
  { value: 'DIRECTCOSTS',  label: 'Direct Costs' },
  { value: 'EQUITY',       label: 'Equity' },
  { value: 'EXPENSE',      label: 'Expense' },
  { value: 'FIXED',        label: 'Fixed Asset' },
  { value: 'LIABILITY',    label: 'Liability' },
  { value: 'NONCURRENT',   label: 'Non-current Asset' },
  { value: 'OTHERINCOME',  label: 'Other Income' },
  { value: 'OVERHEADS',    label: 'Overhead' },
  { value: 'PREPAYMENT',   label: 'Prepayment' },
  { value: 'REVENUE',      label: 'Revenue' },
  { value: 'SALES',        label: 'Sales' },
  { value: 'TERMLIAB',     label: 'Term Liability' },
  { value: 'WAGETAX',      label: 'Wages Payable' },
];

// Create-form type options exclude the catch-all "All Types" entry.
const CREATE_TYPE_OPTIONS = ACCOUNT_TYPE_OPTIONS.filter((o) => o.value !== '');

// ─── Nature derivation ─────────────────────────────────────────────────────────
// Nature is a canonical derived field — never persisted.
// Derived from Class when available; otherwise inferred from Type.

type AccountNature = 'Debit' | 'Credit';

const CLASS_NATURE: Record<string, AccountNature> = {
  ASSET:    'Debit',
  EXPENSE:  'Debit',
  EQUITY:   'Credit',
  LIABILITY:'Credit',
  REVENUE:  'Credit',
};

const TYPE_NATURE: Record<string, AccountNature> = {
  BANK:        'Debit',
  CURRENT:     'Debit',
  DEPRECIATN:  'Debit',
  FIXED:       'Debit',
  NONCURRENT:  'Debit',
  PREPAYMENT:  'Debit',
  DIRECTCOSTS: 'Debit',
  EXPENSE:     'Debit',
  OVERHEADS:   'Debit',
  WAGETAX:     'Debit',
  EQUITY:      'Credit',
  CURRLIAB:    'Credit',
  LIABILITY:   'Credit',
  TERMLIAB:    'Credit',
  OTHERINCOME: 'Credit',
  REVENUE:     'Credit',
  SALES:       'Credit',
};

function deriveNature(account: Pick<AccountSummary, 'type' | 'class'>): AccountNature {
  if (account.class) {
    const n = CLASS_NATURE[account.class.toUpperCase()];
    if (n) return n;
  }
  return TYPE_NATURE[account.type?.toUpperCase()] ?? 'Debit';
}

function deriveTypeLabel(type?: string): string {
  if (!type) return '—';
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type.toUpperCase())?.label ?? type;
}

// ─── Summary row ──────────────────────────────────────────────────────────────

interface SummaryCounts {
  total: number; banks: number; revenue: number; expenses: number;
  assets: number; liabilities: number; equity: number;
}

function computeSummary(rows: AccountSummary[]): SummaryCounts {
  const s: SummaryCounts = { total: rows.length, banks: 0, revenue: 0, expenses: 0, assets: 0, liabilities: 0, equity: 0 };
  for (const row of rows) {
    const cls = row.class?.toUpperCase() ?? '';
    const t   = row.type?.toUpperCase() ?? '';
    if (cls === 'ASSET' || t === 'BANK' || t === 'CURRENT' || t === 'FIXED' || t === 'NONCURRENT' || t === 'DEPRECIATN' || t === 'PREPAYMENT') {
      if (t === 'BANK') { s.banks++; } else { s.assets++; }
    } else if (cls === 'EXPENSE' || t === 'EXPENSE' || t === 'DIRECTCOSTS' || t === 'OVERHEADS' || t === 'WAGETAX') {
      s.expenses++;
    } else if (cls === 'REVENUE' || t === 'REVENUE' || t === 'SALES' || t === 'OTHERINCOME') {
      s.revenue++;
    } else if (cls === 'LIABILITY' || t === 'LIABILITY' || t === 'CURRLIAB' || t === 'TERMLIAB') {
      s.liabilities++;
    } else if (cls === 'EQUITY' || t === 'EQUITY') {
      s.equity++;
    } else {
      s.assets++;
    }
  }
  return s;
}

function SummaryRow({ rows }: { rows: AccountSummary[] }) {
  const s = computeSummary(rows);
  const stats: { label: string; value: number; highlight?: boolean }[] = [
    { label: 'Total',       value: s.total,       highlight: true },
    { label: 'Banks',       value: s.banks },
    { label: 'Revenue',     value: s.revenue },
    { label: 'Expenses',    value: s.expenses },
    { label: 'Assets',      value: s.assets },
    { label: 'Liabilities', value: s.liabilities },
    { label: 'Equity',      value: s.equity },
  ];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
      {stats.map(({ label, value, highlight }) => (
        <Box
          key={label}
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 1,
            px: 1.5, py: 0.5, display: 'flex', alignItems: 'center',
            gap: 0.75, flexShrink: 0,
            bgcolor: highlight ? 'action.hover' : 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
          <Typography variant="body2" fontWeight={highlight ? 700 : 600} color={highlight ? 'text.primary' : 'text.secondary'}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function AccountDetailDrawer({
  credentialId, accountId, onClose, onEdit,
}: {
  credentialId: string; accountId: string;
  onClose: () => void; onEdit: (detail: AccountDetail) => void;
}) {
  const { data, isLoading, error } = useAccount(credentialId, accountId);
  const nature = data ? deriveNature(data) : null;

  return (
    <FormDrawer
      open onClose={onClose} title="Account Detail"
      actions={
        <Stack direction="row" spacing={1} width="100%">
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>Close</Button>
          {data && !data.systemAccount && (
            <Button variant="contained" onClick={() => data && onEdit(data)} sx={{ flex: 1 }}>
              Edit
            </Button>
          )}
        </Stack>
      }
    >
      {isLoading && <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>}
      {error && !isLoading && <Alert severity="error">{extractApiMessage(error, 'Could not load account detail.')}</Alert>}
      {data && !isLoading && (
        <Stack spacing={2}>
          <DetailRow label="Code"    value={data.code ?? '—'} />
          <DetailRow label="Account" value={data.name} />
          <DetailRow label="Type"    value={deriveTypeLabel(data.type)} />
          {data.class && <DetailRow label="Class" value={data.class} />}
          <DetailRow label="Nature"
            value={
              <Chip label={nature} size="small"
                color={nature === 'Debit' ? 'primary' : 'success'} variant="outlined" sx={{ height: 22 }} />
            }
          />
          <DetailRow label="Tax" value={data.taxType ?? '—'} />
          <Divider />
          <DetailRow label="Description" value={data.description ?? '—'} />
          <DetailRow label="Currency" value={data.currency?.toUpperCase() ?? '—'} />
          <DetailRow label="Status"
            value={<Chip label={data.status === 'active' ? 'Active' : 'Archived'}
              color={data.status === 'active' ? 'success' : 'default'} size="small"
              variant={data.status === 'active' ? 'filled' : 'outlined'} />}
          />
          <DetailRow label="System Account" value={data.systemAccount ? 'Yes' : 'No'} />
          <DetailRow label="Payments Enabled"
            value={data.paymentsEnabled !== undefined ? (data.paymentsEnabled ? 'Yes' : 'No') : '—'} />
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Account form (create + edit) ─────────────────────────────────────────────

interface AccountFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: AccountDetail;
  credentialId: string;
  onClose: () => void;
  onReauthorisationRequired?: () => void;
}

function AccountForm({ open, mode, initial, credentialId, onClose, onReauthorisationRequired }: AccountFormProps) {
  const isEdit = mode === 'edit';

  const [name,               setName]               = useState(initial?.name ?? '');
  const [code,               setCode]               = useState(initial?.code ?? '');
  const [type,               setType]               = useState(initial?.type ?? '');
  const [taxType,            setTaxType]            = useState(initial?.taxType ?? '');
  const [description,        setDescription]        = useState(initial?.description ?? '');
  const [currency,           setCurrency]           = useState(initial?.currency ?? '');
  const [paymentsEnabled,    setPaymentsEnabled]    = useState(initial?.paymentsEnabled ?? false);
  const [showInExpenseClaims, setShowInExpenseClaims] = useState(initial?.showInExpenseClaims ?? false);
  const [formError,          setFormError]          = useState('');

  const isBank = type.toUpperCase() === 'BANK';

  const createMutation = useCreateAccountMutation(credentialId);
  const updateMutation = useUpdateAccountMutation(credentialId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(async () => {
    setFormError('');
    if (!name.trim()) { setFormError('Account name is required.'); return; }
    if (!type)        { setFormError('Account type is required.'); return; }

    try {
      if (isEdit && initial) {
        const dto: UpdateAccountInput = {};
        if (code !== (initial.code ?? ''))                       dto.code               = code || undefined;
        if (name !== initial.name)                               dto.name               = name;
        if (taxType !== (initial.taxType ?? ''))                 dto.taxType            = taxType || undefined;
        if (!isBank && description !== (initial.description ?? '')) dto.description     = description || undefined;
        if (paymentsEnabled !== (initial.paymentsEnabled ?? false)) dto.paymentsEnabled = paymentsEnabled;
        if (!isBank && showInExpenseClaims !== (initial.showInExpenseClaims ?? false))
          dto.showInExpenseClaims = showInExpenseClaims;

        await updateMutation.mutateAsync({ accountId: initial.id, dto });
      } else {
        const dto: CreateAccountInput = { name, type };
        if (code)                      dto.code                = code;
        if (taxType)                   dto.taxType             = taxType;
        if (!isBank && description)    dto.description         = description;
        if (isBank && currency)        dto.currency            = currency;
        if (paymentsEnabled)           dto.paymentsEnabled     = true;
        if (!isBank && showInExpenseClaims) dto.showInExpenseClaims = true;

        await createMutation.mutateAsync(dto);
      }
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        onReauthorisationRequired?.();
        onClose();
      } else {
        setFormError(extractApiMessage(err, 'An error occurred. Please try again.'));
      }
    }
  }, [name, code, type, taxType, description, currency, paymentsEnabled, showInExpenseClaims,
      isEdit, isBank, initial, createMutation, updateMutation, onClose, onReauthorisationRequired]);

  return (
    <FormDrawer
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Account' : 'Add Account'}
      actions={
        <Stack direction="row" spacing={1} width="100%">
          <Button variant="outlined" onClick={onClose} disabled={isPending} sx={{ flex: 1 }}>Cancel</Button>
          <LoadingButton variant="contained" loading={isPending} onClick={handleSubmit} sx={{ flex: 1 }}>
            {isEdit ? 'Save Changes' : 'Create Account'}
          </LoadingButton>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {formError && <Alert severity="error">{formError}</Alert>}

        {/* Type — required; read-only in edit mode */}
        <TextField
          select label="Type *" size="small" fullWidth
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isEdit}
          helperText={isEdit ? 'Account type cannot be changed after creation.' : undefined}
        >
          {CREATE_TYPE_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>

        {/* Name */}
        <TextField
          label="Name *" size="small" fullWidth
          value={name} onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 150 }}
        />

        {/* Code */}
        <TextField
          label="Code" size="small" fullWidth
          value={code} onChange={(e) => setCode(e.target.value)}
          inputProps={{ maxLength: 10 }}
          helperText="Optional. Max 10 characters. Must be unique."
        />

        {/* Tax Type */}
        <TextField
          label="Tax Type" size="small" fullWidth
          value={taxType} onChange={(e) => setTaxType(e.target.value)}
          inputProps={{ maxLength: 50 }}
          helperText="e.g. INPUT, OUTPUT, NONE"
        />

        {/* Currency — BANK only */}
        {!isEdit && isBank && (
          <TextField
            label="Currency" size="small" fullWidth
            value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 3 }}
            helperText="ISO 4217 code (e.g. AUD, USD). Cannot be changed after creation."
          />
        )}

        {/* Description — not available for BANK accounts */}
        {!isBank && (
          <TextField
            label="Description" size="small" fullWidth multiline rows={2}
            value={description} onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 4000 }}
          />
        )}

        <Divider />

        {/* Payments Enabled */}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={paymentsEnabled}
              onChange={(e) => setPaymentsEnabled(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Enable payments to this account</Typography>}
        />

        {/* Show in Expense Claims — not for BANK accounts */}
        {!isBank && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={showInExpenseClaims}
                onChange={(e) => setShowInExpenseClaims(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Show in expense claims</Typography>}
          />
        )}
      </Stack>
    </FormDrawer>
  );
}

// ─── Table columns ─────────────────────────────────────────────────────────────

function buildColumns(
  onView:    (row: AccountSummary) => void,
  onEdit:    (row: AccountSummary) => void,
  onArchive: (row: AccountSummary) => void,
  onDelete:  (row: AccountSummary) => void,
): GridColDef<AccountSummary>[] {
  return [
    {
      field: 'code',
      headerName: 'Code',
      width: 90,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
          {(value as string) ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Account',
      flex: 2,
      minWidth: 160,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: ({ row }) => deriveTypeLabel(row.type),
    },
    {
      field: '_nature',
      headerName: 'Nature',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => {
        const n = deriveNature(row);
        return (
          <Chip label={n} size="small"
            color={n === 'Debit' ? 'primary' : 'success'} variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }} />
        );
      },
    },
    {
      field: 'taxType',
      headerName: 'Tax',
      width: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">{row.taxType ?? '—'}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value === 'active' ? 'Active' : 'Archived'}
          color={value === 'active' ? 'success' : 'default'}
          size="small"
          variant={value === 'active' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <RowActions>
          <Tooltip title="View / Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView(row); }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.systemAccount ? 'System accounts cannot be archived' : 'Archive'}>
            <span>
              <IconButton
                size="small"
                disabled={Boolean(row.systemAccount) || row.status === 'archived'}
                onClick={(e) => { e.stopPropagation(); onArchive(row); }}
              >
                <ArchiveOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={row.systemAccount ? 'System accounts cannot be deleted' : 'Delete'}>
            <span>
              <IconButton
                size="small" color="error"
                disabled={Boolean(row.systemAccount)}
                onClick={(e) => { e.stopPropagation(); onDelete(row); }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </RowActions>
      ),
    },
  ];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const {
    availableProviderOptions, providersLoading, providersError,
    selectedProviderId, setSelectedProviderId, resolvedProviderId, selectedProvider,
    resolvedProviderKey, capabilitiesLoading, getCapabilityStatus,
    availableConnections, connectionsLoading, connectionsError,
    selectedConnectionId, setSelectedConnectionId, resolvedConnectionId,
  } = useAccountingContext();

  // ── Filter state ────────────────────────────────────────────────────────────

  const [codeFilter,    setCodeFilter]    = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [natureFilter,  setNatureFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [page,         setPage]         = useState(0);
  const [pageSize,     setPageSize]     = useState(DEFAULT_PAGE_SIZE);

  // ── CRUD state ──────────────────────────────────────────────────────────────

  const [viewAccountId,    setViewAccountId]    = useState<string | null>(null);
  const [createOpen,       setCreateOpen]       = useState(false);
  const [editingDetail,    setEditingDetail]    = useState<AccountDetail | null>(null);
  const [archiveTarget,    setArchiveTarget]    = useState<AccountSummary | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<AccountSummary | null>(null);
  // Set to true when a write operation fails with HTTP 401 (missing write scope).
  // Cleared when the user dismisses the reconnect banner.
  const [reauthorisationNeeded, setReauthorisationNeeded] = useState(false);

  // ── Selection handlers ──────────────────────────────────────────────────────

  const handleProviderChange = useCallback((ccpId: string) => {
    setSelectedProviderId(ccpId);
    setPage(0); setViewAccountId(null);
    setTypeFilter(''); setNatureFilter(''); setCodeFilter(''); setAccountFilter('');
  }, [setSelectedProviderId]);

  const handleConnectionChange = useCallback((id: string) => {
    setSelectedConnectionId(id);
    setPage(0); setViewAccountId(null);
  }, [setSelectedConnectionId]);

  // ── Capability ──────────────────────────────────────────────────────────────

  const capabilityStatus = getCapabilityStatus(CAPABILITY_KEY);
  const coaEnabled = Boolean(resolvedConnectionId) && capabilityStatus === 'available';

  // ── Data ────────────────────────────────────────────────────────────────────

  const {
    data: rawData, isLoading: accountsLoading, error: accountsError, refetch,
  } = useAccounts(
    resolvedConnectionId || null,
    {
      limit:  MAX_LIMIT,
      type:   typeFilter || undefined,
      status: statusFilter,
    },
    { enabled: coaEnabled },
  );

  const allRows = useMemo<AccountSummary[]>(() => rawData?.data ?? [], [rawData]);

  // Client-side filters — applied in AND order over the server-fetched dataset.
  // Nature:  derived field (not a backend param).
  // Code:    partial numeric match — non-numeric chars in input are stripped before matching.
  // Account: case-insensitive partial name match.
  const filteredRows = useMemo(() => {
    let result = allRows;

    if (natureFilter) {
      result = result.filter((r) => deriveNature(r) === natureFilter);
    }

    if (codeFilter) {
      const numericOnly = codeFilter.replace(/\D/g, '');
      if (numericOnly) {
        result = result.filter(
          (r) => r.code != null && String(r.code).includes(numericOnly),
        );
      }
    }

    if (accountFilter) {
      const lower = accountFilter.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(lower));
    }

    return result;
  }, [allRows, natureFilter, codeFilter, accountFilter]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize],
  );

  // ── Mutations ───────────────────────────────────────────────────────────────

  const archiveMutation = useArchiveAccountMutation(resolvedConnectionId || null);
  const deleteMutation  = useDeleteAccountMutation(resolvedConnectionId || null);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      if (viewAccountId === archiveTarget.id) setViewAccountId(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setReauthorisationNeeded(true);
      }
    } finally {
      setArchiveTarget(null);
    }
  }, [archiveTarget, archiveMutation, viewAccountId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      if (viewAccountId === deleteTarget.id) setViewAccountId(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setReauthorisationNeeded(true);
      }
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, viewAccountId]);

  // ── Table columns (stable reference) ────────────────────────────────────────

  const columns = useMemo(
    () =>
      buildColumns(
        (row) => setViewAccountId(row.id),
        (row) => { setViewAccountId(null); setEditingDetail(row as AccountDetail); },
        (row) => setArchiveTarget(row),
        (row) => setDeleteTarget(row),
      ),
    [],
  );

  // ── Derived flags ────────────────────────────────────────────────────────────

  const noProviders =
    !providersLoading && !providersError && availableProviderOptions.length === 0;
  const noConnections =
    !connectionsLoading && !connectionsError &&
    Boolean(resolvedProviderId) && availableConnections.length === 0;

  const providerValue   = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';
  const showConnections = Boolean(resolvedProviderId) && availableConnections.length > 0;
  const hasFilters      = Boolean(typeFilter || natureFilter || codeFilter || accountFilter);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage and explore your accounting chart of accounts."
        actions={
          coaEnabled ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Add Account
            </Button>
          ) : undefined
        }
      />

      {/* ── Single fixed toolbar row ─────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1, mb: 1.5, borderRadius: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, alignItems: 'center', minWidth: 'max-content' }}>
          {/* Provider */}
          <TextField
            select label="Provider" size="small"
            value={providerValue}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={providersLoading || availableProviderOptions.length === 0}
            SelectProps={{ displayEmpty: true }}
            sx={{ width: 150 }}
          >
            {availableProviderOptions.length === 0 && (
              <MenuItem value="" disabled>{providersLoading ? 'Loading…' : 'None configured'}</MenuItem>
            )}
            {availableProviderOptions.map((p) => (
              <MenuItem key={p.ccpId} value={p.ccpId}>{p.displayName}</MenuItem>
            ))}
          </TextField>

          {/* Connection */}
          {showConnections && (
            <TextField select label="Connection" size="small"
              value={connectionValue}
              onChange={(e) => handleConnectionChange(e.target.value)}
              sx={{ width: 200 }}
            >
              {availableConnections.map((c) => (
                <MenuItem key={c.id} value={c.id}>{accountingConnectionLabel(c)}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Type — server-side */}
          <TextField
            select label="Type" size="small"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            disabled={!coaEnabled} sx={{ width: 145 }}
          >
            {ACCOUNT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          {/* Nature — client-side */}
          <TextField
            select label="Nature" size="small"
            value={natureFilter}
            onChange={(e) => { setNatureFilter(e.target.value); setPage(0); }}
            disabled={!coaEnabled} sx={{ width: 120 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Debit">Debit</MenuItem>
            <MenuItem value="Credit">Credit</MenuItem>
          </TextField>

          {/* Status — server-side */}
          <TextField
            select label="Status" size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(0); }}
            disabled={!coaEnabled} sx={{ width: 145 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>

          {/* Code — partial numeric match; non-numeric chars ignored */}
          <TextField
            size="small"
            placeholder="Code"
            value={codeFilter}
            onChange={(e) => { setCodeFilter(e.target.value); setPage(0); }}
            disabled={!coaEnabled}
            inputProps={{ inputMode: 'numeric', 'aria-label': 'Filter by account code' }}
            sx={{ width: 90 }}
          />

          {/* Account name — case-insensitive partial match */}
          <TextField
            size="small"
            placeholder="Account"
            value={accountFilter}
            onChange={(e) => { setAccountFilter(e.target.value); setPage(0); }}
            disabled={!coaEnabled}
            inputProps={{ 'aria-label': 'Filter by account name' }}
            sx={{ width: 180 }}
          />

          <Box sx={{ flexGrow: 1, minWidth: 8 }} />

          <Button
            size="small" variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => refetch()}
            disabled={!coaEnabled || accountsLoading}
            sx={{ flexShrink: 0 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* ── Provider / connection errors ─────────────────────────────────── */}
      {providersError && (
        <ErrorState title="Could not load accounting providers"
          description={extractApiMessage(providersError, 'Check your connection and try again.')} />
      )}
      {noProviders && !providersError && (
        <EmptyState icon={HubOutlinedIcon} title="No accounting providers configured"
          description="Enable Xero (or another accounting provider) for your company, then add OAuth credentials."
          action={<Button component={Link} href="/provider-credentials" variant="contained" startIcon={<HubOutlinedIcon />}>Go to Credentials</Button>}
        />
      )}
      {noConnections && !connectionsError && (
        <EmptyState icon={VpnKeyOutlinedIcon} title="No active connections"
          description={`No active ${selectedProvider?.displayName ?? 'accounting'} connections found. Add credentials and complete OAuth.`}
          action={<Button component={Link} href="/provider-credentials" variant="contained" startIcon={<LinkOutlinedIcon />}>Go to Provider Credentials</Button>}
        />
      )}
      {connectionsError && (
        <Alert severity="error" sx={{ mb: 2 }}>{extractApiMessage(connectionsError, 'Could not load connections.')}</Alert>
      )}

      {/* ── Capability loading ────────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && capabilitiesLoading && (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      )}

      {/* ── Capability gate ────────────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && !capabilitiesLoading && (
        <>
          {capabilityStatus === 'planned' && (
            <ProviderFeatureUnavailable featureDisplayName="Chart of Accounts"
              providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey} status="planned" />
          )}
          {capabilityStatus === 'unsupported' && (
            <ProviderFeatureUnavailable featureDisplayName="Chart of Accounts"
              providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey} status="unsupported" />
          )}
        </>
      )}

      {/* ── Reconnect required banner ─────────────────────────────────────── */}
      {reauthorisationNeeded && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              component={Link}
              href="/provider-credentials"
              size="small"
              color="inherit"
              variant="outlined"
            >
              Reconnect
            </Button>
          }
          onClose={() => setReauthorisationNeeded(false)}
        >
          <strong>Re-authorisation required.</strong>&nbsp;
          The current Xero connection was authorised with read-only scope and cannot perform
          write operations. Open Provider Credentials, disconnect, and reconnect Xero to
          grant <code>accounting.settings</code> write access.
        </Alert>
      )}

      {/* ── Chart of Accounts content ─────────────────────────────────────── */}
      {coaEnabled && (
        <>
          {/* Error loading accounts */}
          {accountsError && !accountsLoading && (() => {
            const msg = extractApiMessage(accountsError, 'The provider returned an error. Check the connection and try again.');
            const isOAuthIncomplete = msg.toLowerCase().includes('oauth') || msg.toLowerCase().includes('tenant') || msg.toLowerCase().includes('organisation');
            return (
              <ErrorState
                title={isOAuthIncomplete ? 'Connection not authorised' : 'Could not load accounts'}
                description={isOAuthIncomplete
                  ? 'The Xero OAuth flow has not been completed. Open Provider Credentials and click "Connect with Xero".'
                  : msg}
                action={isOAuthIncomplete ? (
                  <Button component={Link} href="/provider-credentials" variant="outlined" startIcon={<OpenInNewOutlinedIcon />}>
                    Open Provider Credentials
                  </Button>
                ) : undefined}
              />
            );
          })()}

          {!accountsError && <SummaryRow rows={filteredRows} />}

          {!accountsError && (
            <DataTable<AccountSummary>
              columns={columns}
              rows={paginatedRows}
              total={filteredRows.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
              onRowClick={(row) => setViewAccountId(row.id)}
              loading={accountsLoading}
              getRowId={(row) => row.id}
              tableHeight="calc(100vh - 360px)"
              emptyState={
                <EmptyState icon={AccountTreeOutlinedIcon} title="No accounts found"
                  description={hasFilters
                    ? 'No accounts match the current filters. Adjust Type, Nature, Status, or Search.'
                    : 'No accounts are available in this chart of accounts.'} />
              }
              mobileCardConfig={{
                primaryText: 'name',
                secondaryText: (row) => [row.code, deriveTypeLabel(row.type)].filter(Boolean).join(' · '),
                badge: (row) => (
                  <Chip label={row.status === 'active' ? 'Active' : 'Archived'}
                    color={row.status === 'active' ? 'success' : 'default'} size="small"
                    variant={row.status === 'active' ? 'filled' : 'outlined'} />
                ),
                fields: [
                  { field: '_nature' as keyof AccountSummary, label: 'Nature', render: (_v, row) => deriveNature(row) },
                ],
              }}
            />
          )}
        </>
      )}

      {/* ── Detail drawer ─────────────────────────────────────────────────── */}
      {viewAccountId && resolvedConnectionId && (
        <AccountDetailDrawer
          credentialId={resolvedConnectionId}
          accountId={viewAccountId}
          onClose={() => setViewAccountId(null)}
          onEdit={(detail) => { setViewAccountId(null); setEditingDetail(detail); }}
        />
      )}

      {/* ── Create drawer ─────────────────────────────────────────────────── */}
      {createOpen && resolvedConnectionId && (
        <AccountForm
          open mode="create"
          credentialId={resolvedConnectionId}
          onClose={() => setCreateOpen(false)}
          onReauthorisationRequired={() => setReauthorisationNeeded(true)}
        />
      )}

      {/* ── Edit drawer ───────────────────────────────────────────────────── */}
      {editingDetail && resolvedConnectionId && (
        <AccountForm
          open mode="edit"
          initial={editingDetail}
          credentialId={resolvedConnectionId}
          onClose={() => setEditingDetail(null)}
          onReauthorisationRequired={() => setReauthorisationNeeded(true)}
        />
      )}

      {/* ── Archive confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive account?"
        description={`"${archiveTarget?.name}" will be archived and no longer visible in the active chart of accounts. You can restore it by filtering for Archived accounts.`}
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
        loading={archiveMutation.isPending}
      />

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete account?"
        description={`"${deleteTarget?.name}" will be permanently deleted if the provider permits. If deletion is not allowed, you will be asked to archive instead.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
