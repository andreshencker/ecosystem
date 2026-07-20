'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDrawer,
  PermissionGuard,
  RowActions,
  SearchToolbar,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import { useDomainCatalogues } from '@/hooks/api/useDomainCatalogue';
import {
  useEventCatalogues,
  useCreateEventCatalogueMutation,
  useUpdateEventCatalogueMutation,
  useDeleteEventCatalogueMutation,
  useBulkImportEventCatalogueMutation,
  usePreviewNotificationEmailHtmlMutation,
  type CreateEventCatalogueDto,
} from '@/hooks/api/useEventCatalogue';
import { useLayoutTemplates } from '@/hooks/api/useLayoutTemplates';
import type { DomainCatalogue, EventCatalogue, EventChannelContent } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  notification: 'Notification',
  alert:        'Alert',
  request:      'Request',
  security:     'Security',
};

const EVENT_TYPE_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'error'> = {
  notification: 'primary',
  alert:        'warning',
  request:      'default',
  security:     'error',
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

const eventSchema = z.object({
  domainCatalogueId: z.string().min(1, 'Domain is required'),
  eventKey:          z.string().min(1, 'Required').max(200).regex(slugRegex, 'Lowercase letters, numbers, underscores and hyphens only'),
  displayName:       z.string().min(1, 'Required').max(300),
  description:       z.string().max(1000).optional().default(''),
  eventType:         z.enum(['notification', 'alert', 'request', 'security']),
  isActive:          z.boolean().default(true),
  emailEnabled:      z.boolean().default(false),
  emailSubject:      z.string().max(500).optional().default(''),
  emailContent:      z.string().max(100000).optional().default(''),
  emailReqVars:      z.string().optional().default(''),
  emailOptVars:      z.string().optional().default(''),
  emailReqFiles:     z.string().optional().default(''),
  emailOptFiles:     z.string().optional().default(''),
  smsEnabled:        z.boolean().default(false),
  smsContent:        z.string().max(2000).optional().default(''),
  smsReqVars:        z.string().optional().default(''),
  smsOptVars:        z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (data.emailEnabled) {
    if (!data.emailSubject?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['emailSubject'], message: 'Subject is required when email is enabled' });
    if (!data.emailContent?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['emailContent'], message: 'Content is required when email is enabled' });
  }
  if (data.smsEnabled && !data.smsContent?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['smsContent'], message: 'Content is required when SMS is enabled' });
  }
});

type EventFormValues = z.infer<typeof eventSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVars(csv: string | undefined): string[] {
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}
function joinVars(arr: string[] | undefined): string { return (arr ?? []).join(', '); }

function getDomainDisplayName(domainCatalogueId: string | DomainCatalogue | undefined): string {
  if (!domainCatalogueId) return '—';
  if (typeof domainCatalogueId === 'object') return domainCatalogueId.displayName;
  return '—';
}
function getDomainKey(domainCatalogueId: string | DomainCatalogue | undefined): string {
  if (typeof domainCatalogueId === 'object' && domainCatalogueId !== null) return (domainCatalogueId as DomainCatalogue).domainKey;
  return '';
}
function findDomainIdFromEvent(event: EventCatalogue, domains: DomainCatalogue[]): string {
  const d = event.domainCatalogueId;
  if (typeof d === 'string') return d;
  if (typeof d === 'object' && d !== null) return domains.find((dom) => dom.domainKey === (d as DomainCatalogue).domainKey)?.id ?? '';
  return '';
}
function buildChannelContent(values: EventFormValues) {
  return {
    email: {
      enabled: values.emailEnabled, subject: values.emailSubject ?? '', content: values.emailContent ?? '',
      requiredVariables: parseVars(values.emailReqVars), optionalVariables: parseVars(values.emailOptVars),
      files: { required: parseVars(values.emailReqFiles), optional: parseVars(values.emailOptFiles) },
    },
    sms: {
      enabled: values.smsEnabled, content: values.smsContent ?? '',
      requiredVariables: parseVars(values.smsReqVars), optionalVariables: parseVars(values.smsOptVars),
    },
  };
}
function formatRelativeDate(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}
function substituteVars(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const parts = String(key).trim().split('.');
    let cur: unknown = vars;
    for (const p of parts) { if (cur == null || typeof cur !== 'object') return match; cur = (cur as Record<string, unknown>)[p]; }
    return cur != null ? String(cur) : match;
  });
}
function buildDefaultTestVars(event: EventCatalogue | null, formValues?: Partial<EventFormValues>): Record<string, string> {
  const reqVars = event
    ? [...(event.channelContent?.email?.requiredVariables ?? []), ...(event.channelContent?.sms?.requiredVariables ?? [])]
    : [...parseVars(formValues?.emailReqVars), ...parseVars(formValues?.smsReqVars)];
  const optVars = event
    ? [...(event.channelContent?.email?.optionalVariables ?? []), ...(event.channelContent?.sms?.optionalVariables ?? [])]
    : [...parseVars(formValues?.emailOptVars), ...parseVars(formValues?.smsOptVars)];
  const allVars = [...new Set([...reqVars, ...optVars])];
  return Object.fromEntries(allVars.map((v) => [v, `[${v}]`]));
}

