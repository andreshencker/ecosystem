'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { PageHeader } from '@/components/layout';

// ─── Grapifly-flavored visual tokens (borrowed from grapifly/frontend/app/styles.css) ─
const ink = '#111114';
const muted = '#66666d';
const line = 'rgba(18,18,22,.09)';
const accent = '#5c47ce';
const panelBg = '#f6f5fa';
const codeBg = '#111116';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${line}`,
        borderRadius: '22px',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: ink, mb: 1.5 }}
    >
      {children}
    </Typography>
  );
}

function Body({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: Parameters<typeof Typography>[0]['sx'];
}) {
  return (
    <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: muted, mb: 2, ...sx }}>
      {children}
    </Typography>
  );
}

function InfoTile({ label, text }: { label: string; text: string }) {
  return (
    <Box sx={{ p: 2.25, borderRadius: '16px', bgcolor: panelBg, flex: '1 1 220px' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: accent, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, color: ink }}>{text}</Typography>
    </Box>
  );
}

function StepPill({ n, label }: { n: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: ink,
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </Box>
      <Typography sx={{ fontSize: 14.5, fontWeight: 650, color: ink }}>{label}</Typography>
    </Box>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: codeBg,
        color: '#e8e8ee',
        borderRadius: '16px',
        p: 2.25,
        fontSize: 12.5,
        lineHeight: 1.65,
        overflowX: 'auto',
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        m: 0,
      }}
    >
      {children}
    </Box>
  );
}

const METHOD_COLORS: Record<string, string> = {
  POST: '#1d9e75',
  GET: '#378add',
  PATCH: '#ba7517',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        color: METHOD_COLORS[method] ?? accent,
        bgcolor: '#f2f2f6',
        borderRadius: '8px',
        px: 1,
        py: 0.4,
        minWidth: 44,
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {method}
    </Box>
  );
}

function EndpointRow({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        borderBottom: `1px solid ${line}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <MethodBadge method={method} />
      <Typography
        sx={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          color: ink,
          flexShrink: 0,
        }}
      >
        {path}
      </Typography>
      <Typography sx={{ fontSize: 13, color: muted }}>{description}</Typography>
    </Box>
  );
}

interface Field {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

function FieldTable({ fields }: { fields: Field[] }) {
  return (
    <Box sx={{ border: `1px solid ${line}`, borderRadius: '14px', overflow: 'hidden', mb: 2 }}>
      {fields.map((f, i) => (
        <Box
          key={f.name}
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            px: 2,
            py: 1.25,
            bgcolor: i % 2 === 0 ? '#fff' : '#fafafc',
            borderBottom: i < fields.length - 1 ? `1px solid ${line}` : 'none',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12.5,
              fontWeight: 700,
              color: ink,
              minWidth: 160,
              flexShrink: 0,
            }}
          >
            {f.name}
            {f.required && (
              <Box component="span" sx={{ color: '#c0392b' }}>
                {' '}
                *
              </Box>
            )}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              color: accent,
              minWidth: 90,
              flexShrink: 0,
            }}
          >
            {f.type}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: muted, lineHeight: 1.5 }}>
            {f.description}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function FlowStep({
  n,
  title,
  method,
  path,
  auth,
  children,
}: {
  n: number;
  title: string;
  method?: string;
  path?: string;
  auth: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3.5 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: ink,
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {n}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: ink, mb: 0.5 }}>
          {title}
        </Typography>
        {method && path && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MethodBadge method={method} />
            <Typography
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12.5,
                color: ink,
              }}
            >
              {path}
            </Typography>
          </Box>
        )}
        <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#ba7517', mb: 1 }}>
          Auth: {auth}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}

