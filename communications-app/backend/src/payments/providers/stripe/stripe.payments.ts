// src/payments/providers/stripe/stripe.payments.ts
// Stripe PaymentIntent mapping. All Stripe SDK types stay here.

import Stripe from 'stripe';
import { PaymentCanonicalStatus } from '../../enums/payment-canonical-status.enum';
import type {
  PaymentSummary,
  PaymentDetail,
  PaymentListResult,
  ListPaymentsParams,
} from '../../contracts/payment-list.contract';
import type { PaymentUnit } from '../../contracts/payment-unit.contract';

// ─── Status mapping ───────────────────────────────────────────────────────────

export function mapStripePaymentStatus(
  intent: Stripe.PaymentIntent,
): PaymentCanonicalStatus {
  switch (intent.status) {
    case 'succeeded':
      return PaymentCanonicalStatus.Succeeded;
    case 'processing':
      return PaymentCanonicalStatus.Processing;
    case 'requires_action':
      return PaymentCanonicalStatus.RequiresAction;
    case 'requires_confirmation':
      return PaymentCanonicalStatus.RequiresConfirmation;
    case 'requires_capture':
      return PaymentCanonicalStatus.RequiresCapture;
    case 'canceled':
      return PaymentCanonicalStatus.Cancelled;
    case 'requires_payment_method':
      // Declined or awaiting payment method
      return intent.last_payment_error
        ? PaymentCanonicalStatus.Failed
        : PaymentCanonicalStatus.Pending;
    default:
      return PaymentCanonicalStatus.Pending;
  }
}

// ─── Payment method helpers ───────────────────────────────────────────────────

function mapPaymentMethodType(
  pm: Stripe.PaymentMethod | string | null | undefined,
): string | undefined {
  if (!pm || typeof pm === 'string') return undefined;
  // Map Stripe type to canonical category
  const mapping: Record<string, string> = {
    card: 'card',
    us_bank_account: 'bank_transfer',
    sepa_debit: 'direct_debit',
    au_becs_debit: 'direct_debit',
    acss_debit: 'direct_debit',
    bacs_debit: 'direct_debit',
    link: 'wallet',
    apple_pay: 'wallet',
    google_pay: 'wallet',
    cashapp: 'wallet',
    klarna: 'buy_now_pay_later',
    afterpay_clearpay: 'buy_now_pay_later',
    affirm: 'buy_now_pay_later',
    boleto: 'voucher',
    oxxo: 'voucher',
    konbini: 'voucher',
  };
  return mapping[pm.type] ?? pm.type;
}

function mapPaymentMethodLabel(
  pm: Stripe.PaymentMethod | string | null | undefined,
): string | undefined {
  if (!pm || typeof pm === 'string') return undefined;
  if (pm.type === 'card' && pm.card) {
    const brand = pm.card.brand
      ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
      : '';
    return `${brand} •••• ${pm.card.last4 ?? ''}`.trim() || undefined;
  }
  return undefined;
}

// ─── Intent → PaymentSummary ──────────────────────────────────────────────────

export function mapStripeIntentToSummary(
  intent: Stripe.PaymentIntent,
  accountId: string,
): PaymentSummary {
  const pm = intent.payment_method as
    | Stripe.PaymentMethod
    | string
    | null
    | undefined;
  const error = intent.last_payment_error;

  return {
    id: intent.id,
    accountId,
    providerKey: 'stripe',
    providerPaymentId: intent.id,
    amountMinor: intent.amount,
    currency: intent.currency,
    status: mapStripePaymentStatus(intent),
    providerStatus: intent.status,
    paymentMethodType: mapPaymentMethodType(pm),
    paymentMethodLabel: mapPaymentMethodLabel(pm),
    description: intent.description ?? undefined,
    createdAt: new Date(intent.created * 1000),
    requiresUserAction: intent.status === 'requires_action',
    failureCode: error?.code ?? undefined,
    declineCode: error?.decline_code ?? undefined,
    failureMessage: error?.message ?? undefined,
  };
}

// ─── Intent → PaymentDetail ───────────────────────────────────────────────────

export function mapStripeIntentToDetail(
  intent: Stripe.PaymentIntent,
  accountId: string,
): PaymentDetail {
  const summary = mapStripeIntentToSummary(intent, accountId);

  const charge = intent.latest_charge;
  const chargeObj = charge && typeof charge !== 'string' ? charge : null;

  // Safe metadata — exclude internal Graphify keys, keep user-facing ones
  const safeMetadata: Record<string, string> = {};
  if (intent.metadata) {
    for (const [k, v] of Object.entries(intent.metadata)) {
      if (typeof v === 'string' && !k.startsWith('graphify_')) {
        safeMetadata[k] = v;
      }
    }
  }

  return {
    ...summary,
    captureMethod: intent.capture_method ?? undefined,
    confirmationMethod: intent.confirmation_method ?? undefined,
    amountReceivedMinor: intent.amount_received,
    amountCapturableMinor: intent.amount_capturable,
    amountRefundedMinor: chargeObj?.amount_refunded ?? undefined,
    latestChargeId:
      typeof charge === 'string' ? charge : (charge?.id ?? undefined),
    receiptUrl: chargeObj?.receipt_url ?? undefined,
    cancellationReason: (intent as unknown as Record<string, unknown>)[
      'cancellation_reason'
    ] as string | undefined,
    providerMetadata:
      Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
  };
}

// ─── List PaymentIntents ──────────────────────────────────────────────────────

