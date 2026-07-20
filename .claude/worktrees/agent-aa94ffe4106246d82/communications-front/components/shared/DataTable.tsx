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
  emptyState?: React.ReactNode;
  noRowsLabel?: string;
  filterSlot?: React.ReactNode;
  mobileCardConfig?: MobileCardConfig<T>;
  getRowId?: (row: T) => string;
  checkboxSelection?: boolean;
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

  const actions = rowActions ? rowActions(row) : null;

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, cursor: onRowClick ? 'pointer' : 'default' }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: actions ? 1 : 2 } }}>
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

      {/* Action row */}
      {actions && (
        <>
          <Divider />
          <CardActions sx={{ px: 2, py: 1, justifyContent: 'flex-end' }}>
            {actions}
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
  emptyState,
  noRowsLabel = 'No records found.',
  filterSlot,
  mobileCardConfig,
  getRowId,
  checkboxSelection = false,
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
        <QueryError message={error.message} />
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

  // ─── Desktop DataGrid ─────────────────────────────────────────────────────
  return (
    <Box>
      {filterNode}
      <DataGrid
        rows={rows}
        columns={desktopColumns}
        getRowId={resolvedGetRowId}
        rowCount={total}
        paginationMode="server"
        paginationModel={{ page, pageSize: clampedPageSize }}
        onPaginationModelChange={(model) => {
          if (model.page !== page) onPageChange(model.page);
          if (model.pageSize !== clampedPageSize) {
            onPageSizeChange(model.pageSize);
            onPageChange(0);
          }
        }}
        pageSizeOptions={[25, 50, 100]}
        loading={loading}
        checkboxSelection={checkboxSelection}
        onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
        disableRowSelectionOnClick={!onRowClick}
        getRowHeight={() => 52}
        autoHeight
        sx={{
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
          // When there are no rows, autoHeight collapses the virtual scroller to
          // 0 px and the noRowsOverlay (absolutely positioned inside it) gets
          // clipped. A minHeight on the scroll-content area guarantees the
          // overlay has room to render the EmptyState icon and text.
          '& .MuiDataGrid-virtualScrollerContent': {
            minHeight: 240,
          },
        }}
        slots={{
          // Render content at its natural size so MUI DataGrid autoHeight can
          // adapt instead of stretching the overlay to fill an unknown height.
          // EmptyState's own py provides the vertical breathing room.
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
        }}
      />
    </Box>
  );
}