// ─── Tab 1 — Overview ───────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <Box sx={{ p: { xs: 3, sm: 4 } }}>
      <SectionHeading>What is the Notifications module?</SectionHeading>
      <Body>
        Notifications is Relay&apos;s central engine for sending email and SMS messages on
        your behalf. Instead of wiring up a mail or SMS provider inside every system that
        needs to reach a customer, everything routes through here: you configure the message
        once, and Relay takes care of rendering and delivering it — no matter which
        application triggers it, and no matter which provider is doing the actual sending.
      </Body>
      <Body>
        It exists to solve one recurring problem: transactional communication (welcome
        emails, receipts, password resets, alerts) tends to get scattered across every
        service that needs to send something, each with its own provider integration, its
        own templates, and its own failure handling. Notifications centralizes all of that
        behind a single, stable API — <code>POST /notifications/event</code> — so any
        internal module or external application can trigger a message without knowing
        anything about SendGrid, Twilio, or SMTP.
      </Body>

      <Box sx={{ mt: 4, mb: 4 }}>
        <SectionHeading>How it&apos;s organized</SectionHeading>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StepPill n={1} label="Domains — categories such as Billing or Security" />
          <StepPill n={2} label="Events — specific actions inside a domain, e.g. “invoice created”" />
          <StepPill n={3} label="Channel content — the subject and body of the message, one version for email and one for SMS" />
          <StepPill n={4} label="Delivery — Relay renders the final message and sends it through the provider you configured" />
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionHeading>What you can customize</SectionHeading>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <InfoTile
            label="Message content"
            text="The subject and body for each event, per channel — email and SMS have independent copy."
          />
          <InfoTile
            label="Variables"
            text="What data the message receives — e.g. {{name}} or {{amount}} — and which ones are required."
          />
          <InfoTile
            label="Delivery provider"
            text="Which service actually sends the email or SMS (SendGrid, Mailgun, SMTP, Twilio, …) — chosen in Setup."
          />
          <InfoTile
            label="Visual design"
            text="Your company's Template and Theme decide how the final email looks."
          />
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionHeading>When to use it</SectionHeading>
        <Body>
          Any moment your systems need to tell someone something: a welcome message when a
          customer signs up, a payment reminder, a security alert, a confirmation that
          something finished processing. You don&apos;t need to build email or SMS delivery
          into each application — you fire the event, and Relay handles the rest.
        </Body>
      </Box>

      <Box>
        <SectionHeading>Before going live</SectionHeading>
        <Body>
          Use{' '}
          <Link href="/notifications/test" style={{ color: accent, fontWeight: 650 }}>
            Test Notifications
          </Link>{' '}
          to send yourself a real preview and confirm exactly how it will look to the final
          recipient, before turning the event on for real.
        </Body>
      </Box>
    </Box>
  );
}

// ─── Tab 2 — Developer docs ─────────────────────────────────────────────────

