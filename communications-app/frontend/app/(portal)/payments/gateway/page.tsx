'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepContent from '@mui/material/StepContent';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined';
import TokenOutlinedIcon from '@mui/icons-material/TokenOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState } from '@/components/shared';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import { usePaymentProviders, useGatewayGuide, useProviderCapabilities } from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import type {
  GatewayGuide,
  GatewayGuideStep,
  GatewayGuideRequestExample,
  GatewayGuideResponseExample,
  GatewayGuidePresentationType,
} from '@/types/payments';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  number,
  children,
}: {
  title: string;
  subtitle?: string;
  number?: number;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" mb={4}>
      <Stack direction="row" spacing={1.5} alignItems="baseline" mb={0.5}>
        {number !== undefined && (
          <Typography
            variant="caption"
            fontWeight={700}
            color="primary.main"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 1,
              borderColor: 'primary.main',
              flexShrink: 0,
              fontSize: '0.7rem',
              lineHeight: 1,
            }}
          >
            {number}
          </Typography>
        )}
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
      </Stack>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" mb={2} ml={number !== undefined ? 4.5 : 0}>
          {subtitle}
        </Typography>
      )}
      <Box ml={number !== undefined ? 4.5 : 0}>{children}</Box>
    </Box>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <Box
      component="pre"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.78rem',
        lineHeight: 1.6,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 2,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        m: 0,
      }}
    >
      {code}
    </Box>
  );
}

// ─── Info callout ─────────────────────────────────────────────────────────────

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        bgcolor: 'info.main',
        opacity: 0.85,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'info.light',
      }}
    >
      <InfoOutlinedIcon sx={{ color: 'info.contrastText', mt: 0.25, flexShrink: 0 }} fontSize="small" />
      <Typography variant="body2" color="info.contrastText">
        {children}
      </Typography>
    </Box>
  );
}

// ─── Bullet list ──────────────────────────────────────────────────────────────

