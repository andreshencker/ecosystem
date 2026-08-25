'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { PageHeader } from '@/components/layout';

// ─── Small building blocks ──────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: 'grey.900',
        color: 'grey.100',
        borderRadius: 1,
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}
    >
      {children}
    </Box>
  );
}

function MethodChip({ method }: { method: string }) {
  const color: 'success' | 'error' | 'info' | 'default' =
    method === 'POST' ? 'success' :
    method === 'DELETE' ? 'error' :
    method === 'GET' ? 'info' : 'default';
  return <Chip label={method} size="small" color={color} sx={{ fontWeight: 700, fontFamily: 'monospace', minWidth: 66 }} />;
}

interface EndpointProps {
  method: string;
  path: string;
  auth: 'bearer' | 'public';
  summary: string;
  children: React.ReactNode;
}

function Endpoint({ method, path, auth, summary, children }: EndpointProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={1}>
        <MethodChip method={method} />
        <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 500 }}>
          {path}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          icon={auth === 'public' ? <PublicOutlinedIcon /> : <LockOutlinedIcon />}
          label={auth === 'public' ? 'Public' : 'Bearer token'}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {summary}
      </Typography>
      <Stack spacing={2}>{children}</Stack>
    </Paper>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IdentityDocumentationPage() {
  return (
    <Box>
      <PageHeader
        title="Identity — integration guide"
        subtitle="How to implement &quot;Sign in with Google&quot; using Relay's Identity channel."
      />

      <Stack spacing={3} maxWidth={900}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            How it fits together
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Relay owns the OAuth 2.0 dance with Google — authorization, token exchange, refresh,
            and reading the verified profile. Your application never sees a Client Secret or a
            Google access token; it only asks Relay to start a connection and later checks
            whether that connection is verified. What you do with the verified identity
            (create a user, link an account, start a session) is entirely up to your app.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Before calling any of these endpoints, create a <strong>Provider Credentials</strong> record
            for the Identity channel (Setup → Credentials → Add Credentials → Identity → Google) with
            either your own OAuth Client ID/Secret, or one reused from the platform&apos;s
            ecosystem app. That record&apos;s ID is the <code>providerCredentialsId</code> used below.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Flow
          </Typography>
          <Stack component="ol" spacing={0.75} sx={{ pl: 2.5, m: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Call <code>POST /start</code> with the credential ID — get back a Google authorization URL.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Send the user to that URL. Google redirects them back to Relay&apos;s callback — you never
              handle the authorization code yourself.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Relay exchanges the code, reads the verified Google profile, and stores the connection.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Call <code>GET /connections/:id/status</code> whenever you need to confirm the connection
              is live and read the verified email/name — never tokens.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Call <code>DELETE /connections/:id</code> to disconnect.
            </Typography>
          </Stack>
        </Paper>

        <Typography variant="subtitle1" fontWeight={600}>
          Endpoints
        </Typography>

        <Endpoint
          method="POST"
          path="/relay/channels/oauth/identity/google/start"
          auth="bearer"
          summary='Starts the "Sign in with Google" flow and returns the authorization URL to redirect the user to.'
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Request body</Typography>
            <CodeBlock>{`{
  "providerCredentialsId": "6776e4f1a0c1234567890abc",
  "returnPath": "/settings/connections"   // optional
}`}</CodeBlock>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Response</Typography>
            <CodeBlock>{`{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}`}</CodeBlock>
          </Box>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/relay/channels/oauth/identity/google/callback"
          auth="public"
          summary="Google redirects here after the user approves access. Not called by your app directly — Relay exchanges the code, reads the profile, persists the connection, then 302-redirects the browser back to the returnPath (or a default) with a ?status= query param."
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Redirect query params</Typography>
            <CodeBlock>{`?status=connected&credentialId=6776e4f1a0c1234567890abc
?status=error&reason=Invalid+or+expired+authorization+state`}</CodeBlock>
          </Box>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/relay/channels/oauth/identity/google/connections/:credentialId/status"
          auth="bearer"
          summary="Verifies the connection is live by calling Google's userinfo endpoint. Returns the canonical status — never tokens."
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Response — connected</Typography>
            <CodeBlock>{`{
  "connected": true,
  "providerKey": "google_identity",
  "emailAddress": "user@example.com",
  "displayName": "Jane Doe",
  "grantedScopes": "openid email profile",
  "tokenExpiresAt": "2026-08-14T10:00:00.000Z",
  "checkedAt": "2026-08-14T09:00:00.000Z"
}`}</CodeBlock>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Response — not connected</Typography>
            <CodeBlock>{`{
  "connected": false,
  "providerKey": "google_identity",
  "emailAddress": null,
  "displayName": null,
  "grantedScopes": null,
  "tokenExpiresAt": null,
  "checkedAt": "2026-08-14T09:00:00.000Z",
  "reason": "Not connected yet — click \\"Connect with Google\\""
}`}</CodeBlock>
          </Box>
        </Endpoint>

        <Endpoint
          method="DELETE"
          path="/relay/channels/oauth/identity/google/connections/:credentialId"
          auth="bearer"
          summary="Revokes the token with Google (best-effort) and deactivates the credential regardless of whether revocation succeeded."
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Response</Typography>
            <CodeBlock>{`{
  "disconnected": true,
  "tenantName": null
}`}</CodeBlock>
          </Box>
        </Endpoint>

        <Divider />

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Auth &amp; scope
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <code>Bearer token</code> endpoints require the same JWT used across Relay — the
            connection is always scoped to the caller&apos;s company; you can never read or
            operate on another company&apos;s credential. The <code>/callback</code> endpoint is the
            only public route, protected by a single-use, 10-minute server-side state token
            instead of a session.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Full request/response schemas are also available in Swagger at{' '}
            <Typography component="code" sx={{ fontFamily: 'monospace' }}>/docs</Typography> under the{' '}
            <strong>Identity — Google OAuth</strong> tag.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}
