// src/payments/providers/stripe/stripe.refunds.ts
//
// All Stripe SDK types and all Stripe refund API logic live here.
// Nothing Stripe-specific leaks outside src/payments/providers/stripe/.

import Stripe from 'stripe';
import type {
  RefundSummary,
  RefundDetail,
  RefundListResult,
  ListRefundsParams,
  CreateRefundParams,
  RefundCanonicalStatus,
} from '../../contracts/payment-refund-list.contract';
import {
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
} from '../../errors/payment.errors';

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps a raw Stripe.Refund status string to the canonical RefundCanonicalStatus.
 *
 * Stripe uses 'canceled' (US spelling); the canonical type uses 'cancelled'.
 */
export function mapStripeRefundStatus(
  refund: Stripe.Refund,
): RefundCanonicalStatus {
  switch (refund.status) {
    case 'succeeded':
      return 'succeeded';
    case 'pending':
      return 'pending';
    case 'requires_action':
      return 'requires_action';
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

// ─── Stripe.Refund → RefundSummary ────────────────────────────────────────────

export function mapStripeRefundToSummary(
  refund: Stripe.Refund,
  accountId: string,
): RefundSummary {
  const chargeId =
    typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
  const piId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id;

  // Safe metadata — copy only string values
  const safeMetadata: Record<string, string> = {};
  if (refund.metadata) {
    for (const [k, v] of Object.entries(refund.metadata)) {
      if (typeof v === 'string') safeMetadata[k] = v;
    }
  }

  return {
    id: refund.id,
    accountId,
    providerKey: 'stripe',
    providerRefundId: refund.id,
    providerPaymentId: piId ?? '',
    providerChargeId: chargeId,
    amountMinor: refund.amount,
    currency: refund.currency,
    status: mapStripeRefundStatus(refund),
    providerStatus: refund.status ?? 'unknown',
    reason: refund.reason ?? undefined,
    failureCode: (refund as unknown as Record<string, unknown>)[
      'failure_reason'
    ] as string | undefined,
    createdAt: new Date(refund.created * 1000),
    metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
  };
}

// ─── Stripe.Refund → RefundDetail ────────────────────────────────────────────

export function mapStripeRefundToDetail(
  refund: Stripe.Refund,
  accountId: string,
  charge?: Stripe.Charge | null,
): RefundDetail {
  const summary = mapStripeRefundToSummary(refund, accountId);

  const balanceTxId =
    typeof refund.balance_transaction === 'string'
      ? refund.balance_transaction
      : refund.balance_transaction?.id;

  let paymentAmountMinor: number | undefined;
  let refundedAmountMinor: number | undefined;
  let remainingRefundableAmountMinor: number | undefined;

  if (charge) {
    paymentAmountMinor = charge.amount;
    refundedAmountMinor = charge.amount_refunded;
    remainingRefundableAmountMinor = charge.amount - charge.amount_refunded;
  }

  return {
    ...summary,
    paymentAmountMinor,
    refundedAmountMinor,
    remainingRefundableAmountMinor,
    receiptNumber: refund.receipt_number ?? undefined,
    balanceTransactionId: balanceTxId,
    providerMetadata: summary.metadata,
  };
}

// ─── List refunds ─────────────────────────────────────────────────────────────

export async function listStripeRefunds(
  client: Stripe,
  accountId: string,
  params: ListRefundsParams,
): Promise<RefundListResult> {
  const limit = Math.min(params.limit ?? 20, 100);

  const listParams: Stripe.RefundListParams = { limit };
  if (params.cursor) listParams.starting_after = params.cursor;
  // Note: Stripe RefundListParams does not support currency filtering at the API
  // level; currency is applied client-side after the list is fetched.

  // Support filtering by payment_intent or charge ID via search
  if (params.search) {
    const s = params.search.trim();
    if (s.startsWith('pi_')) {
      listParams.payment_intent = s;
    } else if (s.startsWith('ch_')) {
      listParams.charge = s;
    }
    // re_ prefix: cannot filter by refund ID in list — fall through to full list
    // and apply client-side filter after fetching
  }

  const result = await client.refunds.list(listParams);
  let data = result.data.map((r) => mapStripeRefundToSummary(r, accountId));

  // Client-side currency filtering (Stripe RefundListParams has no currency field)
  if (params.currency) {
    const currency = params.currency.toLowerCase();
    data = data.filter((r) => r.currency === currency);
  }

  // Client-side date filtering (Stripe list does not support created filter for refunds)
  if (params.createdFrom) {
    const from = params.createdFrom.getTime();
    data = data.filter((r) => r.createdAt.getTime() >= from);
  }
  if (params.createdTo) {
    const to = params.createdTo.getTime();
    data = data.filter((r) => r.createdAt.getTime() <= to);
  }

  // Client-side re_ prefix search (cannot filter by refund ID server-side in list)
  if (params.search && params.search.startsWith('re_')) {
    const search = params.search;
    data = data.filter((r) => r.providerRefundId === search);
  }

  const nextCursor =
    result.has_more && result.data.length > 0
      ? result.data[result.data.length - 1].id
      : undefined;

  return { data, hasMore: result.has_more, nextCursor };
}

// ─── Get single refund detail ─────────────────────────────────────────────────

export async function getStripeRefund(
  client: Stripe,
  accountId: string,
  refundId: string,
): Promise<RefundDetail> {
  const refund = await client.refunds.retrieve(refundId, {
    expand: ['balance_transaction', 'charge'],
  });

  const charge =
    refund.charge && typeof refund.charge !== 'string' ? refund.charge : null;

  return mapStripeRefundToDetail(refund, accountId, charge);
}

// ─── Create refund ────────────────────────────────────────────────────────────

/**
 * Creates a refund against a succeeded PaymentIntent.
 *
 * Validation steps:
 *   1. Retrieve the PaymentIntent to verify it has status 'succeeded'.
 *   2. Determine the refundable amount from the latest charge.
 *   3. Validate the requested amount (> 0, ≤ refundable).
 *   4. Create the Stripe refund and return the detail.
 *
 * Throws PaymentCredentialsInvalidError for business-rule violations
 * (not-yet-succeeded payment, over-refund, zero amount).
 */
export async function createStripeRefund(
  client: Stripe,
  accountId: string,
  params: CreateRefundParams,
): Promise<RefundDetail> {
  // 1. Retrieve PaymentIntent to validate eligibility
  const intent = await client.paymentIntents.retrieve(params.paymentId, {
    expand: ['latest_charge'],
  });

  if (intent.status !== 'succeeded') {
    throw new PaymentCredentialsInvalidError(
      `Payment "${params.paymentId}" has status "${intent.status}" and cannot be refunded. Only succeeded payments are eligible.`,
    );
  }

  // 2. Get charge to determine refundable amount
  const charge =
    intent.latest_charge && typeof intent.latest_charge !== 'string'
      ? intent.latest_charge
      : null;

  const received = intent.amount_received ?? 0;
  const alreadyRefunded = charge?.amount_refunded ?? 0;
  const refundable = received - alreadyRefunded;

  if (refundable <= 0) {
    throw new PaymentCredentialsInvalidError(
      `Payment "${params.paymentId}" has already been fully refunded.`,
    );
  }

  // 3. Validate requested amount
  const amountToRefund = params.amountMinor ?? refundable;

  if (amountToRefund <= 0) {
    throw new PaymentCredentialsInvalidError(
      'Refund amount must be greater than zero.',
    );
  }

  if (amountToRefund > refundable) {
    throw new PaymentCredentialsInvalidError(
      `Refund amount ${amountToRefund} exceeds the remaining refundable amount ${refundable}.`,
    );
  }

  // 4. Map canonical reason to Stripe reason
  const stripeReason = mapCanonicalReasonToStripe(params.reason);

  // 5. Create refund
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: params.paymentId,
    amount: amountToRefund,
    ...(stripeReason ? { reason: stripeReason } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
    expand: ['balance_transaction', 'charge'],
  };

  const refund = await client.refunds.create(refundParams);

  const chargeObj =
    refund.charge && typeof refund.charge !== 'string' ? refund.charge : null;

  return mapStripeRefundToDetail(refund, accountId, chargeObj);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapCanonicalReasonToStripe(
  reason: string | undefined,
): Stripe.RefundCreateParams['reason'] {
  switch (reason) {
    case 'duplicate':
      return 'duplicate';
    case 'fraudulent':
      return 'fraudulent';
    case 'requested_by_customer':
      return 'requested_by_customer';
    default:
      // 'expired_uncaptured_charge', 'other', or undefined → let Stripe default
      return undefined;
  }
}

/**
 * Throws a domain error for Stripe API errors encountered during refund
 * operations. Re-throws domain errors (PaymentCredentialsInvalidError) unchanged.
 */
export function throwStripeRefundError(
  err: unknown,
  providerKey: string,
): never {
  // Re-throw domain errors (e.g. PaymentCredentialsInvalidError thrown during
  // eligibility checks in createStripeRefund) without wrapping.
  if (
    err instanceof PaymentCredentialsInvalidError ||
    err instanceof PaymentProviderUnavailableError
  ) {
    throw err;
  }

  if (
    err instanceof Stripe.errors.StripeAuthenticationError ||
    err instanceof Stripe.errors.StripePermissionError ||
    err instanceof Stripe.errors.StripeInvalidRequestError
  ) {
    throw new PaymentCredentialsInvalidError(
      'Stripe credentials are invalid, revoked, or lack the required permissions.',
    );
  }

  if (
    err instanceof Stripe.errors.StripeConnectionError ||
    err instanceof Stripe.errors.StripeRateLimitError ||
    err instanceof Stripe.errors.StripeAPIError ||
    (err instanceof Error && err.message?.toLowerCase().includes('timeout'))
  ) {
    throw new PaymentProviderUnavailableError(
      providerKey,
      err instanceof Error ? err.message : undefined,
    );
  }

  throw new PaymentProviderUnavailableError(
    providerKey,
    err instanceof Error ? err.message : 'Unexpected error',
  );
}
