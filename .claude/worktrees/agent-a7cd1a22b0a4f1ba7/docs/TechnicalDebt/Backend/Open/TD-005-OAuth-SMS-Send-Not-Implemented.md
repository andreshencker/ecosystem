---
tags: [technical-debt, channels]
id: TD-005
area: Channels
priority: Medium
status: Open
identified: 2026-06-13
action-plan: AP-014
---

# TD-005 — OAuth SMS `sendSms()` Not Implemented

## Description

`OAuthSmsChannel.sendSms()` returns a stub error. No OAuth SMS provider implementation exists.

## Location

`src/communication/channels/implementation/sms/oauth/oauth-sms.channel.ts`

## Impact

Companies configured with an OAuth SMS provider cannot send SMS. Silent failure at the API level.

## Planned Resolution

**AP-014** — Implement `OAuthSmsChannel.sendSms()` for at least one OAuth-based SMS provider. Provider to be specified before work begins.
