'use client';

import React, { useState, type ReactNode } from 'react';

import Alert           from '@mui/material/Alert';
import Box             from '@mui/material/Box';
import Button          from '@mui/material/Button';
import Card            from '@mui/material/Card';
import CardContent     from '@mui/material/CardContent';
import CardHeader      from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider         from '@mui/material/Divider';
import IconButton      from '@mui/material/IconButton';
import InputAdornment  from '@mui/material/InputAdornment';
import Stack           from '@mui/material/Stack';
import TextField       from '@mui/material/TextField';
import Tooltip         from '@mui/material/Tooltip';
import Typography      from '@mui/material/Typography';

import CableOutlinedIcon          from '@mui/icons-material/CableOutlined';
import DeleteOutlineIcon           from '@mui/icons-material/DeleteOutline';
import LinkOutlinedIcon            from '@mui/icons-material/LinkOutlined';
import PauseCircleOutlineIcon      from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon       from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon                 from '@mui/icons-material/Refresh';
import SwapHorizIcon               from '@mui/icons-material/SwapHoriz';
import TuneOutlinedIcon            from '@mui/icons-material/TuneOutlined';
import VisibilityOffOutlinedIcon   from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon      from '@mui/icons-material/VisibilityOutlined';
import WarningAmberOutlinedIcon    from '@mui/icons-material/WarningAmberOutlined';

import { PageHeader } from '@/components/layout';
import {
  useIntegration,
  type IntegrationConnection,
  type IntegrationTestResult,
} from '@/hooks/api/useCommunicationConnection';

// ─── Public props ─────────────────────────────────────────────────────────────

export interface IntegrationPageProps {
  provider:    string;
  title:       string;
  description: string;
  icon?:       ReactNode;
}

