'use client';

// General Ledger — route: /accounting/general-ledger
//
// Read-only view of accounting journal entries from the connected provider.
// For Xero: GET /api.xro/2.0/Journals (requires accounting.journals.read scope).
//
// This page is ENTIRELY separate from Manual Journals:
//   - No create, update, delete, reconcile, post, or void operations.
//   - Data comes directly from the provider's general ledger resource.
//   - One row per journal; journal lines shown in a detail drawer on click.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, FormDrawer } from '@/components/shared';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import { useGeneralLedgerJournals } from '@/hooks/api/useAccounting';
import type { JournalSummary, JournalLineSummary, ListJournalsParams } from '@/types/accounting';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_KEY  = 'journals';
const DEFAULT_PAGE_SIZE = 25;

const SOURCE_TYPE_OPTIONS = [
  { value: '',                label: 'All Sources'     },
  { value: 'ACCREC',         label: 'Invoice'         },
  { value: 'ACCPAY',         label: 'Bill'            },
  { value: 'ACCRECCREDIT',   label: 'Credit Note (AR)'},
  { value: 'ACCPAYCREDIT',   label: 'Credit Note (AP)'},
  { value: 'TRANSFER',       label: 'Transfer'        },
  { value: 'MANUALADJUSTMENT', label: 'Manual Journal'},
  { value: 'RECEIPT',        label: 'Receipt'         },
  { value: 'EXPPAYMENT',     label: 'Expense Payment' },
  { value: 'DEPRECIATION',   label: 'Depreciation'    },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function sourceTypeLabel(type?: string): string {
  if (!type) return '—';
  const found = SOURCE_TYPE_OPTIONS.find((o) => o.value === type);
  return found?.label ?? type;
}

// ─── Summary counters ─────────────────────────────────────────────────────────

function SummaryCounters({ journals }: { journals: JournalSummary[] }) {
  const totalLines = journals.reduce((acc, j) => acc + (j.lines?.length ?? 0), 0);

  const stats = [
    { label: 'Total Journals', value: String(journals.length), highlight: true },
    { label: 'Total Lines',    value: String(totalLines) },
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
          <Typography
            variant="body2"
            fontWeight={highlight ? 700 : 600}
            color={highlight ? 'text.primary' : 'text.secondary'}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Detail drawer row ────────────────────────────────────────────────────────

function DrawerRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">{value ?? '—'}</Typography>
    </Box>
  );
}

// ─── Journal detail drawer ────────────────────────────────────────────────────

function JournalDetailDrawer({
  journal,
  onClose,
}: {
  journal: JournalSummary;
  onClose: () => void;
}) {
  return (
    <FormDrawer
      open
      onClose={onClose}
      title={`Journal #${journal.journalNumber ?? '—'}`}
    >
      <Stack spacing={2}>
        <DrawerRow label="Date"        value={formatDate(journal.date)} />
        <DrawerRow label="Journal #"   value={journal.journalNumber ?? '—'} />
        <DrawerRow label="Source Type" value={sourceTypeLabel(journal.sourceType)} />
        <DrawerRow label="Reference"   value={journal.reference || '—'} />
        <DrawerRow label="Created"     value={formatDate(journal.createdAt)} />

        <Divider />

        <Typography variant="subtitle2" fontWeight={600}>
          Journal Lines
        </Typography>

        {journal.lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No lines returned.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Account</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Debit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Credit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journal.lines.map((line, idx) => (
                  <TableRow key={line.journalLineId ?? idx}>
                    <TableCell>
                      <Typography variant="body2">{line.accountCode ?? '—'}</Typography>
                      {line.accountName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {line.accountName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{line.description || '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {line.netAmount > 0 ? (
                        <Typography variant="body2">{formatAmount(line.netAmount)}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {line.netAmount < 0 ? (
                        <Typography variant="body2">{formatAmount(line.netAmount)}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Stack>
    </FormDrawer>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

function buildColumns(): GridColDef[] {
  return [
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(value as string)}
        </Typography>
      ),
    },
    {
      field: 'journalNumber',
      headerName: 'Journal #',
      width: 100,
      renderCell: ({ value }) => (
        <Typography variant="body2">{value ?? '—'}</Typography>
      ),
    },
    {
      field: 'sourceType',
      headerName: 'Source',
      width: 170,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">
          {sourceTypeLabel(value as string)}
        </Typography>
      ),
    },
    {
      field: 'reference',
      headerName: 'Reference',
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">
          {(value as string) || '—'}
        </Typography>
      ),
    },
    {
      field: 'lines',
      headerName: 'Lines',
      width: 70,
      renderCell: ({ value }) => (
        <Chip
          label={(value as JournalLineSummary[])?.length ?? 0}
          size="small"
          variant="outlined"
          sx={{ minWidth: 32 }}
        />
      ),
    },
  ];
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  dateFrom,
  dateTo,
  sourceType,
  onDateFromChange,
  onDateToChange,
  onSourceTypeChange,
  onRefresh,
  loading,
}: {
  dateFrom: string;
  dateTo: string;
  sourceType: string;
  onDateFromChange: (v: string) => void;
  onDateToChange:   (v: string) => void;
  onSourceTypeChange: (v: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      flexWrap="wrap"
      useFlexGap
    >
      <TextField
        label="Date From"
        type="date"
        size="small"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 155 }}
      />
      <TextField
        label="Date To"
        type="date"
        size="small"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 155 }}
      />
      <TextField
        select
        label="Source"
        size="small"
        value={sourceType}
        onChange={(e) => onSourceTypeChange(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        {SOURCE_TYPE_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRefresh}
        disabled={loading}
        sx={{ alignSelf: 'flex-start' }}
      >
        Refresh
      </Button>
    </Stack>
  );
}

// ─── Provider / Connection selector ───────────────────────────────────────────

function ProviderSelector() {
  const {
    availableProviderOptions,
    selectedProvider,
    setSelectedProviderId,
    availableConnections,
    selectedConnection,
    setSelectedConnectionId,
    providersLoading,
    connectionsLoading,
  } = useAccountingContext();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
      <TextField
        select
        label="Provider"
        size="small"
        value={selectedProvider?.ccpId ?? ''}
        onChange={(e) => setSelectedProviderId(e.target.value)}
        disabled={providersLoading || availableProviderOptions.length <= 1}
        sx={{ minWidth: 180 }}
      >
        {availableProviderOptions.map((p) => (
          <MenuItem key={p.ccpId} value={p.ccpId}>
            {p.displayName}
          </MenuItem>
        ))}
      </TextField>

      {availableConnections.length > 1 && (
        <TextField
          select
          label="Connection"
          size="small"
          value={selectedConnection?.id ?? ''}
          onChange={(e) => setSelectedConnectionId(e.target.value)}
          disabled={connectionsLoading}
          sx={{ minWidth: 220 }}
        >
          {availableConnections.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {accountingConnectionLabel(c)}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeneralLedgerPage() {
  const {
    resolvedConnectionId,
    getCapabilityStatus,
    capabilitiesLoading,
    selectedProvider,
  } = useAccountingContext();

  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [sourceType,  setSourceType]  = useState('');
  const [queryParams, setQueryParams] = useState<ListJournalsParams>({});
  const [page,        setPage]        = useState(0);
  const [pageSize,    setPageSize]    = useState(DEFAULT_PAGE_SIZE);
  const [selectedJournal, setSelectedJournal] = useState<JournalSummary | null>(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // Reset pagination when filters change
  useEffect(() => { setPage(0); }, [queryParams]);

  const capabilityStatus = getCapabilityStatus(CAPABILITY_KEY);
  const isAvailable = capabilityStatus === 'available';

  const { data, isLoading, error, refetch } = useGeneralLedgerJournals(
    resolvedConnectionId,
    { ...queryParams, _refresh: refreshKey } as ListJournalsParams,
    { enabled: isAvailable && Boolean(resolvedConnectionId) },
  );

  const journals = data?.data ?? [];

  const pagedRows = useMemo(
    () => journals.slice(page * pageSize, page * pageSize + pageSize),
    [journals, page, pageSize],
  );

  const handleApplyFilters = useCallback(() => {
    setQueryParams({
      ...(dateFrom    ? { dateFrom }    : {}),
      ...(dateTo      ? { dateTo }      : {}),
      ...(sourceType  ? { sourceType }  : {}),
    });
  }, [dateFrom, dateTo, sourceType]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refetch();
  }, [refetch]);

  // Apply filters on Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleApplyFilters(); },
    [handleApplyFilters],
  );

  const columns = useMemo(() => buildColumns(), []);

  // Show capability gate if not available
  if (!capabilitiesLoading && !isAvailable && resolvedConnectionId) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="General Ledger"
          subtitle="View accounting journal entries from your accounting provider."
        />
        <ProviderSelector />
        <ProviderFeatureUnavailable
          providerDisplayName={selectedProvider?.displayName ?? 'Provider'}
          featureDisplayName="General Ledger"
          status={capabilityStatus ?? 'unsupported'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="General Ledger"
        subtitle="View accounting journal entries from your accounting provider."
      />

      <Box sx={{ px: 3, pb: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ProviderSelector />

        {/* Filter zone — outside the scrollable table area */}
        <Box onKeyDown={handleKeyDown} mb={2}>
          <FilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            sourceType={sourceType}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSourceTypeChange={(v) => { setSourceType(v); setQueryParams((prev) => ({ ...prev, sourceType: v || undefined })); }}
            onRefresh={handleRefresh}
            loading={isLoading}
          />
        </Box>

        {/* Summary — outside the scrollable table area */}
        {journals.length > 0 && <SummaryCounters journals={journals} />}

        {/* Fixed-height table with internal vertical scroll */}
        <Paper
          variant="outlined"
          sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <DataTable
            columns={columns}
            rows={pagedRows}
            total={journals.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            onRowClick={(row) => setSelectedJournal(row as JournalSummary)}
            loading={isLoading}
            error={error}
            tableHeight="100%"
            getRowId={(row) => (row as JournalSummary).id}
            emptyState={
              resolvedConnectionId ? (
                <EmptyState
                  title="No journals found"
                  description="Try adjusting your date range or source type filter."
                />
              ) : (
                <EmptyState
                  title="No connection selected"
                  description="Select a provider and connection above to view general ledger entries."
                />
              )
            }
            mobileCardConfig={{
              primaryText: (row) => {
                const j = row as JournalSummary;
                return `#${j.journalNumber ?? '—'} — ${sourceTypeLabel(j.sourceType)}`;
              },
              secondaryText: (row) => formatDate((row as JournalSummary).date),
              fields: [
                { field: 'reference' as keyof JournalSummary, label: 'Reference' },
                {
                  field: 'lines' as keyof JournalSummary,
                  label: 'Lines',
                  render: (v) => `${(v as JournalLineSummary[])?.length ?? 0} lines`,
                },
              ],
            }}
          />
        </Paper>
      </Box>

      {/* Journal detail drawer */}
      {selectedJournal && (
        <JournalDetailDrawer
          journal={selectedJournal}
          onClose={() => setSelectedJournal(null)}
        />
      )}
    </Box>
  );
}
