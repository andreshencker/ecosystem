'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import { FormDrawer } from '@/components/shared';
import { useShiftSyncHistory } from '@/hooks/api/useShifts';

export interface SyncHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircleOutlinedIcon fontSize="small" color="success" />,
  failed:    <ErrorOutlineIcon fontSize="small" color="error" />,
  running:   <HourglassEmptyOutlinedIcon fontSize="small" color="warning" />,
};

export function SyncHistoryDrawer({ open, onClose }: SyncHistoryDrawerProps) {
  const [page] = useState(1);

  const { data, isLoading } = useShiftSyncHistory({ page, limit: 50 });

  return (
    <FormDrawer open={open} onClose={onClose} title="Sync History" width={720}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Calendar sync runs for this Business — most recent first. Credentials and stack traces are not shown.
        </Typography>

        {isLoading ? (
          <Stack spacing={1}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : !data?.items?.length ? (
          <Box display="flex" alignItems="center" gap={1} py={4} justifyContent="center">
            <CalendarMonthOutlinedIcon color="disabled" />
            <Typography variant="body2" color="text.secondary">
              No sync history yet. Run "Sync Calendars" to start.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Calendar</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Created</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell align="right">Deleted</TableCell>
                  <TableCell align="right">Errors</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((entry) => (
                  <TableRow key={entry._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 160 }}>
                        {entry.calendarName ?? '—'}
                      </Typography>
                      {entry.accountIdentifier && (
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {entry.accountIdentifier}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(entry.startedAt)}</Typography>
                    </TableCell>
                    <TableCell align="right">{entry.eventsReceived}</TableCell>
                    <TableCell align="right">{entry.created}</TableCell>
                    <TableCell align="right">{entry.updated}</TableCell>
                    <TableCell align="right">{entry.deleted}</TableCell>
                    <TableCell align="right">
                      {entry.errors.length > 0 ? (
                        <Chip
                          label={entry.errors.length}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatDuration(entry.durationMs)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {STATUS_ICON[entry.status] ?? entry.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </FormDrawer>
  );
}
