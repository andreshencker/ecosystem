'use client';

import React from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import TablePagination from '@mui/material/TablePagination';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryError } from './QueryError';

// ─── Mobile card types ────────────────────────────────────────────────────────

export interface MobileCardField<T> {
  field: keyof T;
  label?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface MobileCardConfig<T> {
  primaryText: keyof T | ((row: T) => string);
  secondaryText?: keyof T | ((row: T) => string);
  badge?: (row: T) => React.ReactNode;
  fields: MobileCardField<T>[];
  /** Card-footer actions rendered full-width with space-between layout. Takes priority over rowActions in mobile view. */
  actions?: (row: T) => React.ReactNode;
}

// ─── DataTable props ──────────────────────────────────────────────────────────

export interface DataTableProps<T extends { id?: string }> {
  columns: GridColDef[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  /** Called when the user clicks Retry in the error panel. */
  onRetry?: () => void;
  emptyState?: React.ReactNode;
  noRowsLabel?: string;
  filterSlot?: React.ReactNode;
  mobileCardConfig?: MobileCardConfig<T>;
  getRowId?: (row: T) => string;
  checkboxSelection?: boolean;
  /**
   * When provided, the DataGrid uses a fixed height container with internal
   * vertical + horizontal scrolling instead of expanding to fit all rows.
   * Accepts any CSS height value (e.g. 600, "60vh", "calc(100vh - 300px)").
   */
  height?: number | string;
}

// ─── Mobile card sub-component ────────────────────────────────────────────────

function MobileCard<T extends { id?: string }>({
  row,
  config,
  onRowClick,
  rowActions,
}: {
  row: T;
  config: MobileCardConfig<T>;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
}) {
  const primary =
    typeof config.primaryText === 'function'
      ? config.primaryText(row)
      : String(row[config.primaryText] ?? '');

  const secondary =
    config.secondaryText == null
      ? null
      : typeof config.secondaryText === 'function'
      ? config.secondaryText(row)
      : String(row[config.secondaryText] ?? '');

  // config.actions takes priority; rowActions is legacy fallback
  const mobileActions  = config.actions ? config.actions(row) : null;
  const legacyActions  = !mobileActions && rowActions ? rowActions(row) : null;
  const hasFooter      = !!(mobileActions || legacyActions);

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, cursor: onRowClick ? 'pointer' : 'default' }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: hasFooter ? 1 : 2 } }}>
        {/* Header row */}
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          mb={secondary || config.fields.length ? 0.5 : 0}
          onClick={() => onRowClick?.(row)}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.primary" noWrap sx={{ flex: 1, mr: 1 }}>
            {primary}
          </Typography>
          {config.badge && <Box flexShrink={0}>{config.badge(row)}</Box>}
        </Box>

        {/* Subtitle */}
        {secondary && (
          <Typography
            variant="caption"
            color="text.secondary"
            fontFamily="monospace"
            display="block"
            mb={config.fields.length ? 1 : 0}
            onClick={() => onRowClick?.(row)}
          >
            {secondary}
          </Typography>
        )}

        {/* Field rows */}
        {config.fields.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Stack spacing={0.75} onClick={() => onRowClick?.(row)}>
              {config.fields.map((f, i) => {
                const rawValue = row[f.field];
                const rendered = f.render
                  ? f.render(rawValue, row)
                  : String(rawValue ?? '—');
                return (
                  <Box key={i} display="flex" gap={1} alignItems="center">
                    {f.label && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: '38%', flexShrink: 0 }}
                      >
                        {f.label}
                      </Typography>
                    )}
                    <Box component="span" sx={{ flex: 1 }}>
                      {typeof rendered === 'string' ? (
                        <Typography variant="body2" color="text.primary">
                          {rendered}
                        </Typography>
                      ) : (
                        rendered
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>

      {/* Mobile-specific actions: full-width, space-between */}
      {mobileActions && (
        <>
          <Divider />
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1}
          >
            {mobileActions}
          </Box>
        </>
      )}

      {/* Legacy rowActions fallback: right-aligned */}
      {legacyActions && (
        <>
          <Divider />
          <CardActions sx={{ px: 2, py: 1, justifyContent: 'flex-end' }}>
            {legacyActions}
          </CardActions>
        </>
      )}
    </Card>
  );
}

// ─── Main DataTable component ─────────────────────────────────────────────────

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowActions,
  loading = false,
  error,
  onRetry,
  emptyState,
  noRowsLabel = 'No records found.',
  filterSlot,
  mobileCardConfig,
  getRowId,
  checkboxSelection = false,
  height,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const showMobile = isMobile && Boolean(mobileCardConfig);

  // MUI DataGrid Community (MIT) enforces a hard maximum of 100 rows per page.
  const clampedPageSize = Math.min(pageSize, 100);

  const resolvedGetRowId = getRowId ?? ((row: T) => (row as T & { id: string }).id);

  // ─── Desktop columns: append rowActions column if provided ────────────────
  const desktopColumns: GridColDef[] = rowActions
    ? [
        ...columns,
        {
          field: '__actions__',
          headerName: 'Actions',
          width: 160,
          sortable: false,
          disableColumnMenu: true,
          align: 'right' as const,
          headerAlign: 'right' as const,
          renderCell: (params) => (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="flex-end"
              height="100%"
              onClick={(e) => e.stopPropagation()}
            >
              {rowActions(params.row as T)}
            </Box>
          ),
        },
      ]
    : columns;

  // ─── Shared filter slot ───────────────────────────────────────────────────
  const filterNode = filterSlot ? <Box mb={2}>{filterSlot}</Box> : null;

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box>
        {filterNode}
        <QueryError message={error.message} onRetry={onRetry} />
      </Box>
    );
  }

  // ─── Mobile card list ─────────────────────────────────────────────────────
  if (showMobile) {
    return (
      <Box>
        {filterNode}

        {loading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          emptyState ?? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {noRowsLabel}
              </Typography>
            </Box>
          )
        ) : (
          <Stack spacing={1.5}>
            {rows.map((row) => (
              <MobileCard
                key={resolvedGetRowId(row)}
                row={row}
                config={mobileCardConfig!}
                onRowClick={onRowClick}
                rowActions={rowActions}
              />
            ))}
          </Stack>
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={clampedPageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_e, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => {
            onPageSizeChange(parseInt(e.target.value, 10));
            onPageChange(0);
          }}
          sx={{ mt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Box>
    );
  }

  // ─── Shared DataGrid sx ───────────────────────────────────────────────────
  const gridSx = {
    border: 'none',
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: 'background.default',
      borderBottom: '2px solid',
      borderColor: 'divider',
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 600,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'text.secondary',
    },
    '& .MuiDataGrid-row': {
      cursor: onRowClick ? 'pointer' : 'default',
      '&:hover': { backgroundColor: 'action.hover' },
    },
    '& .MuiDataGrid-cell': {
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiDataGrid-footerContainer': {
      borderTop: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.default',
    },
    '& .MuiDataGrid-virtualScrollerContent': {
      minHeight: 240,
    },
  };

  const gridSlots = {
    noRowsOverlay: () =>
      emptyState ? (
        emptyState
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            {noRowsLabel}
          </Typography>
        </Box>
      ),
  };

  const gridCommonProps = {
    rows,
    columns: desktopColumns,
    getRowId: resolvedGetRowId,
    rowCount: total,
    paginationMode: 'server' as const,
    paginationModel: { page, pageSize: clampedPageSize },
    onPaginationModelChange: (model: { page: number; pageSize: number }) => {
      if (model.page !== page) onPageChange(model.page);
      if (model.pageSize !== clampedPageSize) {
        onPageSizeChange(model.pageSize);
        onPageChange(0);
      }
    },
    pageSizeOptions: [25, 50, 100],
    loading,
    checkboxSelection,
    onRowClick: onRowClick ? (params: any) => onRowClick(params.row as T) : undefined,
    disableRowSelectionOnClick: !onRowClick,
    getRowHeight: () => 52,
    slots: gridSlots,
    sx: gridSx,
  };

  // ─── Desktop DataGrid ─────────────────────────────────────────────────────

  // Fixed-height mode: container constrains height; DataGrid scrolls internally
  // both vertically and horizontally. Header stays sticky inside the grid.
  if (height) {
    return (
      <Box>
        {filterNode}
        <Box sx={{ height, width: '100%' }}>
          <DataGrid {...gridCommonProps} />
        </Box>
      </Box>
    );
  }

  // Default mode: grid expands to fit all rows (autoHeight).
  return (
    <Box>
      {filterNode}
      <DataGrid {...gridCommonProps} autoHeight />
    </Box>
  );
}