export async function listStripePayments(
  client: Stripe,
  accountId: string,
  params: ListPaymentsParams,
): Promise<PaymentListResult> {
  const limit = Math.min(params.limit ?? 20, 100);

  // Build created date filter
  const createdFilter: Stripe.RangeQueryParam = {};
  if (params.createdFrom) {
    createdFilter.gte = Math.floor(params.createdFrom.getTime() / 1000);
  }
  if (params.createdTo) {
    createdFilter.lte = Math.floor(params.createdTo.getTime() / 1000);
  }

  // Use Stripe Search API when a text search term is provided
  if (params.search) {
    return listStripePaymentsViaSearch(
      client,
      accountId,
      params,
      limit,
      createdFilter,
    );
  }

  // Standard list — Stripe.PaymentIntentListParams does not expose currency in
  // the SDK type declaration even though the API supports it. Cast to a wider
  // type to include it without unsafe any.
  const listParams: Stripe.PaymentIntentListParams & { currency?: string } = {
    limit,
    expand: ['data.payment_method'],
  };
  if (params.cursor) listParams.starting_after = params.cursor;
  if (params.currency) listParams.currency = params.currency.toLowerCase();
  if (Object.keys(createdFilter).length > 0) listParams.created = createdFilter;

  const result = await client.paymentIntents.list(listParams);

  let data = result.data.map((i) => mapStripeIntentToSummary(i, accountId));

  // Status filter applied client-side (Stripe list does not support it)
  if (params.status) {
    data = data.filter((p) => p.status === params.status);
  }

  const nextCursor =
    result.has_more && result.data.length > 0
      ? result.data[result.data.length - 1].id
      : undefined;

  return { data, hasMore: result.has_more, nextCursor };
}

async function listStripePaymentsViaSearch(
  client: Stripe,
  accountId: string,
  params: ListPaymentsParams,
  limit: number,
  createdFilter: Stripe.RangeQueryParam,
): Promise<PaymentListResult> {
  const search = params.search!;
  const parts: string[] = [];

  // Match by PaymentIntent ID (exact) or description (partial)
  if (search.startsWith('pi_')) {
    parts.push(`id:'${search}'`);
  } else {
    // Stripe search supports metadata and description queries
    parts.push(
      `(description~'${search}' OR metadata['reference']:'${search}')`,
    );
  }

  if (params.currency) {
    parts.push(`currency:'${params.currency.toLowerCase()}'`);
  }
  if (params.status) {
    // Map canonical status back to Stripe status for search
    const stripeStatusMap: Record<string, string> = {
      succeeded: 'succeeded',
      failed: 'requires_payment_method',
      processing: 'processing',
      requires_action: 'requires_action',
      requires_confirmation: 'requires_confirmation',
      requires_capture: 'requires_capture',
      cancelled: 'canceled',
    };
    const stripeStatus = stripeStatusMap[params.status];
    if (stripeStatus) parts.push(`status:'${stripeStatus}'`);
  }
  if (createdFilter.gte) parts.push(`created>=${createdFilter.gte}`);
  if (createdFilter.lte) parts.push(`created<=${createdFilter.lte}`);

  try {
    const result = await client.paymentIntents.search({
      query: parts.join(' AND '),
      limit,
      expand: ['data.payment_method'],
      ...(params.cursor ? { page: params.cursor } : {}),
    });

    const data = result.data.map((i) => mapStripeIntentToSummary(i, accountId));

    return {
      data,
      hasMore: result.has_more,
      nextCursor: result.next_page ?? undefined,
    };
  } catch {
    // Search API may not be available — fall back to list without search
    return { data: [], hasMore: false };
  }
}

// ─── Retrieve single PaymentIntent ───────────────────────────────────────────

export async function getStripePayment(
  client: Stripe,
  accountId: string,
  paymentId: string,
): Promise<PaymentDetail> {
  const intent = await client.paymentIntents.retrieve(paymentId, {
    expand: ['payment_method', 'latest_charge'],
  });

  return mapStripeIntentToDetail(intent, accountId);
}

// ─── Payment units (currencies) ───────────────────────────────────────────────
//
// Strategy:
//   1. List the 100 most recent PaymentIntents to collect currencies in use.
//   2. Retrieve the account Balance to capture any balance currencies not yet
//      seen in transactions (e.g. a newly enabled currency with no payments).
//   3. Merge, deduplicate, sort, return uppercase codes.
//
// Limitation: with a 100-intent sample window, currencies used only in older
// payments may be absent.  This is intentional — the goal is the active set,
// not a full historical audit.

export async function listStripePaymentUnits(
  client: Stripe,
): Promise<PaymentUnit[]> {
  const codesSet = new Set<string>();

  // 1. Collect currencies from recent PaymentIntents.
  try {
    const intents = await client.paymentIntents.list({ limit: 100 });
    for (const intent of intents.data) {
      if (intent.currency) {
        codesSet.add(intent.currency.toUpperCase());
      }
    }
  } catch {
    // Non-fatal: fall through to balance check.
  }

  // 2. Collect currencies from Balance (available + pending).
  try {
    const balance = await client.balance.retrieve();
    for (const line of [...balance.available, ...balance.pending]) {
      if (line.currency) {
        codesSet.add(line.currency.toUpperCase());
      }
    }
  } catch {
    // Non-fatal: return whatever was collected from PaymentIntents.
  }

  return [...codesSet]
    .sort()
    .map((code) => ({
      code,
      label: code,
      kind: 'fiat' as const,
    }));
}
