'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WebhookOutlinedIcon from '@mui/icons-material/WebhookOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FormDrawer,
  RowActions,
  type MobileCardConfig,
} from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import { usePaymentsContext, connectionLabel } from '@/providers/PaymentsProvider';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import {
  useWebhookEndpoints,
  useWebhookEndpointDetail,
  useWebhookSupportedEventTypes,
  useCreateWebhookEndpointMutation,
  useDeleteWebhookEndpointMutation,
  useWebhookDeliveries,
  useWebhookDeliveryDetail,
  useRetryWebhookDeliveryMutation,
} from '@/hooks/api/usePayments';
import type {
  WebhookEndpointSummary,
  WebhookEndpointStatus,
  WebhookDeliverySummary,
  WebhookSignatureStatus,
  WebhookProcessingStatus,
  ListWebhookDeliveriesParams,
  CreateWebhookEndpointInput,
} from '@/types/payments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function truncateId(id: string, len = 22): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}
function truncateUrl(url: string, len = 40): string {
  return url.length > len ? `${url.slice(0, len)}…` : url;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function EndpointStatusBadge({ status }: { status: WebhookEndpointStatus }) {
  const colors: Record<WebhookEndpointStatus, 'success' | 'default' | 'error'> = {
    enabled: 'success', disabled: 'default', unknown: 'error',
  };
  return <Chip label={status.charAt(0).toUpperCase() + status.slice(1)} color={colors[status] ?? 'default'} size="small" variant={status === 'enabled' ? 'filled' : 'outlined'} />;
}

const SIG_COLORS: Record<WebhookSignatureStatus, 'success' | 'error' | 'warning' | 'default'> = {
  valid: 'success', invalid: 'error', missing: 'warning', not_supported: 'default', unknown: 'default',
};
const SIG_LABELS: Record<WebhookSignatureStatus, string> = {
  valid: 'Valid', invalid: 'Invalid', missing: 'Missing', not_supported: 'N/A', unknown: 'Unknown',
};

function SignatureBadge({ status }: { status: WebhookSignatureStatus }) {
  return <Chip label={SIG_LABELS[status] ?? status} color={SIG_COLORS[status] ?? 'default'} size="small" variant={status === 'valid' ? 'filled' : 'outlined'} />;
}

const PROC_COLORS: Record<WebhookProcessingStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  processed: 'success', failed: 'error', processing: 'info', verified: 'info', received: 'default', ignored: 'default', duplicate: 'warning',
};
const PROC_LABELS: Record<WebhookProcessingStatus, string> = {
  received: 'Received', verified: 'Verified', processing: 'Processing', processed: 'Processed', failed: 'Failed', ignored: 'Ignored', duplicate: 'Duplicate',
};

function ProcessingBadge({ status }: { status: WebhookProcessingStatus }) {
  return <Chip label={PROC_LABELS[status] ?? status} color={PROC_COLORS[status] ?? 'default'} size="small" variant={status === 'processed' || status === 'processing' ? 'filled' : 'outlined'} />;
}

// ─── Endpoint Detail Drawer ───────────────────────────────────────────────────

