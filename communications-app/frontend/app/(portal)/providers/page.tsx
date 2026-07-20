'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDrawer,
  PermissionGuard,
  RowActions,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { useChannels } from '@/hooks/api/useCompanyChannelProviders';
import {
  usePlatformProviders,
  useCreateProviderMutation,
  useUpdateProviderMutation,
  useDeleteProviderMutation,
} from '@/hooks/api/usePlatformProviders';
import { usePermissions } from '@/hooks/usePermissions';
import type { Channel, Provider } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key: 'API Key',
  smtp: 'SMTP',
  oauth: 'OAuth 2.0',
  access_keys: 'Access Keys',
};

const CONNECTION_TYPE_OPTIONS = [
  { value: 'smtp', label: 'SMTP' },
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'access_keys', label: 'Access Keys' },
] as const;

const PAGE_SIZE = 50;

// ─── Form schema ──────────────────────────────────────────────────────────────

const providerSchema = z.object({
  providerKey: z
    .string()
    .min(1, 'Required')
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, hyphens, and underscores only'),
  displayName: z.string().min(1, 'Required').max(120),
  description: z.string().max(500).optional(),
  channelId: z.string().min(1, 'Required'),
  connectionType: z.enum(['api_key', 'smtp', 'oauth', 'access_keys']),
  isActive: z.boolean().optional(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

// ─── Provider Drawer ──────────────────────────────────────────────────────────

interface ProviderDrawerProps {
  open: boolean;
  editTarget: Provider | null;
  onClose: () => void;
}

function ProviderDrawer({ open, editTarget, onClose }: ProviderDrawerProps) {
  const isEditing = Boolean(editTarget);
  const createMutation = useCreateProviderMutation();
  const updateMutation = useUpdateProviderMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: channelsData } = useChannels();
  const channels = channelsData ?? [];

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      providerKey: '',
      displayName: '',
      description: '',
      channelId: '',
      connectionType: 'api_key',
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (editTarget) {
      const channelId =
        typeof editTarget.channelId === 'object'
          ? (editTarget.channelId as Channel).id
          : (editTarget.channelId as string);
      form.reset({
        providerKey: editTarget.providerKey,
        displayName: editTarget.displayName,
        description: editTarget.description ?? '',
        channelId,
        connectionType: editTarget.connectionType,
        isActive: editTarget.isActive,
      });
    } else {
      form.reset({
        providerKey: '',
        displayName: '',
        description: '',
        channelId: '',
        connectionType: 'api_key',
        isActive: true,
      });
    }
  }, [editTarget, form]);

  async function onSubmit(values: ProviderFormValues) {
    if (isEditing && editTarget) {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        displayName: values.displayName,
        description: values.description,
        channelId: values.channelId,
        isActive: values.isActive,
      });
    } else {
      await createMutation.mutateAsync({
        providerKey: values.providerKey,
        displayName: values.displayName,
        description: values.description,
        channelId: values.channelId,
        connectionType: values.connectionType,
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
      title={isEditing ? 'Edit Provider' : 'New Provider'}
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
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Provider'}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Controller
          name="providerKey"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Provider Key"
              fullWidth
              size="small"
              required
              disabled={isEditing}
              error={Boolean(form.formState.errors.providerKey)}
              helperText={
                form.formState.errors.providerKey?.message ??
                'Unique identifier (e.g. sendgrid, twilio)'
              }
              placeholder="sendgrid"
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
          name="channelId"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Channel"
              fullWidth
              size="small"
              required
              error={Boolean(form.formState.errors.channelId)}
              helperText={form.formState.errors.channelId?.message}
            >
              {channels.length === 0 ? (
                <MenuItem value="" disabled>No channels available</MenuItem>
              ) : (
                channels.map((ch) => (
                  <MenuItem key={ch.id} value={ch.id}>{ch.displayName}</MenuItem>
                ))
              )}
            </TextField>
          )}
        />
        <Controller
          name="connectionType"
          control={form.control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Connection Type"
              fullWidth
              size="small"
              required
              disabled={isEditing}
              error={Boolean(form.formState.errors.connectionType)}
              helperText={form.formState.errors.connectionType?.message}
            >
              <MenuItem value="api_key">API Key</MenuItem>
              <MenuItem value="smtp">SMTP</MenuItem>
              <MenuItem value="oauth">OAuth 2.0</MenuItem>
              <MenuItem value="access_keys">Access Keys</MenuItem>
            </TextField>
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

export default function ProvidersPage() {
  const { canManageProviders } = usePermissions();

  const { data, isLoading, error } = usePlatformProviders();
  const deleteMutation = useDeleteProviderMutation();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filterConnectionType, setFilterConnectionType] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Provider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);

  const providers = useMemo(() => data?.items ?? [], [data]);
  const hasActiveFilters = Boolean(search || filterConnectionType);

  const filtered = useMemo(
    () =>
      providers.filter((p) => {
        const matchesSearch =
          p.displayName.toLowerCase().includes(search.toLowerCase()) ||
          p.providerKey.toLowerCase().includes(search.toLowerCase());
        const matchesType = !filterConnectionType || p.connectionType === filterConnectionType;
        return matchesSearch && matchesType;
      }),
    [providers, search, filterConnectionType],
  );

  // Client-side pagination
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterConnectionType('');
    setPage(0);
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((provider: Provider) => {
    setEditTarget(provider);
    setDrawerOpen(true);
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  // Desktop columns — Channel column intentionally omitted (no raw ObjectIds per DEC-015)
  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'providerKey',
        headerName: 'Provider Key',
        flex: 1,
        minWidth: 130,
        renderCell: (p) => (
          <Typography variant="body2" fontFamily="monospace" fontWeight={500} noWrap>
            {(p.row as Provider).providerKey}
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
            {(p.row as Provider).displayName}
          </Typography>
        ),
      },
      {
        field: 'connectionType',
        headerName: 'Connection Type',
        width: 145,
        renderCell: (p) => (
          <Chip
            label={CONNECTION_TYPE_LABELS[(p.row as Provider).connectionType] ?? (p.row as Provider).connectionType}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: (p) => <StatusBadge active={(p.row as Provider).isActive} />,
      },
    ],
    [],
  );

  // Mobile card config
  const mobileCardConfig = useMemo<MobileCardConfig<Provider>>(
    () => ({
      primaryText: 'displayName',
      secondaryText: 'providerKey',
      badge: (row) => <StatusBadge active={row.isActive} />,
      fields: [
        {
          field: 'connectionType',
          label: 'Connection',
          render: (v) => (
            <Chip
              label={CONNECTION_TYPE_LABELS[v as string] ?? String(v)}
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
    }),
    [],
  );

  // Row actions
  const rowActions = useCallback(
    (row: Provider) => (
      <PermissionGuard allowed={canManageProviders}>
        <RowActions>
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
        </RowActions>
      </PermissionGuard>
    ),
    [canManageProviders, openEdit],
  );

  const emptyState = (
    <EmptyState
      icon={ExtensionOutlinedIcon}
      title={hasActiveFilters ? 'No providers match your filters' : 'No providers yet'}
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filter.'
          : 'Create the first provider to make it available for companies.'
      }
      action={
        hasActiveFilters ? (
          <Button variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : (
          <PermissionGuard allowed={canManageProviders}>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
              Create Provider
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
        title="Providers"
        count={filtered.length}
        subtitle="Manage global providers available to all companies."
        actions={
          <PermissionGuard allowed={canManageProviders}>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
              Create Provider
            </Button>
          </PermissionGuard>
        }
      />

      {/* Filter bar — DEC-015 §2 */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search providers…"
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
          <FormControl size="small" sx={{ width: { xs: '100%', sm: 160 } }}>
            <InputLabel>Connection Type</InputLabel>
            <Select
              value={filterConnectionType}
              label="Connection Type"
              onChange={(e) => {
                setFilterConnectionType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=""><em>All types</em></MenuItem>
              {CONNECTION_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
      <DataTable<Provider>
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
        noRowsLabel="No providers found."
        getRowId={(row) => row.id}
      />

      <ProviderDrawer
        open={drawerOpen}
        editTarget={editTarget}
        onClose={() => setDrawerOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete provider?"
        description={`Provider "${deleteTarget?.displayName}" will be permanently deleted. Companies using this provider will lose access.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