function DeveloperTab() {
  return (
    <Box sx={{ p: { xs: 3, sm: 4 } }}>
      <SectionHeading>Recommended flow</SectionHeading>
      <Body>
        This is the exact sequence to go from zero to sending a notification from an
        external application. Each step links to its full reference further down this page.
      </Body>

      <FlowStep n={1} title="Get your integration token" auth="Grapifly session">
        <Body>
          Go to Setup → API Tokens in Relay and create a token
          (<code>POST /company-integrations</code>, session-authenticated — <code>companyId</code>{' '}
          is resolved from your session and forced onto the record, so you can only create
          tokens for your own company). The raw token is shown <strong>once</strong> — store it
          securely. Every subsequent call from your external app authenticates with this
          token in the <code>x-integration-token</code> header; Relay resolves your company
          from it automatically.
        </Body>
      </FlowStep>

      <FlowStep
        n={2}
        title="Create a domain"
        method="POST"
        path="/domain-catalogue"
        auth="Internal admin key or Grapifly session — not the integration token"
      >
        <Body>
          A domain is a category (e.g. <code>billing</code>, <code>security</code>). It also
          declares, per channel, which configured provider credential should deliver
          messages in that domain. You need the <code>providerCredentialsId</code> of a
          credential already configured in Setup → Credentials — fetch available ones with{' '}
          <code>GET /provider-credentials/options?companyId=&amp;channel=email</code>.
        </Body>
      </FlowStep>

      <FlowStep
        n={3}
        title="Create the events for that domain"
        method="POST"
        path="/event-catalogue"
        auth="Internal admin key or Grapifly session — not the integration token"
      >
        <Body>
          An event is a specific trigger inside the domain (e.g.{' '}
          <code>invoice_created</code>), with its own subject/body and its own list of
          required and optional variables, independently for email and SMS. Use{' '}
          <code>POST /event-catalogue/bulk</code> to create several events for the same
          domain in a single call.
        </Body>
      </FlowStep>

      <FlowStep
        n={4}
        title="Send a notification"
        method="POST"
        path="/notifications/event"
        auth="Integration token (external apps) or Grapifly session"
      >
        <Body>
          This is the call your application makes every time it needs to notify someone —
          the only endpoint you&apos;ll be calling on a recurring basis. It resolves the
          event from the catalog, merges in the variables you send, renders the final
          message, delivers it, and logs the result.
        </Body>
      </FlowStep>

      <Box sx={{ my: 4, height: 1, bgcolor: line }} />

      <SectionHeading>Authentication reference</SectionHeading>
      <FieldTable
        fields={[
          {
            name: 'Grapifly session',
            type: 'Bearer JWT',
            description:
              'A logged-in company_owner/company_admin in the Relay UI. Can create domains, events, and tokens for their own company, and send notifications.',
          },
          {
            name: 'Internal admin key',
            type: 'x-api-key',
            description:
              'COMMUNICATION_API_KEY — used for platform-level provisioning (e.g. Relay\'s own bootstrap scripts). Not meant for external applications.',
          },
          {
            name: 'Integration token',
            type: 'x-integration-token',
            description:
              'Scoped to one company. The only credential external applications should use. Valid for POST /notifications/event and its preview endpoint — not for creating domains or events.',
          },
        ]}
      />

      <Box sx={{ mt: 4 }}>
        <SectionHeading>POST /notifications/event — full reference</SectionHeading>
        <Body>Request body:</Body>
        <FieldTable
          fields={[
            {
              name: 'event',
              type: 'string',
              required: true,
              description:
                'Canonical key "domainKey.eventKey" (recommended) or a bare eventKey for backward compatibility.',
            },
            {
              name: 'email',
              type: 'string',
              description: 'Recipient email address — required if the event has email content enabled.',
            },
            {
              name: 'phone',
              type: 'string',
              description: 'Recipient phone number (E.164) — required if the event has SMS content enabled.',
            },
            {
              name: 'variables',
              type: 'object',
              description:
                'Key/value map filling the {{placeholders}} declared as required/optional on the event. Missing required variables surface as a validation error.',
            },
            {
              name: 'payload',
              type: 'object',
              description:
                'Optional. payload.data is merged with variables for backward compatibility with older integrations.',
            },
          ]}
        />
        <CodeBlock>{`POST /notifications/event
x-integration-token: <your integration token>
Content-Type: application/json

{
  "event": "billing.invoice_created",
  "email": "customer@example.com",
  "variables": {
    "customerName": "Andres",
    "amount": "1,250.00",
    "invoiceNumber": "INV-00123"
  }
}`}</CodeBlock>
        <Body>Response — 200 when every channel delivered, 207 if any channel failed:</Body>
        <CodeBlock>{`{
  "eventKey": "invoice_created",
  "companyId": "6a...",
  "results": [
    { "channel": "EMAIL", "success": true, "provider": "sendgrid" }
  ]
}`}</CodeBlock>
        <Body sx={{ mb: 0 }}>
          <strong>Do not send <code>companyId</code> in the body</strong> — it is always
          resolved server-side from whatever credential authenticated the request (session
          or integration token), and any value you send is ignored. This is a deliberate
          security boundary: it is what makes it impossible for one company&apos;s token to
          trigger a notification under another company&apos;s identity.
        </Body>
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading>POST /domain-catalogue — request fields</SectionHeading>
        <FieldTable
          fields={[
            { name: 'companyId', type: 'string', required: true, description: 'Mongo ObjectId — ignored and overridden when authenticated with a Grapifly session.' },
            { name: 'domainKey', type: 'string', required: true, description: 'Lowercase, unique per company — e.g. "billing".' },
            { name: 'displayName', type: 'string', required: true, description: 'Human-readable name shown in the UI.' },
            { name: 'domainCategory', type: 'string', required: true, description: 'Free-form grouping label.' },
            { name: 'isActive', type: 'boolean', description: 'Defaults to true.' },
            { name: 'channelsToUse', type: 'array', description: 'List of { channel: "email"|"sms", providerCredentialsId }. Determines which configured credential delivers this domain\'s messages per channel.' },
          ]}
        />
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading>POST /event-catalogue — request fields</SectionHeading>
        <FieldTable
          fields={[
            { name: 'domainCatalogueId', type: 'string', required: true, description: 'The _id returned when you created the domain.' },
            { name: 'eventKey', type: 'string', required: true, description: 'Lowercase, unique within the domain — e.g. "invoice_created".' },
            { name: 'displayName', type: 'string', required: true, description: 'Human-readable name shown in the UI.' },
            { name: 'eventType', type: 'enum', required: true, description: 'One of: notification, alert, request, security.' },
            { name: 'channelContent', type: 'object', description: 'See below — per-channel subject/body/variables.' },
            { name: 'scope', type: 'enum', description: '"company" (default) or "platform" for Relay-internal system events.' },
          ]}
        />
        <Body>
          <code>channelContent</code> shape — <code>email</code> and <code>sms</code> are both
          optional, but at least one must be enabled:
        </Body>
        <CodeBlock>{`{
  "domainCatalogueId": "6a...",
  "eventKey": "invoice_created",
  "displayName": "Invoice created",
  "eventType": "notification",
  "channelContent": {
    "email": {
      "enabled": true,
      "subject": "Your invoice {{invoiceNumber}} is ready",
      "content": "Hi {{customerName}}, your invoice for {{amount}} is attached.",
      "requiredVariables": ["customerName", "amount", "invoiceNumber"],
      "optionalVariables": []
    },
    "sms": {
      "enabled": false
    }
  }
}`}</CodeBlock>
        <Body sx={{ mb: 0 }}>
          Variables referenced with <code>{'{{variableName}}'}</code> in <code>subject</code> or{' '}
          <code>content</code> must be declared in <code>requiredVariables</code> or{' '}
          <code>optionalVariables</code> for that channel — <code>POST /notifications/event</code>{' '}
          validates required variables at send time and rejects the call if any are missing.
        </Body>
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading>Other endpoints</SectionHeading>
        <Card>
          <Box sx={{ px: 2.25 }}>
            <EndpointRow
              method="POST"
              path="/notifications/preview/event-by-key"
              description="Renders the final HTML without sending it — useful for reviewing before you flip an event on."
            />
            <EndpointRow
              method="GET"
              path="/notifications/logs"
              description="Execution history: what was attempted, the outcome, and when — per company."
            />
            <EndpointRow
              method="POST"
              path="/event-catalogue/bulk"
              description="Create multiple events for the same domain in one call — body: { domainCatalogueId, items: [...] }."
            />
          </Box>
        </Card>
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeading>Error handling</SectionHeading>
        <FieldTable
          fields={[
            { name: '400', type: 'Bad Request', description: '"event is required", "companyId is required", or a missing required variable.' },
            { name: '401', type: 'Unauthorized', description: 'Missing or invalid integration token / session / admin key.' },
            { name: '404', type: 'Not Found', description: 'The canonical or bare event key does not exist for this company.' },
            { name: '207', type: 'Multi-Status', description: 'The event was found and processed, but at least one channel (email or SMS) failed to deliver — check results[].error.' },
          ]}
        />
      </Box>
    </Box>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [tab, setTab] = useState<'overview' | 'developer'>('overview');

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="How Relay's notification engine works, and how to integrate it from other applications."
      />

      <Card>
        <Box
          role="tablist"
          sx={{
            display: 'flex',
            gap: 0.5,
            px: 2.25,
            borderBottom: `1px solid ${line}`,
            overflowX: 'auto',
          }}
        >
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'developer', label: 'Technical documentation' },
            ] as const
          ).map((t) => {
            const isActive = tab === t.key;
            return (
              <ButtonBase
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.key)}
                sx={{
                  py: 2.1,
                  px: 1.5,
                  fontSize: 14,
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                  color: isActive ? accent : muted,
                  borderBottom: '2px solid',
                  borderColor: isActive ? '#6b55e6' : 'transparent',
                  borderRadius: 0,
                  transition: 'color .15s ease',
                }}
              >
                {t.label}
              </ButtonBase>
            );
          })}
        </Box>

        {tab === 'overview' ? <OverviewTab /> : <DeveloperTab />}
      </Card>
    </Box>
  );
}
