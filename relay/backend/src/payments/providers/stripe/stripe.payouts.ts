// src/payments/providers/stripe/stripe.payouts.ts
//
// All Stripe SDK types and all Stripe payout API logic live here.
// Nothing Stripe-specific leaks outside src/payments/providers/stripe/.

import Stripe from 'stripe';
import type {
  PayoutSummary,
  PayoutDetail,
  PayoutListResult,
  ListPayoutsParams,
  PayoutCanonicalStatus,
  PayoutDestinationType,
} from '../../contracts/payment-payout-list.contract';

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps a raw Stripe.Payout status to the canonical PayoutCanonicalStatus.
 *
 * Stripe uses 'canceled' (US spelling); the canonical type uses 'cancelled'.
 */
export function mapStripePayoutStatus(
  payout: Stripe.Payout,
): PayoutCanonicalStatus {
  switch (payout.status) {
    case 'pending':
      return 'pending';
    case 'in_transit':
      return 'in_transit';
    case 'paid':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

// ─── Destination helpers ──────────────────────────────────────────────────────

/**
 * Extracts safe, masked destination info from a Stripe payout.
 * Never returns full account numbers, routing numbers, or any sensitive data.
 */
function extractDestinationInfo(payout: Stripe.Payout): {
  destinationType: PayoutDestinationType;
  destinationLabel: string | undefined;
  destinationId: string | undefined;
  destinationBankName: string | undefined;
  destinationLast4: string | undefined;
} {
  const dest = payout.destination;

  if (!dest) {
    return {
      destinationType: 'unknown',
      destinationLabel: undefined,
      destinationId: undefined,
      destinationBankName: undefined,
      destinationLast4: undefined,
    };
  }

  // Destination may be an ID string (not expanded) or a full object.
  if (typeof dest === 'string') {
    return {
      destinationType: 'unknown',
      destinationLabel: undefined,
      destinationId: dest,
      destinationBankName: undefined,
      destinationLast4: undefined,
    };
  }

  // Expanded BankAccount object
  if (dest.object === 'bank_account') {
    const ba = dest as Stripe.BankAccount;
    const last4 = ba.last4 ?? undefined;
    const bankName = ba.bank_name ?? undefined;
    const label =
      bankName && last4
        ? `${bankName} •••• ${last4}`
        : last4
          ? `Bank account •••• ${last4}`
          : undefined;

    return {
      destinationType: 'bank_account',
      destinationLabel: label,
      destinationId: ba.id,
      destinationBankName: bankName,
      destinationLast4: last4,
    };
  }

  // Expanded Card object (debit card payout)
  if (dest.object === 'card') {
    const card = dest as Stripe.Card;
    const last4 = card.last4 ?? undefined;
    const brand = card.brand
      ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
      : 'Card';
    const label = last4 ? `${brand} •••• ${last4}` : undefined;

    return {
      destinationType: 'debit_card',
      destinationLabel: label,
      destinationId: card.id,
      destinationBankName: undefined,
      destinationLast4: last4,
    };
  }

  return {
    destinationType: 'unknown',
    destinationLabel: undefined,
    destinationId:
      typeof dest === 'object' && 'id' in dest
        ? (dest as { id: string }).id
        : undefined,
    destinationBankName: undefined,
    destinationLast4: undefined,
  };
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

// ─── Stripe.Payout → PayoutSummary ───────────────────────────────────────────

export function mapStripePayoutToSummary(
  payout: Stripe.Payout,
  accountId: string,
): PayoutSummary {
  const { destinationType, destinationLabel } = extractDestinationInfo(payout);

  return {
    id: payout.id,
    accountId,
    providerKey: 'stripe',
    providerPayoutId: payout.id,
    amountMinor: payout.amount,
    currency: payout.currency,
    status: mapStripePayoutStatus(payout),
    providerStatus: payout.status ?? 'unknown',
    method: payout.method ?? undefined,
    type: payout.type ?? undefined,
    destinationType,
    destinationLabel,
    createdAt: new Date(payout.created * 1000),
    estimatedArrivalAt: payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : undefined,
    automatic: payout.automatic ?? undefined,
    description: payout.description ?? undefined,
    failureCode: payout.failure_code ?? undefined,
    failureMessage: payout.failure_message ?? undefined,
    metadata: extractSafeMetadata(payout.metadata),
  };
}

// ─── Stripe.Payout → PayoutDetail ────────────────────────────────────────────

export function mapStripePayoutToDetail(
  payout: Stripe.Payout,
  accountId: string,
): PayoutDetail {
  const summary = mapStripePayoutToSummary(payout, accountId);

  const { destinationId, destinationBankName, destinationLast4 } =
    extractDestinationInfo(payout);

  const balanceTxId =
    typeof payout.balance_transaction === 'string'
      ? payout.balance_transaction
      : (payout.balance_transaction as { id?: string } | null)?.id;

  const failureBtId =
    typeof payout.failure_balance_transaction === 'string'
      ? payout.failure_balance_transaction
      : (payout.failure_balance_transaction as { id?: string } | null)?.id;

  return {
    ...summary,
    balanceTransactionId: balanceTxId,
    destinationId,
    destinationBankName,
    destinationLast4,
    statementDescriptor: payout.statement_descriptor ?? undefined,
    sourceType: payout.source_type ?? undefined,
    failureBalanceTransactionId: failureBtId,
    providerMetadata: summary.metadata,
  };
}

// ─── List payouts ─────────────────────────────────────────────────────────────

/**
 * Lists payouts from Stripe.
 *
 * Filters supported natively by Stripe:
 *   - status, currency, created (range), arrival_date (range), starting_after
 *
 * Client-side filtering (applied after fetch):
 *   - search by payout ID (po_xxx prefix match)
 *
 * Limitation: Stripe has no text-search endpoint for payouts. Providing a
 * search term other than a payout ID will return no results until the provider
 * adds this capability.
 */
export async function listStripePayouts(
  client: Stripe,
  accountId: string,
  params: ListPayoutsParams,
): Promise<PayoutListResult> {
  const limit = Math.min(params.limit ?? 20, 100);

  // Stripe.PayoutListParams does not expose `currency` in the SDK type definition
  // even though the API supports it. Cast to a wider type to include it.
  const listParams: Stripe.PayoutListParams & { currency?: string } = { limit };

  if (params.cursor) listParams.starting_after = params.cursor;
  if (params.currency) listParams.currency = params.currency.toLowerCase();

  // Status: map canonical back to Stripe status value
  if (params.status) {
    const stripeStatus = mapCanonicalStatusToStripe(params.status);
    if (stripeStatus) {
      listParams.status = stripeStatus as Stripe.PayoutListParams['status'];
    }
  }

  // Created date range
  const createdFilter: Stripe.RangeQueryParam = {};
  if (params.createdFrom) {
    createdFilter.gte = Math.floor(params.createdFrom.getTime() / 1000);
  }
  if (params.createdTo) {
    createdFilter.lte = Math.floor(params.createdTo.getTime() / 1000);
  }
  if (Object.keys(createdFilter).length > 0) {
    listParams.created = createdFilter;
  }

  // Arrival date range
  const arrivalFilter: Stripe.RangeQueryParam = {};
  if (params.arrivalFrom) {
    arrivalFilter.gte = Math.floor(params.arrivalFrom.getTime() / 1000);
  }
  if (params.arrivalTo) {
    arrivalFilter.lte = Math.floor(params.arrivalTo.getTime() / 1000);
  }
  if (Object.keys(arrivalFilter).length > 0) {
    listParams.arrival_date = arrivalFilter;
  }

  const result = await client.payouts.list(listParams);

  let data = result.data.map((p) => mapStripePayoutToSummary(p, accountId));

  // Client-side search — only payout ID prefix match is reliable
  if (params.search) {
    const s = params.search.trim().toLowerCase();
    if (s.startsWith('po_')) {
      data = data.filter((p) => p.providerPayoutId.toLowerCase().startsWith(s));
    }
    // No other field is safely text-searchable on the Stripe payouts API.
  }

  const nextCursor =
    result.has_more && result.data.length > 0
      ? result.data[result.data.length - 1].id
      : undefined;

  return { data, hasMore: result.has_more, nextCursor };
}

// ─── Retrieve single payout ───────────────────────────────────────────────────

export async function getStripePayout(
  client: Stripe,
  accountId: string,
  payoutId: string,
): Promise<PayoutDetail> {
  const payout = await client.payouts.retrieve(payoutId, {
    expand: [
      'destination',
      'balance_transaction',
      'failure_balance_transaction',
    ],
  });

  return mapStripePayoutToDetail(payout, accountId);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps a canonical payout status back to the Stripe status string for filtering.
 * Returns undefined for statuses that have no Stripe equivalent (e.g. 'reversed').
 */
function mapCanonicalStatusToStripe(canonical: string): string | undefined {
  switch (canonical) {
    case 'pending':
      return 'pending';
    case 'in_transit':
      return 'in_transit';
    case 'paid':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'canceled';
    default:
      return undefined;
  }
}
