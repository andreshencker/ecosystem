'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Alert from '@mui/material/Alert';
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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

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
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useCompanyIntegrations,
  useCreateCompanyIntegrationMutation,
  useUpdateCompanyIntegrationMutation,
  useDeleteCompanyIntegrationMutation,
  useRotateIntegrationTokenMutation,
  useDeactivateCompanyIntegrationMutation,
  useActivateCompanyIntegrationMutation,
  type CreateCompanyIntegrationDto,
} from '@/hooks/api/useCompanyIntegrations';
import type { CompanyIntegration, CompanyIntegrationWithToken, IntegrationEnvironment } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENV_LABELS: Record<IntegrationEnvironment, string> = {
  development: 'Development',
  staging:     'Staging',
  production:  'Production',
};

const ENV_COLORS: Record<IntegrationEnvironment, 'default' | 'warning' | 'success'> = {
  development: 'default',
  staging:     'warning',
  production:  'success',
};

const slugRegex = /^[a-z0-9_-]+$/;

// ─── Schema ───────────────────────────────────────────────────────────────────

const integrationSchema = z.object({
  integrationKey: z.string().min(1, 'Required').max(100).regex(slugRegex, 'Lowercase, numbers, underscores and hyphens only'),
  displayName:    z.string().min(1, 'Required').max(200),
  description:    z.string().max(1000).optional().default(''),
  environment:    z.enum(['development', 'staging', 'production']).default('development'),
  expiresAt:      z.string().optional().nullable(),
  isActive:       z.boolean().default(true),
});

type IntegrationFormValues = z.infer<typeof integrationSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── How To Connect Modal ─────────────────────────────────────────────────────

const ENDPOINT = 'POST /notifications/event';

const CURL_EXAMPLE = `curl -X POST https://your-api.example.com/notifications/event \\
  -H "Content-Type: application/json" \\
  -H "x-integration-token: <your-token>" \\
  -d '{
    "event": "orders.order_confirmed",
    "email": "customer@example.com",
    "payload": {
      "data": {
        "orderId": "ORD-123",
        "amount": "AU$1,250.00"
      }
    }
  }'`;

const BODY_EXAMPLE = `{
  "event": "security.company_user_invitation",
  "email": "user@example.com",
  "payload": {
    "data": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}`;

const RESPONSE_EXAMPLE = `{
  "eventKey": "company_user_invitation",
  "companyId": "resolved internally",
  "results": [
    {
      "channel": "EMAIL",
      "provider": "gmail",
      "success": true
    }
  ]
}`;

const INTERNAL_TS_EXAMPLE = `// Inside any business service that needs to send a notification:

async function inviteUser(actor: AuthContext, data: InviteData) {
  // 1. Perform the business operation
  const user = await this.userRepository.create(data);

  // 2. Trigger the notification — the ONLY permitted pattern
  await this.notificationService.notifyEvent({
    companyId: actor.companyId,                   // from auth context
    event:     'security.company_user_invitation', // domainKey.eventKey
    email:     data.email,
    payload: {
      data: {
        firstName:    data.firstName,
        tempPassword: generatedPassword,
        loginUrl:     this.config.get('APP_BASE_URL') + '/auth/login',
      },
    },
  });
}

// Platform Admin flow — identical pattern, different companyId:
await this.notificationService.notifyEvent({
  companyId: config.PLATFORM_COMPANY_ID,          // not the actor's company
  event:     'security.platform_admin_invitation',
  email:     invitee.email,
  payload:   { data: { firstName, tempPassword, loginUrl } },
});`;

function CopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
            {copied
              ? <CheckCircleOutlinedIcon fontSize="small" />
              : <ContentCopyOutlinedIcon fontSize="small" />
            }
          </IconButton>
        </Tooltip>
      </Box>
      <Paper
        variant="outlined"
        sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, overflow: 'auto' }}
      >
        <Typography
          component="pre"
          variant="body2"
          fontFamily="monospace"
          fontSize="0.78rem"
          sx={{ m: 0, whiteSpace: 'pre', lineHeight: 1.6 }}
        >
          {content}
        </Typography>
      </Paper>
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Stack spacing={0.75}>
      {items.map((note, i) => (
        <Box key={i} display="flex" gap={1} alignItems="flex-start">
          <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ flexShrink: 0 }}>·</Typography>
          <Typography variant="body2" color="text.secondary">{note}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

function StepList({ steps }: { steps: { title?: string; text: string }[] }) {
  return (
    <Stack spacing={1.5}>
      {steps.map(({ title, text }, i) => (
        <Box key={i} display="flex" gap={1.5} alignItems="flex-start">
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.1 }}>
            <Typography variant="caption" color="white" fontWeight={700} lineHeight={1}>{i + 1}</Typography>
          </Box>
          <Box>
            {title && <Typography variant="body2" fontWeight={600}>{title}</Typography>}
            <Typography variant="body2" color="text.secondary">{text}</Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}

function HowToConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = React.useState(0);

  function handleClose() {
    setTab(0);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '92vh' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        How notifications work
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v as number)} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="Internal Events" />
          <Tab label="External Applications" />
          <Tab label="Example Request" />
          <Tab label="Example Response" />
          <Tab label="Best Practices" />
        </Tabs>
      </Box>

      <DialogContent>

        {/* ── Tab 0: Overview ─────────────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Every notification in the platform — whether triggered by a business service, a platform admin, or an external application — flows through a single engine:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography component="pre" variant="body2" fontFamily="monospace" fontSize="0.78rem" sx={{ m: 0, whiteSpace: 'pre', lineHeight: 1.6 }}>
                {`NotificationService.notifyEvent({\n  companyId,   ← always resolved server-side\n  event,       ← domainKey.eventKey\n  email?,\n  phone?,\n  payload?,\n})`}
              </Typography>
            </Paper>
            <Typography variant="subtitle2">Three sources, one engine</Typography>
            <StepList steps={[
              { title: 'Platform Admin', text: 'Platform-level services trigger events such as admin invitations or password resets using the modules company ID. The code path is identical to company notifications.' },
              { title: 'Company Owner / Admin / Operator', text: 'Business services trigger company-scoped events — user invitations, welcome emails, password resets — using the actor\'s companyId from their auth context.' },
              { title: 'External Applications', text: 'ERP, CRM, HR systems, mobile apps, and trading platforms call POST /notifications/event with an integration token. The server resolves companyId from the token. The external app never sends or knows the company identifier.' },
            ]} />
            <Alert severity="info" variant="outlined">
              <strong>Key principle:</strong> NotificationService does not know whether the trigger was internal or external.
              It receives a canonical payload with a resolved <code>companyId</code> — that is all.
            </Alert>
            <Divider />
            <Typography variant="subtitle2">Credential resolution</Typography>
            <Typography variant="body2" color="text.secondary">
              All notifications use the credentials belonging to the <strong>resolved company</strong> — not the caller&apos;s company, not a shared pool, and not the platform. The integration token is the only source of company identity for external callers. Cross-company triggering is structurally impossible.
            </Typography>
          </Stack>
        </TabPanel>

        {/* ── Tab 1: Internal Events ──────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Business services trigger notifications by injecting <code>NotificationService</code> and calling <code>notifyEvent()</code>.
              The <code>companyId</code> always comes from the authenticated actor&apos;s context — never hardcoded.
            </Typography>
            <CopyBlock label="TypeScript — internal trigger pattern" content={INTERNAL_TS_EXAMPLE} />
            <Typography variant="subtitle2">Rules for internal callers</Typography>
            <BulletList items={[
              'Always use the domainKey.eventKey format — e.g. security.company_user_invitation, orders.order_confirmed.',
              'Never construct HTML inside a business service. Put the template in EventCatalogue. Callers only provide payload.data.* variables.',
              'companyId must come from the authenticated actor\'s context, never hardcoded.',
              'Do not catch NotificationService errors silently — failed deliveries must be observable in ExecutionLog.',
              'Never call provider adapters (email, SMS) directly from business code. notifyEvent() is the only permitted integration point.',
              'Platform Admin flows use the same pattern with companyId = config.PLATFORM_COMPANY_ID.',
            ]} />
            <Alert severity="info" variant="outlined">
              To find the correct event key: open <strong>Domains</strong>, find the domain, then open <strong>Events</strong> and filter by domain.
              Check <code>requiredVariables</code> to know which <code>payload.data.*</code> fields you must supply.
            </Alert>
          </Stack>
        </TabPanel>

        {/* ── Tab 2: External Applications ────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              External systems — ERP, CRM, HR, e-commerce, trading platforms, mobile apps — connect to a company via an integration token.
              The token is the only source of company identity. The external app never sends or knows the <code>companyId</code>.
            </Typography>
            <Typography variant="subtitle2">How companyId is resolved</Typography>
            <StepList steps={[
              { title: 'Create an integration', text: 'On this page, click "New Integration". Choose the environment (development, staging, production).' },
              { title: 'Copy the token once', text: 'The raw token is shown exactly once — on create or rotate. Copy it immediately. It cannot be recovered.' },
              { title: 'Store the token in your app', text: 'Store the token as a backend environment variable (e.g. COMM_INTEGRATION_TOKEN). Never expose it in frontend code, browser storage, or version control.' },
              { title: 'Send the request', text: 'POST /notifications/event with the token in the x-integration-token header. Do not include companyId in the body.' },
              { title: 'Server validates the token', text: 'The server hashes the token (SHA-256), looks up the CompanyIntegration, asserts it is active and not expired, updates lastUsedAt, and extracts companyId.' },
              { title: 'Engine takes over', text: 'The resolved companyId is passed to NotificationService — exactly as any internal trigger. The delivery pipeline is identical.' },
            ]} />
            <Alert severity="warning" variant="outlined">
              <strong>Cross-company triggering is structurally impossible.</strong> The token is the only source of company identity.
              An external app cannot send a notification for any company other than the one the token belongs to.
            </Alert>
          </Stack>
        </TabPanel>

        {/* ── Tab 3: Example Request ──────────────────────────────────────── */}
        <TabPanel value={tab} index={3}>
          <Stack spacing={2}>
            <CopyBlock label="Endpoint" content={ENDPOINT} />
            <CopyBlock label="cURL example" content={CURL_EXAMPLE} />
            <CopyBlock label="JSON body" content={BODY_EXAMPLE} />
            <Alert severity="info" variant="outlined">
              Do <strong>not</strong> include <code>companyId</code> in the request body.
              It is resolved server-side from the <code>x-integration-token</code> header.
            </Alert>
          </Stack>
        </TabPanel>

        {/* ── Tab 4: Example Response ─────────────────────────────────────── */}
        <TabPanel value={tab} index={4}>
          <Stack spacing={2}>
            <CopyBlock label="Success response" content={RESPONSE_EXAMPLE} />
            <Typography variant="subtitle2">Response fields</Typography>
            <Stack spacing={1}>
              {([
                ['eventKey',          'The triggered event key (without domain prefix).'],
                ['companyId',         '"resolved internally" — never echoed back. The token is the company identity.'],
                ['results',           'Array of delivery results, one per channel configured for the event domain.'],
                ['results[].channel', 'Channel used: EMAIL, SMS, or STORAGE.'],
                ['results[].provider','Provider used: gmail, sendgrid, mailgun, twilio, s3, etc.'],
                ['results[].success', 'true if delivery succeeded; false on failure. ExecutionLog always records both.'],
              ] as [string, string][]).map(([field, desc]) => (
                <Box key={field} display="flex" gap={1.5} alignItems="flex-start">
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem" color="primary.main" sx={{ flexShrink: 0, minWidth: 190 }}>{field}</Typography>
                  <Typography variant="body2" color="text.secondary">{desc}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </TabPanel>

        {/* ── Tab 5: Best Practices ───────────────────────────────────────── */}
        <TabPanel value={tab} index={5}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Token security</Typography>
            <BulletList items={[
              'Store tokens in backend environment variables only — never in frontend code, browser storage, or version control.',
              'Use a separate integration per environment (development, staging, production).',
              'Use a separate integration per external system — do not share tokens between apps.',
              'Rotate tokens periodically. The old token is invalidated immediately on rotation.',
              'Set an expiry date for tokens used in temporary integrations.',
              'Deactivate integrations that are no longer in use rather than deleting them — deactivated records preserve the audit trail.',
            ]} />
            <Divider />
            <Typography variant="subtitle2">Event keys</Typography>
            <BulletList items={[
              'The event must exist in the Event Catalogue before you can trigger it.',
              'Format is always domainKey.eventKey — e.g. orders.order_confirmed, billing.invoice_issued, security.company_user_invitation.',
              'Check requiredVariables in the event definition to know which payload.data.* fields are mandatory.',
              'Missing required variables may produce incomplete notifications without returning an error — validate locally before sending.',
            ]} />
            <Divider />
            <Typography variant="subtitle2">Credentials and delivery</Typography>
            <BulletList items={[
              'Notifications use the credentials of the resolved company — not a shared pool and not the modules.',
              'The domain must have channel credentials configured before notifications can be delivered on that channel.',
              'If credentials are missing for a channel, that channel\'s delivery is skipped silently.',
              'ExecutionLog records every attempt — success or failure — and is the primary source for observability and audit.',
              'An inactive or expired token is rejected with 401 Unauthorized.',
            ]} />
          </Stack>
        </TabPanel>

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Token Reveal Modal ───────────────────────────────────────────────────────

interface TokenRevealModalProps {
  open: boolean;
  onClose: () => void;
  integration: CompanyIntegrationWithToken | null;
  isRotate?: boolean;
}

function TokenRevealModal({ open, onClose, integration, isRotate }: TokenRevealModalProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!integration?.rawToken) return;
    navigator.clipboard.writeText(integration.rawToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isRotate ? 'Token Rotated' : 'Integration Created'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="warning" icon={<VisibilityOffOutlinedIcon />}>
            Copy this token now. <strong>You will not be able to see it again.</strong>
          </Alert>

          {integration && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={600}>
                {isRotate ? 'NEW TOKEN' : 'INTEGRATION TOKEN'}
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  fontSize="0.82rem"
                  sx={{ flex: 1, wordBreak: 'break-all' }}
                >
                  {integration.rawToken}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
                  <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                    {copied
                      ? <CheckCircleOutlinedIcon fontSize="small" />
                      : <ContentCopyOutlinedIcon fontSize="small" />
                    }
                  </IconButton>
                </Tooltip>
              </Paper>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Integration
            </Typography>
            <Typography variant="body2" fontWeight={500}>{integration?.displayName}</Typography>
            <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize="0.8rem">
              {integration?.integrationKey}
            </Typography>
          </Box>

          <Alert severity="info" variant="outlined">
            Use this token as the <code>x-integration-token</code> header when calling the Communication API.
            Store it securely — it cannot be recovered.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Integration Form Drawer ──────────────────────────────────────────────────

interface IntegrationFormDrawerProps {
  open: boolean;
  integration: CompanyIntegration | null;
  companyId: string;
  onClose: () => void;
  onCreated: (result: CompanyIntegrationWithToken) => void;
}

function IntegrationFormDrawer({
  open,
  integration,
  companyId,
  onClose,
  onCreated,
}: IntegrationFormDrawerProps) {
  const createMutation = useCreateCompanyIntegrationMutation();
  const updateMutation = useUpdateCompanyIntegrationMutation();
  const isEditing      = Boolean(integration);
  const isPending      = createMutation.isPending || updateMutation.isPending;

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationSchema),
    values: {
      integrationKey: integration?.integrationKey ?? '',
      displayName:    integration?.displayName    ?? '',
      description:    integration?.description    ?? '',
      environment:    (integration?.environment   ?? 'development') as IntegrationFormValues['environment'],
      expiresAt:      integration?.expiresAt
        ? new Date(integration.expiresAt).toISOString().slice(0, 10)
        : '',
      isActive:       integration?.isActive ?? true,
    },
  });

  const { control, handleSubmit, formState: { errors } } = form;

  async function onSubmit(values: IntegrationFormValues) {
    if (isEditing && integration) {
      await updateMutation.mutateAsync({
        id:          integration.id,
        displayName: values.displayName,
        description: values.description ?? '',
        environment: values.environment,
        expiresAt:   values.expiresAt || null,
        isActive:    values.isActive,
      });
      onClose();
    } else {
      const result = await createMutation.mutateAsync({
        companyId,
        integrationKey: values.integrationKey,
        displayName:    values.displayName,
        description:    values.description ?? '',
        environment:    values.environment,
        expiresAt:      values.expiresAt || null,
      } as CreateCompanyIntegrationDto);
      onCreated(result as CompanyIntegrationWithToken);
      onClose();
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Integration' : 'New Integration'}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Integration'}
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <Controller
          name="displayName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Display Name"
              fullWidth
              size="small"
              required
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              placeholder="JTrade Backend"
            />
          )}
        />

        <Controller
          name="integrationKey"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Integration Key"
              fullWidth
              size="small"
              required
              disabled={isEditing}
              error={Boolean(errors.integrationKey)}
              helperText={errors.integrationKey?.message ?? (isEditing ? 'Cannot change after creation' : 'Unique slug — e.g. jtrade_backend')}
              placeholder="jtrade_backend"
              InputProps={isEditing ? { sx: { fontFamily: 'monospace' } } : undefined}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Description"
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="Backend service for JTrade order notifications"
              helperText="Optional — for internal documentation"
            />
          )}
        />

        <Controller
          name="environment"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Environment"
              fullWidth
              size="small"
              required
              helperText="Production tokens use gpf_live_ prefix; others use gpf_test_"
            >
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </TextField>
          )}
        />

        <Controller
          name="expiresAt"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Expires At"
              fullWidth
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
              helperText="Optional — leave blank for no expiry"
              value={field.value ?? ''}
            />
          )}
        />

        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
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