// ─── Channel status helpers ───────────────────────────────────────────────────

type ChannelStatus = 'configured' | 'missing' | 'disabled';

function getEmailStatus(email: EventChannelContent['email']): ChannelStatus {
  if (!email?.enabled) return 'disabled';
  return email.subject?.trim() && email.content?.trim() ? 'configured' : 'missing';
}
function getSmsStatus(sms: EventChannelContent['sms']): ChannelStatus {
  if (!sms?.enabled) return 'disabled';
  return sms.content?.trim() ? 'configured' : 'missing';
}

const CHANNEL_STATUS_LABEL: Record<ChannelStatus, string> = { configured: 'Configured', missing: 'Missing', disabled: 'Disabled' };
const CHANNEL_STATUS_COLOR: Record<ChannelStatus, 'success' | 'warning' | 'default'> = { configured: 'success', missing: 'warning', disabled: 'default' };

function ChannelStatusChip({ status }: { status: ChannelStatus }) {
  return <Chip label={CHANNEL_STATUS_LABEL[status]} size="small" color={CHANNEL_STATUS_COLOR[status]} variant="outlined" sx={{ fontSize: '0.7rem' }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.8} display="block">
      {children}
    </Typography>
  );
}

// ─── PreviewModal ─────────────────────────────────────────────────────────────

interface PreviewModalProps {
  open: boolean; onClose: () => void;
  event: EventCatalogue | null; formValues: Partial<EventFormValues> | null;
  companyId: string;
}

