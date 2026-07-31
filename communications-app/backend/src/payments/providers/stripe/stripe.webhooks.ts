// src/payments/providers/stripe/stripe.webhooks.ts
//
// All Stripe webhook endpoint management and signature-verification logic.
// Nothing Stripe-specific leaks outside src/payments/providers/stripe/.

import Stripe from 'stripe';
import * as crypto from 'crypto';
import type {
  WebhookEndpointSummary,
  WebhookEndpointDetail,
  WebhookEndpointCreateResult,
  WebhookEndpointListResult,
  CreateWebhookEndpointParams,
  UpdateWebhookEndpointParams,
  WebhookEndpointStatus,
  ListWebhookEndpointsParams,
} from '../../contracts/payment-webhook-endpoint.contract';
import type { VerifiedWebhookEvent } from '../../contracts/payment-webhook-delivery.contract';

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStripeEndpointStatus(
  endpoint: Stripe.WebhookEndpoint,
): WebhookEndpointStatus {
  switch (endpoint.status) {
    case 'enabled':
      return 'enabled';
    case 'disabled':
      return 'disabled';
    default:
      return 'unknown';
  }
}

// ─── Safe metadata ────────────────────────────────────────────────────────────

function extractSafeMetadata(
  metadata: Stripe.Metadata | null | undefined,
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v === 'string') safe[k] = v;
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

// ─── Stripe.WebhookEndpoint → WebhookEndpointSummary ─────────────────────────

export function mapStripeEndpointToSummary(
  endpoint: Stripe.WebhookEndpoint,
  accountId: string,
): WebhookEndpointSummary {
  const events = endpoint.enabled_events ?? [];

  return {
    id: endpoint.id,
    accountId,
    providerKey: 'stripe',
    providerEndpointId: endpoint.id,
    url: endpoint.url,
    status: mapStripeEndpointStatus(endpoint),
    providerStatus: endpoint.status ?? 'unknown',
    enabledEventCount: events.includes('*') ? -1 : events.length,
    apiVersion: endpoint.api_version ?? undefined,
    description: endpoint.description ?? undefined,
    createdAt: new Date(endpoint.created * 1000),
    environment: endpoint.livemode ? 'live' : 'test',
    metadata: extractSafeMetadata(endpoint.metadata),
  };
}

// ─── Stripe.WebhookEndpoint → WebhookEndpointDetail ──────────────────────────

export function mapStripeEndpointToDetail(
  endpoint: Stripe.WebhookEndpoint,
  accountId: string,
): WebhookEndpointDetail {
  const summary = mapStripeEndpointToSummary(endpoint, accountId);

  const appId =
    typeof endpoint.application === 'string'
      ? endpoint.application
      : (endpoint.application as unknown as { id?: string } | null)?.id;

  return {
    ...summary,
    enabledEvents: endpoint.enabled_events ?? [],
    connect: (endpoint as unknown as Record<string, unknown>)['connect'] as
      | boolean
      | undefined,
    applicationId: appId,
    providerMetadata: summary.metadata,
  };
}

// ─── List webhook endpoints ───────────────────────────────────────────────────

export async function listStripeWebhookEndpoints(
  client: Stripe,
  accountId: string,
  params: ListWebhookEndpointsParams,
): Promise<WebhookEndpointListResult> {
  const limit = Math.min(params.limit ?? 20, 100);

  const listParams: Stripe.WebhookEndpointListParams = { limit };
  if (params.cursor) listParams.starting_after = params.cursor;

  const result = await client.webhookEndpoints.list(listParams);

  const data = result.data.map((e) => mapStripeEndpointToSummary(e, accountId));

  const nextCursor =
    result.has_more && result.data.length > 0
      ? result.data[result.data.length - 1].id
      : undefined;

  return { data, hasMore: result.has_more, nextCursor };
}

// ─── Get single webhook endpoint ─────────────────────────────────────────────

export async function getStripeWebhookEndpoint(
  client: Stripe,
  accountId: string,
  endpointId: string,
): Promise<WebhookEndpointDetail> {
  const endpoint = await client.webhookEndpoints.retrieve(endpointId);
  return mapStripeEndpointToDetail(endpoint, accountId);
}

// ─── Create webhook endpoint ──────────────────────────────────────────────────

/**
 * Creates a Stripe webhook endpoint and returns the result.
 *
 * The signing secret (secret field) is included exactly once in the result
 * as signingSecretOnce. It must be stored encrypted by the caller.
 * It is NEVER logged here.
 */
export async function createStripeWebhookEndpoint(
  client: Stripe,
  accountId: string,
  params: CreateWebhookEndpointParams,
): Promise<WebhookEndpointCreateResult> {
  const createParams: Stripe.WebhookEndpointCreateParams = {
    url: params.url,
    enabled_events:
      params.enabledEvents as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
  };

  if (params.description) createParams.description = params.description;
  if (params.metadata) createParams.metadata = params.metadata;
  if (params.connect !== undefined) {
    (createParams as unknown as Record<string, unknown>)['connect'] =
      params.connect;
  }

  const endpoint = await client.webhookEndpoints.create(createParams);
  const detail = mapStripeEndpointToDetail(endpoint, accountId);

  // The signing secret — present only on create, never returned by retrieve.
  // The caller MUST store it encrypted. We do NOT log it.
  const signingSecretOnce: string | undefined = endpoint.secret ?? undefined;

  return { ...detail, signingSecretOnce };
}