export default function CompanyIntegrationsPage() {
  const companyId = useAuthStore((s) => s.companyId);
  const { canManageCredentials } = usePermissions();

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useCompanyIntegrations(companyId, { limit: 100 });
  const allRows = useMemo(() => data?.items ?? [], [data]);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,      setPage]      = useState(0);
  const pageSize = 50;

  const hasActiveFilters = Boolean(search || envFilter || statusFilter);

  function clearFilters() {
    setSearch('');
    setEnvFilter('');
    setStatusFilter('');
    setPage(0);
  }

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.integrationKey.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q),
      );
    }

    if (envFilter) rows = rows.filter((r) => r.environment === envFilter);

    if (statusFilter === 'active')   rows = rows.filter((r) => r.isActive);
    if (statusFilter === 'inactive') rows = rows.filter((r) => !r.isActive);

    return rows;
  }, [allRows, search, envFilter, statusFilter]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize],
  );

  // ── Drawer state ─────────────────────────────────────────────────────────────
  const [howToOpen,     setHowToOpen]     = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<CompanyIntegration | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<CompanyIntegration | null>(null);
  const [rotateTarget,  setRotateTarget]  = useState<CompanyIntegration | null>(null);
  const [tokenResult,   setTokenResult]   = useState<CompanyIntegrationWithToken | null>(null);
  const [isTokenRotate, setIsTokenRotate] = useState(false);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteMutation     = useDeleteCompanyIntegrationMutation();
  const rotateMutation     = useRotateIntegrationTokenMutation();
  const deactivateMutation = useDeactivateCompanyIntegrationMutation();
  const activateMutation   = useActivateCompanyIntegrationMutation();

  const confirmPending = deleteMutation.isPending || rotateMutation.isPending;

  function openCreate() { setEditTarget(null); setDrawerOpen(true); }
  function openEdit(row: CompanyIntegration) { setEditTarget(row); setDrawerOpen(true); }

  function handleCreated(result: CompanyIntegrationWithToken) {
    setIsTokenRotate(false);
    setTokenResult(result);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleRotate() {
    if (!rotateTarget) return;
    const result = await rotateMutation.mutateAsync(rotateTarget.id);
    setRotateTarget(null);
    setIsTokenRotate(true);
    setTokenResult(result);
  }

  const handleToggleActive = useCallback(async (row: CompanyIntegration) => {
    if (row.isActive) {
      await deactivateMutation.mutateAsync(row.id);
    } else {
      await activateMutation.mutateAsync(row.id);
    }
  }, [deactivateMutation, activateMutation]);

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns = useMemo<GridColDef<CompanyIntegration>[]>(
    () => [
      {
        field: 'displayName',
        headerName: 'Name',
        flex: 1.2,
        minWidth: 140,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" fontWeight={500} noWrap>{row.displayName}</Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {row.description.slice(0, 50)}{row.description.length > 50 ? '…' : ''}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'integrationKey',
        headerName: 'Integration Key',
        flex: 1,
        minWidth: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" noWrap>
            {row.integrationKey}
          </Typography>
        ),
      },
      {
        field: 'environment',
        headerName: 'Environment',
        width: 130,
        renderCell: ({ row }) => (
          <Chip
            label={ENV_LABELS[row.environment] ?? row.environment}
            size="small"
            color={ENV_COLORS[row.environment] ?? 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'tokenPrefix',
        headerName: 'Token Prefix',
        width: 175,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap>
            {row.tokenPrefix}…
          </Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: ({ row }) => <StatusBadge active={row.isActive} />,
      },
      {
        field: 'lastUsedAt',
        headerName: 'Last Used',
        width: 115,
        renderCell: ({ row }) => (
          <Typography variant="caption" color="text.secondary">
            {formatRelativeDate(row.lastUsedAt)}
          </Typography>
        ),
      },
      {
        field: 'expiresAt',
        headerName: 'Expires At',
        width: 115,
        renderCell: ({ row }) => {
          const expired = isExpired(row.expiresAt);
          return (
            <Typography
              variant="caption"
              color={expired ? 'error.main' : 'text.secondary'}
            >
              {formatDate(row.expiresAt)}
              {expired && ' (expired)'}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  // ── Mobile card config ─────────────────────────────────────────────────────
  const mobileCardConfig = useMemo<MobileCardConfig<CompanyIntegration>>(
    () => ({
      primaryText:   'displayName',
      secondaryText: 'integrationKey',
      badge: (row) => <StatusBadge active={row.isActive} />,
      fields: [
        {
          field: 'environment',
          label: 'Environment',
          render: (v) => (
            <Chip
              label={ENV_LABELS[v as IntegrationEnvironment] ?? String(v)}
              size="small"
              color={ENV_COLORS[v as IntegrationEnvironment] ?? 'default'}
              variant="outlined"
            />
          ),
        },
        {
          field: 'tokenPrefix',
          label: 'Token',
          render: (v) => (
            <Typography variant="caption" fontFamily="monospace">{String(v)}…</Typography>
          ),
        },
        {
          field: 'lastUsedAt',
          label: 'Last Used',
          render: (v) => formatRelativeDate(v as string),
        },
      ],
    }),
    [],
  );

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: CompanyIntegration) => (
      <PermissionGuard allowed={canManageCredentials}>
        <RowActions>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? 'Deactivate' : 'Activate'}>
            <IconButton
              size="small"
              color={row.isActive ? 'warning' : 'success'}
              onClick={() => handleToggleActive(row)}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
            >
              {row.isActive
                ? <BlockOutlinedIcon fontSize="small" />
                : <CheckCircleOutlinedIcon fontSize="small" />
              }
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate token">
            <IconButton size="small" onClick={() => setRotateTarget(row)}>
              <RefreshOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canManageCredentials, handleToggleActive, deactivateMutation.isPending, activateMutation.isPending],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Integrations"
        count={filteredRows.length}
        subtitle="External applications connected to this company via integration tokens."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              startIcon={<HelpOutlineOutlinedIcon />}
              onClick={() => setHowToOpen(true)}
              size="small"
            >
              How it works
            </Button>
            <PermissionGuard allowed={canManageCredentials}>
              <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                New Integration
              </Button>
            </PermissionGuard>
          </Stack>
        }
      />

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

          <TextField
            size="small"
            placeholder="Search by name or key…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 170 } }}>
            <InputLabel>Environment</InputLabel>
            <Select value={envFilter} label="Environment" onChange={(e) => { setEnvFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All environments</em></MenuItem>
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 140 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All statuses</em></MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
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

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <DataTable<CompanyIntegration>
        columns={columns}
        rows={paginatedRows}
        total={filteredRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        emptyState={
          allRows.length === 0 ? (
            <EmptyState
              icon={ExtensionOutlinedIcon}
              title="No integrations yet"
              description="Create an integration to connect external applications to this company."
              action={
                canManageCredentials ? (
                  <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                    New Integration
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={ExtensionOutlinedIcon}
              title="No integrations match your filters"
              description="Try adjusting or clearing your filters."
              action={
                <Button variant="outlined" startIcon={<ClearOutlinedIcon />} onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )
        }
        noRowsLabel="No integrations found."
      />

      {/* ── Drawers & dialogs ─────────────────────────────────────────────── */}
      {companyId && (
        <IntegrationFormDrawer
          open={drawerOpen}
          integration={editTarget}
          companyId={companyId}
          onClose={() => setDrawerOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {/* How it works guide */}
      <HowToConnectModal open={howToOpen} onClose={() => setHowToOpen(false)} />

      {/* Token reveal modal — shown after create or rotate */}
      <TokenRevealModal
        open={Boolean(tokenResult)}
        onClose={() => setTokenResult(null)}
        integration={tokenResult}
        isRotate={isTokenRotate}
      />

      {/* Rotate token confirmation */}
      <ConfirmDialog
        open={Boolean(rotateTarget)}
        title="Rotate integration token?"
        description={`A new token will be generated for "${rotateTarget?.displayName}". The current token will be invalidated immediately. You must update all systems using the old token.`}
        confirmLabel="Rotate Token"
        onConfirm={handleRotate}
        onCancel={() => setRotateTarget(null)}
        loading={rotateMutation.isPending}
        danger
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete integration?"
        description={`"${deleteTarget?.displayName}" (${deleteTarget?.integrationKey}) will be permanently deleted. External systems using this token will immediately lose access.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