function EndpointDetailDrawer({ connectionId, endpointId, onClose }: { connectionId: string; endpointId: string; onClose: () => void }) {
  const { data, isLoading, error } = useWebhookEndpointDetail(connectionId, endpointId);
  return (
    <FormDrawer open onClose={onClose} title="Endpoint Detail" actions={<Button variant="outlined" onClick={onClose} fullWidth>Close</Button>}>
      {isLoading && <Box display="flex" justifyContent="center" pt={4}><CircularProgress /></Box>}
      {error && !isLoading && <ErrorState title="Could not load endpoint" description="The provider API returned an error." />}
      {data && !isLoading && (
        <Stack spacing={2.5}>
          <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Status</Typography><EndpointStatusBadge status={data.status} /></Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Overview</Typography>
            <Stack spacing={1}>
              <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>URL</Typography><Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{data.url}</Typography></Box>
              {data.environment && <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Environment</Typography><Typography variant="body2">{data.environment === 'live' ? 'Live' : 'Test'}</Typography></Box>}
              {data.apiVersion && <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">API Version</Typography><Typography variant="body2" fontFamily="monospace">{data.apiVersion}</Typography></Box>}
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Created</Typography><Typography variant="body2">{formatDate(data.createdAt)}</Typography></Box>
              {data.description && <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Description</Typography><Typography variant="body2">{data.description}</Typography></Box>}
            </Stack>
          </Box>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Provider IDs</Typography><Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Endpoint ID</Typography><Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{data.providerEndpointId}</Typography></Box></Box>
          {data.enabledEvents && data.enabledEvents.length > 0 && (
            <><Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Enabled Events ({data.enabledEvents.includes('*') ? 'All' : data.enabledEvents.length})</Typography>
              <Stack spacing={0.5}>{data.enabledEvents.map((e) => <Typography key={e} variant="body2" fontFamily="monospace" fontSize="0.75rem">{e}</Typography>)}</Stack>
            </Box></>
          )}
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Create Endpoint Drawer ───────────────────────────────────────────────────

function CreateEndpointDrawer({ connectionId, onClose }: { connectionId: string; onClose: (secret?: string) => void }) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [urlError, setUrlError] = useState('');
  const { data: eventTypesData, isLoading: eventTypesLoading } = useWebhookSupportedEventTypes(connectionId);
  const eventTypes = eventTypesData?.data ?? [];
  const mutation = useCreateWebhookEndpointMutation(connectionId);

  const handleSubmit = async () => {
    if (!url.trim()) { setUrlError('URL is required.'); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) { setUrlError('URL must start with https:// or http://.'); return; }
    setUrlError('');
    const dto: CreateWebhookEndpointInput = { url: url.trim(), enabledEvents: selectedEvents, description: description.trim() || undefined };
    const result = await mutation.mutateAsync(dto).catch(() => null);
    if (result) onClose(result.signingSecretOnce);
  };

  return (
    <FormDrawer open onClose={() => onClose()} title="Create Webhook Endpoint" actions={<Stack direction="row" spacing={1} width="100%"><Button variant="contained" onClick={() => void handleSubmit()} disabled={mutation.isPending} sx={{ flex: 1 }}>{mutation.isPending ? 'Creating…' : 'Create'}</Button><Button variant="outlined" onClick={() => onClose()} sx={{ flex: 1 }}>Cancel</Button></Stack>}>
      <Stack spacing={2.5}>
        <TextField label="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} error={Boolean(urlError)} helperText={urlError || 'The HTTPS URL where the provider sends events.'} placeholder="https://your-server.example.com/webhooks/stripe" fullWidth size="small" required />
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" fullWidth size="small" />
        <Box>
          <Typography variant="body2" fontWeight={500} mb={0.5}>Enabled Events *</Typography>
          {eventTypesLoading ? <CircularProgress size={20} /> : (
            <FormControl fullWidth size="small">
              <Select multiple value={selectedEvents} onChange={(e) => setSelectedEvents(e.target.value as string[])} renderValue={(sel) => sel.length === 0 ? 'Select events…' : `${sel.length} event${sel.length === 1 ? '' : 's'} selected`} displayEmpty>
                {eventTypes.map((ev) => <MenuItem key={ev} value={ev}><Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">{ev}</Typography></MenuItem>)}
              </Select>
              <FormHelperText>Choose the event types this endpoint should receive.</FormHelperText>
            </FormControl>
          )}
        </Box>
        {selectedEvents.length > 0 && <Box><Typography variant="caption" color="text.secondary" mb={0.5} display="block">Selected ({selectedEvents.length})</Typography><Stack spacing={0.25}>{selectedEvents.map((e) => <Typography key={e} variant="body2" fontFamily="monospace" fontSize="0.72rem">{e}</Typography>)}</Stack></Box>}
      </Stack>
    </FormDrawer>
  );
}

// ─── One-time Secret Dialog ───────────────────────────────────────────────────

function SigningSecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Signing Secret — Save Now</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="warning.main">This signing secret is shown exactly once. Copy and store it securely. It cannot be retrieved again.</Typography>
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{secret}</Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ContentCopyOutlinedIcon />} onClick={() => void handleCopy()} variant="outlined">{copied ? 'Copied!' : 'Copy Secret'}</Button>
        <Button onClick={onClose} variant="contained">I have saved it</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteEndpointDialog({ endpoint, connectionId, onClose }: { endpoint: WebhookEndpointSummary; connectionId: string; onClose: () => void }) {
  const mutation = useDeleteWebhookEndpointMutation(connectionId);
  const handleDelete = async () => { await mutation.mutateAsync(endpoint.id).catch(() => null); onClose(); };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Webhook Endpoint?</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">This will permanently delete the endpoint. Future events will no longer be delivered to:</Typography>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{endpoint.url}</Typography>
          <Typography variant="body2" color="text.secondary">Historical delivery records are preserved.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={() => void handleDelete()} disabled={mutation.isPending} color="error" variant="contained">{mutation.isPending ? 'Deleting…' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delivery Detail Drawer ───────────────────────────────────────────────────

function DeliveryDetailDrawer({ connectionId, deliveryId, onClose }: { connectionId: string; deliveryId: string; onClose: () => void }) {
  const { data, isLoading, error } = useWebhookDeliveryDetail(connectionId, deliveryId);
  const retryMutation = useRetryWebhookDeliveryMutation(connectionId);
  const canRetry = data?.signatureStatus === 'valid' && data?.processingStatus === 'failed' && !retryMutation.isPending;
  const handleRetry = async () => { await retryMutation.mutateAsync(deliveryId).catch(() => null); };
  return (
    <FormDrawer open onClose={onClose} title="Delivery Detail" actions={
      <Stack direction="row" spacing={1} width="100%">
        {canRetry && <Button variant="outlined" startIcon={<ReplayOutlinedIcon />} onClick={() => void handleRetry()} disabled={retryMutation.isPending} sx={{ flex: 1 }}>Retry</Button>}
        <Button variant="outlined" onClick={onClose} sx={{ flex: canRetry ? 1 : undefined, width: canRetry ? undefined : '100%' }}>Close</Button>
      </Stack>}>
      {isLoading && <Box display="flex" justifyContent="center" pt={4}><CircularProgress /></Box>}
      {error && !isLoading && <ErrorState title="Could not load delivery" description="Try again." />}
      {data && !isLoading && (
        <Stack spacing={2.5}>
          <Box display="flex" gap={1} flexWrap="wrap"><SignatureBadge status={data.signatureStatus} /><ProcessingBadge status={data.processingStatus} />{data.duplicate && <Chip label="Duplicate" size="small" color="warning" />}</Box>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Overview</Typography>
            <Stack spacing={1}>
              <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Event Type</Typography><Typography variant="body2" fontFamily="monospace">{data.eventType}</Typography></Box>
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Provider</Typography><Typography variant="body2">{data.provider}</Typography></Box>
              {data.livemode !== undefined && <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Environment</Typography><Typography variant="body2">{data.livemode ? 'Live' : 'Test'}</Typography></Box>}
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Received</Typography><Typography variant="body2">{formatDateTime(data.receivedAt)}</Typography></Box>
              {data.processedAt && <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Processed</Typography><Typography variant="body2">{formatDateTime(data.processedAt)}</Typography></Box>}
            </Stack>
          </Box>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Provider IDs</Typography>
            <Stack spacing={1}>
              <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Event ID</Typography><Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{data.providerEventId}</Typography></Box>
              {data.objectType && data.objectId && <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>{data.objectType}</Typography><Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{data.objectId}</Typography></Box>}
              {data.requestId && <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Request ID</Typography><Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>{data.requestId}</Typography></Box>}
            </Stack>
          </Box>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Security</Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Signature</Typography><SignatureBadge status={data.signatureStatus} /></Box>
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Duplicate</Typography><Typography variant="body2">{data.duplicate ? 'Yes' : 'No'}</Typography></Box>
              {data.payloadHash && <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Payload Hash (SHA-256)</Typography><Typography variant="body2" fontFamily="monospace" fontSize="0.7rem" sx={{ wordBreak: 'break-all' }}>{data.payloadHash}</Typography></Box>}
            </Stack>
          </Box>
          <Divider />
          <Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Processing</Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Status</Typography><ProcessingBadge status={data.processingStatus} /></Box>
              <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Attempts</Typography><Typography variant="body2">{data.attemptCount}</Typography></Box>
              {data.lastErrorCode && <Box display="flex" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Error Code</Typography><Typography variant="body2" fontFamily="monospace" color="error.main">{data.lastErrorCode}</Typography></Box>}
              {data.lastErrorMessage && <Box><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>Error Message</Typography><Typography variant="body2" color="error.main">{data.lastErrorMessage}</Typography></Box>}
            </Stack>
          </Box>
          {data.safePayloadSummary && Object.keys(data.safePayloadSummary).length > 0 && (
            <><Divider /><Box><Typography variant="subtitle2" fontWeight={600} mb={1}>Payload Summary</Typography>
              <Stack spacing={0.5}>{Object.entries(data.safePayloadSummary).map(([k, v]) => (
                <Box key={k} display="flex" justifyContent="space-between" gap={1}>
                  <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ flexShrink: 0 }}>{k}</Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Typography>
                </Box>
              ))}</Stack>
            </Box></>
          )}
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Endpoints Tab ────────────────────────────────────────────────────────────

function EndpointsTab({ connectionId }: { connectionId: string }) {
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [viewEndpointId, setViewEndpointId] = useState<string | null>(null);
  const [deleteEndpoint, setDeleteEndpoint] = useState<WebhookEndpointSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const { data: listData, isLoading, error, refetch } = useWebhookEndpoints(connectionId, { cursor, limit: 20 });
  const endpoints = listData?.data ?? [];
  const hasMore = listData?.hasMore ?? false;
  const nextCursor = listData?.nextCursor;

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'url', headerName: 'Endpoint', flex: 2, minWidth: 220, renderCell: (p) => { const row = p.row as WebhookEndpointSummary; return <Box><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{truncateUrl(row.url)}</Typography><Typography variant="caption" color="text.secondary" display="block" fontFamily="monospace">{truncateId(row.providerEndpointId)}</Typography></Box>; } },
    { field: 'status', headerName: 'Status', width: 100, renderCell: (p) => <EndpointStatusBadge status={(p.row as WebhookEndpointSummary).status} /> },
    { field: 'enabledEventCount', headerName: 'Events', width: 80, renderCell: (p) => { const c = (p.row as WebhookEndpointSummary).enabledEventCount; return <Typography variant="body2" color="text.secondary">{c === -1 ? 'All' : c}</Typography>; } },
    { field: 'environment', headerName: 'Env', width: 70, renderCell: (p) => { const env = (p.row as WebhookEndpointSummary).environment; return <Chip label={env === 'live' ? 'Live' : 'Test'} size="small" color={env === 'live' ? 'error' : 'default'} variant="outlined" />; } },
    { field: 'createdAt', headerName: 'Created', width: 110, renderCell: (p) => <Typography variant="body2" color="text.secondary">{formatDate((p.row as WebhookEndpointSummary).createdAt)}</Typography> },
  ], []);

  const rowActions = useCallback((row: WebhookEndpointSummary) => (
    <RowActions>
      <Tooltip title="View"><IconButton size="small" onClick={() => setViewEndpointId(row.id)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteEndpoint(row)} color="error"><DeleteOutlineOutlinedIcon fontSize="small" /></IconButton></Tooltip>
    </RowActions>
  ), []);

  const mobileCardConfig = useMemo<MobileCardConfig<WebhookEndpointSummary>>(() => ({
    primaryText: (row) => truncateUrl(row.url, 30),
    secondaryText: (row) => truncateId(row.providerEndpointId),
    badge: (row) => <EndpointStatusBadge status={row.status} />,
    fields: [{ field: 'enabledEventCount', label: 'Events', render: (v) => (v === -1 ? 'All' : String(v)) }, { field: 'createdAt', label: 'Created', render: (v) => formatDate(String(v)) }],
  }), []);

  const emptyState = <EmptyState icon={WebhookOutlinedIcon} title="No webhook endpoints configured" description="Create an endpoint to start receiving events." action={<Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowCreate(true)}>Create endpoint</Button>} />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Button size="small" variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={() => void refetch()} disabled={isLoading}>Refresh</Button>
        <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowCreate(true)}>Create endpoint</Button>
      </Box>
      {isLoading && <Box display="flex" justifyContent="center" pt={4}><CircularProgress /></Box>}
      {error && !isLoading && <ErrorState title="Could not load endpoints" description="Check credentials and try again." action={<Button onClick={() => void refetch()}>Retry</Button>} />}
      {!isLoading && !error && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <DataTable<WebhookEndpointSummary> rows={endpoints} columns={columns} total={endpoints.length} page={0} pageSize={endpoints.length || 20} onPageChange={() => {}} onPageSizeChange={() => {}} rowActions={rowActions} mobileCardConfig={mobileCardConfig} emptyState={emptyState} noRowsLabel="No endpoints found." getRowId={(row) => row.id} tableHeight="max(240px, calc(100vh - 440px))" />
          {(cursorStack.length > 0 || hasMore) && <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}><Button size="small" variant="outlined" onClick={() => { const s = [...cursorStack]; const p = s.pop(); setCursorStack(s); setCursor(p ?? undefined); }} disabled={cursorStack.length === 0}>Previous</Button><Button size="small" variant="outlined" onClick={() => { if (!nextCursor) return; setCursorStack((p) => [...p, cursor ?? '']); setCursor(nextCursor); }} disabled={!hasMore}>Next</Button></Box>}
        </Box>
      )}
      {viewEndpointId && <EndpointDetailDrawer connectionId={connectionId} endpointId={viewEndpointId} onClose={() => setViewEndpointId(null)} />}
      {showCreate && <CreateEndpointDrawer connectionId={connectionId} onClose={(secret) => { setShowCreate(false); if (secret) setSigningSecret(secret); }} />}
      {signingSecret && <SigningSecretDialog secret={signingSecret} onClose={() => setSigningSecret(null)} />}
      {deleteEndpoint && <DeleteEndpointDialog endpoint={deleteEndpoint} connectionId={connectionId} onClose={() => setDeleteEndpoint(null)} />}
    </Box>
  );
}

// ─── Deliveries Tab ───────────────────────────────────────────────────────────

const PROC_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' }, { value: 'processed', label: 'Processed' }, { value: 'failed', label: 'Failed' },
  { value: 'processing', label: 'Processing' }, { value: 'duplicate', label: 'Duplicate' }, { value: 'received', label: 'Received' }, { value: 'ignored', label: 'Ignored' },
];
const SIG_STATUS_OPTIONS = [
  { value: '', label: 'All signatures' }, { value: 'valid', label: 'Valid' }, { value: 'invalid', label: 'Invalid' }, { value: 'missing', label: 'Missing' },
];

