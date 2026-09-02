'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDrawer,
  PermissionGuard,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import {
  usePlatformChannels,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
} from '@/hooks/api/usePlatformChannels';
import { usePermissions } from '@/hooks/usePermissions';
import type { Channel } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_FORMAT_LABELS: Record<string, string> = {
  html: 'HTML',
  text: 'Text',
  binary: 'Binary',
};

const PAGE_SIZE = 50;

// ─── Form schema ──────────────────────────────────────────────────────────────

const channelSchema = z.object({
  channelKey: z
    .string()
    .min(1, 'Required')
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, hyphens, and underscores only'),
  displayName: z.string().min(1, 'Required').max(120),
  description: z.string().max(500).optional(),
  contentFormat: z.enum(['html', 'text', 'binary']),
  supportsTemplates: z.boolean(),
  supportsFiles: z.boolean(),
  isActive: z.boolean().optional(),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

// ─── Channel Drawer ───────────────────────────────────────────────────────────

interface ChannelDrawerProps {
  open: boolean;
  editTarget: Channel | null;
  onClose: () => void;
}

function ChannelDrawer({ open, editTarget, onClose }: ChannelDrawerProps) {
  const isEditing = Boolean(editTarget);
  const createMutation = useCreateChannelMutation();
  const updateMutation = useUpdateChannelMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      channelKey: '',
      displayName: '',
      description: '',
      contentFormat: 'text',
      supportsTemplates: false,
      supportsFiles: false,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (editTarget) {
      form.reset({
        channelKey: editTarget.channelKey,
        displayName: editTarget.displayName,
        description: editTarget.description ?? '',
        contentFormat: editTarget.contentFormat,
        supportsTemplates: editTarget.supportsTemplates,
        supportsFiles: editTarget.supportsFiles,
        isActive: editTarget.isActive,
      });
    } else {
      form.reset({
        channelKey: '',
        displayName: '',
        description: '',
        contentFormat: 'text',
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      });
    }
  }, [editTarget, form]);

  async function onSubmit(values: ChannelFormValues) {
    if (isEditing && editTarget) {
      await updateMutation.mutateAsync({
        channelKey: editTarget.channelKey,
        displayName: values.displayName,
        description: values.description,
        contentFormat: values.contentFormat,
        supportsTemplates: values.supportsTemplates,
        supportsFiles: values.supportsFiles,
        isActive: values.isActive,
      });
    } else {
      await createMutation.mutateAsync({
        channelKey: values.channelKey,
        displayName: values.displayName,
        description: values.description,
        contentFormat: values.contentFormat,
        supportsTemplates: values.supportsTemplates,
        supportsFiles: values.supportsFiles,
        isActive: values.isActive ?? true,
      });
    }
    form.reset();
    onClose();
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Channel' : 'New Channel'}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Channel'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Controller
          name="channelKey"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Channel Key"
              fullWidth
              size="small"
              required
              disabled={isEditing}
              error={Boolean(form.formState.errors.channelKey)}
              helperText={
                form.formState.errors.channelKey?.message ??
                'Unique identifier (e.g. email, sms, push)'
              }
              placeholder="email"
            />
          )}
        />
        <Controller
          name="displayName"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Display Name"
              fullWidth
              size="small"
              required
              error={Boolean(form.formState.errors.displayName)}
              helperText={form.formState.errors.displayName?.message}
            />
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Description"
              fullWidth
              size="small"
              multiline
              rows={3}
              error={Boolean(form.formState.errors.description)}
              helperText={form.formState.errors.description?.message}
            />
          )}
        />
        <Controller
          name="contentFormat"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Content Format"
              fullWidth
              size="small"
              required
              error={Boolean(form.formState.errors.contentFormat)}
              helperText={form.formState.errors.contentFormat?.message}
            >
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="binary">Binary</MenuItem>
            </TextField>
          )}
        />
        <Controller
          name="supportsTemplates"
          control={form.control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Supports Templates"
            />
          )}
        />
        <Controller
          name="supportsFiles"
          control={form.control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Supports Files"
            />
          )}
        />
        {isEditing && (
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                }
                label="Active"
              />
            )}
          />
        )}
      </Stack>
    </FormDrawer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelsPage() {
  const { canViewChannels } = usePermissions();

  const { data, isLoading, error } = usePlatformChannels();
  const deleteMutation = useDeleteChannelMutation();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Channel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);

  const channels = useMemo(() => data?.items ?? [], [data]);
  const hasActiveFilters = Boolean(search);

  const filtered = useMemo(
    () =>
      channels.filter(
        (c) =>
          c.displayName.toLowerCase().includes(search.toLowerCase()) ||
          c.channelKey.toLowerCase().includes(search.toLowerCase()),
      ),
    [channels, search],
  );

  // Client-side pagination — pass the current page slice to DataTable
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setPage(0);
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((channel: Channel) => {
    setEditTarget(channel);
    setDrawerOpen(true);
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.channelKey);
    setDeleteTarget(null);
  }

  // Desktop columns
  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'channelKey',
        headerName: 'Channel Key',
        flex: 1,
        minWidth: 120,
        renderCell: (p) => (
          <Typography variant="body2" fontFamily="monospace" fontWeight={500} noWrap>
            {(p.row as Channel).channelKey}
          </Typography>
        ),
      },
      {
        field: 'displayName',
        headerName: 'Display Name',
        flex: 1.2,
        minWidth: 140,
        renderCell: (p) => (
          <Typography variant="body2" noWrap>
            {(p.row as Channel).displayName}
          </Typography>
        ),
      },
      {
        field: 'contentFormat',
        headerName: 'Format',
        width: 90,
        renderCell: (p) => (
          <Chip
            label={CONTENT_FORMAT_LABELS[(p.row as Channel).contentFormat] ?? (p.row as Channel).contentFormat}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: 'supportsTemplates',
        headerName: 'Templates',
        width: 100,
        renderCell: (p) => (
          <Typography
            variant="body2"
            color={(p.row as Channel).supportsTemplates ? 'success.main' : 'text.disabled'}
          >
            {(p.row as Channel).supportsTemplates ? 'Yes' : 'No'}
          </Typography>
        ),
      },
      {
        field: 'supportsFiles',
        headerName: 'Files',
        width: 75,
        renderCell: (p) => (
          <Typography
            variant="body2"
            color={(p.row as Channel).supportsFiles ? 'success.main' : 'text.disabled'}
          >
            {(p.row as Channel).supportsFiles ? 'Yes' : 'No'}
          </Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: (p) => <StatusBadge active={(p.row as Channel).isActive} />,
      },
    ],
    [],
  );

  // Mobile card config
  const mobileCardConfig = useMemo<MobileCardConfig<Channel>>(
    () => ({
      primaryText: 'displayName',
      secondaryText: 'channelKey',
      badge: (row) => <StatusBadge active={row.isActive} />,
      fields: [
        {
          field: 'contentFormat',
          label: 'Format',
          render: (v) => (
            <Chip
              label={CONTENT_FORMAT_LABELS[v as string] ?? String(v)}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          field: 'supportsTemplates',
          label: 'Templates',
          render: (v) => (
            <Typography variant="body2" color={v ? 'success.main' : 'text.disabled'}>
              {v ? 'Yes' : 'No'}
            </Typography>
          ),
        },
        {
          field: 'supportsFiles',
          label: 'Files',
          render: (v) => (
            <Typography variant="body2" color={v ? 'success.main' : 'text.disabled'}>
              {v ? 'Yes' : 'No'}
            </Typography>
          ),
        },
      ],
    }),
    [],
  );

  // Row actions (desktop hover + mobile card footer)
  const rowActions = useCallback(
    (row: Channel) => (
      <PermissionGuard allowed={canViewChannels}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(row)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </PermissionGuard>
    ),
    [canViewChannels, openEdit],
  );

  const emptyState = (
    <EmptyState
      icon={RouterOutlinedIcon}
      title={hasActiveFilters ? 'No channels match your search' : 'No channels yet'}
      description={
        hasActiveFilters
          ? 'Try a different search term.'
          : 'Create the first channel to make it available for providers.'
      }
      action={
        hasActiveFilters ? (
          <Button variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : (
          <PermissionGuard allowed={canViewChannels}>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
              Create Channel
            </Button>
          </PermissionGuard>
        )
      }
    />
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Channels"
        count={filtered.length}
        subtitle="Define communication channels available to all companies."
        actions={
          <PermissionGuard allowed={canViewChannels}>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
              Create Channel
            </Button>
          </PermissionGuard>
        }
      />

      {/* Filter bar — DEC-015 §2 */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search channels…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 200 } }}
          />
          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearOutlinedIcon fontSize="small" />}
              onClick={clearFilters}
              sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* DataTable — handles desktop DataGrid + mobile cards */}
      <DataTable<Channel>
        rows={pageRows}
        columns={columns}
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        emptyState={emptyState}
        noRowsLabel="No channels found."
        getRowId={(row) => row.id}
      />

      <ChannelDrawer
        open={drawerOpen}
        editTarget={editTarget}
        onClose={() => setDrawerOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete channel?"
        description={`Channel "${deleteTarget?.displayName}" will be permanently deleted. This may break providers and company configurations that depend on it.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