function PreviewModal({ open, onClose, event, formValues, companyId }: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [testVarsJson, setTestVarsJson] = useState('{}');
  const [testVarsError, setTestVarsError] = useState<string | null>(null);
  const [testVars, setTestVars] = useState<Record<string, unknown>>({});
  const [layoutId, setLayoutId] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewMutation = usePreviewNotificationEmailHtmlMutation();
  const { data: layoutData } = useLayoutTemplates(companyId, { templateType: 'email', active: true });
  const emailLayouts = layoutData?.templates ?? [];

  useEffect(() => {
    if (!open) return;
    setActiveTab(0); setPreviewHtml(null); setPreviewError(null);
    const defaults = buildDefaultTestVars(event, formValues ?? undefined);
    const json = JSON.stringify(defaults, null, 2);
    setTestVarsJson(json); setTestVars(defaults);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (emailLayouts.length === 1 && !layoutId) setLayoutId(emailLayouts[0].id);
  }, [emailLayouts, layoutId]);

  function handleVarsChange(value: string) {
    setTestVarsJson(value);
    try { setTestVars(JSON.parse(value)); setTestVarsError(null); }
    catch { setTestVarsError('Invalid JSON'); }
  }

  async function generateEmailPreview() {
    if (!event?.id || !layoutId) return;
    setPreviewLoading(true); setPreviewError(null);
    try {
      const html = await previewMutation.mutateAsync({ layoutTemplateId: layoutId, eventCatalogueId: event.id, mock: false });
      setPreviewHtml(html);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPreviewError(msg ?? 'Preview failed — check backend logs');
    } finally { setPreviewLoading(false); }
  }

  const isSaved      = Boolean(event?.id);
  const emailContent = event ? (event.channelContent?.email?.content  ?? '') : (formValues?.emailContent  ?? '');
  const emailSubject = event ? (event.channelContent?.email?.subject   ?? '') : (formValues?.emailSubject   ?? '');
  const emailEnabled = event ? (event.channelContent?.email?.enabled   === true) : Boolean(formValues?.emailEnabled);
  const smsContent   = event ? (event.channelContent?.sms?.content     ?? '') : (formValues?.smsContent    ?? '');
  const smsEnabled   = event ? (event.channelContent?.sms?.enabled     === true) : Boolean(formValues?.smsEnabled);
  const displayName  = event?.displayName ?? formValues?.displayName ?? 'Event';

  const renderedSubject    = substituteVars(emailSubject, testVars);
  const renderedSmsContent = substituteVars(smsContent, testVars);
  const smsCharCount       = renderedSmsContent.length;
  const draftEmailHtml     = emailContent
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;color:#1a1a1a;line-height:1.6}a{color:#4263eb}</style></head><body>${emailContent}</body></html>`
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box>
          <Typography variant="h6">Preview: {displayName}</Typography>
          {!isSaved && <Typography variant="caption" color="text.secondary">Draft — content not yet saved</Typography>}
        </Box>
        <IconButton size="small" onClick={onClose}><CloseOutlinedIcon /></IconButton>
      </Box>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 3, flexShrink: 0 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Email" icon={<EmailOutlinedIcon fontSize="small" />} iconPosition="start" />
          <Tab label="SMS"   icon={<SmsOutlinedIcon   fontSize="small" />} iconPosition="start" />
          <Tab label="Variables" />
        </Tabs>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 0 && (
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!emailEnabled ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <EmailOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">Email channel is not enabled for this event.</Typography>
              </Box>
            ) : isSaved ? (
              <>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'flex-start', flexShrink: 0 }}>
                  <TextField select label="Layout Template" value={layoutId} onChange={(e) => { setLayoutId(e.target.value); setPreviewHtml(null); }} size="small" sx={{ flex: 1, maxWidth: 340 }} disabled={emailLayouts.length === 0} helperText={emailLayouts.length === 0 ? 'No email layout templates found — create one in Layout Templates first' : undefined}>
                    {emailLayouts.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </TextField>
                  <Button variant="outlined" onClick={generateEmailPreview} disabled={!layoutId || previewLoading} startIcon={previewLoading ? <CircularProgress size={14} /> : <VisibilityOutlinedIcon />} sx={{ mt: 0.25 }}>
                    {previewLoading ? 'Rendering…' : 'Render Preview'}
                  </Button>
                </Box>
                {renderedSubject && (
                  <Box sx={{ px: 3, py: 1, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">SUBJECT</Typography>
                    <Typography variant="body2">{renderedSubject}</Typography>
                  </Box>
                )}
                {previewError && <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>{previewError}</Alert>}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {previewHtml ? (
                    <iframe srcDoc={previewHtml} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-same-origin" title="Email preview" />
                  ) : !previewError && (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">Select a layout template and click &quot;Render Preview&quot; to see the full email.</Typography>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Alert severity="info" sx={{ m: 2, mb: 1, flexShrink: 0 }}>Draft preview — save the event to preview with full layout and company theme.</Alert>
                {renderedSubject && (
                  <Box sx={{ px: 3, py: 1, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">SUBJECT</Typography>
                    <Typography variant="body2">{renderedSubject}</Typography>
                  </Box>
                )}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {emailContent ? (
                    <iframe srcDoc={draftEmailHtml} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-same-origin" title="Draft email preview" />
                  ) : (
                    <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">No email content to preview.</Typography></Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
        {activeTab === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 5 }}>
            {!smsEnabled ? (
              <Box textAlign="center">
                <SmsOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">SMS channel is not enabled for this event.</Typography>
              </Box>
            ) : (
              <Box sx={{ width: 300 }}>
                <Box sx={{ border: '8px solid', borderColor: 'grey.800', borderRadius: 5, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <Box sx={{ bgcolor: 'grey.800', py: 1, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: 56, height: 5, bgcolor: 'grey.600', borderRadius: 3 }} />
                  </Box>
                  <Box sx={{ bgcolor: '#f0f0f0', p: 2, minHeight: 180 }}>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={2}>SMS Message</Typography>
                    {renderedSmsContent ? (
                      <Box sx={{ bgcolor: '#DCF8C6', borderRadius: 2, borderBottomRightRadius: 0, p: 1.5, maxWidth: '88%', ml: 'auto' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderedSmsContent}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled" display="block" textAlign="center">No content</Typography>
                    )}
                  </Box>
                  <Box sx={{ bgcolor: 'grey.800', py: 1 }} />
                </Box>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color={smsCharCount > 160 ? 'warning.main' : 'text.secondary'}>
                    {smsCharCount} characters{smsCharCount > 160 && ` · ${Math.ceil(smsCharCount / 153)} messages`}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}
        {activeTab === 2 && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Test Variables</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Edit the JSON below to set variable values. Changes apply to Email and SMS previews immediately.</Typography>
            <TextField multiline fullWidth rows={20} value={testVarsJson} onChange={(e) => handleVarsChange(e.target.value)} error={Boolean(testVarsError)} helperText={testVarsError ?? 'Keys map to {{variable.path}} placeholders in your templates'} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.83rem' } }} />
          </Box>
        )}
      </Box>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── EventFormDrawer ──────────────────────────────────────────────────────────

interface EventFormDrawerProps {
  open: boolean; event: EventCatalogue | null;
  domains: DomainCatalogue[]; defaultDomainId: string;
  companyId: string; onClose: () => void;
}

function EventFormDrawer({ open, event, domains, defaultDomainId, companyId, onClose }: EventFormDrawerProps) {
  const createMutation = useCreateEventCatalogueMutation();
  const updateMutation = useUpdateEventCatalogueMutation();
  const isEditing      = Boolean(event);
  const [previewOpen, setPreviewOpen] = useState(false);

  const email = event?.channelContent?.email ?? {} as NonNullable<EventChannelContent['email']>;
  const sms   = event?.channelContent?.sms   ?? {} as NonNullable<EventChannelContent['sms']>;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    values: {
      domainCatalogueId: event ? findDomainIdFromEvent(event, domains) : defaultDomainId,
      eventKey:      event?.eventKey    ?? '',
      displayName:   event?.displayName ?? '',
      description:   event?.description ?? '',
      eventType:     event?.eventType   ?? 'notification',
      isActive:      event?.isActive    ?? true,
      emailEnabled:  email.enabled      ?? false,
      emailSubject:  email.subject      ?? '',
      emailContent:  email.content      ?? '',
      emailReqVars:  joinVars(email.requiredVariables),
      emailOptVars:  joinVars(email.optionalVariables),
      emailReqFiles: joinVars(email.files?.required),
      emailOptFiles: joinVars(email.files?.optional),
      smsEnabled:    sms.enabled        ?? false,
      smsContent:    sms.content        ?? '',
      smsReqVars:    joinVars(sms.requiredVariables),
      smsOptVars:    joinVars(sms.optionalVariables),
    },
  });

  const { watch, control, handleSubmit, formState: { errors } } = form;
  const emailEnabled = watch('emailEnabled');
  const smsEnabled   = watch('smsEnabled');
  const smsContent   = watch('smsContent') ?? '';
  const formValues   = watch();
  const isPending    = createMutation.isPending || updateMutation.isPending;
  const canPreview   = emailEnabled || smsEnabled;

  async function onSubmit(values: EventFormValues) {
    if (isEditing && event) {
      await updateMutation.mutateAsync({ id: event.id, displayName: values.displayName, description: values.description, eventType: values.eventType, isActive: values.isActive, channelContent: buildChannelContent(values) });
    } else {
      await createMutation.mutateAsync({ domainCatalogueId: values.domainCatalogueId, eventKey: values.eventKey, displayName: values.displayName, description: values.description, eventType: values.eventType, isActive: values.isActive, channelContent: buildChannelContent(values) } as CreateEventCatalogueDto & { isActive?: boolean });
    }
    onClose();
  }

  const channelSectionHeader = (icon: React.ReactNode, label: string, switchName: 'emailEnabled' | 'smsEnabled') => (
    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
      {icon}
      <SectionLabel>{label}</SectionLabel>
      <Controller name={switchName} control={control} render={({ field }) => (
        <Switch size="small" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} sx={{ ml: 'auto !important' }} />
      )} />
    </Stack>
  );

  return (
    <>
      <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit Event' : 'New Event'} width={600}
        actions={
          <>
            <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Tooltip title={canPreview ? 'Preview message' : 'Enable a channel to preview'}><span>
              <Button variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => setPreviewOpen(true)} disabled={!canPreview}>Preview</Button>
            </span></Tooltip>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isPending} startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}>
              {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Event'}
            </Button>
          </>
        }
      >
        <Stack spacing={3}>
          <Box>
            <SectionLabel>Basic Information</SectionLabel>
            <Stack spacing={2} mt={2}>
              <Controller name="domainCatalogueId" control={control} render={({ field }) => (
                <TextField {...field} select label="Domain" fullWidth size="small" required disabled={isEditing} error={Boolean(errors.domainCatalogueId)} helperText={errors.domainCatalogueId?.message ?? (isEditing ? 'Domain cannot be changed after creation' : undefined)}>
                  {domains.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.displayName}<Typography component="span" variant="caption" color="text.secondary" ml={1}>({d.domainKey})</Typography>
                    </MenuItem>
                  ))}
                </TextField>
              )} />
              <Controller name="eventKey" control={control} render={({ field }) => (
                <TextField {...field} label="Event Key" fullWidth size="small" required disabled={isEditing} error={Boolean(errors.eventKey)} helperText={errors.eventKey?.message ?? (isEditing ? 'Cannot be changed after creation' : 'Unique slug — e.g. user_registered')} placeholder="user_registered" InputProps={isEditing ? { sx: { fontFamily: 'monospace' } } : undefined} />
              )} />
              <Controller name="displayName" control={control} render={({ field }) => (
                <TextField {...field} label="Display Name" fullWidth size="small" required error={Boolean(errors.displayName)} helperText={errors.displayName?.message} />
              )} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller name="eventType" control={control} render={({ field }) => (
                    <TextField {...field} select label="Event Type" fullWidth size="small" required error={Boolean(errors.eventType)}>
                      <MenuItem value="notification">Notification</MenuItem>
                      <MenuItem value="alert">Alert</MenuItem>
                      <MenuItem value="request">Request</MenuItem>
                      <MenuItem value="security">Security</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Controller name="isActive" control={control} render={({ field }) => (
                    <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Active" />
                  )} />
                </Grid>
              </Grid>
              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Description" fullWidth size="small" multiline rows={2} placeholder="Triggered when a user completes registration" helperText="Optional — for internal documentation" />
              )} />
            </Stack>
          </Box>

          <Divider />

          {/* Email channel */}
          <Box>
            {channelSectionHeader(<EmailOutlinedIcon fontSize="small" color="action" />, 'Email Channel', 'emailEnabled')}
            {emailEnabled ? (
              <Stack spacing={2}>
                <Controller name="emailSubject" control={control} render={({ field }) => (
                  <TextField {...field} label="Subject" fullWidth size="small" required placeholder="Your {{data.orderId}} has been confirmed" error={Boolean(errors.emailSubject)} helperText={errors.emailSubject?.message ?? 'Supports {{variable}} placeholders'} />
                )} />
                <Controller name="emailContent" control={control} render={({ field }) => (
                  <TextField {...field} label="HTML Content" fullWidth size="small" required multiline rows={10} placeholder={'<p>Dear {{data.firstName}},</p>\n<p>Your order is confirmed.</p>'} error={Boolean(errors.emailContent)} helperText={errors.emailContent?.message ?? 'HTML template. Supports {{data.variable}}, {{company.name}}, {{theme.primaryColor}}'} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }} />
                )} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Controller name="emailReqVars" control={control} render={({ field }) => <TextField {...field} label="Required Variables" fullWidth size="small" placeholder="data.firstName, data.orderId" helperText="Comma-separated paths" />} /></Grid>
                  <Grid item xs={12} sm={6}><Controller name="emailOptVars" control={control} render={({ field }) => <TextField {...field} label="Optional Variables" fullWidth size="small" placeholder="data.couponCode" helperText="Comma-separated paths" />} /></Grid>
                  <Grid item xs={12} sm={6}><Controller name="emailReqFiles" control={control} render={({ field }) => <TextField {...field} label="Required Files" fullWidth size="small" placeholder="invoice, receipt" helperText="Comma-separated file keys" />} /></Grid>
                  <Grid item xs={12} sm={6}><Controller name="emailOptFiles" control={control} render={({ field }) => <TextField {...field} label="Optional Files" fullWidth size="small" placeholder="terms" helperText="Comma-separated file keys" />} /></Grid>
                </Grid>
              </Stack>
            ) : (
              <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Email notifications disabled — toggle the switch to configure</Typography>
              </Box>
            )}
          </Box>

          <Divider />

          {/* SMS channel */}
          <Box>
            {channelSectionHeader(<SmsOutlinedIcon fontSize="small" color="action" />, 'SMS Channel', 'smsEnabled')}
            {smsEnabled ? (
              <Stack spacing={2}>
                <Controller name="smsContent" control={control} render={({ field }) => (
                  <TextField {...field} label="SMS Content" fullWidth size="small" required multiline rows={4} placeholder="Hi {{data.firstName}}, your order {{data.orderId}} is confirmed." error={Boolean(errors.smsContent)}
                    helperText={
                      <Box component="span" display="flex" justifyContent="space-between">
                        <span>{errors.smsContent?.message ?? 'Supports {{data.variable}} placeholders'}</span>
                        <Typography component="span" variant="caption" color={smsContent.length > 160 ? 'warning.main' : 'text.secondary'}>
                          {smsContent.length} chars{smsContent.length > 160 && ` · ${Math.ceil(smsContent.length / 153)} msgs`}
                        </Typography>
                      </Box>
                    }
                  />
                )} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Controller name="smsReqVars" control={control} render={({ field }) => <TextField {...field} label="Required Variables" fullWidth size="small" placeholder="data.firstName" helperText="Comma-separated paths" />} /></Grid>
                  <Grid item xs={12} sm={6}><Controller name="smsOptVars" control={control} render={({ field }) => <TextField {...field} label="Optional Variables" fullWidth size="small" placeholder="data.orderId" helperText="Comma-separated paths" />} /></Grid>
                </Grid>
              </Stack>
            ) : (
              <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">SMS notifications disabled — toggle the switch to configure</Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </FormDrawer>

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} event={isEditing ? event : null} formValues={!isEditing ? formValues : null} companyId={companyId} />
    </>
  );
}

// ─── ImportDialog ─────────────────────────────────────────────────────────────

interface ImportDialogProps { open: boolean; domainId: string; onClose: () => void; }

function ImportDialog({ open, domainId, onClose }: ImportDialogProps) {
  const importMutation = useBulkImportEventCatalogueMutation();
  const [json, setJson] = useState('');
  const [parseErr, setParseErr] = useState('');

  async function handleImport() {
    setParseErr('');
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { setParseErr('Invalid JSON. Paste a valid JSON array.'); return; }
    if (!Array.isArray(parsed)) { setParseErr('Expected a JSON array of event objects.'); return; }
    const events = (parsed as CreateEventCatalogueDto[]).map((e) => ({ ...e, domainCatalogueId: domainId }));
    await importMutation.mutateAsync(events);
    setJson(''); onClose();
  }

  function handleClose() { setJson(''); setParseErr(''); onClose(); }

  const EXAMPLE = JSON.stringify([{ eventKey: 'user_registered', displayName: 'User Registered', eventType: 'notification', channelContent: { email: { enabled: true, subject: 'Welcome {{data.firstName}}!', requiredVariables: ['data.firstName'] }, sms: { enabled: false } } }], null, 2);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Events from JSON</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {parseErr && <Alert severity="error">{parseErr}</Alert>}
          <Alert severity="info" variant="outlined">Paste a JSON array. Each item needs <code>eventKey</code>, <code>displayName</code>, and <code>eventType</code>. The <code>domainCatalogueId</code> is set automatically.</Alert>
          <TextField multiline rows={14} fullWidth size="small" label="JSON payload" placeholder={EXAMPLE} value={json} onChange={(e) => setJson(e.target.value)} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleImport} disabled={!json.trim() || importMutation.isPending} startIcon={importMutation.isPending ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />}>
          {importMutation.isPending ? 'Importing…' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const eventColumns: GridColDef<EventCatalogue>[] = [
  {
    field: 'domain', headerName: 'Domain', width: 130, sortable: false,
    renderCell: (p) => {
      const name = getDomainDisplayName(p.row.domainCatalogueId);
      const key  = getDomainKey(p.row.domainCatalogueId);
      return (
        <Box>
          <Typography variant="body2" noWrap fontWeight={500}>{name}</Typography>
          {key && <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" noWrap>{key}</Typography>}
        </Box>
      );
    },
  },
  {
    field: 'eventKey', headerName: 'Event Key', flex: 1, minWidth: 130,
    renderCell: (p) => <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" noWrap>{p.row.eventKey}</Typography>,
  },
  {
    field: 'displayName', headerName: 'Display Name', flex: 1.5, minWidth: 150,
    renderCell: (p) => (
      <Box>
        <Typography variant="body2" fontWeight={500} noWrap>{p.row.displayName}</Typography>
        {p.row.description && <Typography variant="caption" color="text.secondary" display="block" noWrap>{p.row.description.slice(0, 55)}{p.row.description.length > 55 ? '…' : ''}</Typography>}
      </Box>
    ),
  },
  {
    field: 'eventType', headerName: 'Type', width: 120,
    renderCell: (p) => <Chip label={EVENT_TYPE_LABELS[p.row.eventType] ?? p.row.eventType} size="small" color={EVENT_TYPE_COLORS[p.row.eventType] ?? 'default'} variant="outlined" />,
  },
  {
    field: 'emailStatus', headerName: 'Email', width: 120, sortable: false,
    renderCell: (p) => <ChannelStatusChip status={getEmailStatus(p.row.channelContent?.email)} />,
  },
  {
    field: 'smsStatus', headerName: 'SMS', width: 120, sortable: false,
    renderCell: (p) => <ChannelStatusChip status={getSmsStatus(p.row.channelContent?.sms)} />,
  },
  {
    field: 'isActive', headerName: 'Status', width: 100,
    renderCell: (p) => <StatusBadge active={p.row.isActive} />,
  },
  {
    field: 'updatedAt', headerName: 'Updated', width: 110,
    renderCell: (p) => <Typography variant="caption" color="text.secondary">{formatRelativeDate(p.row.updatedAt)}</Typography>,
  },
];

// ─── Mobile card config ───────────────────────────────────────────────────────

const eventMobileConfig: MobileCardConfig<EventCatalogue> = {
  primaryText:   'displayName',
  secondaryText: (row) => { const key = getDomainKey(row.domainCatalogueId); return key ? `${key} · ${row.eventKey}` : row.eventKey; },
  badge: (row) => <StatusBadge active={row.isActive} />,
  fields: [
    { field: 'eventType', label: 'Type', render: (v) => <Chip label={EVENT_TYPE_LABELS[v as string] ?? String(v)} size="small" color={EVENT_TYPE_COLORS[v as string] ?? 'default'} variant="outlined" /> },
    {
      field: 'channelContent', label: 'Channels', render: (_v, row) => {
        const { email, sms } = (row.channelContent ?? {}) as EventChannelContent;
        return <Stack direction="row" spacing={0.5}><ChannelStatusChip status={getEmailStatus(email)} /><ChannelStatusChip status={getSmsStatus(sms)} /></Stack>;
      },
    },
  ],
};

// ─── EventCatalogueList ───────────────────────────────────────────────────────

interface EventCatalogueListProps {
  /** The company whose events are managed. */
  companyId: string;
}

/**
 * Self-contained event catalogue management — domain selector, search, type/channel/status filters,
 * DataTable, EventFormDrawer, PreviewModal, ImportDialog, delete confirmation.
 *
 * Used in:
 *   - /event-catalogue          (own-company view)
 *   - /companies/[id] Events tab (modules-admin cross-company view)
 */
export function EventCatalogueList({ companyId }: EventCatalogueListProps) {
  const { canManageEvents } = usePermissions();
  const list = useListState();

  // ── Domain data ────────────────────────────────────────────────────────────
  const { data: domainsData, isLoading: domainsLoading } = useDomainCatalogues(companyId, { limit: 100 });
  const domains = useMemo(() => domainsData?.items ?? [], [domainsData]);

  // ── Domain selector (primary context) ────────────────────────────────────
  const [selectedDomainId, setSelectedDomainId] = useState('');

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) setSelectedDomainId(domains[0].id);
  }, [domains, selectedDomainId]);

  // ── Events data (scoped to selected domain) ────────────────────────────────
  const { data: eventsData, isLoading: eventsLoading, error: eventsError } =
    useEventCatalogues(selectedDomainId || null, { limit: 200, populateDomainCatalogue: true });

  const deleteMutation = useDeleteEventCatalogueMutation();
  const allEvents = useMemo(() => eventsData?.items ?? [], [eventsData]);

  // ── Additional filters (beyond search) ────────────────────────────────────
  const typeFilter     = list.filters['type']     ?? '';
  const channelFilter  = list.filters['channel']  ?? '';
  const statusFilter   = list.filters['status']   ?? '';
  const templateFilter = list.filters['template'] ?? '';

  const filteredEvents = useMemo(() => {
    let result = allEvents;

    if (list.debouncedSearch.trim()) {
      const q = list.debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.eventKey.toLowerCase().includes(q) ||
          e.displayName.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q),
      );
    }
    if (typeFilter) result = result.filter((e) => e.eventType === typeFilter);
    if (channelFilter) {
      result = result.filter((e) => {
        const emailOn = e.channelContent?.email?.enabled === true;
        const smsOn   = e.channelContent?.sms?.enabled   === true;
        if (channelFilter === 'email') return emailOn && !smsOn;
        if (channelFilter === 'sms')   return !emailOn && smsOn;
        if (channelFilter === 'both')  return emailOn && smsOn;
        if (channelFilter === 'none')  return !emailOn && !smsOn;
        return true;
      });
    }
    if (statusFilter) result = result.filter((e) => (statusFilter === 'active' ? e.isActive : !e.isActive));
    if (templateFilter) {
      result = result.filter((e) => {
        const { email, sms } = e.channelContent ?? {};
        const emailOk = !email?.enabled || (Boolean(email.subject?.trim()) && Boolean(email.content?.trim()));
        const smsOk   = !sms?.enabled   || Boolean(sms.content?.trim());
        const configured = emailOk && smsOk;
        return templateFilter === 'configured' ? configured : !configured;
      });
    }
    return result;
  }, [allEvents, list.debouncedSearch, typeFilter, channelFilter, statusFilter, templateFilter]);

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<EventCatalogue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventCatalogue | null>(null);
  const [previewEvent, setPreviewEvent] = useState<EventCatalogue | null>(null);
  const [importOpen,   setImportOpen]   = useState(false);

  function openCreate() { setEditTarget(null); setDrawerOpen(true); }
  function openEdit(event: EventCatalogue) { setEditTarget(event); setDrawerOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = (event: EventCatalogue) => (
    <RowActions>
      <Tooltip title="Preview message">
        <IconButton size="small" onClick={() => setPreviewEvent(event)}>
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <PermissionGuard allowed={canManageEvents}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(event)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(event)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </PermissionGuard>
    </RowActions>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Action buttons ──────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" gap={1} mb={1}>
        <PermissionGuard allowed={canManageEvents && Boolean(selectedDomainId)}>
          <Button variant="outlined" size="small" startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
        </PermissionGuard>
        <PermissionGuard allowed={canManageEvents && Boolean(selectedDomainId)}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Add Event
          </Button>
        </PermissionGuard>
      </Box>

      {/* ── Domain context selector ──────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 320 } }} disabled={domainsLoading}>
          <InputLabel>Domain</InputLabel>
          <Select value={selectedDomainId} label="Domain" onChange={(e) => { setSelectedDomainId(e.target.value); list.clearFilters(); }}>
            {domainsLoading
              ? <MenuItem value=""><em>Loading…</em></MenuItem>
              : domains.length === 0
                ? <MenuItem value="" disabled>No domains configured</MenuItem>
                : domains.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.displayName}&nbsp;<Typography component="span" variant="caption" color="text.secondary">({d.domainKey})</Typography>
                    </MenuItem>
                  ))
            }
          </Select>
        </FormControl>
      </Paper>

      {/* ── Search + filters (SearchToolbar) ────────────────────────────────── */}
      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search name, key, description…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 150 }} disabled={!selectedDomainId || eventsLoading}>
          <InputLabel>Event Type</InputLabel>
          <Select value={typeFilter} label="Event Type" onChange={(e) => list.setFilter('type', e.target.value)}>
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="notification">Notification</MenuItem>
            <MenuItem value="alert">Alert</MenuItem>
            <MenuItem value="request">Request</MenuItem>
            <MenuItem value="security">Security</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }} disabled={!selectedDomainId || eventsLoading}>
          <InputLabel>Channel</InputLabel>
          <Select value={channelFilter} label="Channel" onChange={(e) => list.setFilter('channel', e.target.value)}>
            <MenuItem value="">All channels</MenuItem>
            <MenuItem value="email">Email only</MenuItem>
            <MenuItem value="sms">SMS only</MenuItem>
            <MenuItem value="both">Email + SMS</MenuItem>
            <MenuItem value="none">None</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 115 }} disabled={!selectedDomainId || eventsLoading}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }} disabled={!selectedDomainId || eventsLoading}>
          <InputLabel>Content</InputLabel>
          <Select value={templateFilter} label="Content" onChange={(e) => list.setFilter('template', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="configured">Configured</MenuItem>
            <MenuItem value="missing">Missing content</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      {!selectedDomainId ? (
        <EmptyState
          icon={EventOutlinedIcon}
          title="Select a domain to manage events"
          description="Choose a domain above to view, create and manage its notification events."
        />
      ) : eventsLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : eventsError ? (
        <Alert severity="error">Failed to load events. Please check your connection and try again.</Alert>
      ) : (
        <DataTable<EventCatalogue>
          rows={filteredEvents}
          columns={eventColumns}
          total={filteredEvents.length}
          page={list.page}
          pageSize={Math.max(filteredEvents.length, 25)}
          onPageChange={list.setPage}
          onPageSizeChange={() => {}}
          rowActions={rowActions}
          mobileCardConfig={eventMobileConfig}
          getRowId={(row) => row.id}
          noRowsLabel="No events found."
          emptyState={
            allEvents.length === 0 ? (
              <EmptyState
                icon={EventOutlinedIcon}
                title="No events configured"
                description="Create events to define what triggers notifications for this domain."
                action={
                  <PermissionGuard allowed={canManageEvents}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)}>Import JSON</Button>
                      <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>Add Event</Button>
                    </Stack>
                  </PermissionGuard>
                }
              />
            ) : (
              <EmptyState title="No events match your filters" description="Try adjusting or clearing your filters." action={<Button variant="outlined" onClick={list.clearFilters}>Clear filters</Button>} />
            )
          }
        />
      )}

      {/* ── EventFormDrawer ──────────────────────────────────────────────────── */}
      {selectedDomainId && (
        <>
          <EventFormDrawer open={drawerOpen} event={editTarget} domains={domains} defaultDomainId={selectedDomainId} companyId={companyId} onClose={() => setDrawerOpen(false)} />
          <ImportDialog open={importOpen} domainId={selectedDomainId} onClose={() => setImportOpen(false)} />
        </>
      )}

      {/* ── PreviewModal ─────────────────────────────────────────────────────── */}
      <PreviewModal open={Boolean(previewEvent)} onClose={() => setPreviewEvent(null)} event={previewEvent} formValues={null} companyId={companyId} />

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete event?"
        description={`"${deleteTarget?.displayName}" (${deleteTarget?.eventKey}) will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
