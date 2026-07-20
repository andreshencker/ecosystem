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
import { EmptyState } from './EmptyState';

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
      sx={{ mb: 1.5, cursor: onRowClick ? 'pointer' : 'default' }}
    >
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
        {/* Header row */}
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          mb={secondary ? 0.25 : 1}
          onClick={() => onRowClick?.(row)}
        >
          <Typography variant="body1" fontWeight={500} color="text.primary">
            {primary}
          </Typography>
          {config.badge && <Box ml={1} flexShrink={0}>{config.badge(row)}</Box>}
        </Box>

        {/* Subtitle */}
        {secondary && (
          <Typography
            variant="body2"
            color="text.secondary"
            mb={1}
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
                  <Box key={i} display="flex" gap={1}>
                    {f.label && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: '35%', flexShrink: 0 }}
                      >
                        {f.label}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.primary">
                      {rendered}
                    </Typography>
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

  const resolvedGetRowId = getRowId ?? ((row: T) => (row as T & { id: string }).id);

  // ─── Desktop columns: append rowActions column if provided ────────────────
  const desktopColumns: GridColDef[] = rowActions
    ? [
        ...columns,
        {
          field: '__actions__',
          headerName: '',
          width: 100,
          sortable: false,
          disableColumnMenu: true,
          align: 'right' as const,
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
  const filterNode = filterSlot ? (
    <Box mb={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        flexWrap="wrap"
      >
        {filterSlot}
      </Stack>
    </Box>
  ) : null;

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
            <Box py={6} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {noRowsLabel}
              </Typography>
            </Box>
          )
        ) : (
          <Stack>
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
          rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_e, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => {
            onPageSizeChange(parseInt(e.target.value, 10));
            onPageChange(0);
          }}
          sx={{ mt: 1, borderTop: '1px solid', borderColor: 'divider' }}
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
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          if (model.page !== page) onPageChange(model.page);
          if (model.pageSize !== pageSize) {
            onPageSizeChange(model.pageSize);
            onPageChange(0);
          }
        }}
        pageSizeOptions={[25, 50, 100]}
        loading={loading}
        checkboxSelection={checkboxSelection}
        onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
        disableRowSelectionOnClick={!onRowClick}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& .MuiDataGrid-row': {
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': { backgroundColor: 'action.hover' },
            '& .__actions__': { visibility: 'hidden' },
            '&:hover .__actions__': { visibility: 'visible' },
          },
          '& .MuiDataGrid-cell': {
            borderColor: 'divider',
          },
        }}
        slots={{
          noRowsOverlay: () =>
            emptyState ? (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                {emptyState}
              </Box>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography variant="body2" color="text.secondary">
                  {noRowsLabel}
                </Typography>
              </Box>
            ),
        }}
        autoHeight
      />
    </Box>
  );
}
