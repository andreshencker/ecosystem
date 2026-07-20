'use client';

import React from 'react';
import Box from '@mui/material/Box';

interface RowActionsProps {
  children: React.ReactNode;
  /**
   * Pass `(e) => e.stopPropagation()` when used directly inside a custom
   * DataGrid renderCell that wraps a clickable row — prevents row-click from
   * firing when the user clicks an action button.
   *
   * Not needed when `rowActions` is passed to the shared `DataTable` component,
   * which already handles stopPropagation in its own renderCell wrapper.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Canonical action cell layout for CRUD tables (Design System §9).
 *
 * - 12 px gap between every icon button
 * - Right-aligned flex row
 * - 36 × 36 touch target with 6 px border-radius on each IconButton child
 * - Correct hover background colour (action.hover from theme)
 *
 * Usage:
 *   rowActions={(row) => (
 *     <RowActions>
 *       <Tooltip title="Edit"><IconButton size="small">…</IconButton></Tooltip>
 *       <Tooltip title="Delete"><IconButton size="small" color="error">…</IconButton></Tooltip>
 *     </RowActions>
 *   )}
 */
export function RowActions({ children, onClick }: RowActionsProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.5,           // 12 px — DS spacing(1.5)
        whiteSpace: 'nowrap',
        // Enforce uniform touch-target size and corner radius on every
        // IconButton that appears as a direct or shallow child.
        '& .MuiIconButton-root': {
          width: 36,
          height: 36,
          borderRadius: '6px',
          '&:hover': {
            borderRadius: '6px',
          },
        },
      }}
    >
      {children}
    </Box>
  );
}
