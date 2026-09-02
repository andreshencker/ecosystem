'use client';

// Manual Journals — route: /accounting/manual-journals
//
// INTEGRATION GUIDE for external applications.
//
// This page is NOT an accounting editor, journal-entry form, or operational UI.
// External applications own all accounting/business logic. Communications owns
// the integration runtime: authentication, routing, provider resolution, and
// canonical normalisation.

import React, { useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';

import { PageHeader } from '@/components/layout';

// ─── Guide constants ──────────────────────────────────────────────────────────
// These strings are the source of truth for what the guide documents.
// They are tested in manual-journals-guide.spec.ts to confirm they match
// the actual backend implementation.

const MJ_ROUTES = {
  list:   'GET  /accounting/manual-journals/:credentialId',
  get:    'GET  /accounting/manual-journals/:credentialId/:manualJournalId',
  create: 'POST /accounting/manual-journals/:credentialId',
  update: 'PATCH /accounting/manual-journals/:credentialId/:manualJournalId',
} as const;

const MJ_AUTH_HEADER = 'x-integration-token' as const;
const MJ_CAPABILITY_KEY = 'manualJournals' as const;

const MJ_REQUEST_FIELDS = [
  { field: 'date',                    type: 'string',           required: true,  note: 'ISO date YYYY-MM-DD — journal date' },
  { field: 'narration',               type: 'string',           required: true,  note: 'Journal description (max 4000 chars)' },
  { field: 'lines',                   type: 'array (min 2)',    required: true,  note: 'Journal lines — see line contract below' },
  { field: 'status',                  type: '"draft" | "posted"', required: false, note: 'Defaults to "draft"' },
  { field: 'lineAmountType',          type: '"NoTax" | "Exclusive" | "Inclusive"', required: false, note: 'Tax handling mode' },
  { field: 'showOnCashBasisReports',  type: 'boolean',          required: false, note: 'Include in cash-basis reports' },
  { field: 'externalReference',       type: 'string',           required: false, note: 'Caller correlation ID (max 500 chars)' },
  { field: 'organisationId',          type: 'string',           required: false, note: 'Communications organisation ID for multi-org connections (body field for writes)' },
] as const;

const MJ_LINE_FIELDS = [
  { field: 'accountCode', type: 'string',  required: true,  note: 'Provider account code (e.g. "400") — caller\'s responsibility' },
  { field: 'amount',      type: 'number',  required: true,  note: 'Signed amount — positive = debit, negative = credit' },
  { field: 'description', type: 'string',  required: false, note: 'Line description (max 4000 chars)' },
  { field: 'taxType',     type: 'string',  required: false, note: 'Provider tax code (e.g. "NONE", "TAX")' },
  { field: 'tracking',    type: 'array',   required: false, note: 'Tracking categories [{name, option}]' },
] as const;

const MJ_RESPONSE_FIELDS = [
  { field: 'id',                    note: 'Communications/provider resource ID (UUID)' },
  { field: 'providerResourceId',    note: 'Provider-assigned ID (same as id for Xero)' },
  { field: 'externalReference',     note: 'Caller correlation ID, if supplied' },
  { field: 'date',                  note: 'Journal date (YYYY-MM-DD)' },
  { field: 'narration',             note: 'Journal description' },
  { field: 'status',                note: '"draft" | "posted" | "deleted" | "voided"' },
  { field: 'lineAmountType',        note: 'Tax handling mode' },
  { field: 'showOnCashBasisReports', note: 'Cash-basis report inclusion flag' },
  { field: 'hasAttachments',        note: 'Provider-side attachment indicator' },
  { field: 'updatedAt',             note: 'ISO date of last provider update' },
  { field: 'lines',                 note: 'Array of ManualJournalLine — see line contract' },
  { field: 'sourceUrl',             note: 'URL/reference stored at provider' },
  { field: 'createdAt',             note: 'ISO date of creation (when available from provider)' },
] as const;

const MJ_ERRORS = [
  { status: '401', label: 'Unauthorised', note: 'Missing or invalid integration token' },
  { status: '401', label: 'No company context', note: 'Token does not resolve to a company' },
  { status: '404', label: 'Not found', note: 'Manual journal does not exist at the provider' },
  { status: '422', label: 'Capability unsupported', note: 'Provider does not support Manual Journals' },
  { status: '422', label: 'Validation failure', note: 'Missing required field or invalid value' },
  { status: '422', label: 'Provider validation', note: 'Provider rejected the journal (e.g. invalid account code, unbalanced lines)' },
  { status: '503', label: 'Scope missing', note: 'Connection lacks the required OAuth scope — reconnect required' },
  { status: '503', label: 'Connection unavailable', note: 'Provider connection expired or revoked' },
  { status: '503', label: 'Provider unavailable', note: 'Network error or provider outage' },
] as const;

// ─── CopyableCodeBlock ────────────────────────────────────────────────────────

function CopyableCodeBlock({
  children,
  'data-testid': testId,
}: {
  children: string;
  'data-testid'?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="pre"
        data-testid={testId}
        sx={{
          bgcolor: 'grey.900',
          color: 'grey.100',
          borderRadius: 1,
          p: 2,
          pr: 5,
          overflowX: 'auto',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          lineHeight: 1.6,
          m: 0,
          border: '1px solid',
          borderColor: 'grey.800',
        }}
      >
        {children}
      </Box>
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <IconButton
          size="small"
          onClick={handleCopy}
          data-testid={testId ? `${testId}-copy` : undefined}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: copied ? 'success.main' : 'grey.400',
            '&:hover': { color: 'grey.100' },
          }}
        >
          {copied ? <CheckOutlinedIcon fontSize="small" /> : <ContentCopyOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ─── Inline code ──────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  return (
    <Box
      component="code"
      sx={{
        bgcolor: 'action.selected',
        px: 0.75,
        py: 0.25,
        borderRadius: 0.5,
        fontSize: '0.83em',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </Box>
  );
}

// ─── MethodBadge ──────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  GET:   'info',
  POST:  'success',
  PATCH: 'warning',
};

function EndpointRow({ method, path, note }: { method: string; path: string; note: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Chip
        label={method}
        size="small"
        color={METHOD_COLOR[method] ?? 'default'}
        sx={{ minWidth: 56, mt: 0.1, fontFamily: 'monospace', fontSize: '0.7rem' }}
      />
      <Box>
        <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
          {path}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      </Box>
    </Stack>
  );
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`mj-tab-${index}`}
      aria-labelledby={`mj-tabpanel-${index}`}
    >
      {value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
    </Box>
  );
}

// ─── Responsibility callout ───────────────────────────────────────────────────

function ResponsibilityCallout() {
  return (
    <Alert severity="warning" data-testid="responsibility-callout">
      <Typography variant="body2" fontWeight={600} gutterBottom>
        The external application is responsible for all accounting decisions:
      </Typography>
      {[
        'Account selection — which accounts to use',
        'Debit / credit intent — positive amounts = debit, negative = credit',
        'Line balance — provider enforces that lines sum to zero',
        'Tax treatment — correct provider tax codes',
        'Journal date and narration',
        'Business rules — when and why to create the journal',
      ].map((item) => (
        <Typography key={item} variant="body2">
          • {item}
        </Typography>
      ))}
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        <strong>Communications does not</strong> choose accounts, infer debit/credit direction,
        generate balancing lines, or apply any accounting logic.
      </Typography>
    </Alert>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  'Overview',
  'Auth & Context',
  'Endpoints',
  'Create',
  'List / Get',
  'Update',
  'Contracts',
  'Errors',
  'Provider Notes',
] as const;

export default function ManualJournalsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}
      data-testid="manual-journals-page"
    >
      <PageHeader
        title="Manual Journals"
        subtitle="Integrate journal operations from external applications through the Communications Accounting API."
      />

      <Alert
        severity="info"
        sx={{ mx: 3, mb: 2 }}
        data-testid="integration-guide-banner"
      >
        <strong>Integration Guide.</strong> Manual Journals are created and managed by external
        applications. Communications validates the canonical request and executes it through the
        selected accounting provider. This page is not an accounting editor.
      </Alert>

      <Box sx={{ px: 3, pb: 4 }}>
        <Paper variant="outlined">
          {/* ── Sticky tab bar ── */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              data-testid="guide-tabs"
            >
              {TABS.map((label, i) => (
                <Tab
                  key={label}
                  label={label}
                  id={`mj-tab-${i}`}
                  aria-controls={`mj-tabpanel-${i}`}
                  sx={{ fontSize: '0.8rem', minWidth: 'unset' }}
                />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* ── TAB 0: OVERVIEW ── */}
            <TabPanel value={tab} index={0}>
              <Stack spacing={2.5}>
                <Box data-testid="overview-section">
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    What is this?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The Manual Journals capability allows external applications to create and manage
                    manual accounting journal entries through Communications. The external application
                    owns the accounting intent; Communications owns the integration runtime.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Integration flow
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      p: 2,
                      m: 0,
                      lineHeight: 2,
                    }}
                  >
{`External Application   ←  owns: accounts, amounts, debit/credit, date, narration
        ↓
x-integration-token    ←  identity / company binding
        ↓
Communications API     ←  authenticates, validates structure, resolves runtime
        ↓
Accounting Channel     ←  resolves provider, connection, organisation
        ↓
Provider Adapter       ←  translates canonical → provider format
        ↓
Accounting Provider    ←  Xero Manual Journals`}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Responsibility boundary
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={700} display="block" mb={0.5}>
                        EXTERNAL APPLICATION
                      </Typography>
                      {['Account selection', 'Debit / credit amounts', 'Tax treatment', 'Journal date', 'Business rules'].map((item) => (
                        <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
                      ))}
                    </Paper>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                      <Typography variant="caption" color="secondary.main" fontWeight={700} display="block" mb={0.5}>
                        COMMUNICATIONS
                      </Typography>
                      {['Authentication', 'Company resolution', 'Provider routing', 'Credential handling', 'Canonical normalisation'].map((item) => (
                        <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
                      ))}
                    </Paper>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                        PROVIDER (XERO)
                      </Typography>
                      {['Journal storage', 'Business validation', 'Reconciliation', 'Balance enforcement', 'Status lifecycle'].map((item) => (
                        <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
                      ))}
                    </Paper>
                  </Stack>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 1: AUTH & CONTEXT ── */}
            <TabPanel value={tab} index={1}>
              <Stack spacing={2.5}>
                <Box data-testid="auth-section">
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Authentication
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    External applications authenticate with an <strong>Integration Token</strong>
                    {' '}issued by Communications. Send it in the <Code>x-integration-token</Code> header.
                    Do not use the <Code>Authorization: Bearer</Code> header — that header is reserved
                    for browser-side JWT access and will not resolve an integration token.
                  </Typography>
                  <CopyableCodeBlock data-testid="auth-header-example">{`x-integration-token: <your-integration-token>
Content-Type: application/json`}</CopyableCodeBlock>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    The integration token is bound to a company. Communications resolves the
                    company context server-side — never send a <Code>companyId</Code> in the request body.
                    Integration tokens are created and managed in the platform at{' '}
                    <strong>API Tokens</strong> in the company settings.
                  </Typography>
                </Box>

                <Divider />

                <Box data-testid="context-section">
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Accounting Context
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Every Manual Journals request targets a specific accounting connection via a
                    {' '}<Code>credentialId</Code> path parameter — the Communications{' '}
                    <Code>ProviderCredentials._id</Code>. This credential encodes which provider
                    (e.g. Xero), which OAuth connection, and which default organisation to use.
                  </Typography>

                  <Stack spacing={1.5}>
                    {[
                      {
                        term: 'Provider',
                        desc: 'The accounting software (e.g. Xero). Selected when the company sets up the Accounting channel.',
                      },
                      {
                        term: 'Connection (credentialId)',
                        desc: 'The company-owned provider connection. Obtained by calling GET /accounting/providers or listing provider credentials. This is the :credentialId path parameter.',
                      },
                      {
                        term: 'Organisation (organisationId)',
                        desc: 'The authorised accounting business/tenant inside that connection. Required when a connection has multiple organisations. Pass as a body field on write operations (POST/PATCH) or as a query parameter on read operations (GET).',
                      },
                    ].map(({ term, desc }) => (
                      <Box key={term}>
                        <Typography variant="body2" fontWeight={600}>{term}</Typography>
                        <Typography variant="body2" color="text.secondary">{desc}</Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Box mt={1.5}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Discover available providers and connections:
                    </Typography>
                    <CopyableCodeBlock data-testid="context-discovery-example">{`# List available accounting providers for your company
GET /accounting/providers
x-integration-token: <your-integration-token>

# Check capabilities of a specific provider
GET /accounting/providers/xero/capabilities
x-integration-token: <your-integration-token>`}</CopyableCodeBlock>
                  </Box>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 2: ENDPOINTS ── */}
            <TabPanel value={tab} index={2}>
              <Stack spacing={2} data-testid="endpoints-section">
                <Typography variant="subtitle1" fontWeight={600}>
                  Manual Journals Endpoints
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All endpoints require <Code>x-integration-token</Code> authentication and a valid
                  accounting connection via the <Code>:credentialId</Code> path parameter.
                </Typography>

                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600, width: 80 }}>Method</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Purpose</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { method: 'GET',   path: '/accounting/manual-journals/:credentialId',                          note: 'List manual journals' },
                        { method: 'GET',   path: '/accounting/manual-journals/:credentialId/:manualJournalId',         note: 'Get a single manual journal' },
                        { method: 'POST',  path: '/accounting/manual-journals/:credentialId',                          note: 'Create a manual journal' },
                        { method: 'PATCH', path: '/accounting/manual-journals/:credentialId/:manualJournalId',         note: 'Update a DRAFT manual journal' },
                      ].map(({ method, path, note }) => (
                        <TableRow key={`${method}-${path}`}>
                          <TableCell>
                            <Chip label={method} size="small" color={METHOD_COLOR[method] ?? 'default'} sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                              {path}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{note}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                <Alert severity="info">
                  There is no DELETE endpoint. Manual Journals cannot be deleted — only voided
                  or left as DRAFT/POSTED. This is a provider constraint (Xero).
                </Alert>
              </Stack>
            </TabPanel>

            {/* ── TAB 3: CREATE ── */}
            <TabPanel value={tab} index={3}>
              <Stack spacing={2.5} data-testid="create-section">
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Create a Manual Journal
                  </Typography>
                  <EndpointRow method="POST" path="/accounting/manual-journals/:credentialId" note="Returns 201 Created with the journal detail" />
                </Box>

                <ResponsibilityCallout />

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Request body</Typography>
                  <CopyableCodeBlock data-testid="create-request-example">{`{
  "date": "2026-08-08",
  "narration": "Payroll journal — August 2026",
  "status": "draft",
  "externalReference": "payroll-2026-08-001",
  "organisationId": "<communications-organisation-id>",
  "lines": [
    {
      "accountCode": "400",
      "amount": 5000,
      "description": "Payroll expense",
      "taxType": "NONE"
    },
    {
      "accountCode": "800",
      "amount": -5000,
      "description": "Payroll accrual",
      "taxType": "NONE"
    }
  ]
}`}</CopyableCodeBlock>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>curl example</Typography>
                  <CopyableCodeBlock data-testid="create-curl-example">{`curl -X POST \\
  https://<communications-host>/accounting/manual-journals/<credentialId> \\
  -H "x-integration-token: <your-integration-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2026-08-08",
    "narration": "Payroll journal — August 2026",
    "status": "draft",
    "externalReference": "payroll-2026-08-001",
    "lines": [
      { "accountCode": "400", "amount": 5000, "description": "Payroll expense", "taxType": "NONE" },
      { "accountCode": "800", "amount": -5000, "description": "Payroll accrual", "taxType": "NONE" }
    ]
  }'`}</CopyableCodeBlock>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Response (201 Created)
                  </Typography>
                  <CopyableCodeBlock data-testid="create-response-example">{`{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "providerResourceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "externalReference": "payroll-2026-08-001",
  "date": "2026-08-08",
  "narration": "Payroll journal — August 2026",
  "status": "draft",
  "lineAmountType": "NoTax",
  "showOnCashBasisReports": false,
  "hasAttachments": false,
  "updatedAt": "2026-08-08",
  "lines": [
    { "accountCode": "400", "amount": 5000, "description": "Payroll expense", "taxType": "NONE", "tracking": [] },
    { "accountCode": "800", "amount": -5000, "description": "Payroll accrual", "taxType": "NONE", "tracking": [] }
  ],
  "sourceUrl": "payroll-2026-08-001"
}`}</CopyableCodeBlock>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 4: LIST / GET ── */}
            <TabPanel value={tab} index={4}>
              <Stack spacing={3} data-testid="list-get-section">
                {/* List */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    List Manual Journals
                  </Typography>
                  <EndpointRow method="GET" path="/accounting/manual-journals/:credentialId" note="Paginated list of manual journals" />

                  <Box mt={1.5}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>Query parameters</Typography>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Parameter</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[
                            ['organisationId', 'string', 'Communications organisation ID (for multi-org connections)'],
                            ['cursor',         'string', 'Pagination cursor — pass nextCursor from previous response'],
                            ['limit',          '1–100',  'Max records per page'],
                            ['dateFrom',       'YYYY-MM-DD', 'Inclusive lower bound on journal date'],
                            ['dateTo',         'YYYY-MM-DD', 'Inclusive upper bound on journal date'],
                            ['status',         'draft | posted | deleted | voided | all', 'Filter by journal status'],
                          ].map(([param, type, desc]) => (
                            <TableRow key={param}>
                              <TableCell><Code>{param}</Code></TableCell>
                              <TableCell><Typography variant="caption" fontFamily="monospace">{type}</Typography></TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{desc}</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>

                  <Box mt={1.5}>
                    <CopyableCodeBlock data-testid="list-example">{`GET /accounting/manual-journals/<credentialId>?dateFrom=2026-08-01&dateTo=2026-08-31&status=draft
x-integration-token: <your-integration-token>

# Response (200 OK):
{
  "data": [ /* ManualJournalSummary[] */ ],
  "hasMore": false,
  "nextCursor": null,
  "total": 12
}`}</CopyableCodeBlock>
                  </Box>
                </Box>

                <Divider />

                {/* Get one */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Get a Single Manual Journal
                  </Typography>
                  <EndpointRow method="GET" path="/accounting/manual-journals/:credentialId/:manualJournalId" note="Returns full journal detail including lines" />

                  <Box mt={1.5}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Use the <Code>id</Code> field from a list or create response as the{' '}
                      <Code>:manualJournalId</Code> path parameter. This is the Communications/provider
                      resource ID (a UUID) — do not construct or guess IDs.
                    </Typography>
                    <CopyableCodeBlock data-testid="get-example">{`GET /accounting/manual-journals/<credentialId>/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
x-integration-token: <your-integration-token>

# Response (200 OK): ManualJournalDetail — see Contracts tab`}</CopyableCodeBlock>
                  </Box>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 5: UPDATE ── */}
            <TabPanel value={tab} index={5}>
              <Stack spacing={2.5} data-testid="update-section">
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Update a Manual Journal
                  </Typography>
                  <EndpointRow method="PATCH" path="/accounting/manual-journals/:credentialId/:manualJournalId" note="Returns 200 OK with updated journal detail" />
                </Box>

                <Alert severity="warning">
                  <strong>DRAFT only.</strong> Only journals with status <Code>draft</Code> can be
                  updated. Journals with status <Code>posted</Code> are immutable — the provider will
                  reject the request with a validation error. Check the journal status before attempting
                  an update.
                </Alert>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    All fields are optional. Send only the fields that should change. Omitted fields
                    remain unchanged at the provider.
                  </Typography>
                  <CopyableCodeBlock data-testid="update-request-example">{`PATCH /accounting/manual-journals/<credentialId>/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
x-integration-token: <your-integration-token>
Content-Type: application/json

{
  "narration": "Payroll journal — August 2026 (revised)",
  "externalReference": "payroll-2026-08-001-v2",
  "lines": [
    { "accountCode": "400", "amount": 5500, "description": "Payroll expense (revised)", "taxType": "NONE" },
    { "accountCode": "800", "amount": -5500, "description": "Payroll accrual (revised)", "taxType": "NONE" }
  ]
}`}</CopyableCodeBlock>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Updatable fields</Typography>
                  <Stack spacing={0.5} sx={{ pl: 1 }}>
                    {['date', 'narration', 'lines', 'status', 'lineAmountType', 'showOnCashBasisReports', 'externalReference', 'organisationId'].map((f) => (
                      <Typography key={f} variant="body2" color="text.secondary">
                        • <Code>{f}</Code>
                      </Typography>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Response (200 OK)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Returns the full <Code>ManualJournalDetail</Code> shape — see the Contracts tab.
                  </Typography>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 6: CONTRACTS ── */}
            <TabPanel value={tab} index={6}>
              <Stack spacing={3} data-testid="contracts-section">

                {/* Request */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Request Contract — CreateManualJournalDto
                  </Typography>
                  <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 70 }}>Required</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {MJ_REQUEST_FIELDS.map(({ field, type, required, note }) => (
                          <TableRow key={field}>
                            <TableCell><Code>{field}</Code></TableCell>
                            <TableCell><Typography variant="caption" fontFamily="monospace">{type}</Typography></TableCell>
                            <TableCell>
                              <Chip label={required ? 'Yes' : 'No'} size="small" color={required ? 'error' : 'default'} variant="outlined" />
                            </TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{note}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>

                {/* Line contract */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Journal Line Contract — ManualJournalLineDto
                  </Typography>
                  <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 70 }}>Required</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {MJ_LINE_FIELDS.map(({ field, type, required, note }) => (
                          <TableRow key={field}>
                            <TableCell><Code>{field}</Code></TableCell>
                            <TableCell><Typography variant="caption" fontFamily="monospace">{type}</Typography></TableCell>
                            <TableCell>
                              <Chip label={required ? 'Yes' : 'No'} size="small" color={required ? 'error' : 'default'} variant="outlined" />
                            </TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{note}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>

                {/* Response */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Response Contract — ManualJournalDetail
                  </Typography>
                  <Alert severity="success" sx={{ mb: 1.5 }}>
                    The canonical response contains <strong>no credentials, tokens, or internal
                    platform secrets</strong>. Only safe, normalised fields are returned.
                  </Alert>
                  <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {MJ_RESPONSE_FIELDS.map(({ field, note }) => (
                          <TableRow key={field}>
                            <TableCell><Code>{field}</Code></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{note}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 7: ERRORS ── */}
            <TabPanel value={tab} index={7}>
              <Stack spacing={2} data-testid="errors-section">
                <Typography variant="subtitle1" fontWeight={600}>
                  Error Reference
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Communications maps provider and validation errors to canonical HTTP responses.
                  All error bodies follow the format:{' '}
                  <Code>{'{ "statusCode": 422, "message": "Human-readable description" }'}</Code>
                </Typography>

                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600, width: 90 }}>HTTP</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 180 }}>Label</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>When it occurs</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {MJ_ERRORS.map(({ status, label, note }) => (
                        <TableRow key={`${status}-${label}`}>
                          <TableCell>
                            <Chip
                              label={status}
                              size="small"
                              color={status === '404' ? 'default' : status === '422' ? 'warning' : status === '401' ? 'error' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{label}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{note}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Recommended error handling</Typography>
                  <Stack spacing={0.5} sx={{ pl: 1 }}>
                    {[
                      '401 — Verify integration token validity; refresh if expired.',
                      '404 — The journal ID no longer exists; do not retry.',
                      '422 — Inspect message for validation details; fix payload before retrying.',
                      '503 (scope missing) — The Accounting connection must be re-authorised with the correct OAuth scope.',
                      '503 (provider unavailable) — Retry with exponential backoff.',
                    ].map((item) => (
                      <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </TabPanel>

            {/* ── TAB 8: PROVIDER NOTES ── */}
            <TabPanel value={tab} index={8}>
              <Stack spacing={2} data-testid="provider-notes-section">
                <Typography variant="subtitle1" fontWeight={600}>
                  Provider Notes — Xero
                </Typography>
                <Alert severity="info">
                  This section documents Xero-specific behaviour. Other providers may behave
                  differently. Always check provider capability status before making requests.
                </Alert>

                {[
                  {
                    title: 'Capability check',
                    body: 'The ManualJournals capability must be available for the selected provider. Check via GET /accounting/providers/xero/capabilities — look for "manualJournals": "available".',
                  },
                  {
                    title: 'Required OAuth scope',
                    body: 'The Xero connection must be authorised with the accounting.manualjournals scope (write, includes read). If the scope is missing, list and get operations require accounting.manualjournals.read. A 503 with "scope missing" indicates the connection must be re-authorised in Communications.',
                  },
                  {
                    title: 'Line balance enforcement',
                    body: 'Xero requires the sum of all line amounts to equal zero. Positive amounts are debits; negative amounts are credits. The calling application must supply a balanced journal — Communications does not validate or enforce balance.',
                  },
                  {
                    title: 'DRAFT vs POSTED',
                    body: 'Journals submitted with status "draft" can be retrieved and updated. Journals submitted with status "posted" are immediately posted and immutable — no further updates are accepted by Xero.',
                  },
                  {
                    title: 'Account codes',
                    body: 'Xero uses short account codes (e.g. "400", "800"). They must correspond to existing, non-system accounts in the connected organisation. Use the Chart of Accounts endpoints to retrieve valid codes before constructing a journal request.',
                  },
                  {
                    title: 'External reference correlation',
                    body: 'The externalReference field is stored at the provider and returned in responses. It is useful for correlating Communications records with source system records. Communications does not enforce uniqueness — duplicate prevention is the calling application\'s responsibility.',
                  },
                  {
                    title: 'Multi-organisation connections',
                    body: 'When a credential is connected to multiple Xero organisations, pass the organisationId (Communications-internal) to target the correct one. This identifier is obtained from the provider organisations API — never use raw Xero tenant IDs.',
                  },
                ].map(({ title, body }) => (
                  <Box key={title}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>{title}</Typography>
                    <Typography variant="body2" color="text.secondary">{body}</Typography>
                  </Box>
                ))}
              </Stack>
            </TabPanel>

          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