type View = 'connect' | 'saved' | 'replace';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 24)   return `${h} hour${h === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status indicator ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connected: { color: '#0EA66F', label: 'Connected'        },
  failed:    { color: '#DC2626', label: 'Connection Failed' },
  null:      { color: '#9CA3AF', label: 'Not Verified'     },
} as const;

function StatusIndicator({ status }: { status: IntegrationConnection['lastStatus'] }) {
  const cfg = STATUS_CONFIG[status ?? 'null'];
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box
        component="span"
        sx={{
          width: 10, height: 10,
          borderRadius: '50%',
          backgroundColor: cfg.color,
          flexShrink: 0,
          boxShadow: `0 0 0 3px ${cfg.color}22`,
        }}
      />
      <Typography variant="body2" fontWeight={600} color={cfg.color}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box display="flex" alignItems="baseline" gap={2}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 140, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" component="span">{value}</Typography>
    </Box>
  );
}

// ─── Section card wrapper (matches Business page pattern) ─────────────────────

function SectionCard({
  avatar,
  title,
  children,
}: {
  avatar: ReactNode;
  title:  string;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardHeader
        avatar={avatar}
        title={<Typography variant="subtitle1" fontWeight={600}>{title}</Typography>}
        sx={{ pb: 1 }}
      />
      <Divider />
      <CardContent sx={{ px: 3, py: 2.5 }}>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Token input with show/hide ───────────────────────────────────────────────

function TokenInput({
  value,
  onChange,
  placeholder,
  helperText,
}: {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  helperText?:  string;
}) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label="API Token"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      type={show ? 'text' : 'password'}
      autoComplete="off"
      placeholder={placeholder ?? 'Paste your API token here…'}
      helperText={helperText}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={show ? 'Hide token' : 'Show token'}>
              <IconButton size="small" onClick={() => setShow((v) => !v)} edge="end">
                {show
                  ? <VisibilityOffOutlinedIcon fontSize="small" />
                  : <VisibilityOutlinedIcon   fontSize="small" />}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}

// ─── ConnectForm (shared by "connect" and "replace" views) ────────────────────

interface ConnectFormProps {
  provider: string;
  mode:     'connect' | 'replace';
  onDone:   () => void;
  onCancel?: () => void;
}

function ConnectForm({ provider, mode, onDone, onCancel }: ConnectFormProps) {
  const { save, test } = useIntegration(provider);
  const [token,      setToken]      = useState('');
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);

  const isEmpty   = !token.trim();
  const testOk    = testResult?.success === true;
  const isLoading = test.isPending || save.isPending;

  async function handleTest() {
    setTestResult(null);
    const r = await test.mutateAsync({ token: token.trim() });
    setTestResult(r);
  }

  async function handleSave() {
    await save.mutateAsync({ token: token.trim(), isActive: true });
    onDone();
  }

  return (
    <Stack spacing={2.5}>
      <TokenInput
        value={token}
        onChange={(v) => { setToken(v); setTestResult(null); }}
        helperText="Stored encrypted — the raw token is never retained after verification."
      />

      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          sx={{ py: 0.5, fontSize: '0.8125rem' }}
        >
          {testResult.message}
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" gap={1}>
          {onCancel && (
            <Button variant="text" color="inherit" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button
            variant="outlined"
            disabled={isEmpty || isLoading}
            onClick={handleTest}
            startIcon={test.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            color={testResult ? (testResult.success ? 'success' : 'error') : 'primary'}
          >
            {test.isPending ? 'Testing…' : testResult ? 'Test Again' : 'Test Connection'}
          </Button>
        </Stack>

        {testOk && (
          <Button
            variant="contained"
            disabled={save.isPending}
            startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={handleSave}
          >
            {save.isPending
              ? 'Saving…'
              : mode === 'replace' ? 'Replace Connection' : 'Save Connection'}
          </Button>
        )}
      </Stack>

      {!testOk && !test.isPending && (
        <Typography variant="caption" color="text.disabled">
          {testResult
            ? 'Fix the token and test again before saving.'
            : 'Test the token first — save is enabled once the connection is verified.'}
        </Typography>
      )}
    </Stack>
  );
}

// ─── Connect view (no connection saved yet) ───────────────────────────────────

function ConnectView({ provider, onDone }: { provider: string; onDone: () => void }) {
  return (
    <Stack spacing={3}>
      <SectionCard
        avatar={<LinkOutlinedIcon color="action" />}
        title="Integration Setup"
      >
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Generate an integration token in Communications App and paste it below.
            The token is encrypted on save — it is never stored in plaintext.
          </Typography>
          <ConnectForm provider={provider} mode="connect" onDone={onDone} />
        </Stack>
      </SectionCard>
    </Stack>
  );
}

// ─── Status card (shared between saved view and replace view) ─────────────────

function ConnectionStatusCard({
  connection,
  localStatus,
  testMessage,
}: {
  connection:   IntegrationConnection;
  localStatus:  IntegrationConnection['lastStatus'];
  testMessage:  string | null;
}) {
  return (
    <SectionCard
      avatar={<CableOutlinedIcon color="action" />}
      title="Connection Status"
    >
      <Stack spacing={1.5}>
        <StatusIndicator status={localStatus} />

        <Box sx={{ height: 2 }} />

        <InfoRow
          label="Token"
          value={
            <Typography variant="body2" fontFamily="monospace" component="span">
              {connection.tokenPrefix ? `${connection.tokenPrefix}…` : '—'}
            </Typography>
          }
        />
        <InfoRow
          label="Provider"
          value={
            <Typography variant="body2" component="span" sx={{ textTransform: 'capitalize' }}>
              {connection.provider}
            </Typography>
          }
        />
        <InfoRow
          label="Active"
          value={connection.isActive ? 'Yes' : 'No'}
        />
        <InfoRow label="Connected"    value={formatDate(connection.createdAt)} />
        <InfoRow label="Last verified" value={relativeTime(connection.lastTestedAt)} />
      </Stack>

      {testMessage && (
        <Alert
          severity={localStatus === 'connected' ? 'success' : 'error'}
          sx={{ mt: 2.5, py: 0.5, fontSize: '0.8125rem' }}
        >
          {testMessage}
        </Alert>
      )}
      {connection.lastError && !testMessage && (
        <Alert severity="error" sx={{ mt: 2.5, py: 0.5, fontSize: '0.8125rem' }}>
          {connection.lastError}
        </Alert>
      )}
    </SectionCard>
  );
}

// ─── Saved view (three cards) ─────────────────────────────────────────────────

function SavedView({
  provider,
  connection,
  onReplace,
}: {
  provider:   string;
  connection: IntegrationConnection;
  onReplace:  () => void;
}) {
  const { test, toggle, remove } = useIntegration(provider);

  const [localStatus,   setLocalStatus]   = useState<IntegrationConnection['lastStatus']>(connection.lastStatus);
  const [testMessage,   setTestMessage]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const busy = test.isPending || toggle.isPending || remove.isPending;

  async function handleTest() {
    setTestMessage(null);
    const r = await test.mutateAsync({});
    setLocalStatus(r.status);
    setTestMessage(r.message);
  }

  async function handleToggle() {
    await toggle.mutateAsync({ isActive: !connection.isActive });
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await remove.mutateAsync();
  }

  return (
    <Stack spacing={3}>

      {/* ── 1. Connection Status ───────────────────────────────────────────── */}
      <ConnectionStatusCard
        connection={connection}
        localStatus={localStatus}
        testMessage={testMessage}
      />

      {/* ── 2. Actions ────────────────────────────────────────────────────── */}
      <SectionCard
        avatar={<TuneOutlinedIcon color="action" />}
        title="Actions"
      >
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" mb={1}>
            Verify the stored token or replace it with a new one generated in Communications App.
          </Typography>
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={
                test.isPending
                  ? <CircularProgress size={16} color="inherit" />
                  : <RefreshIcon />
              }
              disabled={busy}
              onClick={handleTest}
            >
              {test.isPending ? 'Testing…' : 'Test Connection'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              disabled={busy}
              onClick={onReplace}
            >
              Replace Token
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      {/* ── 3. Danger Zone ────────────────────────────────────────────────── */}
      <SectionCard
        avatar={<WarningAmberOutlinedIcon color="action" />}
        title="Danger Zone"
      >
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            Disabling the integration pauses all notification delivery without deleting credentials.
            Deleting the integration removes the encrypted token permanently.
          </Typography>

          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <Button
              variant="outlined"
              color={connection.isActive ? 'warning' : 'success'}
              startIcon={
                toggle.isPending
                  ? <CircularProgress size={16} color="inherit" />
                  : connection.isActive
                    ? <PauseCircleOutlineIcon />
                    : <PlayCircleOutlineIcon />
              }
              disabled={busy}
              onClick={handleToggle}
            >
              {toggle.isPending
                ? '…'
                : connection.isActive ? 'Disable Integration' : 'Enable Integration'}
            </Button>

            <Button
              variant="outlined"
              color={confirmDelete ? 'error' : 'inherit'}
              startIcon={
                remove.isPending
                  ? <CircularProgress size={16} color="inherit" />
                  : <DeleteOutlineIcon />
              }
              disabled={busy}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
            >
              {remove.isPending
                ? 'Deleting…'
                : confirmDelete ? 'Confirm Delete' : 'Delete Integration'}
            </Button>
          </Stack>

          {confirmDelete && (
            <Typography variant="caption" color="error.main">
              Click &quot;Confirm Delete&quot; to permanently remove this integration.
            </Typography>
          )}
        </Stack>
      </SectionCard>

    </Stack>
  );
}

// ─── Replace view (current status + replace form) ────────────────────────────

function ReplaceView({
  provider,
  connection,
  onDone,
  onCancel,
}: {
  provider:   string;
  connection: IntegrationConnection;
  onDone:     () => void;
  onCancel:   () => void;
}) {
  return (
    <Stack spacing={3}>
      {/* Show current connection as read-only reference */}
      <ConnectionStatusCard
        connection={connection}
        localStatus={connection.lastStatus}
        testMessage={null}
      />

      <SectionCard
        avatar={<SwapHorizIcon color="action" />}
        title="Replace Token"
      >
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Replacing the token encrypts and stores the new one, then discards the previous.
            Test the new token before saving.
          </Typography>
          <ConnectForm
            provider={provider}
            mode="replace"
            onDone={onDone}
            onCancel={onCancel}
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}

// ─── IntegrationPage (root) ───────────────────────────────────────────────────

export function IntegrationPage({ provider, title, description }: IntegrationPageProps) {
  const { connection } = useIntegration(provider);
  const [view, setView] = useState<View | null>(null);

  const currentView: View =
    view ?? (connection.data ? 'saved' : 'connect');

  return (
    <Box>
      <PageHeader title={title} subtitle={description} />

      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 4 }}>
        {connection.isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : currentView === 'saved' && connection.data ? (
          <SavedView
            provider={provider}
            connection={connection.data}
            onReplace={() => setView('replace')}
          />
        ) : currentView === 'replace' && connection.data ? (
          <ReplaceView
            provider={provider}
            connection={connection.data}
            onDone={() => setView('saved')}
            onCancel={() => setView('saved')}
          />
        ) : (
          <ConnectView
            provider={provider}
            onDone={() => setView('saved')}
          />
        )}
      </Box>
    </Box>
  );
}