function DeliveriesTab({ connectionId }: { connectionId: string }) {
  const [search, setSearch] = useState('');
  const [filterProc, setFilterProc] = useState('');
  const [filterSig, setFilterSig] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;
  const [viewDeliveryId, setViewDeliveryId] = useState<string | null>(null);

  const queryParams = useMemo<ListWebhookDeliveriesParams>(() => {
    const p: ListWebhookDeliveriesParams = { limit: LIMIT, offset };
    if (search.trim()) p.search = search.trim();
    if (filterProc) p.processingStatus = filterProc;
    if (filterSig) p.signatureStatus = filterSig;
    return p;
  }, [search, filterProc, filterSig, offset]);

  const { data: listData, isLoading, error, refetch } = useWebhookDeliveries(connectionId, queryParams);
  const deliveries = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const hasMore = listData?.hasMore ?? false;
  const hasFilters = Boolean(search || filterProc || filterSig);
  const clearFilters = useCallback(() => { setSearch(''); setFilterProc(''); setFilterSig(''); setOffset(0); }, []);

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'eventType', headerName: 'Event', flex: 1.5, minWidth: 200, renderCell: (p) => { const row = p.row as WebhookDeliverySummary; return <Box><Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">{row.eventType}</Typography><Typography variant="caption" color="text.secondary" display="block" fontFamily="monospace">{truncateId(row.providerEventId)}</Typography></Box>; } },
    { field: 'objectType', headerName: 'Object', width: 140, renderCell: (p) => { const row = p.row as WebhookDeliverySummary; if (!row.objectType || !row.objectId) return <Typography variant="body2" color="text.disabled">—</Typography>; return <Box><Typography variant="body2" fontSize="0.75rem">{row.objectType}</Typography><Typography variant="caption" color="text.secondary" fontFamily="monospace">{truncateId(row.objectId, 16)}</Typography></Box>; } },
    { field: 'signatureStatus', headerName: 'Signature', width: 100, renderCell: (p) => <SignatureBadge status={(p.row as WebhookDeliverySummary).signatureStatus} /> },
    { field: 'processingStatus', headerName: 'Processing', width: 110, renderCell: (p) => <ProcessingBadge status={(p.row as WebhookDeliverySummary).processingStatus} /> },
    { field: 'receivedAt', headerName: 'Received', width: 130, renderCell: (p) => <Typography variant="body2" color="text.secondary">{formatDate((p.row as WebhookDeliverySummary).receivedAt)}</Typography> },
    { field: 'attemptCount', headerName: 'Attempts', width: 80, renderCell: (p) => <Typography variant="body2" color="text.secondary">{(p.row as WebhookDeliverySummary).attemptCount}</Typography> },
  ], []);

  const rowActions = useCallback((row: WebhookDeliverySummary) => (
    <RowActions><Tooltip title="View details"><IconButton size="small" onClick={() => setViewDeliveryId(row.id)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip></RowActions>
  ), []);

  const mobileCardConfig = useMemo<MobileCardConfig<WebhookDeliverySummary>>(() => ({
    primaryText: (row) => row.eventType,
    secondaryText: (row) => truncateId(row.providerEventId, 24),
    badge: (row) => <ProcessingBadge status={row.processingStatus} />,
    fields: [{ field: 'signatureStatus', label: 'Signature', render: (v) => String(v) }, { field: 'receivedAt', label: 'Received', render: (v) => formatDate(String(v)) }],
  }), []);

  const emptyState = <EmptyState icon={WebhookOutlinedIcon} title={hasFilters ? 'No deliveries match your filters' : 'No webhook events have been received for this connection.'} description={hasFilters ? 'Try adjusting filters.' : 'Events will appear here when the provider sends them to your configured endpoints.'} action={hasFilters ? <Button onClick={clearFilters}>Clear filters</Button> : undefined} />;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center' }}>
        <Button size="small" variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={() => void refetch()} disabled={isLoading}>Refresh</Button>
        <TextField size="small" placeholder="Event ID, object ID…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> }} sx={{ width: 180 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}><Select value={filterProc} displayEmpty onChange={(e) => { setFilterProc(e.target.value); setOffset(0); }}>{PROC_STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.value === '' ? <em>{o.label}</em> : o.label}</MenuItem>)}</Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}><Select value={filterSig} displayEmpty onChange={(e) => { setFilterSig(e.target.value); setOffset(0); }}>{SIG_STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.value === '' ? <em>{o.label}</em> : o.label}</MenuItem>)}</Select></FormControl>
        {hasFilters && <Button size="small" variant="text" startIcon={<ClearOutlinedIcon fontSize="small" />} onClick={clearFilters}>Clear</Button>}
      </Box>
      {isLoading && <Box display="flex" justifyContent="center" pt={4}><CircularProgress /></Box>}
      {error && !isLoading && <ErrorState title="Could not load deliveries" description="Try again." action={<Button onClick={() => void refetch()}>Retry</Button>} />}
      {!isLoading && !error && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <DataTable<WebhookDeliverySummary> rows={deliveries} columns={columns} total={deliveries.length} page={0} pageSize={deliveries.length || LIMIT} onPageChange={() => {}} onPageSizeChange={() => {}} rowActions={rowActions} mobileCardConfig={mobileCardConfig} emptyState={emptyState} noRowsLabel="No deliveries found." getRowId={(row) => row.id} tableHeight="max(240px, calc(100vh - 440px))" />
          {total > LIMIT && <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</Typography><Button size="small" variant="outlined" onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>Previous</Button><Button size="small" variant="outlined" onClick={() => setOffset(offset + LIMIT)} disabled={!hasMore}>Next</Button></Box>}
        </Box>
      )}
      {viewDeliveryId && <DeliveryDetailDrawer connectionId={connectionId} deliveryId={viewDeliveryId} onClose={() => setViewDeliveryId(null)} />}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsWebhooksPage() {
  const {
    connections,
    connectionsLoading,
    connectionsError,
    resolvedConnectionId,
    resolvedProviderKey,
    selectedProvider,
    getCapabilityStatus,
    selectedConnection,
  } = usePaymentsContext();
  const [activeTab, setActiveTab] = useState(0);

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.webhooks);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  useEffect(() => { setActiveTab(0); }, [resolvedConnectionId]);

  const pageSubtitle = selectedConnection ? `Connection: ${connectionLabel(selectedConnection)}` : undefined;

  if (connectionsLoading) return <Box display="flex" justifyContent="center" pt={8}><CircularProgress /></Box>;

  if (connectionsError) return <Box sx={{ minWidth: 0 }}><PageHeader title="Webhooks" /><ErrorState title="Could not load payment connections" description="There was a problem loading your configured connections." /></Box>;

  if (connections.length === 0) return <Box sx={{ minWidth: 0 }}><PageHeader title="Webhooks" breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Webhooks' }]} /><EmptyState icon={WebhookOutlinedIcon} title="No payment providers configured" description="Configure a payment provider credential in the Credentials page." /></Box>;

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Webhooks" breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Webhooks' }]} />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.webhooks}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader title="Webhooks" subtitle={pageSubtitle} breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Webhooks' }]} />
      <PaymentsFilter />
      {!resolvedConnectionId ? (
        <EmptyState icon={LinkOutlinedIcon} title="No connection selected" description="Select a provider and connection above to manage webhooks." />
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, v: number) => setActiveTab(v)}>
              <Tab label="Endpoints" />
              <Tab label="Event Deliveries" />
            </Tabs>
          </Box>
          {activeTab === 0 && <EndpointsTab connectionId={resolvedConnectionId} />}
          {activeTab === 1 && <DeliveriesTab connectionId={resolvedConnectionId} />}
        </>
      )}
    </Box>
  );
}