function BulletList({ items }: { items: string[] }) {
  return (
    <Stack spacing={0.75}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            •
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Graphify Payments Architecture
// Provider-independent. Always visible.
// ═══════════════════════════════════════════════════════════════════════════════

function GraphifyArchitecture() {
  // Three-party model: External App → Graphify → Provider
  const columnSx = {
    flex: 1,
    p: 2,
    borderRadius: 2,
    bgcolor: 'background.paper',
    border: 2,
  };

  return (
    <Stack spacing={2}>
      {/* Three-column diagram */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'stretch' }}>
        {/* External Application */}
        <Box sx={{ ...columnSx, borderColor: 'secondary.main' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <IntegrationInstructionsOutlinedIcon color="secondary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
              External Application
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {[
              'Business logic',
              'Products & prices',
              'Customer identity',
              'Invoices & contracts',
              'Payment pages',
              'Pay buttons',
              'Success / failure UX',
              'Order fulfilment',
            ].map((item) => (
              <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                <CheckCircleOutlinedIcon sx={{ fontSize: 13, mt: 0.35, color: 'secondary.main' }} />
                <Typography variant="body2" fontSize="0.78rem">{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Arrow */}
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
          <ArrowForwardOutlinedIcon color="primary" />
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ display: { xs: 'flex', md: 'none' } }}>
          <ArrowDownwardOutlinedIcon color="primary" />
        </Box>

        {/* Graphify Communications (centre — primary contract) */}
        <Box sx={{ ...columnSx, borderColor: 'primary.main', flex: 1.4 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <LockOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
              Graphify Communications
            </Typography>
            <Chip label="Primary Contract" size="small" color="primary" variant="filled" sx={{ fontSize: '0.65rem' }} />
          </Stack>
          <Stack spacing={0.5}>
            {[
              'Token authentication & company resolution',
              'Payment engine',
              'Provider resolution & credential decryption',
              'Payment session creation',
              'Provider adapter execution',
              'Canonical runtime generation',
              'Webhook signature verification',
              'Canonical status normalisation',
            ].map((item) => (
              <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                <CheckCircleOutlinedIcon sx={{ fontSize: 13, mt: 0.35, color: 'primary.main' }} />
                <Typography variant="body2" fontSize="0.78rem">{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Arrow */}
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
          <ArrowForwardOutlinedIcon color="action" />
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ display: { xs: 'flex', md: 'none' } }}>
          <ArrowDownwardOutlinedIcon color="action" />
        </Box>

        {/* Provider */}
        <Box sx={{ ...columnSx, borderColor: 'divider', opacity: 0.8 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <RouterOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              Payment Provider
            </Typography>
          </Stack>
          <Stack spacing={0.5} mb={1.5}>
            {['Executes payment operations', 'Returns provider-native response'].map((item) => (
              <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                <CheckCircleOutlinedIcon sx={{ fontSize: 13, mt: 0.35, color: 'text.disabled' }} />
                <Typography variant="body2" fontSize="0.78rem" color="text.secondary">{item}</Typography>
              </Stack>
            ))}
          </Stack>
          <Stack spacing={0.5}>
            {['Stripe', 'Binance', 'PayPal', 'Square', '…'].map((p) => (
              <Chip key={p} label={p} size="small" variant="outlined" sx={{ width: 'fit-content', fontSize: '0.7rem' }} />
            ))}
          </Stack>
        </Box>
      </Stack>

      <InfoCallout>
        External applications communicate only with Graphify. They never call Stripe, Binance, or any other provider
        directly. The provider is an implementation detail hidden inside the Graphify runtime.
      </InfoCallout>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Token Resolution
// Provider-independent. Always visible.
// ═══════════════════════════════════════════════════════════════════════════════

function TokenResolutionSection() {
  const monoSx = { fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.8 };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TokenOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="body2" color="text.secondary">
          Every request starts with the Communications Bearer token. All company context, permissions, and
          payment connections are derived server-side — your application sends none of them explicitly.
        </Typography>
      </Stack>

      <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2.5 }}>
        <Stack spacing={0}>
          {[
            'Bearer Token',
            '      │',
            '      ▼',
            'Graphify Communications',
            '      │',
            '      ├── Company',
            '      ├── Application',
            '      ├── Permissions',
            '      └── Available Payment Connections',
          ].map((line, i) => (
            <Typography key={i} sx={monoSx}>
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>

      <CodeBlock
        code={`// Every Communications API request
const headers = {
  Authorization: \`Bearer \${communicationsToken}\`,
  'Content-Type': 'application/json',
};

// Never include:
// - companyId
// - provider credentials
// - signing secrets
// - secret keys`}
      />

      <InfoCallout>
        The token is issued by Communications Auth. Your application never sends{' '}
        <strong>companyId</strong>, <strong>provider keys</strong>, <strong>signing secrets</strong>, or{' '}
        <strong>decrypted credentials</strong>. Everything is resolved server-side from the authenticated token.
      </InfoCallout>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Payment Connections
// Provider-independent. Always visible.
// ═══════════════════════════════════════════════════════════════════════════════

function PaymentConnectionsSection() {
  const monoSx = { fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.8 };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Before creating payment sessions, your application loads the available payment connections for the
        authenticated company. A connection maps to one configured provider credential — test or live.
        Your application stores only the connection identifier, never the credentials.
      </Typography>

      {/* Configuration flow */}
      <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2.5 }}>
        <Stack spacing={0}>
          {[
            'Settings',
            '  ↓',
            'Payments → Provider Credentials',
            '  ↓',
            'GET /payments/accounts',
            '  ↓',
            'Select connection',
            '  ↓',
            'Store  connectionId  (never store credentials)',
          ].map((line, i) => (
            <Typography key={i} sx={monoSx}>
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>

      <CodeBlock
        code={`GET /payments/accounts
Authorization: Bearer <token>

// Response:
{
  "data": [
    {
      "id": "6776e4f1a0c1234567890abc",
      "providerKey": "stripe",
      "tag": "production",
      "environment": "live",
      "isActive": true
    },
    {
      "id": "6776e4f1a0c1234567890def",
      "providerKey": "stripe",
      "tag": "test",
      "environment": "test",
      "isActive": true
    }
  ]
}

// Store in your application settings:
const paymentSettings = {
  connectionId: '6776e4f1a0c1234567890abc',   // not a secret
};`}
      />

      <InfoCallout>
        The <strong>connectionId</strong> is a MongoDB ObjectId — opaque but not secret. Store it in your application
        configuration. Switch between test and live connections without changing application code.
      </InfoCallout>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Graphify Payment Session Runtime
// Provider-independent. Always visible.
// ═══════════════════════════════════════════════════════════════════════════════

const RUNTIME_TYPES = [
  {
    mode: 'Embedded',
    color: 'primary.main' as const,
    flow: ['clientSecret', 'publishableKey'],
    action: 'Mount secure payment component (Stripe.js, Braintree Drop-in, etc.)',
    description: 'Your frontend mounts a provider-hosted payment form inside your own UI. Card data never touches your servers.',
  },
  {
    mode: 'Redirect',
    color: 'secondary.main' as const,
    flow: ['checkoutUrl'],
    action: 'Redirect customer browser to checkoutUrl',
    description: 'Customer is sent to a provider-hosted checkout page and returned to your returnUrl on completion.',
  },
  {
    mode: 'QR Code',
    color: 'text.secondary' as const,
    flow: ['qrPayload'],
    action: 'Render QR code — customer scans with mobile device',
    description: 'A scannable QR code initiates the payment flow on the customer\'s device. Common in retail and point-of-sale.',
  },
  {
    mode: 'Deep Link',
    color: 'text.secondary' as const,
    flow: ['mobileUrl'],
    action: 'Open banking / wallet application via deep link',
    description: 'A mobile deep link launches the customer\'s banking or wallet app to authorise the payment directly.',
  },
] as const;

function SessionRuntimeSection() {
  const monoSx = { fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.8 };

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">
        The <strong>Graphify Payment Session Runtime</strong> is the primary integration contract. Every provider
        adapter translates its native payment flow into one canonical runtime type. Applications implement
        against the runtime type — they never implement provider-specific flows directly.
      </Typography>

      {/* Session flow */}
      <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1.5, p: 2.5 }}>
        <Stack spacing={0}>
          {[
            'Application',
            '      │',
            '      ▼',
            'POST /payments/accounts/{connectionId}/sessions',
            '      │',
            '      ▼',
            'Graphify Payment Runtime',
            '      │',
            '      ▼',
            'Provider Adapter  (Stripe, Binance, PayPal, …)',
            '      │',
            '      ▼',
            'Provider API',
            '      │',
            '      ▼',
            'Canonical Runtime Response → Application',
          ].map((line, i) => (
            <Typography key={i} sx={monoSx}>
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>

      <InfoCallout>
        Applications never call Stripe, Binance, or any other provider directly. They call{' '}
        <strong>Graphify</strong> and receive a <strong>canonical runtime response</strong>. The provider is an
        implementation detail resolved and executed entirely inside the Graphify runtime.
      </InfoCallout>

      {/* Runtime type cards */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
          Canonical Runtime Types
        </Typography>
        <Stack spacing={1.5}>
          {RUNTIME_TYPES.map((rt) => (
            <Box
              key={rt.mode}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                <Box flex={1}>
                  <Typography variant="subtitle2" fontWeight={700} color={rt.color} mb={0.5}>
                    {rt.mode} Runtime
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                    {rt.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    minWidth: 220,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 1.5,
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    lineHeight: 1.8,
                  }}
                >
                  {[
                    `{ ${rt.flow.join(', ')} }`,
                    '    ↓',
                    rt.action,
                  ].map((line, i) => (
                    <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.8 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          Canonical Session Request
        </Typography>
        <CodeBlock
          code={`POST /payments/accounts/{connectionId}/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "amountMinor": 15000,
  "paymentUnitCode": "AUD",
  "reference": "invoice-2024-001",
  "returnUrl": "https://your-app.com/payments/success",
  "cancelUrl": "https://your-app.com/payments/cancelled",
  "presentationType": "redirect"   // or "embedded", "qr_code", "deep_link"
}`}
        />
      </Box>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Canonical Payment Status
// Provider-independent. Always visible.
// ═══════════════════════════════════════════════════════════════════════════════

const CANONICAL_STATUSES: {
  status: string;
  color: 'default' | 'info' | 'success' | 'error' | 'warning';
  description: string;
}[] = [
  {
    status: 'requires_customer_action',
    color: 'warning',
    description:
      'Customer must complete additional authentication (3DS, OTP, bank redirect). Prompt the customer to return.',
  },
  {
    status: 'processing',
    color: 'info',
    description: 'Payment is being processed by the provider. Poll again or wait for a webhook event.',
  },
  {
    status: 'succeeded',
    color: 'success',
    description: 'Payment completed successfully. Safe to fulfil the order or service.',
  },
  {
    status: 'failed',
    color: 'error',
    description: 'Payment declined or errored. Inspect failureCode and present an appropriate retry option.',
  },
  {
    status: 'cancelled',
    color: 'default',
    description: 'Customer cancelled or the session was abandoned before completion.',
  },
  {
    status: 'expired',
    color: 'default',
    description: 'Payment session or link expired without a completion attempt.',
  },
];

function CanonicalStatusSection() {
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        These statuses are identical across every payment provider. Your business logic never needs to handle
        Stripe-specific status strings, PayPal order states, or Binance payment codes — Graphify normalises
        everything to this canonical set.
      </Typography>

      <Stack spacing={1}>
        {CANONICAL_STATUSES.map(({ status, color, description }) => (
          <Stack key={status} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Chip
              label={status}
              color={color}
              size="small"
              variant={color === 'success' ? 'filled' : 'outlined'}
              sx={{ fontFamily: 'monospace', fontSize: '0.72rem', width: 240, flexShrink: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <InfoCallout>
        Always check status server-side via <strong>GET /payments/accounts/{'{connectionId}'}/sessions/{'{sessionId}'}</strong> after
        the customer returns from a redirect. Never trust URL query parameters alone as proof of payment.
      </InfoCallout>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider-specific components (rendered only when a guide is loaded)
// ═══════════════════════════════════════════════════════════════════════════════

function Prerequisites({ items }: { items: string[] }) {
  return (
    <Stack spacing={0.75}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
          <Typography variant="body2" color="primary.main" sx={{ flexShrink: 0, fontWeight: 600 }}>
            {i + 1}.
          </Typography>
          <Typography variant="body2">{item}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function SupportedFlows({ items }: { items: string[] }) {
  return (
    <Stack spacing={0.75}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
          <CheckCircleOutlinedIcon sx={{ fontSize: 16, mt: 0.3, color: 'success.main', flexShrink: 0 }} />
          <Typography variant="body2">{item}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function ImplementationStepper({ steps }: { steps: GatewayGuideStep[] }) {
  return (
    <Stepper orientation="vertical" nonLinear>
      {steps.map((step) => (
        <Step key={step.stepNumber} active expanded>
          <StepLabel
            StepIconProps={{ icon: step.stepNumber }}
            sx={{ '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '0.9rem' } }}
          >
            {step.title}
          </StepLabel>
          <StepContent>
            <Stack spacing={1.5} pb={2}>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
              {step.codeExample && <CodeBlock code={step.codeExample} />}
              {step.notes && step.notes.length > 0 && (
                <Box sx={{ p: 1.5, bgcolor: 'action.selected', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Stack spacing={0.5}>
                    {step.notes.map((note, i) => (
                      <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
                        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                          •
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                          {note}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );
}

function RequestExample({ example }: { example: GatewayGuideRequestExample }) {
  const headerLines = Object.entries(example.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const bodyLines = example.body ? '\n\n' + JSON.stringify(example.body, null, 2) : '';
  return (
    <Box mb={3}>
      <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
        {example.label}
      </Typography>
      {example.description && (
        <Typography variant="body2" color="text.secondary" mb={1}>
          {example.description}
        </Typography>
      )}
      <CodeBlock code={`${example.method} ${example.path}\n${headerLines}${bodyLines}`} />
    </Box>
  );
}

function ResponseExample({ example }: { example: GatewayGuideResponseExample }) {
  return (
    <Box mb={3}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
        <Typography variant="subtitle2" fontWeight={600}>
          {example.label}
        </Typography>
        <Chip
          label={example.statusCode}
          size="small"
          color={example.statusCode < 300 ? 'success' : 'error'}
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
        />
      </Stack>
      {example.description && (
        <Typography variant="body2" color="text.secondary" mb={1}>
          {example.description}
        </Typography>
      )}
      <CodeBlock code={JSON.stringify(example.body, null, 2)} />
    </Box>
  );
}

function TabbedExamples({ guide }: { guide: GatewayGuide }) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Requests" />
          <Tab label="Responses" />
        </Tabs>
      </Box>
      {tab === 0 && guide.requestExamples.map((ex, i) => <RequestExample key={i} example={ex} />)}
      {tab === 1 && guide.responseExamples.map((ex, i) => <ResponseExample key={i} example={ex} />)}
    </>
  );
}

function PresentationTypes({ types }: { types: GatewayGuidePresentationType[] }) {
  return (
    <Stack spacing={1.5}>
      {types.map((pt) => (
        <Box
          key={pt.mode}
          sx={{
            p: 2,
            border: 1,
            borderColor: pt.supported ? 'primary.light' : 'divider',
            borderRadius: 2,
            bgcolor: pt.supported ? 'background.paper' : 'action.disabledBackground',
            opacity: pt.supported ? 1 : 0.65,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" mb={0.75}>
            <Typography variant="subtitle2" fontWeight={600}>
              {pt.label}
            </Typography>
            <Chip
              label={pt.supported ? 'Supported' : 'Not supported'}
              size="small"
              color={pt.supported ? 'success' : 'default'}
              variant={pt.supported ? 'filled' : 'outlined'}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={pt.recommendedFor.length > 0 ? 1 : 0}>
            {pt.description}
          </Typography>
          {pt.recommendedFor.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Recommended for:
              </Typography>
              <Stack spacing={0.25}>
                {pt.recommendedFor.map((use, i) => (
                  <Typography key={i} variant="caption" color="text.secondary">
                    • {use}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function WebhookReceiverPath({ path }: { path: string }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Register webhook endpoints via <strong>Payments → Webhooks</strong>. The provider delivers events to the
        Graphify receiver. Graphify verifies the signature and records the delivery — your application never
        handles raw provider signatures.
      </Typography>
      <CodeBlock code={path} />
      <InfoCallout>
        Invalid or missing signatures are rejected and logged. Only verified events are processed. Duplicate
        events are acknowledged but not processed twice.
      </InfoCallout>
    </Stack>
  );
}

// ─── Provider guide (provider-specific content only) ─────────────────────────

function ProviderGuide({ guide }: { guide: GatewayGuide }) {
  return (
    <Stack spacing={0}>
      <Section
        number={6}
        title="Prerequisites"
        subtitle={`What your application needs before integrating with ${guide.displayName}.`}
      >
        <Prerequisites items={guide.prerequisites} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={7}
        title="Supported Payment Flows"
        subtitle={`Payment flow types available for ${guide.displayName}.`}
      >
        <SupportedFlows items={guide.supportedFlows} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={8}
        title="Implementation Steps"
        subtitle={`Step-by-step guide for integrating ${guide.displayName} via Graphify.`}
      >
        <ImplementationStepper steps={guide.implementationSteps} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={9}
        title="Canonical API Examples"
        subtitle="Graphify requests and responses — no provider-specific secrets included."
      >
        <TabbedExamples guide={guide} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={10}
        title="Payment Presentation Modes"
        subtitle={`How ${guide.displayName} payments are presented to the customer.`}
      >
        <PresentationTypes types={guide.presentationTypes} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={11}
        title="Webhook Receiver"
        subtitle="Incoming provider events are verified and recorded by Graphify."
      >
        <WebhookReceiverPath path={guide.webhookReceiverPath} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={12}
        title="Testing"
        subtitle={`Testing guidance specific to ${guide.displayName}.`}
      >
        <BulletList items={guide.testingInstructions} />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section number={13} title="Known Limitations">
        <BulletList items={guide.limitations} />
      </Section>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function PaymentsGatewayPage() {
  const { providers, isLoading: providersLoading, error: providersError } = usePaymentProviders();
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>('');

  const { data: capabilitiesData } = useProviderCapabilities(selectedProviderKey || null);
  const capabilityStatus =
    capabilitiesData?.capabilities?.[PAGE_CAPABILITY.gateway] ?? null;
  const capabilityBlocks =
    Boolean(selectedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  const { data: guide, isLoading: guideLoading, error: guideError } = useGatewayGuide(
    capabilityBlocks ? null : selectedProviderKey || null,
  );

  const selectedProviderOption = providers.find((p) => p.providerKey === selectedProviderKey);

  React.useEffect(() => {
    if (providers.length > 0 && !selectedProviderKey) {
      setSelectedProviderKey(providers[0]?.providerKey ?? '');
    }
  }, [providers, selectedProviderKey]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Graphify Payments Integration"
        subtitle="The official integration reference for every application that consumes Graphify Payments."
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Gateway' }]}
      />

      {/* ── Graphify-first sections (always visible, provider-independent) ── */}

      <Section
        number={1}
        title="Graphify Payments Architecture"
        subtitle="Graphify is the primary payment contract. External applications communicate only with Graphify — never with the provider directly."
      >
        <GraphifyArchitecture />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={2}
        title="Token Resolution"
        subtitle="Every request starts with the Communications Bearer token. Graphify resolves company, permissions, and payment connections server-side."
      >
        <TokenResolutionSection />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={3}
        title="Payment Connections"
        subtitle="Your application loads available payment connections and stores the connection identifier — never the credentials."
      >
        <PaymentConnectionsSection />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={4}
        title="Graphify Payment Session Runtime"
        subtitle="The canonical runtime consumed by every application. One API — any provider."
      >
        <SessionRuntimeSection />
      </Section>

      <Divider sx={{ mb: 3 }} />

      <Section
        number={5}
        title="Canonical Payment Statuses"
        subtitle="Use these statuses in your business logic. They are identical across all providers — Graphify normalises everything."
      >
        <CanonicalStatusSection />
      </Section>

      {/* ── Provider-specific documentation ── */}

      <Box
        sx={{
          mt: 2,
          mb: 3,
          p: 2,
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AccountTreeOutlinedIcon color="primary" fontSize="small" />
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Provider-specific Implementation Guide
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Everything above applies to all providers. Select a provider to load its specific prerequisites,
              implementation steps, API examples, presentation modes, testing instructions, and limitations.
            </Typography>
          </Box>
          {/* Provider selector */}
          {providersLoading ? (
            <CircularProgress size={20} />
          ) : providersError ? null : providers.length > 0 ? (
            <FormControl size="small" sx={{ minWidth: 200, flexShrink: 0 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                label="Provider"
                value={selectedProviderKey}
                onChange={(e) => setSelectedProviderKey(e.target.value)}
              >
                {providers.map((p) => (
                  <MenuItem key={p.providerKey} value={p.providerKey}>
                    {p.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
        </Stack>
      </Box>

      {/* No providers configured */}
      {!providersLoading && !providersError && providers.length === 0 && (
        <EmptyState
          icon={IntegrationInstructionsOutlinedIcon as SvgIconComponent}
          title="No payment providers configured"
          description="Configure a provider credential in Settings → Provider Credentials to load the provider-specific guide."
        />
      )}

      {/* Provider error */}
      {providersError && (
        <ErrorState title="Could not load providers" description="Check your connection and refresh." />
      )}

      {/* Capability guard: gateway not available for selected provider */}
      {capabilityBlocks && capabilityStatus && (
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.gateway}
          providerDisplayName={selectedProviderOption?.displayName ?? selectedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      )}

      {/* Provider guide — only when capability allows */}
      {selectedProviderKey && !capabilityBlocks && (
        <>
          {guideLoading && (
            <Box display="flex" justifyContent="center" pt={4}>
              <CircularProgress />
            </Box>
          )}
          {guideError && !guideLoading && (
            <ErrorState
              title="Could not load provider guide"
              description="The provider may not supply a gateway guide yet."
            />
          )}
          {guide && !guideLoading && <ProviderGuide guide={guide} />}
        </>
      )}
    </Box>
  );
}
