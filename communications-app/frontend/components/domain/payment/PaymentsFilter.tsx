'use client';

import React from 'react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

import {
  usePaymentsContext,
  connectionLabel,
} from '@/providers/PaymentsProvider';

// ─── PaymentsFilter ──────────────────────────────────────────────────────────
//
// Shared filter area for all operational Payments pages.
//
// Filter order (per design spec):
//   1. Provider    — ~30 % width on desktop, full width on mobile
//   2. Connection  — remaining width on desktop, full width on mobile
//   3. children    — page-specific filters with their own responsive widths
//
// Layout: one flex row with wrapping.
//   Desktop / tablet (sm+): Provider + Connection + children on one row.
//   Mobile (xs):            each control stacks full-width in order.

interface PaymentsFilterProps {
  children?: React.ReactNode;
}

export function PaymentsFilter({ children }: PaymentsFilterProps) {
  const {
    availableProviderOptions,
    selectedProviderId,
    setSelectedProviderId,
    resolvedProviderId,
    availableConnections,
    selectedConnectionId,
    setSelectedConnectionId,
    resolvedConnectionId,
    providersLoading,
  } = usePaymentsContext();

  const hasContent =
    availableProviderOptions.length > 0 || providersLoading || children;

  if (!hasContent) return null;

  const providerValue = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';

  const showConnectionSelector =
    Boolean(resolvedProviderId) && availableConnections.length > 0;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {/* ── Provider ─────────────────────────────────────────────────────
            Fixed ~30 % on desktop (min 160 px, max 260 px).
            Full width on mobile so it stacks cleanly.               ──── */}
        <TextField
          select
          label="Provider"
          size="small"
          value={providerValue}
          onChange={(e) => setSelectedProviderId(e.target.value)}
          disabled={providersLoading || availableProviderOptions.length === 0}
          SelectProps={{ displayEmpty: true }}
          sx={{
            width: { xs: '100%', sm: '30%' },
            minWidth: { sm: 160 },
            maxWidth: { sm: 260 },
          }}
        >
          {availableProviderOptions.length === 0 && (
            <MenuItem value="" disabled>
              No payment providers configured
            </MenuItem>
          )}
          {availableProviderOptions.map((p) => (
            <MenuItem key={p.ccpId} value={p.ccpId}>
              {p.displayName}
            </MenuItem>
          ))}
        </TextField>

        {/* ── Connection ───────────────────────────────────────────────────
            Grows to fill remaining row width on desktop (flex: 1).
            Full width on mobile so it stacks cleanly.               ──── */}
        {showConnectionSelector && (
          <TextField
            select
            label="Connection"
            size="small"
            value={connectionValue}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            disabled={availableConnections.length === 0}
            sx={{
              flex: { sm: 1 },
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 200 },
            }}
          >
            {availableConnections.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {connectionLabel(c)}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* ── Page-specific filters ────────────────────────────────────────
            Passed by the parent page (Search, Type, Status, Refresh…).
            Each child sets its own responsive width so the group wraps
            onto the next line only when necessary.                  ──── */}
        {children}
      </Box>
    </Paper>
  );
}
