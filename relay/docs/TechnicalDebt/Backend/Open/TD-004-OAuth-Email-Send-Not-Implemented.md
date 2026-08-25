---
tags: [technical-debt, channels]
id: TD-004
area: Channels
priority: Medium
status: Open
identified: 2026-06-13
action-plan: AP-013
---

# TD-004 — OAuth Email `sendEmail()` Not Implemented

## Description

`OAuthEmailChannel.sendEmail()` returns a stub error. OAuth credential flow, access token retrieval/refresh, and Nodemailer OAuth2 transport are not implemented.

## Location

`src/communication/channels/implementation/email/oauth/oauth-email.channel.ts`

## Impact

Companies configured with Gmail OAuth or other OAuth email providers cannot send email. Silent failure at the API level.

## Planned Resolution

**AP-013** — Implement Gmail OAuth email send: access token retrieval/refresh from stored credentials, Nodemailer transport with `auth: { type: 'OAuth2', ... }`, in-memory token cache to avoid re-encrypting on every send.