// ─── Update webhook endpoint ──────────────────────────────────────────────────

export async function updateStripeWebhookEndpoint(
  client: Stripe,
  accountId: string,
  endpointId: string,
  params: UpdateWebhookEndpointParams,
): Promise<WebhookEndpointDetail> {
  const updateParams: Stripe.WebhookEndpointUpdateParams = {};

  if (params.url !== undefined) updateParams.url = params.url;
  if (params.enabledEvents !== undefined) {
    updateParams.enabled_events =
      params.enabledEvents as Stripe.WebhookEndpointUpdateParams.EnabledEvent[];
  }
  if (params.description !== undefined)
    updateParams.description = params.description;
  if (params.disabled !== undefined) updateParams.disabled = params.disabled;
  if (params.metadata !== undefined) updateParams.metadata = params.metadata;

  const endpoint = await client.webhookEndpoints.update(
    endpointId,
    updateParams,
  );

  return mapStripeEndpointToDetail(endpoint, accountId);
}

// ─── Delete webhook endpoint ──────────────────────────────────────────────────

export async function deleteStripeWebhookEndpoint(
  client: Stripe,
  endpointId: string,
): Promise<{ deleted: boolean; endpointId: string }> {
  const deleted = await client.webhookEndpoints.del(endpointId);
  return {
    deleted: deleted.deleted ?? false,
    endpointId: deleted.id,
  };
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verifies a Stripe webhook signature using the raw request body.
 *
 * Security requirements:
 *   - rawBody MUST be the original bytes before any JSON parsing.
 *   - signingSecret MUST be the secret for the specific endpoint that sent
 *     this event (we_xxx → whsec_xxx).
 *   - Never trust event data before this verification succeeds.
 *
 * Returns a VerifiedWebhookEvent with only safe fields extracted.
 * Raw Stripe objects are never passed to callers.
 *
 * @throws Error when signature verification fails.
 */
export function verifyStripeWebhookSignature(
  rawBody: Buffer,
  stripeSignatureHeader: string,
  signingSecret: string,
): VerifiedWebhookEvent {
  // Stripe.webhooks.constructEvent throws on invalid signature.
  const event = Stripe.webhooks.constructEvent(
    rawBody,
    stripeSignatureHeader,
    signingSecret,
  );

  // Extract only safe, non-sensitive fields from the event.
  const obj = event.data?.object as unknown as
    | Record<string, unknown>
    | undefined;
  const objectType = obj ? (obj['object'] as string | undefined) : undefined;
  const objectId = obj ? (obj['id'] as string | undefined) : undefined;

  // Build a safe payload summary — redact sensitive fields.
  const safePayloadSummary = obj
    ? buildSafePayloadSummary(objectType, obj)
    : undefined;

  const requestData = (event as unknown as { request?: { id?: string | null } })
    ?.request;

  return {
    providerEventId: event.id,
    eventType: event.type,
    createdAt: new Date(event.created * 1000),
    livemode: event.livemode,
    apiVersion: event.api_version ?? undefined,
    objectType,
    objectId,
    requestId: requestData?.id ?? undefined,
    safePayloadSummary,
  };
}

/**
 * Computes a SHA-256 hash of the raw body for idempotency evidence.
 * The hash is stored with the delivery record — NOT the raw body itself.
 */
export function hashRawBody(rawBody: Buffer): string {
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

// ─── Safe payload summary ─────────────────────────────────────────────────────

/**
 * Extracts a safe, redacted summary of the event object.
 * Sensitive fields (card numbers, bank accounts, keys, secrets) are never included.
 */
function buildSafePayloadSummary(
  objectType: string | undefined,
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  // Always safe to include
  const safeKeys = [
    'id',
    'object',
    'status',
    'amount',
    'currency',
    'created',
    'livemode',
    'type',
    'failure_code',
    'failure_message',
    'reason',
    'description',
  ];

  for (const key of safeKeys) {
    if (key in obj) safe[key] = obj[key];
  }

  // Object-type specific safe fields
  if (objectType === 'payment_intent') {
    const safeIntentKeys = [
      'amount_received',
      'amount_capturable',
      'capture_method',
      'payment_method_types',
    ];
    for (const key of safeIntentKeys) {
      if (key in obj) safe[key] = obj[key];
    }
  }

  if (objectType === 'refund') {
    if ('payment_intent' in obj) safe['payment_intent'] = obj['payment_intent'];
    if ('charge' in obj) safe['charge'] = obj['charge'];
  }

  if (objectType === 'payout') {
    const safePayoutKeys = ['arrival_date', 'method', 'source_type'];
    for (const key of safePayoutKeys) {
      if (key in obj) safe[key] = obj[key];
    }
    // destination: only show the ID, never the full bank account
    if (obj['destination'] && typeof obj['destination'] === 'object') {
      const dest = obj['destination'] as Record<string, unknown>;
      safe['destination'] = { id: dest['id'], object: dest['object'] };
    } else if (typeof obj['destination'] === 'string') {
      safe['destination'] = obj['destination'];
    }
  }

  return safe;
}
