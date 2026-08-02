// src/payments/providers/coingate/coingate.callbacks.ts
//
// CoinGate callback (webhook) processing.
//
// CoinGate callback security mechanism:
//   When creating an order, a `token` field (custom string) can be set.
//   CoinGate includes that token in every callback payload for that order.
//   Security validation = compare received token against the expected value.
//
// This implementation uses stateless token derivation:
//   token = SHA-256(credentialId + ':' + externalReference + ':coingate-callback-v1')[0:32]
//
// The external reference is the `order_id` field in the callback (our merchant ref).
// This allows verification without storing per-order state.
//
// After token validation, the order is re-fetched from CoinGate for authoritative state.
// We never trust the callback payload status alone.

import type { CoinGateClient } from './coingate.client';
import type { CoinGateOrder } from './coingate.types';
import { verifyCallbackToken } from './coingate.orders';
import type { VerifiedWebhookEvent } from '../../contracts/payment-webhook-delivery.contract';

// ─── Callback payload shape ───────────────────────────────────────────────────

export interface CoinGateCallbackPayload {
  id?: number | string;
  status?: string;
  order_id?: string; // merchant-supplied external reference
  price_currency?: string;
  price_amount?: string;
  receive_currency?: string;
  receive_amount?: string;
  pay_currency?: string;
  pay_amount?: string;
  created_at?: string;
  token?: string; // set by us on order creation; sent back for validation
}

export interface CoinGateCallbackResult {
  /** Whether the callback token was valid. */
  valid: boolean;
  /** Safe signal: callback should be ignored silently on invalid. */
  signatureStatus: 'valid' | 'invalid' | 'missing';
  /** Provider order ID (CoinGate internal). */
  orderId?: string;
  /** Merchant external reference (our order_id). */
  externalReference?: string;
  /** Re-fetched authoritative order (only when valid=true). */
  order?: CoinGateOrder;
}

// ─── Canonical callback event type strings ────────────────────────────────────

export const COINGATE_EVENT_PAYMENT_PAID = 'coingate.order.paid';
export const COINGATE_EVENT_PAYMENT_CONFIRMING = 'coingate.order.confirming';
export const COINGATE_EVENT_PAYMENT_EXPIRED = 'coingate.order.expired';
export const COINGATE_EVENT_PAYMENT_INVALID = 'coingate.order.invalid';
export const COINGATE_EVENT_PAYMENT_CANCELED = 'coingate.order.canceled';
export const COINGATE_EVENT_REFUND_STATUS = 'coingate.refund.status_changed';
export const COINGATE_EVENT_ORDER_GENERIC = 'coingate.order.status_changed';

function resolveEventType(status: string | undefined): string {
  switch (status) {
    case 'paid':
      return COINGATE_EVENT_PAYMENT_PAID;
    case 'confirming':
      return COINGATE_EVENT_PAYMENT_CONFIRMING;
    case 'expired':
      return COINGATE_EVENT_PAYMENT_EXPIRED;
    case 'invalid':
      return COINGATE_EVENT_PAYMENT_INVALID;
    case 'canceled':
      return COINGATE_EVENT_PAYMENT_CANCELED;
    default:
      return COINGATE_EVENT_ORDER_GENERIC;
  }
}

// ─── Main callback processor ──────────────────────────────────────────────────

/**
 * Processes a CoinGate callback.
 *
 * Steps:
 *   1. Parse JSON body.
 *   2. Extract order ID and external reference (order_id).
 *   3. If token present: verify against derived expected value.
 *   4. Re-fetch the order from CoinGate for authoritative state.
 *   5. Return result for the generic receiver to record as delivery.
 *
 * The caller (receiver controller) is responsible for:
 *   - Creating the WebhookDelivery record.
 *   - Acknowledging the callback with 200 OK quickly.
 *   - Not trusting callback-only status.
 */
export async function processCoinGateCallback(
  rawBody: Buffer,
  credentialId: string,
  client: CoinGateClient,
): Promise<CoinGateCallbackResult> {
  // 1. Parse the callback body.
  let payload: CoinGateCallbackPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as CoinGateCallbackPayload;
  } catch {
    return { valid: false, signatureStatus: 'invalid' };
  }

  const orderId = payload.id !== undefined ? String(payload.id) : undefined;
  const externalReference = payload.order_id;
  const receivedToken = payload.token;

  // 2. Token validation.
  let signatureStatus: 'valid' | 'invalid' | 'missing' = 'missing';

  if (!receivedToken) {
    // No token in payload — cannot validate.
    // Still process if we can re-fetch the order (lower security).
    signatureStatus = 'missing';
  } else if (externalReference) {
    const tokenValid = verifyCallbackToken(
      receivedToken,
      credentialId,
      externalReference,
    );
    signatureStatus = tokenValid ? 'valid' : 'invalid';

    if (!tokenValid) {
      return {
        valid: false,
        signatureStatus: 'invalid',
        orderId,
        externalReference,
      };
    }
  } else {
    // Token present but no externalReference to derive against.
    signatureStatus = 'invalid';
    return { valid: false, signatureStatus: 'invalid', orderId };
  }

  // 3. Re-fetch from CoinGate for authoritative state.
  if (!orderId) {
    return { valid: false, signatureStatus, orderId, externalReference };
  }

  try {
    const order = await client.get<CoinGateOrder>(`/orders/${orderId}`);
    return { valid: true, signatureStatus, orderId, externalReference, order };
  } catch {
    // If re-fetch fails, still acknowledge but mark as not fully verified.
    return { valid: false, signatureStatus, orderId, externalReference };
  }
}

/**
 * Builds a VerifiedWebhookEvent from a successfully processed CoinGate callback.
 * Used by the generic WebhookDelivery recorder.
 */
export function buildCoinGateVerifiedEvent(
  result: CoinGateCallbackResult,
  apiVersion = '2',
): VerifiedWebhookEvent {
  const order = result.order;
  const eventType = resolveEventType(order?.status);

  return {
    providerEventId: `coingate:${result.orderId ?? 'unknown'}:${order?.status ?? 'unknown'}`,
    eventType,
    objectType: 'order',
    objectId: result.orderId,
    apiVersion,
    createdAt: new Date(),
    livemode: false, // determined by the credential mode, not the payload
    safePayloadSummary: {
      orderId: result.orderId,
      externalReference: result.externalReference,
      status: order?.status,
      priceAmount: order?.price_amount,
      priceCurrency: order?.price_currency,
    },
  };
}
